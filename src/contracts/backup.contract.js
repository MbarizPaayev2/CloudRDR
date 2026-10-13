/**
 * @file src/contracts/backup.contract.js
 *
 * CONTRACT — Backup module interface
 * ===========================================================================
 * This file defines what the Crypto developer must implement for the encrypted
 * backup/restore layer (AES-256-GCM with AEAD tag verification).
 *
 * HOW TO SWAP IN THE REAL MODULE
 * --------------------------------
 * In src/restore/restoreService.js, change the one import:
 *       import * as backup from '../contracts/backup.contract.js';
 *    becomes:
 *       import * as backup from '../backup/index.js';
 *
 * REAL IMPLEMENTATION REQUIREMENTS
 * ----------------------------------
 * restoreFile(bucket, path, versionRef):
 *   - Fetch the encrypted backup identified by (bucket, path, versionRef).
 *   - Decrypt using AES-256-GCM with the key from the secrets vault.
 *   - Verify the AEAD authentication tag BEFORE returning any plaintext bytes.
 *   - Return { bytes: Buffer, aeadVerified: true } on success.
 *   - Return { bytes: Buffer, aeadVerified: false } if the tag check fails
 *     (caller will treat the file as MODIFIED and will NOT write it back).
 *   - Return { bytes: null, aeadVerified: false } when the backup is missing.
 *
 * STUB BEHAVIOUR
 * ---------------
 * - Stores copies in an in-memory backup cache (`_backupStore`).
 * - If not in cache, attempts reading from storage adapter as a fallback.
 * - Supports `_setBackupProviderForTests` to simulate AEAD failure, corrupted bytes, or missing files.
 * ===========================================================================
 */

import logger from '../utils/logger.js';
import { getStorageAdapter } from '../adapters/storage/index.js';
import { NotFoundError } from '../utils/errors.js';

/** In-memory backup store for stub */
const _backupStore = new Map();

/** Custom test provider hook */
let _customBackupProvider = null;

/**
 * Store an encrypted backup representation for testing and stub use.
 * @param {string} bucket
 * @param {string} path
 * @param {Buffer | string} data
 */
export function storeBackup(bucket, path, data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  _backupStore.set(`${bucket}:${path}`, buf);
}

/**
 * Restore a file from encrypted backup.
 *
 * @param {string} bucket      Storage bucket name.
 * @param {string} path        Object path within the bucket.
 * @param {string} [versionRef] Backup version reference.
 * @returns {Promise<{ bytes: Buffer | null, aeadVerified: boolean }>}
 */
export async function restoreFile(bucket, path, versionRef = null) {
  if (_customBackupProvider) {
    return _customBackupProvider(bucket, path, versionRef);
  }

  const key = `${bucket}:${path}`;
  if (_backupStore.has(key)) {
    logger.debug({ bucket, path }, 'backup.restoreFile: retrieved from stub backup store');
    return {
      bytes: _backupStore.get(key),
      aeadVerified: true,
    };
  }

  // Fallback: read live storage if not yet in backup store
  try {
    const adapter = await getStorageAdapter();
    const bytes = await adapter.read(bucket, path);
    return { bytes, aeadVerified: true };
  } catch (err) {
    if (err instanceof NotFoundError) {
      return { bytes: null, aeadVerified: false };
    }
    throw err;
  }
}

/**
 * Set custom handler for tests (e.g. simulate corrupted bytes, AEAD invalid, or missing).
 * @param {Function | null} fn
 */
export function _setBackupProviderForTests(fn) {
  _customBackupProvider = fn;
}

/**
 * Clear test backup store.
 */
export function _resetBackupStoreForTests() {
  _backupStore.clear();
  _customBackupProvider = null;
}
