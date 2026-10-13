/**
 * @file src/crypto/ed25519.js
 *
 * Ed25519 Digital Signature implementation for CloudRDR.
 * Uses Node.js native crypto module for RFC 8032 compliant Ed25519 signatures.
 * Provides key generation, deterministic canonical JSON signing,
 * and constant-time signature verification.
 */

import crypto from 'node:crypto';
import logger from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

/** In-memory keystore / active key pair */
let _activeKeyPair = null;

/**
 * Generate a new Ed25519 key pair in PKCS#8 / SPKI DER format.
 * @returns {{ publicKey: string, privateKey: string, keyId: string }}
 */
export function generateEd25519KeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });

  // Key ID is the first 16 hex chars of the public key's SHA-256
  const keyId = 'key-' + crypto.createHash('sha256').update(pubDer).digest('hex').slice(0, 16);

  return {
    publicKey: pubDer.toString('hex'),
    privateKey: privDer.toString('hex'),
    keyId,
  };
}

/**
 * Initialise or load the active signing key.
 * If not already initialised, generates and registers an in-memory key pair.
 * @param {{ publicKey?: string, privateKey?: string, keyId?: string }} [keys]
 * @returns {{ publicKey: string, privateKey: string, keyId: string }}
 */
export function initSigningKey(keys = null) {
  if (keys && keys.privateKey && keys.publicKey) {
    const keyId =
      keys.keyId ||
      'key-' +
        crypto
          .createHash('sha256')
          .update(Buffer.from(keys.publicKey, 'hex'))
          .digest('hex')
          .slice(0, 16);
    _activeKeyPair = {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      keyId,
    };
  } else if (!_activeKeyPair) {
    _activeKeyPair = generateEd25519KeyPair();
    logger.info({ keyId: _activeKeyPair.keyId }, 'ed25519: generated active signing key pair');
  }
  return _activeKeyPair;
}

/**
 * Produce a canonical (RFC 8785 style) deterministic JSON representation of an object.
 * Keys are sorted recursively to guarantee signature reproducibility.
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalJson(v)).join(',') + ']';
  }

  const sortedKeys = Object.keys(value).sort();
  const pairs = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Sign an incident record or arbitrary object using the active Ed25519 private key.
 *
 * @param {Record<string, unknown>} record
 * @param {string} [privateKeyHex] Optional private key hex override
 * @param {string} [keyIdOverride]
 * @returns {{ signature: string, keyId: string, canonicalPayload: string }}
 */
export function signRecordEd25519(record, privateKeyHex = null, keyIdOverride = null) {
  if (!record || typeof record !== 'object') {
    throw new ValidationError('Record must be a valid object');
  }

  const keys = initSigningKey();
  const privHex = privateKeyHex || keys.privateKey;
  const keyId = keyIdOverride || keys.keyId;

  const canonical = canonicalJson(record);
  const dataBuf = Buffer.from(canonical, 'utf8');

  const privateKeyObj = crypto.createPrivateKey({
    key: Buffer.from(privHex, 'hex'),
    format: 'der',
    type: 'pkcs8',
  });

  const sigBuf = crypto.sign(null, dataBuf, privateKeyObj);
  const signature = sigBuf.toString('hex');

  logger.debug({ keyId, sigLen: signature.length }, 'ed25519: record signed successfully');

  return {
    signature,
    keyId,
    canonicalPayload: canonical,
  };
}

/**
 * Verify an Ed25519 signature over a record.
 * Uses constant-time comparison to protect against timing side-channel attacks.
 *
 * @param {Record<string, unknown>} record
 * @param {string} signatureHex
 * @param {string} [publicKeyHex]
 * @returns {boolean}
 */
export function verifyRecordEd25519(record, signatureHex, publicKeyHex = null) {
  if (!record || !signatureHex) return false;

  try {
    const keys = initSigningKey();
    const pubHex = publicKeyHex || keys.publicKey;

    const canonical = canonicalJson(record);
    const dataBuf = Buffer.from(canonical, 'utf8');
    const sigBuf = Buffer.from(signatureHex, 'hex');

    const publicKeyObj = crypto.createPublicKey({
      key: Buffer.from(pubHex, 'hex'),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, dataBuf, publicKeyObj, sigBuf);
  } catch (err) {
    logger.warn({ err: err.message }, 'ed25519: verification encountered error');
    return false;
  }
}

/**
 * Reset active key pair (for testing).
 */
export function _resetKeysForTests() {
  _activeKeyPair = null;
}
