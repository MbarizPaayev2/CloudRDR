/**
 * @file test/unit/dashboardData.test.js
 * Unit tests for Dashboard data layer: mockApi, api client, and reactive state.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mockApi } from '../../dashboard/js/mock/mockApi.js';
import { api } from '../../dashboard/js/api.js';
import {
  getState,
  setState,
  subscribe,
  refreshAll,
  selectIncident,
} from '../../dashboard/js/state.js';
import { CONFIG } from '../../dashboard/js/config.js';

describe('Dashboard Data Layer - Mock API & State Store', () => {
  it('mockApi provides complete baseline, runs, incidents, and audit log', async () => {
    const health = await mockApi.getHealth();
    assert.equal(health.status, 'ok');
    assert.ok(health.uptime > 0);

    const baseline = await mockApi.getBaseline('protected');
    assert.equal(baseline.bucket, 'protected');
    assert.equal(baseline.merkle_root.length, 64);
    assert.ok(baseline.file_count > 0);

    const runs = await mockApi.getDetectionRuns();
    assert.ok(runs.length >= 5);
    const spikeRun = runs.find((r) => r.verdict === 'ransomware');
    assert.ok(spikeRun, 'Mock data must contain a ransomware spike run');
    assert.equal(spikeRun.canary_triggered, true);

    const incidents = await mockApi.getIncidents();
    assert.ok(incidents.length >= 2);
    const activeInc = incidents.find((i) => i.status === 'frozen');
    assert.ok(activeInc);
    assert.ok(activeInc.affected_paths.length >= 5);
    assert.ok(activeInc.record_signature);

    const restoreReport = await mockApi.restoreIncident(activeInc.id);
    assert.equal(restoreReport.isFullyRestored, true);
    assert.equal(restoreReport.validFiles, activeInc.affected_paths.length);
    assert.equal(restoreReport.modifiedFiles, 0);

    const auditLog = await mockApi.getAuditLog();
    assert.ok(auditLog.length >= 5);
    assert.equal(auditLog[0].prevHash, '0'.repeat(64), 'Genesis block prevHash must be 64 zeros');
  });

  it('api delegates to mockApi when CONFIG.USE_MOCK is true', async () => {
    CONFIG.USE_MOCK = true;
    const health = await api.getHealth();
    assert.equal(health.status, 'ok');

    const incidents = await api.getIncidents();
    assert.ok(Array.isArray(incidents));
    assert.ok(incidents.length >= 2);
  });

  it('state store notifies subscribers and refreshAll populates state', async () => {
    let notified = false;
    let receivedState = null;

    const unsubscribe = subscribe((s) => {
      notified = true;
      receivedState = s;
    });

    assert.ok(notified);
    assert.ok(receivedState);

    // Test setState
    setState({ currentVerdict: 'suspicious' });
    assert.equal(getState().currentVerdict, 'suspicious');

    // Test refreshAll
    await refreshAll();
    const refreshed = getState();
    assert.equal(refreshed.health.status, 'ok');
    assert.ok(refreshed.detectionRuns.length > 0);
    assert.ok(refreshed.incidents.length > 0);
    assert.ok(refreshed.selectedIncidentId);
    assert.ok(refreshed.lastUpdated);

    // Test selectIncident
    const targetId = refreshed.incidents[0].id;
    await selectIncident(targetId);
    assert.equal(getState().selectedIncidentId, targetId);
    assert.equal(getState().selectedIncident.id, targetId);

    unsubscribe();
  });
});
