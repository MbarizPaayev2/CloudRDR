/**
 * @file test/unit/alerting.test.js
 * Unit tests for Enterprise Alert Dispatcher.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchIncidentAlert } from '../../backend/src/alerting/alertDispatcher.js';

describe('Enterprise Alerting & SIEM Integration', () => {
  it('dispatches alerts gracefully when no notification URLs are configured', async () => {
    // Should run safely without throwing any exceptions
    await assert.doesNotReject(async () => {
      await dispatchIncidentAlert(
        {
          id: 'inc-test-uuid',
          account_id: 'corp-acc',
          bucket: 'protected',
          status: 'frozen',
          affected_paths: ['docs/contract.pdf'],
        },
        {
          meanEntropy: 7.85,
          canaryTriggered: true,
        }
      );
    });
  });
});
