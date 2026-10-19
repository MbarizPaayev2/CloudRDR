-- ============================================================
--  CloudRDR – Migration 003: Compliance Tracking & PostgreSQL Indexing
--  Formulated following Prowler & Supabase postgresql-indexing best practices:
--    * Partial indexes for active working sets (status IN ('open', 'frozen', 'restoring'))
--    * Covering indexes with INCLUDE to eliminate table heap lookups during window scans
--    * Dedicated compliance framework audit run history table
-- ============================================================

-- 1. Partial Index on Active Security Incidents
-- Filters out historical 'resolved' incidents so dashboard hot queries remain in L1/L2 cache.
CREATE INDEX IF NOT EXISTS idx_incidents_active_filtered
    ON incidents (account_id, created_at DESC)
    WHERE status IN ('open', 'frozen', 'restoring');

-- 2. Covering Index for Sliding-Window Detection Queries
-- Enables Index-Only Scans on PostgreSQL by including path and event_type.
CREATE INDEX IF NOT EXISTS idx_ce_sliding_window_covering
    ON change_events (account_id, detected_at DESC)
    INCLUDE (event_type, path);

-- 3. Canary Tripwire Event Fast Lookup
-- Dedicated partial index for zero-latency canary trip alert correlation.
CREATE INDEX IF NOT EXISTS idx_ce_canary_alerts
    ON change_events (account_id, detected_at DESC)
    WHERE is_canary = TRUE;

-- 4. Audit Ledger Fast Sequence Verification Index
-- Accelerates hash-chain verification from genesis block to current tip.
CREATE INDEX IF NOT EXISTS idx_al_sequence_verification
    ON audit_ledger (entry_id ASC, timestamp ASC);

-- 5. Table: compliance_framework_runs
-- Persists historical security benchmark compliance scores (CIS, NIST, ISO, HIPAA).
CREATE TABLE IF NOT EXISTS compliance_framework_runs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id     TEXT        NOT NULL,
    framework_name   TEXT        NOT NULL,
    version          TEXT        NOT NULL,
    score_percentage INT         NOT NULL,
    passing_controls INT         NOT NULL,
    total_controls   INT         NOT NULL,
    status           TEXT        NOT NULL,
    evaluated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluator        TEXT        NOT NULL DEFAULT 'cloudrdr-compliance-engine'
);

CREATE INDEX IF NOT EXISTS idx_cfr_framework_date
    ON compliance_framework_runs (framework_id, evaluated_at DESC);

ALTER TABLE compliance_framework_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_compliance_framework_runs" ON compliance_framework_runs
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);
