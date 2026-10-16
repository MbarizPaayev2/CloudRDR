/**
 * @file test/unit/responseService.test.js
 * Unit tests for freeze retries, escalation, and response orchestration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { freezeWithRetry } from '../../backend/src/response/responseService.js';
import * as freeze from '../../backend/src/contracts/freeze.contract.js';

describe('Response - Freeze retries and escalation', () => {
  beforeEach(() => {
    freeze._resetFreezeStateForTests();
  });

  it('successfully freezes account on first attempt', async () => {
    const res = await freezeWithRetry('acc-1', 3);
    assert.equal(res.success, true);
    assert.ok(res.frozenAt);
    assert.equal(freeze._isFrozenForTests('acc-1'), true);
  });

  it('is idempotent when freezing an already frozen account', async () => {
    const res1 = await freezeWithRetry('acc-2', 3);
    assert.equal(res1.success, true);
    const res2 = await freezeWithRetry('acc-2', 3);
    assert.equal(res2.success, true);
  });
});
