/**
 * @file test/unit/verifyRestore.test.js
 * Unit tests for verifyFileBytes and restore verification.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyFileBytes } from '../../src/restore/verifyRestore.js';
import * as crypto from '../../src/contracts/crypto.contract.js';

describe('verifyRestore - Pure verification', () => {
  const content = Buffer.from('Original Protected Document Content');
  const expectedSha256 = crypto.hashBuffer(content);

  it('marks VALID when bytes match expected SHA-256 and AEAD tag verified', () => {
    const outcome = verifyFileBytes({
      restoredBytes: content,
      aeadVerified: true,
      expectedSha256,
    });
    assert.equal(outcome.result, 'VALID');
    assert.equal(outcome.restoredSha256, expectedSha256);
  });

  it('marks MODIFIED when content differs from baseline', () => {
    const tampered = Buffer.from('Corrupted or Encrypted Bytes');
    const outcome = verifyFileBytes({
      restoredBytes: tampered,
      aeadVerified: true,
      expectedSha256,
    });
    assert.equal(outcome.result, 'MODIFIED');
    assert.notEqual(outcome.restoredSha256, expectedSha256);
  });

  it('marks MODIFIED when AEAD authentication verification fails even if bytes match', () => {
    const outcome = verifyFileBytes({
      restoredBytes: content,
      aeadVerified: false, // Tag check failed!
      expectedSha256,
    });
    assert.equal(outcome.result, 'MODIFIED');
  });

  it('marks MISSING when restoredBytes is null or empty', () => {
    const outcome = verifyFileBytes({
      restoredBytes: null,
      aeadVerified: false,
      expectedSha256,
    });
    assert.equal(outcome.result, 'MISSING');
    assert.equal(outcome.restoredSha256, '');
  });
});
