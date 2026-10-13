/**
 * @file src/contracts/crypto.contract.js
 *
 * CONTRACT — Crypto module interface
 * ===========================================================================
 * This file defines EXACTLY what the Crypto developer must implement.
 * It also ships working STUB implementations using Node.js built-ins so the
 * full pipeline runs end-to-end today without the real crypto module.
 *
 * HOW TO SWAP IN THE REAL MODULE
 * --------------------------------
 * 1. The Crypto dev creates their module (e.g. src/crypto/index.js) that
 *    exports the same four functions with the same signatures.
 * 2. Change the ONE import line in every consumer:
 *       import * as crypto from '../contracts/crypto.contract.js';
 *    becomes:
 *       import * as crypto from '../crypto/index.js';
 *    OR re-export from this file:
 *       export { hashStream, merkleRoot, signRecord, verifyRecord, appendAuditLog }
 *       from '../crypto/index.js';
 *    Nothing else changes.
 *
 * STUB BEHAVIOUR
 * ---------------
 * - hashStream : real SHA-256 via node:crypto (accurate stub)
 * - merkleRoot : real pairwise SHA-256 Merkle tree (accurate stub)
 * - signRecord : fake Ed25519 — returns a deterministic hex string derived
 *                from the record. NOT cryptographically secure.
 * - verifyRecord: always returns true (stub)
 * - appendAuditLog: in-memory hash-chained log (resets on restart)
 *
 * All stubs are marked with // STUB so the Crypto dev can find them quickly.
 * ===========================================================================
 */

import crypto from 'node:crypto';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// hashStream
// ---------------------------------------------------------------------------

/**
 * Compute the SHA-256 hash of a readable stream WITHOUT loading it fully
 * into memory. The stream is consumed exactly once.
 *
 * CONTRACT (real implementation must match):
 *   - Accept any Node.js Readable stream.
 *   - Return a Promise that resolves to a 64-char lowercase hex string.
 *   - Never buffer the entire file in memory.
 *   - Reject the promise on stream error.
 *
 * @param {import('node:stream').Readable} stream  Source data stream.
 * @returns {Promise<string>}  64-char lowercase hex SHA-256 digest.
 */
export function hashStream(stream) {
  // STUB — uses real SHA-256, so this stub IS the correct implementation.
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Compute the SHA-256 hash of a Buffer directly.
 * Convenience wrapper used when data is already in memory.
 *
 * @param {Buffer} buf
 * @returns {string}  64-char lowercase hex SHA-256 digest.
 */
export function hashBuffer(buf) {
  // STUB — real SHA-256.
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ---------------------------------------------------------------------------
// merkleRoot
// ---------------------------------------------------------------------------

/**
 * Compute the Merkle root of an ordered list of hex SHA-256 leaf hashes.
 *
 * CONTRACT (real implementation must match):
 *   - Input: string[] of 64-char hex hashes (the file baseline_sha256 values,
 *     sorted deterministically — e.g. lexicographically by file path).
 *   - Output: a single 64-char hex string (the Merkle root).
 *   - An empty array must return the SHA-256 of an empty string:
 *       e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
 *   - A single leaf must return that leaf unchanged.
 *   - Use pairwise SHA-256(left || right); duplicate the last node when the
 *     list has odd length (standard Bitcoin-style Merkle tree).
 *
 * @param {string[]} hashes  Ordered leaf hashes.
 * @returns {string}         64-char hex Merkle root.
 */
export function merkleRoot(hashes) {
  // STUB — real pairwise SHA-256 Merkle tree.
  if (hashes.length === 0) {
    return crypto.createHash('sha256').update('').digest('hex');
  }

  let layer = [...hashes];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i]; // duplicate last if odd
      next.push(
        crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex')
      );
    }
    layer = next;
  }
  return layer[0];
}

// ---------------------------------------------------------------------------
// signRecord / verifyRecord
// ---------------------------------------------------------------------------

/**
 * Sign an incident record JSON object.
 *
 * CONTRACT (real implementation must match):
 *   - Input: a plain JS object (the incident record).
 *   - Output: { signature: string, keyId: string }
 *     where `signature` is a hex-encoded Ed25519 signature over the canonical
 *     JSON representation of `record`, and `keyId` identifies the signing key.
 *   - The signing key must be stored securely (HSM or secrets vault).
 *   - Signing must be deterministic: same record + same key = same signature.
 *
 * @param {Record<string, unknown>} record  Incident record object.
 * @returns {{ signature: string, keyId: string }}
 */
export function signRecord(record) {
  // STUB — NOT cryptographically secure. Replace with real Ed25519.
  const json = JSON.stringify(record, Object.keys(record).sort());
  const signature = crypto.createHash('sha256').update('stub-key:' + json).digest('hex');
  logger.warn({ keyId: 'stub-v0' }, 'crypto.signRecord: using STUB signature — not secure');
  return { signature, keyId: 'stub-v0' };
}

/**
 * Verify a signed incident record.
 *
 * CONTRACT (real implementation must match):
 *   - Input: the record object and the hex signature string.
 *   - Output: boolean — true if the signature is valid, false otherwise.
 *   - Must use constant-time comparison to prevent timing attacks.
 *
 * @param {Record<string, unknown>} record
 * @param {string} signature  Hex-encoded signature to verify.
 * @returns {boolean}
 */
export function verifyRecord(record, signature) {
  // STUB — always true. Replace with real Ed25519 verify.
  const { signature: expected } = signRecord(record);
  // Use timingSafeEqual to avoid timing attacks even in the stub.
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// appendAuditLog
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AuditLogEntry
 * @property {number} index     - Sequential index of this entry (0-based).
 * @property {string} hash      - SHA-256 of (prevHash || JSON(entry)).
 * @property {string} prevHash  - Hash of the previous entry ('0'.repeat(64) for index 0).
 * @property {unknown} data     - The payload that was logged.
 * @property {string} timestamp - ISO-8601 UTC timestamp.
 */

/** @type {AuditLogEntry[]} */
const _auditLog = []; // STUB — in-memory only; resets on restart.

/**
 * Append an entry to the hash-chained audit log.
 *
 * CONTRACT (real implementation must match):
 *   - Input: any serialisable object (the log entry payload).
 *   - Output: { index, hash, prevHash } — the metadata for the appended entry.
 *   - Each entry's hash must cover the previous entry's hash, creating a
 *     tamper-evident chain. Verifying the chain = re-computing each hash.
 *   - Must be persistent (e.g. append-only DB table or immutable object store).
 *   - Must be atomic — no two concurrent calls may get the same index.
 *
 * @param {unknown} entry  Log entry payload (will be JSON-serialised).
 * @returns {{ index: number, hash: string, prevHash: string }}
 */
export function appendAuditLog(entry) {
  // STUB — in-memory, non-persistent. Replace with real hash-chained store.
  const index = _auditLog.length;
  const prevHash =
    index === 0 ? '0'.repeat(64) : _auditLog[index - 1].hash;
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ index, prevHash, timestamp, data: entry });
  const hash = crypto.createHash('sha256').update(payload).digest('hex');

  _auditLog.push({ index, hash, prevHash, data: entry, timestamp });
  logger.debug({ index, hash: hash.slice(0, 16) + '...' }, 'audit-log: entry appended (STUB)');
  return { index, hash, prevHash };
}

/**
 * Return a copy of the full in-memory audit log (for testing/debug only).
 * @returns {AuditLogEntry[]}
 */
export function _getAuditLogForTests() {
  return [..._auditLog];
}
