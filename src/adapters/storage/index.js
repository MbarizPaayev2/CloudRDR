/**
 * @file src/adapters/storage/index.js
 *
 * StorageAdapter interface definition + factory.
 *
 * All application code (baseline, monitor, restore) depends ONLY on the
 * interface documented here. Never import a concrete adapter directly.
 *
 * ---------------------------------------------------------------------------
 * INTERFACE  StorageAdapter
 * ---------------------------------------------------------------------------
 *
 * @typedef {Object} StorageEntry
 * @property {string}      path       - Object key / relative path within the bucket.
 * @property {number}      size       - Size in bytes.
 * @property {string}      etag       - Content fingerprint (MD5 or opaque string).
 * @property {string}      updatedAt  - ISO-8601 UTC timestamp of last modification.
 *
 * ---------------------------------------------------------------------------
 *
 * @typedef {Object} StorageAdapter
 *
 * @property {(bucket: string, prefix?: string) => Promise<StorageEntry[]>} list
 *   List all objects whose path starts with `prefix` (default: '' = all).
 *   Returns an array of StorageEntry; empty array if bucket is empty.
 *
 * @property {(bucket: string, path: string) => Promise<Buffer>} read
 *   Download the object at `path` and return its full content as a Buffer.
 *   Throws NotFoundError if the object does not exist.
 *
 * @property {(bucket: string, path: string, data: Buffer | string) => Promise<void>} write
 *   Upload `data` to `path` in `bucket`, overwriting if it exists.
 *
 * @property {(bucket: string, path: string) => Promise<boolean>} exists
 *   Return true if the object exists, false otherwise.
 *
 * ---------------------------------------------------------------------------
 *
 * To add a new backend (e.g. MinIO, S3):
 *   1. Create src/adapters/storage/minioStorage.js implementing the four methods.
 *   2. Add a case to the factory below.
 *   3. Set STORAGE_PROVIDER=minio in .env.
 *   No other file needs to change.
 */

import cfg from '../../config/index.js';
import logger from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';

/** @type {StorageAdapter | null} */
let _adapter = null;

/**
 * Return the shared StorageAdapter instance.
 * Lazily initialised on first call based on STORAGE_PROVIDER env var.
 *
 * @returns {Promise<StorageAdapter>}
 * @throws {ValidationError} if STORAGE_PROVIDER is unknown.
 */
export async function getStorageAdapter() {
  if (_adapter) return _adapter;

  const provider = cfg.storage.provider;

  if (provider === 'local') {
    const { LocalFsStorage } = await import('./localFsStorage.js');
    _adapter = new LocalFsStorage(cfg.storage.localPath);
    logger.info({ provider: 'local', root: cfg.storage.localPath }, 'Storage adapter: local filesystem');
  } else if (provider === 'supabase') {
    const { SupabaseStorage } = await import('./supabaseStorage.js');
    _adapter = new SupabaseStorage();
    logger.info({ provider: 'supabase' }, 'Storage adapter: Supabase Storage');
  } else {
    throw new ValidationError(
      `Unknown STORAGE_PROVIDER "${provider}". Valid values: local, supabase.`
    );
  }

  return _adapter;
}

/**
 * Reset the singleton (for use in tests only).
 * @returns {void}
 */
export function _resetAdapterForTests() {
  _adapter = null;
}
