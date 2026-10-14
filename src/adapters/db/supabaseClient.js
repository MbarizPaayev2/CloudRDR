/**
 * @file src/adapters/db/supabaseClient.js
 *
 * Singleton Supabase client using the SERVICE-ROLE key.
 * The service role bypasses RLS — NEVER expose this client or its key
 * to the browser, frontend, or any non-server environment.
 *
 * If SUPABASE_URL and SUPABASE_SERVICE_KEY are provided, connects to real Supabase.
 * If running offline / without credentials (demo, tests, simulator), seamlessly falls
 * back to an in-memory database that implements the exact same PostgREST query builder API.
 *
 * Usage:
 *   import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
 *   const db = getSupabaseClient();
 *   const rows = await supaQuery(db.from('protected_files').select('*'));
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import cfg from '../../config/index.js';
import logger from '../../utils/logger.js';
import { ExternalServiceError } from '../../utils/errors.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | any} */
let _client = null;

/** In-memory storage for offline / mock mode */
const _memoryDb = {
  protected_files: [],
  baseline_snapshots: [],
  change_events: [],
  detection_runs: [],
  incidents: [],
  restore_jobs: [],
  restore_results: [],
  internal_users: [],
  user_sessions: [],
};

let _isTestMode = process.env.NODE_ENV === 'test';

// Attempt to load persisted local data if available
try {
  const dbStorePath = path.resolve(process.cwd(), 'data', 'db-storage.json');
  if (fs.existsSync(dbStorePath)) {
    const raw = fs.readFileSync(dbStorePath, 'utf8');
    const parsed = JSON.parse(raw);
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) {
        _memoryDb[key] = parsed[key];
      }
    }
  }

  // Backwards compatibility with users-storage.json
  const authStorePath = path.resolve(process.cwd(), 'data', 'users-storage.json');
  if (fs.existsSync(authStorePath)) {
    const raw = fs.readFileSync(authStorePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.internal_users) && _memoryDb.internal_users.length === 0) {
      _memoryDb.internal_users = parsed.internal_users;
    }
    if (Array.isArray(parsed.user_sessions) && _memoryDb.user_sessions.length === 0) {
      _memoryDb.user_sessions = parsed.user_sessions;
    }
  }
} catch {
  // Non-fatal fallback
}

// Ensure default active users exist for immediate access
if (!_memoryDb.internal_users) {
  _memoryDb.internal_users = [];
}
const defaultPwdHash =
  'scrypt$16384$8$1$792b5a26effb0ed3d0ce3c5aae7ac7c8$30157f0b2a6758794d4f6e7b998b2326cf44a1bea170adf81b7647c59abbc005b457ffb9a2d8dd5d67897efd235a3f8aa578076fcc29ea8a0db13fd770d38329';

const existingAdmin = _memoryDb.internal_users.find((u) => u.email === 'admin@cloudrdr.internal');
if (!existingAdmin) {
  _memoryDb.internal_users.push({
    id: 'usr-admin-01',
    full_name: 'Security Admin',
    email: 'admin@cloudrdr.internal',
    password_hash: defaultPwdHash,
    role: 'admin',
    status: 'active',
    created_at: new Date().toISOString(),
    last_login_at: null,
  });
} else {
  existingAdmin.password_hash = defaultPwdHash;
  existingAdmin.status = 'active';
}

const existingTest = _memoryDb.internal_users.find((u) => u.email === 'test@gmail.com');
if (!existingTest) {
  _memoryDb.internal_users.push({
    id: 'usr-operator-02',
    full_name: 'Test Operator',
    email: 'test@gmail.com',
    password_hash: defaultPwdHash,
    role: 'analyst',
    status: 'active',
    created_at: new Date().toISOString(),
    last_login_at: null,
  });
} else {
  existingTest.password_hash = defaultPwdHash;
  existingTest.status = 'active';
}

function _persistAuthStorageIfApplicable(_tableName) {
  if (_isTestMode) return;
  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbStorePath = path.join(dataDir, 'db-storage.json');
    fs.writeFileSync(dbStorePath, JSON.stringify(_memoryDb, null, 2), 'utf8');
  } catch {
    // Non-fatal
  }
}

/**
 * Creates an in-memory PostgREST query builder mock.
 * @returns {any}
 */
