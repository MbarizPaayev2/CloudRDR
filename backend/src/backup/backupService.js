/**
 * @file src/backup/backupService.js
 *
 * AES-256-GCM Authenticated Encryption Backup Service for CloudRDR.
 * Owned by Crypto developer (Nigar Əliyeva).
 *
 * Features:
 *   - AES-256-GCM with 96-bit (12-byte) random nonce/IV per file
 *   - 128-bit (16-byte) AEAD authentication tag
 *   - Additional Authenticated Data (AAD) binding (bucket + path + versionRef)
 *   - Tamper-proofing: any modification to ciphertext, tag, or metadata
 *     causes AEAD verification failure before plaintext is released.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import logger from '../utils/logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag
const MAGIC_HEADER = Buffer.from('CRDR-GCM1'); // Magic format identifier

/** In-memory / derived backup encryption master key */
let _activeMasterKey = null;

/**
 * Get or initialise the AES-256 backup master key.
 * @param {string | Buffer} [customKey]
 * @returns {Buffer} 32-byte (256-bit) key
 */
export function getBackupKey(customKey = null) {
  if (customKey) {
    const buf = Buffer.isBuffer(customKey) ? customKey : Buffer.from(customKey, 'hex');
    if (buf.length !== 32) {
      throw new Error('Backup encryption key must be 32 bytes (256 bits)');
    }
    _activeMasterKey = buf;
    return _activeMasterKey;
  }

  if (!_activeMasterKey) {
    const envKey = process.env.BACKUP_ENCRYPTION_KEY;
    if (envKey && envKey.length === 64) {
      _activeMasterKey = Buffer.from(envKey, 'hex');
    } else {
      const isTest = process.env.NODE_ENV === 'test';
      const keyFilePath = path.resolve(process.cwd(), 'data', '.master-key.key');

      if (!isTest && fsSync.existsSync(keyFilePath)) {
        try {
          const raw = fsSync.readFileSync(keyFilePath, 'utf8').trim();
          if (raw.length === 64) {
            _activeMasterKey = Buffer.from(raw, 'hex');
            logger.info('backupService: loaded persistent master key from data/.master-key.key');
          }
        } catch {
          // fallback
        }
      }

      if (!_activeMasterKey) {
        _activeMasterKey = crypto.randomBytes(32);
        if (!isTest) {
          try {
            const dataDir = path.resolve(process.cwd(), 'data');
            if (!fsSync.existsSync(dataDir)) {
              fsSync.mkdirSync(dataDir, { recursive: true });
            }
            fsSync.writeFileSync(keyFilePath, _activeMasterKey.toString('hex'), { mode: 0o600 });
            logger.info('backupService: created and saved persistent master key to data/.master-key.key');
          } catch {
            logger.info('backupService: generated session master key for AES-256-GCM');
          }
        } else {
          logger.info('backupService: generated session master key for AES-256-GCM');
        }
      }
    }
  }

  return _activeMasterKey;
}

/**
 * Reset master key for tests.
 */
export function _resetMasterKeyForTests() {
  _activeMasterKey = null;
}

/**
 * Encrypt file data with AES-256-GCM.
 *
 * Output format:
 *   [ MAGIC (8 bytes) | IV (12 bytes) | TAG (16 bytes) | CIPHERTEXT ]
 *
 * @param {Buffer | string} plaintext
 * @param {Object} [metadata] Additional Authenticated Data (AAD)
 * @param {string} [metadata.bucket='']
 * @param {string} [metadata.path='']
 * @param {string} [metadata.versionRef='']
 * @param {Buffer} [keyOverride]
 * @returns {Buffer} The serialized encrypted package
 */
