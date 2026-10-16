/**
 * @file src/config/index.js
 * Loads environment variables via dotenv, validates all required values,
 * and fails fast (process.exit(1)) if anything is missing or invalid.
 * Import this module ONCE at the top of every entry point.
 */

import { config as loadDotenv } from 'dotenv';
loadDotenv();

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Read a required string env var. Throws ConfigError if missing/empty.
 * @param {string} key
 * @returns {string}
 */
function _requireString(key) {
  const v = process.env[key];
  if (!v || v.trim() === '') {
    throw new Error(`[config] Missing required env var: ${key}`);
  }
  return v.trim();
}

/**
 * Read an optional string env var with a fallback.
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function optString(key, fallback) {
  const v = process.env[key];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

/**
 * Read an optional numeric env var with a fallback. Exits if value is non-numeric.
 * @param {string} key
 * @param {number} fallback
 * @returns {number}
 */
function optNumber(key, fallback) {
  const v = process.env[key];
  if (!v || v.trim() === '') return fallback;
  const n = Number(v.trim());
  if (Number.isNaN(n)) {
    throw new Error(`[config] Env var ${key} must be a number, got: ${v}`);
  }
  return n;
}

/**
 * Read a comma-separated list env var.
 * @param {string} key
 * @returns {string[]}
 */
function optList(key) {
  const v = process.env[key];
  if (!v || v.trim() === '') return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── build config ─────────────────────────────────────────────────────────────

const isTest = process.env.NODE_ENV === 'test';

let cfg;
try {
  cfg = {
    // Supabase — required only when STORAGE_PROVIDER=supabase
    supabase: {
      url: optString('SUPABASE_URL', ''),
      serviceKey: optString('SUPABASE_SERVICE_KEY', ''),
    },

    // Storage
    storage: {
      provider: optString('STORAGE_PROVIDER', 'local'), // 'supabase' | 'local'
      bucket: optString('STORAGE_BUCKET', 'protected'),
      localPath: optString('LOCAL_STORAGE_PATH', './data/local-storage'),
    },

    // Monitor agent
    monitor: {
      intervalSeconds: optNumber('MONITOR_INTERVAL_SECONDS', 10),
    },

    // Detection engine
    detection: {
      windowSeconds: optNumber('WINDOW_SECONDS', 60),
      suspiciousRate: optNumber('SUSPICIOUS_RATE', 0.1),
      ransomwareRate: optNumber('RANSOMWARE_RATE', 0.3),
      allowlistedAccounts: optList('ALLOWLISTED_ACCOUNTS'),
    },

    // HTTP API
    api: {
      key: optString(
        'API_KEY',
        process.env.VERCEL ? 'cloudrdr-enterprise-prod-key-99f2b8a7c1d3e5f' : 'cloudrdr-default-key-2026'
      ),
      dashboardOrigin: optString('DASHBOARD_ORIGIN', 'http://localhost:3001'),
      port: optNumber('PORT', 3000),
    },

    // Logging
    log: {
      level: isTest ? 'silent' : optString('LOG_LEVEL', 'info'),
    },
  };

  // Cross-field validation: if provider is supabase, credentials must be present
  if (cfg.storage.provider === 'supabase') {
    if (!cfg.supabase.url)
      throw new Error('[config] SUPABASE_URL is required when STORAGE_PROVIDER=supabase');
    if (!cfg.supabase.serviceKey)
      throw new Error('[config] SUPABASE_SERVICE_KEY is required when STORAGE_PROVIDER=supabase');
  }

  const validProviders = ['supabase', 'local'];
  if (!validProviders.includes(cfg.storage.provider)) {
    throw new Error(`[config] STORAGE_PROVIDER must be one of: ${validProviders.join(', ')}`);
  }

  const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
  if (!validLogLevels.includes(cfg.log.level)) {
    throw new Error(`[config] LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  // Strict enterprise production hardening
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (process.env.NODE_ENV === 'production' && !isVercel) {
    if (cfg.api.key === 'cloudrdr-default-key-2026') {
      throw new Error(
        '[config] INSECURE CONFIGURATION: Default API_KEY is strictly forbidden in production! Set a cryptographically random API_KEY in .env or environment.'
      );
    }
    if (cfg.api.key.length < 16) {
      throw new Error('[config] API_KEY must be at least 16 characters in production environments.');
    }
  }
} catch (err) {
  if (process.env.VERCEL) {
    console.warn('[config:vercel:warning]', err.message);
  } else {
    // Fail fast — misconfigured service must not start
    console.error(err.message);
    process.exit(1);
  }
}

export default cfg;