export function createInMemorySupabaseClient() {
  function createBuilder(tableName) {
    const table = _memoryDb[tableName] || (_memoryDb[tableName] = []);
    const filters = [];
    let isSingle = false;
    let isMaybeSingle = false;
    let orderSpec = null;
    let limitCount = null;
    let operation = 'select'; // 'select' | 'insert' | 'update' | 'delete'
    let mutationPayload = null;

    const builder = {
      select(_cols = '*') {
        if (!['insert', 'update', 'delete'].includes(operation)) {
          operation = 'select';
        }
        return builder;
      },
      insert(rows) {
        operation = 'insert';
        mutationPayload = Array.isArray(rows) ? rows : [rows];
        return builder;
      },
      update(updates) {
        operation = 'update';
        mutationPayload = updates;
        return builder;
      },
      delete() {
        operation = 'delete';
        return builder;
      },
      eq(col, val) {
        filters.push((row) => row[col] === val);
        return builder;
      },
      neq(col, val) {
        filters.push((row) => row[col] !== val);
        return builder;
      },
      in(col, vals) {
        const set = new Set(vals);
        filters.push((row) => set.has(row[col]));
        return builder;
      },
      gte(col, val) {
        filters.push((row) => new Date(row[col]).getTime() >= new Date(val).getTime());
        return builder;
      },
      lte(col, val) {
        filters.push((row) => new Date(row[col]).getTime() <= new Date(val).getTime());
        return builder;
      },
      gt(col, val) {
        filters.push((row) => new Date(row[col]).getTime() > new Date(val).getTime());
        return builder;
      },
      lt(col, val) {
        filters.push((row) => new Date(row[col]).getTime() < new Date(val).getTime());
        return builder;
      },
      order(col, { ascending = true } = {}) {
        orderSpec = { col, ascending };
        return builder;
      },
      limit(n) {
        limitCount = n;
        return builder;
      },
      single() {
        isSingle = true;
        return builder;
      },
      maybeSingle() {
        isMaybeSingle = true;
        return builder;
      },
      // Thenable to allow `await db.from(...)`
      then(resolve) {
        let result = [];
        const now = new Date().toISOString();

        if (operation === 'insert') {
          const inserted = mutationPayload.map((item) => {
            const row = {
              id: item.id || crypto.randomUUID(),
              created_at: item.created_at || now,
              updated_at: item.updated_at || now,
              ...item,
            };
            table.push(row);
            return row;
          });
          result = inserted;
        } else if (operation === 'update') {
          const matched = table.filter((row) => filters.every((fn) => fn(row)));
          matched.forEach((row) => {
            Object.assign(row, mutationPayload, { updated_at: now });
          });
          result = matched;
        } else if (operation === 'delete') {
          const matched = table.filter((row) => filters.every((fn) => fn(row)));
          for (const m of matched) {
            const idx = table.indexOf(m);
            if (idx >= 0) table.splice(idx, 1);
          }
          result = matched;
        } else {
          // select
          result = table.filter((row) => filters.every((fn) => fn(row)));
        }

        if (['insert', 'update', 'delete'].includes(operation)) {
          _persistAuthStorageIfApplicable(tableName);
        }

        if (orderSpec) {
          result = [...result].sort((a, b) => {
            const valA = a[orderSpec.col];
            const valB = b[orderSpec.col];
            if (valA < valB) return orderSpec.ascending ? -1 : 1;
            if (valA > valB) return orderSpec.ascending ? 1 : -1;
            return 0;
          });
        }

        if (limitCount !== null && limitCount !== undefined) {
          result = result.slice(0, limitCount);
        }

        if (isSingle) {
          if (result.length === 0) {
            return resolve({ data: null, error: { message: 'Row not found' } });
          }
          return resolve({ data: result[0], error: null });
        }

        if (isMaybeSingle) {
          return resolve({ data: result[0] || null, error: null });
        }

        return resolve({ data: result, error: null });
      },
    };

    return builder;
  }

  return {
    from: createBuilder,
    _inMemory: true,
  };
}

/**
 * Return the shared Supabase client instance.
 * Lazily initialised on first call.
 * Uses real Supabase if credentials are provided; otherwise uses the in-memory fallback.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (_client) return _client;

  if (cfg.supabase?.url && cfg.supabase?.serviceKey) {
    _client = createClient(cfg.supabase.url, cfg.supabase.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    logger.info(
      { provider: 'supabase', url: cfg.supabase.url },
      'Supabase client initialised (cloud)'
    );
  } else {
    _client = createInMemorySupabaseClient();
    logger.info(
      { provider: 'in-memory' },
      'Supabase client initialised (in-memory offline fallback)'
    );
  }

  return _client;
}

/**
 * Execute a Supabase query and throw ExternalServiceError on failure.
 * Centralises error handling so call sites stay clean.
 *
 * @template T
 * @param {Promise<{ data: T | null; error: import('@supabase/supabase-js').PostgrestError | null }>} queryPromise
 * @returns {Promise<T>}
 * @throws {ExternalServiceError}
 */
export async function supaQuery(queryPromise) {
  const { data, error } = await queryPromise;
  if (error) {
    throw new ExternalServiceError(`Supabase query failed: ${error.message}`, error);
  }
  return /** @type {T} */ (data);
}

/**
 * Set custom client for tests.
 * @param {any} client
 */
export function _setClientForTests(client) {
  _client = client;
}

/**
 * Reset the singleton and memory DB (for use in tests only).
 * @returns {void}
 */
export function _resetClientForTests() {
  _isTestMode = true;
  _client = null;
  for (const k of Object.keys(_memoryDb)) {
    _memoryDb[k] = [];
  }
}

/**
 * Access the in-memory data store for testing assertions.
 */
export function _getMemoryDb() {
  return _memoryDb;
}
