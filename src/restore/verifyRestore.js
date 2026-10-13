/**
 * @file src/restore/verifyRestore.js
 *
 * Verification logic for restored file payloads.
 * Evaluates AEAD authentication tags and SHA-256 baseline equality.
 */

import * as crypto from '../contracts/crypto.contract.js';

/**
 * Verify restored file bytes against expected baseline criteria.
 *
 * Outcome states:
 *   - 'MISSING': Backup returned no bytes.
 *   - 'MODIFIED': AEAD tag verification failed OR restored SHA-256 != expected SHA-256.
 *   - 'VALID': AEAD tag verified AND restored SHA-256 == expected SHA-256.
 *
 * @param {Object} params
 * @param {Buffer | null} params.restoredBytes
 * @param {boolean} params.aeadVerified
 * @param {string} params.expectedSha256
 * @returns {{ result: 'VALID'|'MODIFIED'|'MISSING', restoredSha256: string }}
 */
export function verifyFileBytes({ restoredBytes, aeadVerified, expectedSha256 }) {
  if (!restoredBytes) {
    return {
      result: 'MISSING',
      restoredSha256: '',
    };
  }

  const restoredSha256 = crypto.hashBuffer(restoredBytes);

  // If AEAD authentication tag failed, file is considered tampered/corrupted
  if (!aeadVerified) {
    return {
      result: 'MODIFIED',
      restoredSha256,
    };
  }

  if (restoredSha256 !== expectedSha256) {
    return {
      result: 'MODIFIED',
      restoredSha256,
    };
  }

  return {
    result: 'VALID',
    restoredSha256,
  };
}
