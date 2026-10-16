-- ==============================================================================
-- CloudRDR Enterprise — Complete Consolidated Database Schema (init.sql)
-- Auto-executed by PostgreSQL container on first startup (/docker-entrypoint-initdb.d)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Helper trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TABLE: protected_files
CREATE TABLE IF NOT EXISTS protected_files (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket            TEXT        NOT NULL,
    path              TEXT        NOT NULL,
    size_bytes        BIGINT      NOT NULL DEFAULT 0,
    baseline_sha256   CHAR(64)    NOT NULL,
    baseline_version  INT         NOT NULL DEFAULT 1,
    is_canary         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bucket, path, baseline_version)
);

CREATE INDEX IF NOT EXISTS idx_pf_bucket         ON protected_files (bucket);
CREATE INDEX IF NOT EXISTS idx_pf_bucket_version ON protected_files (bucket, baseline_version);
CREATE INDEX IF NOT EXISTS idx_pf_canary         ON protected_files (bucket, is_canary) WHERE is_canary = TRUE;
CREATE INDEX IF NOT EXISTS idx_pf_created_at     ON protected_files (created_at);

-- 3. TABLE: baseline_snapshots
CREATE TABLE IF NOT EXISTS baseline_snapshots (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket      TEXT        NOT NULL,
    merkle_root CHAR(64)    NOT NULL,
    file_count  INT         NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  TEXT        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bs_bucket     ON baseline_snapshots (bucket);
CREATE INDEX IF NOT EXISTS idx_bs_created_at ON baseline_snapshots (created_at DESC);

-- 4. TABLE: change_events
CREATE TABLE IF NOT EXISTS change_events (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id        TEXT        NOT NULL,
    bucket            TEXT        NOT NULL,
    path              TEXT        NOT NULL,
    event_type        TEXT        NOT NULL CHECK (event_type IN ('created', 'modified', 'deleted')),
    observed_sha256   CHAR(64)    NULL,
    observed_at       TIMESTAMPTZ NOT NULL,
    matched_baseline  BOOLEAN     NOT NULL DEFAULT FALSE,
    entropy           NUMERIC(4,2) NULL,
    is_canary         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ce_lookup ON change_events (account_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_bucket ON change_events (bucket, observed_at DESC);

-- 5. TABLE: detection_runs
CREATE TABLE IF NOT EXISTS detection_runs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id       TEXT        NOT NULL,
    window_seconds   INT         NOT NULL,
    total_files      INT         NOT NULL,
    changed_files    INT         NOT NULL,
    change_rate      NUMERIC(6,4) NOT NULL,
    threshold        NUMERIC(6,4) NOT NULL,
    canary_triggered BOOLEAN     NOT NULL DEFAULT FALSE,
    verdict          TEXT        NOT NULL CHECK (verdict IN ('normal', 'suspicious', 'ransomware')),
    risk_score       INT         NULL,
    threat_level     TEXT        NULL,
    confidence       NUMERIC(4,2) NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_account ON detection_runs (account_id, created_at DESC);

-- 6. TABLE: incidents
CREATE TABLE IF NOT EXISTS incidents (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_run_id  UUID        NULL,
    account_id        TEXT        NOT NULL,
    status            TEXT        NOT NULL CHECK (status IN ('open', 'frozen', 'freeze_failed', 'acknowledged', 'restoring', 'resolved', 'closed')),
    affected_paths    TEXT[]      NOT NULL DEFAULT '{}',
    detected_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    frozen_at         TIMESTAMPTZ NULL,
    resolved_at       TIMESTAMPTZ NULL,
    record_json       JSONB       NULL,
    record_signature  TEXT        NULL,
    signing_key_id    TEXT        NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inc_account ON incidents (account_id, status);
CREATE INDEX IF NOT EXISTS idx_inc_status  ON incidents (status);

-- 7. TABLE: restore_jobs
CREATE TABLE IF NOT EXISTS restore_jobs (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id    UUID        NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    status         TEXT        NOT NULL CHECK (status IN ('running', 'completed', 'staged', 'failed')),
    total_files    INT         NOT NULL,
    valid_files    INT         NOT NULL DEFAULT 0,
    modified_files INT         NOT NULL DEFAULT 0,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ NULL
);

-- 8. TABLE: internal_users
CREATE TABLE IF NOT EXISTS internal_users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'auditor', 'operator')),
    status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NULL
);

-- 9. TABLE: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES internal_users (id) ON DELETE CASCADE,
    session_token  TEXT        NOT NULL UNIQUE,
    user_agent     TEXT        NULL,
    ip_address     TEXT        NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked        BOOLEAN     NOT NULL DEFAULT FALSE
);

-- 10. TABLE: connected_agents
CREATE TABLE IF NOT EXISTS connected_agents (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id         TEXT        NOT NULL UNIQUE,
    token            TEXT        NOT NULL,
    hostname         TEXT        NOT NULL,
    ip_address       TEXT        NULL,
    platform         TEXT        NOT NULL DEFAULT 'linux',
    version          TEXT        NOT NULL,
    account_id       TEXT        NOT NULL DEFAULT 'default-account',
    bucket           TEXT        NOT NULL DEFAULT 'protected',
    status           TEXT        NOT NULL DEFAULT 'online',
    cpu_usage        NUMERIC(4,2) NOT NULL DEFAULT 0.0,
    ram_usage_mb     NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    files_monitored  INT         NOT NULL DEFAULT 0,
    last_ping_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON connected_agents (status, last_ping_at DESC);
