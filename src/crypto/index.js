/**
 * @file src/crypto/index.js
 *
 * Core Cryptography module for CloudRDR.
 * Owned by Crypto developer (Nigar Əliyeva).
 *
 * Capabilities:
 *   - SHA-256 stream & buffer hashing
 *   - Pairwise Merkle tree calculation
 *   - RFC 8032 Ed25519 digital signatures & canonical JSON serialization
 */

import crypto from 'node:crypto';
import {
  signRecordEd25519,
  verifyRecordEd25519,
  generateEd25519KeyPair,
  initSigningKey,
  canonicalJson,
} from './ed25519.js';

/**
 * Compute the SHA-256 hash of a readable stream without loading into memory.
 * @param {import('node:stream').Readable} stream
 * @returns {Promise<string>} 64-character lowercase hex string
 */
export function hashStream(stream) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Compute the SHA-256 hash of a Buffer or string.
 * @param {Buffer | string} data
 * @returns {string} 64-character lowercase hex string
 */
export function hashBuffer(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Compute the Merkle root of an ordered list of leaf SHA-256 hashes.
 * Pairwise SHA-256(left || right); duplicates last leaf on odd lengths.
 * @param {string[]} hashes
 * @returns {string} 64-character lowercase hex Merkle root
 */
export function merkleRoot(hashes) {
  if (!hashes || hashes.length === 0) {
    return crypto.createHash('sha256').update('').digest('hex');
  }

  let layer = [...hashes];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
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

// Ed25519 signatures
export const signRecord = signRecordEd25519;
export const verifyRecord = verifyRecordEd25519;
export { generateEd25519KeyPair, initSigningKey, canonicalJson };
