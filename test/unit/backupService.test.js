/**
 * @file test/unit/backupService.test.js
 * Unit tests for AES-256-GCM authenticated encryption and backup store.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptDataGCM,
  decryptDataGCM,
  EncryptedBackupStore,
} from '../../backend/src/backup/backupService.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('Crypto & Backup - AES-256-GCM Authenticated Encryption', () => {
  const secretData = Buffer.from('Confidential Payroll Spreadsheet: Alice=$120k, Bob=$110k');
  const metadata = { bucket: 'finance-bucket', path: 'payroll.xlsx', versionRef: 'v1' };

  it('successfully encrypts and decrypts with AEAD verification', () => {
    const encrypted = encryptDataGCM(secretData, metadata);
    assert.ok(encrypted.length > secretData.length);

    const { bytes, aeadVerified } = decryptDataGCM(encrypted, metadata);
    assert.equal(aeadVerified, true);
    assert.deepEqual(bytes, secretData);
  });

  it('fails AEAD verification when ciphertext bytes are corrupted', () => {
    const encrypted = encryptDataGCM(secretData, metadata);

    // Tamper with ciphertext at the very end
    encrypted[encrypted.length - 1] ^= 0xff;

    const { bytes, aeadVerified } = decryptDataGCM(encrypted, metadata);
    assert.equal(aeadVerified, false, 'AEAD verification must fail on corrupted ciphertext');
    assert.equal(bytes, null, 'Plaintext must not be released on AEAD failure');
  });

  it('fails AEAD verification when authentication tag is tampered with', () => {
    const encrypted = encryptDataGCM(secretData, metadata);

    // Tag is located between index 20 and 36 (Magic=8, IV=12, Tag=16)
    encrypted[25] ^= 0x55;

    const { bytes, aeadVerified } = decryptDataGCM(encrypted, metadata);
    assert.equal(aeadVerified, false);
    assert.equal(bytes, null);
  });

  it('fails AEAD verification when metadata AAD (bucket/path) is tampered with', () => {
    const encrypted = encryptDataGCM(secretData, metadata);

    // Attacker tries to decrypt with a different bucket or path
    const wrongMetadata = { bucket: 'attacker-bucket', path: 'payroll.xlsx', versionRef: 'v1' };

    const { bytes, aeadVerified } = decryptDataGCM(encrypted, wrongMetadata);
    assert.equal(aeadVerified, false, 'AAD mismatch must cause AEAD authentication failure');
    assert.equal(bytes, null);
  });
});

describe('Crypto & Backup - EncryptedBackupStore File Operations', () => {
  let tmpDir;
  let store;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudrdr-backup-test-'));
    store = new EncryptedBackupStore(tmpDir);
  });

  it('stores and restores encrypted backup files on disk', async () => {
    const content = 'Pre-attack protected file content';
    await store.backupFile('vault', 'docs/spec.txt', content, 'snap-1');

    const { bytes, aeadVerified } = await store.restoreFile('vault', 'docs/spec.txt', 'snap-1');
    assert.equal(aeadVerified, true);
    assert.equal(bytes.toString(), content);
  });

  it('returns missing when file does not exist in store', async () => {
    const { bytes, aeadVerified } = await store.restoreFile('vault', 'nonexistent.txt');
    assert.equal(aeadVerified, false);
    assert.equal(bytes, null);
  });
});
