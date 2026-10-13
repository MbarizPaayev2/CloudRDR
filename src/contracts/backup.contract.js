/**
 * @file src/contracts/backup.contract.js
 *
 * CONTRACT — Backup module interface
 * ===========================================================================
 * Swapped to production AES-256-GCM Authenticated Encryption & Decryption.
 *
 * Features:
 *   - 256-bit AES authenticated encryption with random 96-bit IV
 *   - 128-bit AEAD authentication tag validation
 *   - AAD validation binding bucket + path + version
 * ===========================================================================
 */

import {
  defaultBackupStore,
  encryptDataGCM,
  decryptDataGCM,
  getBackupKey,
} from '../backup/backupService.js';

let _customBackupProvider = null;

/**
 * Store an encrypted AES-256-GCM backup copy.
 * @param {string} bucket
 * @param {string} path
 * @param {Buffer | string} data
 * @param {string} [versionRef='v1']
 */
export async function storeBackup(bucket, path, data, versionRef = 'v1') {
  return defaultBackupStore.backupFile(bucket, path, data, versionRef);
}

/**
 * Restore and decrypt a file from encrypted backup with AEAD tag validation.
 *
 * @param {string} bucket
 * @param {string} path
 * @param {string} [versionRef='v1']
 * @returns {Promise<{ bytes: Buffer | null, aeadVerified: boolean }>}
 */
export async function restoreFile(bucket, path, versionRef = 'v1') {
  if (_customBackupProvider) {
    return _customBackupProvider(bucket, path, versionRef);
  }

  return defaultBackupStore.restoreFile(bucket, path, versionRef);
}

export { encryptDataGCM, decryptDataGCM, getBackupKey };

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
  defaultBackupStore.clear();
  _customBackupProvider = null;
}
