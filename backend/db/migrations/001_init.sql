-- ============================================================
--  CloudRDR – Initial database migration  (001_init.sql)
--  Run once against your Supabase project:
--    SQL editor: paste and execute
--    Supabase CLI: supabase db push
--
--  Design decisions:
--  * All PKs are UUID (gen_random_uuid()) for global uniqueness.
--  * Row Level Security is ENABLED on every table.
--    Only the service role (bypasses RLS) can read/write.
--    anon + authenticated roles are explicitly denied.
--  * Indexes on every FK column and on timestamp columns used
--    in range scans by the detection engine.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for gen_random_uuid()

-- ============================================================
-- TABLE: protected_files
-- One row per file per baseline version.
-- A new baseline run inserts new rows with baseline_version+1;
-- old rows are kept for audit / rollback.
-- ============================================================
CREATE TABLE IF NOT EXISTS protected_files (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Storage bucket name (e.g. 'protected')
    bucket            TEXT        NOT NULL,
    -- Object key / path inside the bucket (e.g. 'docs/report.pdf')
    path              TEXT        NOT NULL,
    -- File size in bytes at the time the baseline was captured
    size_bytes        BIGINT      NOT NULL DEFAULT 0,
    -- Hex SHA-256 of file content at baseline time (64 hex chars)
    baseline_sha256   CHAR(64)    NOT NULL,
    -- Monotonically increasing version number; 1 = initial baseline
    baseline_version  INT         NOT NULL DEFAULT 1,
    -- When TRUE this is a canary/sentinel file;
    -- ANY modification or deletion triggers an immediate ransomware verdict
    is_canary         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent duplicate rows for the same file in the same baseline version
    UNIQUE (bucket, path, baseline_version)
);

CREATE INDEX IF NOT EXISTS idx_pf_bucket         ON protected_files (bucket);
CREATE INDEX IF NOT EXISTS idx_pf_bucket_version ON protected_files (bucket, baseline_version);
-- Partial index: quickly find canaries without scanning non-canary rows
CREATE INDEX IF NOT EXISTS idx_pf_canary         ON protected_files (bucket, is_canary)
    WHERE is_canary = TRUE;
CREATE INDEX IF NOT EXISTS idx_pf_created_at     ON protected_files (created_at);