export function encryptDataGCM(plaintext, metadata = {}, keyOverride = null) {
  const key = keyOverride || getBackupKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const dataBuf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Bind metadata (bucket:path:versionRef) as Additional Authenticated Data
  const aadString = `${metadata.bucket || ''}:${metadata.path || ''}:${metadata.versionRef || ''}`;
  cipher.setAAD(Buffer.from(aadString, 'utf8'));

  const ciphertext = Buffer.concat([cipher.update(dataBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Package: Header + IV + Tag + Ciphertext
  return Buffer.concat([MAGIC_HEADER, iv, tag, ciphertext]);
}

/**
 * Decrypt file data and verify AEAD authentication tag.
 *
 * @param {Buffer} encryptedPackage
 * @param {Object} [metadata] Additional Authenticated Data (AAD)
 * @param {string} [metadata.bucket='']
 * @param {string} [metadata.path='']
 * @param {string} [metadata.versionRef='']
 * @param {Buffer} [keyOverride]
 * @returns {{ bytes: Buffer | null, aeadVerified: boolean }}
 */
export function decryptDataGCM(encryptedPackage, metadata = {}, keyOverride = null) {
  if (!encryptedPackage || encryptedPackage.length < MAGIC_HEADER.length + IV_LENGTH + TAG_LENGTH) {
    return { bytes: null, aeadVerified: false };
  }

  // Verify magic header
  const header = encryptedPackage.subarray(0, MAGIC_HEADER.length);
  if (!header.equals(MAGIC_HEADER)) {
    logger.warn('backupService: unrecognized backup file format');
    return { bytes: null, aeadVerified: false };
  }

  const offsetIv = MAGIC_HEADER.length;
  const offsetTag = offsetIv + IV_LENGTH;
  const offsetCiphertext = offsetTag + TAG_LENGTH;

  const iv = encryptedPackage.subarray(offsetIv, offsetTag);
  const tag = encryptedPackage.subarray(offsetTag, offsetCiphertext);
  const ciphertext = encryptedPackage.subarray(offsetCiphertext);

  const key = keyOverride || getBackupKey();

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const aadString = `${metadata.bucket || ''}:${metadata.path || ''}:${metadata.versionRef || ''}`;
    decipher.setAAD(Buffer.from(aadString, 'utf8'));
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return {
      bytes: plaintext,
      aeadVerified: true,
    };
  } catch (err) {
    // AEAD authentication failure (tag mismatch, corrupted ciphertext, or tampered AAD)
    logger.error({ err: err.message }, 'backupService: AEAD authentication verification FAILED');
    return {
      bytes: null,
      aeadVerified: false,
    };
  }
}

/**
 * File-backed encrypted backup manager.
 */
export class EncryptedBackupStore {
  /**
   * @param {string} [baseDir='./data/encrypted-backups']
   */
  constructor(baseDir = './data/encrypted-backups') {
    this.baseDir = path.resolve(baseDir);
  }

  _resolvePath(bucket, objectPath) {
    return path.join(this.baseDir, bucket, objectPath + '.enc');
  }

  /**
   * Encrypt and store a backup file.
   * @param {string} bucket
   * @param {string} objectPath
   * @param {Buffer | string} data
   * @param {string} [versionRef='v1']
   */
  async backupFile(bucket, objectPath, data, versionRef = 'v1') {
    const encrypted = encryptDataGCM(data, { bucket, path: objectPath, versionRef });
    const target = this._resolvePath(bucket, objectPath);

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, encrypted);

    logger.debug(
      { bucket, path: objectPath },
      'backupService: file encrypted and saved to backup store'
    );
    return { path: target, size: encrypted.length };
  }

  /**
   * Read and decrypt a backup file with AEAD authentication.
   * @param {string} bucket
   * @param {string} objectPath
   * @param {string} [versionRef='v1']
   * @returns {Promise<{ bytes: Buffer | null, aeadVerified: boolean }>}
   */
  async restoreFile(bucket, objectPath, versionRef = 'v1') {
    const target = this._resolvePath(bucket, objectPath);

    if (!fsSync.existsSync(target)) {
      return { bytes: null, aeadVerified: false };
    }

    const encrypted = await fs.readFile(target);
    return decryptDataGCM(encrypted, { bucket, path: objectPath, versionRef });
  }

  /**
   * Clear backup files (optionally for a specific bucket).
   * @param {string} [bucket]
   */
  clear(bucket = null) {
    try {
      if (bucket) {
        const target = path.join(this.baseDir, bucket);
        if (fsSync.existsSync(target)) {
          fsSync.rmSync(target, { recursive: true, force: true });
        }
      } else {
        fsSync.rmSync(this.baseDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
}

/** Global default encrypted backup store */
export const defaultBackupStore = new EncryptedBackupStore();
