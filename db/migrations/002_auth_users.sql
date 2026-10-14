-- ============================================================
--  CloudRDR – Authentication & User Management (002_auth_users.sql)
--
--  Stores internal accounts and persistent session tokens for
--  CloudRDR operators, SOC analysts, and security admins.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLE: internal_users
-- ============================================================
CREATE TABLE IF NOT EXISTS internal_users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     TEXT        NOT NULL,
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'analyst'
                      CHECK (role IN ('admin', 'analyst', 'auditor', 'operator')),
    status        TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'suspended', 'disabled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NULL,
    UNIQUE (email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_iu_email_lower ON internal_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_iu_status ON internal_users (status);
CREATE INDEX IF NOT EXISTS idx_iu_created_at ON internal_users (created_at DESC);

ALTER TABLE internal_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_internal_users" ON internal_users
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TABLE: user_sessions
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_us_token ON user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_us_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_us_expires ON user_sessions (expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_user_sessions" ON user_sessions
    AS RESTRICTIVE FOR ALL TO anon, authenticated USING (FALSE);

-- ============================================================
-- TRIGGER: auto-update internal_users.updated_at
-- ============================================================
DROP TRIGGER IF EXISTS trg_iu_updated_at ON internal_users;
CREATE TRIGGER trg_iu_updated_at
    BEFORE UPDATE ON internal_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