ALTER TABLE protected_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_protected_files" ON protected_files
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TABLE: baseline_snapshots
-- One row per completed baseline run.
-- Stores the Merkle root that the Crypto module computed over
-- all baseline_sha256 values, enabling tamper-detection.
-- ============================================================
CREATE TABLE IF NOT EXISTS baseline_snapshots (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Bucket this snapshot covers
    bucket      TEXT        NOT NULL,
    -- Hex Merkle root of all baseline_sha256 values in this snapshot
    merkle_root CHAR(64)    NOT NULL,
    -- Number of files included in this snapshot
    file_count  INT         NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Service identity that triggered the baseline (e.g. 'cloudrdr-agent')
    created_by  TEXT        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bs_bucket     ON baseline_snapshots (bucket);
CREATE INDEX IF NOT EXISTS idx_bs_created_at ON baseline_snapshots (created_at DESC);

ALTER TABLE baseline_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_baseline_snapshots" ON baseline_snapshots
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TABLE: change_events
-- Every file-level change observed by the monitor agent.
-- The detection engine reads this table using a sliding time window.
-- ============================================================
CREATE TABLE IF NOT EXISTS change_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Bucket where the change was observed
    bucket          TEXT        NOT NULL,
    -- Object key / path that changed
    path            TEXT        NOT NULL,
    -- Cloud account that owns the bucket (used to group events per account)
    account_id      TEXT        NOT NULL,
    -- Type of change observed
    event_type      TEXT        NOT NULL
                        CHECK (event_type IN ('created', 'modified', 'deleted')),
    -- SHA-256 of file content AFTER the change; NULL when event_type = 'deleted'
    observed_sha256 CHAR(64)    NULL,
    -- Wall-clock UTC time the monitor agent detected this change
    observed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- TRUE when observed_sha256 equals the file's baseline_sha256 (no real change)
    matched_baseline BOOLEAN    NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ce_bucket      ON change_events (bucket);
CREATE INDEX IF NOT EXISTS idx_ce_account_id  ON change_events (account_id);
-- The detection engine uses this index for its sliding-window query
CREATE INDEX IF NOT EXISTS idx_ce_observed_at ON change_events (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_path        ON change_events (path);

ALTER TABLE change_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_change_events" ON change_events
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TABLE: detection_runs
-- One row per evaluation cycle of the detection engine.
-- Saved for EVERY verdict (including 'normal') so researchers
-- can sweep thresholds against historical data.
-- ============================================================
CREATE TABLE IF NOT EXISTS detection_runs (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Cloud account this run evaluated
    account_id       TEXT         NOT NULL,
    -- Length of the sliding window used (seconds)
    window_seconds   INT          NOT NULL,
    -- Total protected files for this account at evaluation time
    total_files      INT          NOT NULL,
    -- Unique files whose hash differed from baseline inside the window
    changed_files    INT          NOT NULL,
    -- change_rate = changed_files / total_files
    change_rate      NUMERIC(6,4) NOT NULL,
    -- Ransomware threshold configured at the time of this run
    threshold        NUMERIC(6,4) NOT NULL,
    -- TRUE if any canary file was modified or deleted in the window
    canary_triggered BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Verdict: 'normal' < suspicious_rate <= 'suspicious' < ransomware_rate <= 'ransomware'
    verdict          TEXT         NOT NULL
                         CHECK (verdict IN ('normal', 'suspicious', 'ransomware')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_account_id ON detection_runs (account_id);
CREATE INDEX IF NOT EXISTS idx_dr_created_at ON detection_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_verdict    ON detection_runs (verdict);

ALTER TABLE detection_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_detection_runs" ON detection_runs
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TABLE: incidents
-- Created when the detection engine issues a ransomware verdict.
-- Lifecycle: open -> frozen -> restoring -> resolved
--            open -> frozen -> freeze_failed  (if freeze API unreachable)
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- FK to the detection run that triggered this incident
    detection_run_id UUID        NOT NULL REFERENCES detection_runs (id) ON DELETE RESTRICT,
    -- Cloud account whose storage was (or may be) encrypted
    account_id       TEXT        NOT NULL,
    -- Current lifecycle state of the incident
    status           TEXT        NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'frozen', 'restoring', 'resolved', 'freeze_failed')),
    -- JSON array of object paths affected, e.g. ["docs/a.pdf", "data/b.csv"]
    affected_paths   JSONB       NOT NULL DEFAULT '[]',
    -- When the ransomware verdict was issued
    detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- When the freeze API confirmed the account was frozen (NULL = not yet frozen)
    frozen_at        TIMESTAMPTZ NULL,
    -- When restore verified 100% VALID and incident was closed
    resolved_at      TIMESTAMPTZ NULL,
    -- Full signed incident record JSON (set by incidentService after freeze)
    record_json      JSONB       NULL,
    -- Ed25519 hex signature of record_json (set by Crypto module)
    record_signature TEXT        NULL,
    -- Key ID used for the signature, for future key rotation lookups
    signing_key_id   TEXT        NULL
);

CREATE INDEX IF NOT EXISTS idx_inc_account_id       ON incidents (account_id);
CREATE INDEX IF NOT EXISTS idx_inc_status           ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_inc_detected_at      ON incidents (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_inc_detection_run_id ON incidents (detection_run_id);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_incidents" ON incidents
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TABLE: restore_jobs
-- One job per restore attempt for an incident.
-- A single incident may have multiple jobs (if a job fails and
-- the operator retries).
-- ============================================================
CREATE TABLE IF NOT EXISTS restore_jobs (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- The incident this restore job belongs to
    incident_id    UUID        NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    -- Current state of the restore operation
    status         TEXT        NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued', 'running', 'verified', 'failed')),
    -- Total number of files this job is restoring
    total_files    INT         NOT NULL DEFAULT 0,
    -- Files restored with AEAD verification passed AND hash matches baseline
    valid_files    INT         NOT NULL DEFAULT 0,
    -- Files whose restored hash did NOT match baseline (or AEAD failed)
    modified_files INT         NOT NULL DEFAULT 0,
    -- When the job transitioned from 'queued' to 'running'
    started_at     TIMESTAMPTZ NULL,
    -- When all restore_results rows were written and counts finalised
    finished_at    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_rj_incident_id ON restore_jobs (incident_id);
CREATE INDEX IF NOT EXISTS idx_rj_status      ON restore_jobs (status);
CREATE INDEX IF NOT EXISTS idx_rj_started_at  ON restore_jobs (started_at DESC);

ALTER TABLE restore_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_restore_jobs" ON restore_jobs
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TABLE: restore_results
-- Per-file outcome of a restore job.
-- ============================================================
CREATE TABLE IF NOT EXISTS restore_results (
    id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    -- The restore job this result belongs to
    restore_job_id  UUID     NOT NULL REFERENCES restore_jobs (id) ON DELETE CASCADE,
    -- Object path that was restored (or attempted)
    path            TEXT     NOT NULL,
    -- The hash we expected to see (from protected_files.baseline_sha256)
    expected_sha256 CHAR(64) NOT NULL,
    -- Hash of the bytes actually returned by the backup module
    -- Empty string ('') when result = 'MISSING' (backup returned nothing)
    restored_sha256 CHAR(64) NOT NULL DEFAULT '',
    -- VALID   = AEAD verified AND restored_sha256 == expected_sha256
    -- MODIFIED = AEAD failed OR hashes differ
    -- MISSING  = backup module returned no bytes for this path
    result          TEXT     NOT NULL
                        CHECK (result IN ('VALID', 'MODIFIED', 'MISSING'))
);

CREATE INDEX IF NOT EXISTS idx_rr_job_id ON restore_results (restore_job_id);
CREATE INDEX IF NOT EXISTS idx_rr_path   ON restore_results (path);
CREATE INDEX IF NOT EXISTS idx_rr_result ON restore_results (result);

ALTER TABLE restore_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_restore_results" ON restore_results
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TRIGGER: auto-update protected_files.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pf_updated_at ON protected_files;
CREATE TRIGGER trg_pf_updated_at
    BEFORE UPDATE ON protected_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
