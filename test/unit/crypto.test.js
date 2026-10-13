/**
 * @file test/unit/crypto.test.js
 * Unit tests for Ed25519 digital signatures and canonical JSON serialization.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  signRecordEd25519,
  verifyRecordEd25519,
  generateEd25519KeyPair,
  canonicalJson,
  _resetKeysForTests,
} from '../../src/crypto/ed25519.js';

describe('Crypto - Ed25519 Digital Signatures', () => {
  beforeEach(() => {
    _resetKeysForTests();
  });

  it('generates a valid Ed25519 key pair with keyId', () => {
    const keys = generateEd25519KeyPair();
    assert.ok(keys.publicKey);
    assert.ok(keys.privateKey);
    assert.ok(keys.keyId.startsWith('key-'));
  });

  it('produces deterministic canonical JSON regardless of key insertion order', () => {
    const objA = { z: 1, a: 2, m: { y: 'test', b: 'nested' } };
    const objB = { a: 2, m: { b: 'nested', y: 'test' }, z: 1 };
    assert.equal(canonicalJson(objA), canonicalJson(objB));
  });

  it('signs and verifies an incident record successfully', () => {
    const record = {
      incidentId: 'inc-12345',
      accountId: 'victim-cloud-acc',
      affectedPaths: ['docs/contract.pdf', 'data/db.sqlite'],
      detectedAt: '2026-10-14T00:00:00.000Z',
    };

    const { signature, keyId } = signRecordEd25519(record);
    assert.ok(signature);
    assert.ok(keyId);

    const isValid = verifyRecordEd25519(record, signature);
    assert.equal(isValid, true);
  });

  it('rejects signature if record content was tampered with', () => {
    const record = {
      incidentId: 'inc-999',
      verdict: 'ransomware',
      affectedCount: 40,
    };

    const { signature } = signRecordEd25519(record);

    // Tamper with record
    const tampered = { ...record, affectedCount: 0 };
    const isValid = verifyRecordEd25519(tampered, signature);
    assert.equal(isValid, false, 'Tampered record must fail signature check');
  });

  it('rejects signature if verified with a different public key', () => {
    const record = { message: 'Signed with Key 1' };
    const keys1 = generateEd25519KeyPair();
    const keys2 = generateEd25519KeyPair();

    const { signature } = signRecordEd25519(record, keys1.privateKey, keys1.keyId);

    const validWithOwnKey = verifyRecordEd25519(record, signature, keys1.publicKey);
    assert.equal(validWithOwnKey, true);

    const validWithWrongKey = verifyRecordEd25519(record, signature, keys2.publicKey);
    assert.equal(validWithWrongKey, false, 'Wrong public key must fail verification');
  });
});
