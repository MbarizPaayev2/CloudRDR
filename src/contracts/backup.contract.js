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
 *   - Throw ExternalServiceError if the backup is unreachable or missing.
 *
 * STUB BEHAVIOUR
 * ---------------
 * - Returns the current live file content from the local storage adapter.
 * - Always sets aeadVerified: true (no real decryption).
 * - If the file does not exist in storage, returns { bytes: null, aeadVerified: false }.
 * ===========================================================================
 */

import logger from '../utils/logger.js';
import { getStorageAdapter } from '../adapters/storage/index.js';
import { NotFoundError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// restoreFile
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} RestoreResult
 * @property {Buffer | null} bytes        - Decrypted file bytes, or null if missing.
 * @property {boolean}       aeadVerified - Whether the AEAD tag was valid.
 */

/**
 * Restore a file from encrypted backup.
 *
 * CONTRACT (real implementation must match):
 *   - Decrypt and AEAD-verify before returning bytes.
 *   - Never return unverified plaintext with aeadVerified: true.
 *   - Return { bytes: null, aeadVerified: false } when the backup is missing.
 *   - Throw ExternalServiceError for infrastructure failures.
 *
 * @param {string} bucket      Storage bucket name.
 * @param {string} path        Object path within the bucket.
 * @param {string} [versionRef] Backup version reference (e.g. snapshot ID, timestamp).
 * @returns {Promise<RestoreResult>}
 */
export async function restoreFile(bucket, path, versionRef) {
  // STUB — reads from the live local storage adapter instead of a real backup.
  // Replace with real AES-256-GCM decryption + AEAD verification.
  logger.warn(
    { bucket, path, versionRef },
    'backup.restoreFile: using STUB — reading live file, no real decryption'
  );

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
