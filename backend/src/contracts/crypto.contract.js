/**
 * @file src/contracts/crypto.contract.js
 *
 * CONTRACT — Crypto module interface
 * ===========================================================================
 * Swapped to production Cryptography implementations:
 *   - Real SHA-256 streaming & Buffer hashing
 *   - Pairwise SHA-256 Merkle root computation
 *   - RFC 8032 Ed25519 digital signature signing & verification
 *   - Hash-chained audit logging with tamper-evident links
 * ===========================================================================
 */

import {
  hashStream as realHashStream,
  hashBuffer as realHashBuffer,
  merkleRoot as realMerkleRoot,
  signRecord as realSignRecord,
  verifyRecord as realVerifyRecord,
  generateEd25519KeyPair,
} from '../crypto/index.js';
import { defaultAuditLog, AuditLog } from '../log/auditLog.js';
import { verifyAuditChain } from '../log/chainVerifier.js';

export const hashStream = realHashStream;
export const hashBuffer = realHashBuffer;
export const merkleRoot = realMerkleRoot;
export const signRecord = realSignRecord;
export const verifyRecord = realVerifyRecord;
export { generateEd25519KeyPair, verifyAuditChain, AuditLog };

/**
 * Append an entry to the hash-chained audit log.
 * @param {unknown} entry
 * @returns {Promise<{ index: number, hash: string, prevHash: string }>}
 */
export async function appendAuditLog(entry) {
  const block = await defaultAuditLog.append(entry);
  return {
    index: block.index,
    hash: block.hash,
    prevHash: block.prevHash,
  };
}

/**
 * Retrieve full in-memory audit log entries for testing/verification.
 */
export function _getAuditLogForTests() {
  return defaultAuditLog.getEntries();
}

/**
 * Reset audit log (for tests).
 */
export function _resetAuditLogForTests() {
  defaultAuditLog.clear();
}
