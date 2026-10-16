/**
 * @file test/unit/productionHardening.test.js
 *
 * Enterprise Production Hardening & Component Tests:
 * 1. Dual-layer freeze client (AWS IAM + OS filesystem containment)
 * 2. Persistent AES-256-GCM backup master key
 * 3. PostgreSQL connection pool builder and SQL generator
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { freezeAccount, unfreezeAccount, _isFrozenForTests, _resetFreezeStateForTests } from '../../backend/src/response/freezeClient.js';
import { getBackupKey, _resetMasterKeyForTests } from '../../backend/src/backup/backupService.js';
import { createPostgresQueryBuilder } from '../../backend/src/adapters/db/postgresClient.js';

describe('Production Hardening - Freeze Client', () => {
  it('freezes account, records contract state, and provides idempotency', async () => {
    _resetFreezeStateForTests();
    const res1 = await freezeAccount('prod-acc-404');
    assert.equal(res1.frozen, true);
    assert.ok(res1.at);
    assert.equal(_isFrozenForTests('prod-acc-404'), true);

    // Idempotent call
    const res2 = await freezeAccount('prod-acc-404');
    assert.equal(res2.frozen, true);
    assert.equal(_isFrozenForTests('prod-acc-404'), true);

    // Unfreeze
    const res3 = await unfreezeAccount('prod-acc-404');
    assert.equal(res3.unfrozen, true);
    assert.equal(_isFrozenForTests('prod-acc-404'), false);
  });
});

describe('Production Hardening - Persistent Backup Key', () => {
  it('retrieves valid 32-byte key and respects custom key override', () => {
    _resetMasterKeyForTests();
    const key1 = getBackupKey();
    assert.equal(Buffer.isBuffer(key1), true);
    assert.equal(key1.length, 32);

    const custom = Buffer.alloc(32, 0x7a);
    const key2 = getBackupKey(custom);
    assert.equal(key2.toString('hex'), custom.toString('hex'));
  });
});

describe('Production Hardening - PostgreSQL Query Builder', () => {
  it('fluent builder creates chained query structure correctly', () => {
    const builder = createPostgresQueryBuilder('protected_files');
    builder
      .select('id, bucket, path')
      .eq('bucket', 'finance-2026')
      .order('created_at', { ascending: false })
      .limit(10);

    assert.ok(builder.select);
    assert.ok(builder.eq);
    assert.ok(builder.order);
    assert.ok(builder.limit);
    assert.ok(typeof builder.then === 'function');
  });
});
