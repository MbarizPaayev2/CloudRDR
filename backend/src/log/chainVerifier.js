/**
 * @file src/log/chainVerifier.js
 *
 * Chain integrity verification module for CloudRDR.
 * Proves tamper-evidence by validating all links and block hashes from genesis to head.
 */

import { AuditLog } from './auditLog.js';
import logger from '../utils/logger.js';

const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * @typedef {Object} VerificationReport
 * @property {boolean} valid
 * @property {number} totalEntries
 * @property {number | null} brokenIndex
 * @property {string | null} reason
 * @property {string | null} headHash
 */

/**
 * Verify the cryptographic integrity of an audit log entry sequence.
 *
 * Checks:
 *   1. Sequential 0-indexed ordering.
 *   2. Genesis block has prevHash = 64 zeros.
 *   3. Every subsequent block has prevHash == entries[i - 1].hash.
 *   4. Recomputed block hash == stored hash.
 *
 * @param {Array<import('./auditLog.js').AuditBlock>} entries
 * @returns {VerificationReport}
 */
export function verifyAuditChain(entries) {
  if (!entries || entries.length === 0) {
    return {
      valid: true,
      totalEntries: 0,
      brokenIndex: null,
      reason: null,
      headHash: null,
    };
  }

  for (let i = 0; i < entries.length; i++) {
    const block = entries[i];

    // Check sequential index
    if (block.index !== i) {
      logger.error(
        { expected: i, got: block.index },
        'chainVerifier: non-sequential block index detected'
      );
      return {
        valid: false,
        totalEntries: entries.length,
        brokenIndex: i,
        reason: `Block index mismatch at position ${i} (got ${block.index})`,
        headHash: null,
      };
    }

    // Check previous hash link
    const expectedPrev = i === 0 ? GENESIS_PREV_HASH : entries[i - 1].hash;
    if (block.prevHash !== expectedPrev) {
      logger.error(
        { index: i, expectedPrev, gotPrev: block.prevHash },
        'chainVerifier: broken prevHash link detected'
      );
      return {
        valid: false,
        totalEntries: entries.length,
        brokenIndex: i,
        reason: `Broken chain link at block #${i}: prevHash does not match previous block hash`,
        headHash: null,
      };
    }

    // Recompute block hash
    const recomputed = AuditLog.computeBlockHash(
      block.index,
      block.prevHash,
      block.timestamp,
      block.data
    );

    if (recomputed !== block.hash) {
      logger.error(
        { index: i, expectedHash: block.hash, recomputed },
        'chainVerifier: tampered block content detected'
      );
      return {
        valid: false,
        totalEntries: entries.length,
        brokenIndex: i,
        reason: `Tampering detected at block #${i}: payload hash mismatch`,
        headHash: null,
      };
    }
  }

  const headHash = entries[entries.length - 1].hash;
  logger.debug({ totalEntries: entries.length, headHash }, 'chainVerifier: chain verified VALID');

  return {
    valid: true,
    totalEntries: entries.length,
    brokenIndex: null,
    reason: null,
    headHash,
  };
}
