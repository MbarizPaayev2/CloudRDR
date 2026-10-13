/**
 * @file src/adapters/db/supabaseClient.js
 *
 * Singleton Supabase client using the SERVICE-ROLE key.
 * The service role bypasses RLS — NEVER expose this client or its key
 * to the browser, frontend, or any non-server environment.
 *
 * Usage:
 *   import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
 *   const db = getSupabaseClient();
 *   const rows = await supaQuery(db.from('protected_files').select('*'));
 */

import { createClient } from '@supabase/supabase-js';
import cfg from '../../config/index.js';
import logger from '../../utils/logger.js';
import { ExternalServiceError } from '../../utils/errors.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let _client = null;

/**
 * Return the shared Supabase client instance.
 * Lazily initialised on first call.
 * Throws ExternalServiceError if credentials are missing.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (_client) return _client;

  if (!cfg.supabase.url || !cfg.supabase.serviceKey) {
    throw new ExternalServiceError(
      'Supabase credentials are not configured. ' +
        'Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.'
    );
  }

  _client = createClient(cfg.supabase.url, cfg.supabase.serviceKey, {
    auth: {
      // Service role tokens do not expire; disable refresh and session storage
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  logger.info({ provider: 'supabase', url: cfg.supabase.url }, 'Supabase client initialised');
  return _client;
}

/**
 * Execute a Supabase query and throw ExternalServiceError on failure.
 * Centralises error handling so call sites stay clean.
 *
 * @example
 *   const rows = await supaQuery(
 *     getSupabaseClient().from('protected_files').select('*')
 *   );
 *
 * @template T
 * @param {Promise<{ data: T | null; error: import('@supabase/supabase-js').PostgrestError | null }>} queryPromise
 * @returns {Promise<T>}
 * @throws {ExternalServiceError}
 */
export async function supaQuery(queryPromise) {
  const { data, error } = await queryPromise;
  if (error) {
    throw new ExternalServiceError(
      `Supabase query failed: ${error.message}`,
      error
    );
  }
  // data can be null on empty result sets (e.g. .single() with no rows)
  // callers must handle null if they use .single()
  return /** @type {T} */ (data);
}

/**
 * Reset the singleton (for use in tests only).
 * Calling this in production code is a bug.
 * @returns {void}
 */
export function _resetClientForTests() {
  _client = null;
}
