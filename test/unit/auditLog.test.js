/**
 * @file test/unit/auditLog.test.js
 * Unit tests for hash-chained audit log and chain integrity verifier (tampering test M7).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AuditLog } from '../../backend/src/log/auditLog.js';
import { verifyAuditChain } from '../../backend/src/log/chainVerifier.js';

describe('Crypto & Audit - Hash-Chained Audit Log & Verifier', () => {
  let log;

  beforeEach(() => {
    log = new AuditLog(); // in-memory
  });

  it('initialises genesis block with 64 zeros as prevHash', async () => {
    const block0 = await log.append({ action: 'system_boot' });
    assert.equal(block0.index, 0);
    assert.equal(block0.prevHash, '0'.repeat(64));
    assert.ok(block0.hash);
  });

  it('links sequential blocks where prevHash equals previous block hash', async () => {
    const b0 = await log.append({ action: 'create_baseline' });
    const b1 = await log.append({ action: 'incident_detected' });
    const b2 = await log.append({ action: 'account_frozen' });

    assert.equal(b1.prevHash, b0.hash);
    assert.equal(b2.prevHash, b1.hash);

    const report = verifyAuditChain(log.getEntries());
    assert.equal(report.valid, true);
    assert.equal(report.totalEntries, 3);
    assert.equal(report.headHash, b2.hash);
  });

  it('M7 Tampering Test: detects altered block payload and reports broken index', async () => {
    await log.append({ event: 'event_0', data: 'alpha' });
    await log.append({ event: 'event_1', data: 'beta' });
    await log.append({ event: 'event_2', data: 'gamma' });

    const entries = log.getEntries();

    // Adversary tampers with block 1 payload
    entries[1].data = { event: 'event_1', data: 'MALICIOUS_TAMPERED_CONTENT' };

    const report = verifyAuditChain(entries);
    assert.equal(report.valid, false);
    assert.equal(report.brokenIndex, 1);
    assert.ok(report.reason.includes('Tampering detected at block #1'));
  });

  it('M7 Tampering Test: detects broken link if adversary modifies a hash', async () => {
    await log.append({ step: 1 });
    await log.append({ step: 2 });
    await log.append({ step: 3 });

    const entries = log.getEntries();
    // Corrupt block 1's prevHash
    entries[1].prevHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const report = verifyAuditChain(entries);
    assert.equal(report.valid, false);
    assert.equal(report.brokenIndex, 1);
  });
});
