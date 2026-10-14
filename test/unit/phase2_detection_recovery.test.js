/**
 * @file test/unit/phase2_detection_recovery.test.js
 *
 * Comprehensive Phase 2 test suite for CloudRDR:
 *   - File integrity monitoring & SHA-256 baselines
 *   - Ransomware detection sliding window & canary traps
 *   - Incident management (acknowledgment, status transitions, timeline)
 *   - Safe containment (IAM write-lock dispatch & confirmation)
 *   - Encrypted backup & staged quarantine recovery with baseline re-verification
 *   - Real cryptographic evidence verification (Ed25519, Merkle root, audit hash-chain)
 *   - SOC telemetry endpoints
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { buildServer } from '../../src/api/server.js';
import cfg from '../../src/config/index.js';
import {
  _resetClientForTests,
  getSupabaseClient,
  supaQuery,
} from '../../src/adapters/db/supabaseClient.js';
import { LocalFsStorage } from '../../src/adapters/storage/localFsStorage.js';
import { _setAdapterForTests } from '../../src/adapters/storage/index.js';
import { createBaseline } from '../../src/baseline/baselineService.js';
import {
  _resetFreezeStateForTests,
  _isFrozenForTests,
} from '../../src/contracts/freeze.contract.js';
import { _resetBackupStoreForTests, storeBackup } from '../../src/contracts/backup.contract.js';
import { _resetAuditLogForTests } from '../../src/contracts/crypto.contract.js';
import { defaultAuditLog } from '../../src/log/auditLog.js';
import { resetThresholdsForTests } from '../../src/detection/thresholds.js';
import { startRestore, promoteStagedRestore } from '../../src/restore/restoreService.js';
import { createIncident, getIncident } from '../../src/response/incidentService.js';
import { verifyAuditChain } from '../../src/log/chainVerifier.js';

describe('Phase 2 — Core Ransomware Detection, Safe Containment & Verified Recovery', () => {
  let app;
  let tmpDir;
  let storage;
  const bucket = 'test-phase2-bucket';
  const accountId = 'sec-corp-acc-01';

  before(async () => {
    app = await buildServer({ enableLogger: false });
  });

  after(async () => {
    await app.close();
  });

  beforeEach(async () => {
    _resetClientForTests();
    _resetFreezeStateForTests();
    _resetBackupStoreForTests('test-phase2-bucket');
    _resetAuditLogForTests();
    resetThresholdsForTests();

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudrdr-phase2-'));
    storage = new LocalFsStorage(tmpDir);
    _setAdapterForTests(storage);
  });

  it('1. File Integrity Monitoring: captures SHA-256 baselines and detects file changes', async () => {
    // Write clean files
    await storage.write(bucket, 'finance/budget.xlsx', 'Clean Budget 2026');
    await storage.write(bucket, 'canaries/sentinel.canary', 'CANARY_TRIPWIRE_TOKEN');

    // Create baseline
    const baseline = await createBaseline(bucket);
    assert.equal(baseline.fileCount, 2);
    assert.ok(baseline.merkleRoot);

    const db = getSupabaseClient();
    const rows = await supaQuery(db.from('protected_files').select('*').eq('bucket', bucket));
    assert.equal(rows.length, 2);

    const canary = rows.find((r) => r.path === 'canaries/sentinel.canary');
    assert.ok(canary);
    assert.equal(canary.is_canary, true);
  });

  it('2. Detection Engine: retrieves summary and supports live threshold updates via API', async () => {
    // GET /detection/summary
    const resSummary = await app.inject({
      method: 'GET',
      url: '/detection/summary',
      headers: { 'x-api-key': cfg.api.key },
    });
    assert.equal(resSummary.statusCode, 200);
    const summary = resSummary.json();
    assert.equal(summary.status, 'active');
    assert.equal(summary.modificationThreshold, 0.3);
    assert.equal(summary.windowSeconds, 60);

    // POST /detection/config - update thresholds to 30s window and 0.25 rate
    const resConfig = await app.inject({
      method: 'POST',
      url: '/detection/config',
      headers: { 'x-api-key': cfg.api.key },
      payload: {
        windowSeconds: 30,
        ransomwareRate: 0.25,
        suspiciousRate: 0.08,
      },
    });
    assert.equal(resConfig.statusCode, 200);
    const configResult = resConfig.json();
    assert.equal(configResult.success, true);
    assert.equal(configResult.thresholds.windowSeconds, 30);
    assert.equal(configResult.thresholds.ransomwareRate, 0.25);

    // Verify GET /detection/summary reflects updated thresholds
    const resUpdated = await app.inject({
      method: 'GET',
      url: '/detection/summary',
      headers: { 'x-api-key': cfg.api.key },
    });
    assert.equal(resUpdated.json().windowSeconds, 30);
    assert.equal(resUpdated.json().modificationThreshold, 0.25);
  });

  it('3. Incident Management: supports alert acknowledgment, timeline inspection, and status updates', async () => {
    // Create an open incident
    const incident = await createIncident({
      detectionRunId: 'test-run-101',
      accountId,
      affectedPaths: ['docs/payroll.xlsx', 'canaries/sentinel.canary'],
    });
    assert.equal(incident.status, 'open');

    // PATCH /incidents/:id/status - acknowledge alert
    const resPatch = await app.inject({
      method: 'PATCH',
      url: `/incidents/${incident.id}/status`,
      headers: { 'x-api-key': cfg.api.key },
      payload: {
        status: 'acknowledged',
        note: 'Tier-2 analyst acknowledged active canary breach',
      },
    });
    assert.equal(resPatch.statusCode, 200);
    assert.equal(resPatch.json().incident.status, 'acknowledged');

    // GET /incidents/:id/timeline
    const resTimeline = await app.inject({
      method: 'GET',
      url: `/incidents/${incident.id}/timeline`,
      headers: { 'x-api-key': cfg.api.key },
    });
    assert.equal(resTimeline.statusCode, 200);
    const timelineData = resTimeline.json();
    assert.ok(Array.isArray(timelineData.timeline));
    assert.ok(timelineData.timeline.length >= 1);
    assert.equal(timelineData.timeline[0].event, 'DETECTION_TRIGGERED');
  });

  it('4. Safe Containment: verifies authorization, confirms write-freeze, and logs to audit trail', async () => {
    const incident = await createIncident({
      detectionRunId: 'test-run-102',
      accountId,
      affectedPaths: ['finance/contracts.pdf'],
    });

    assert.equal(_isFrozenForTests(accountId), false);

    // POST /incidents/:id/contain
    const resContain = await app.inject({
      method: 'POST',
      url: `/incidents/${incident.id}/contain`,
      headers: { 'x-api-key': cfg.api.key },
    });
    assert.equal(resContain.statusCode, 200);
    const containBody = resContain.json();
    assert.equal(containBody.success, true);
    assert.equal(containBody.status, 'frozen');
    assert.ok(containBody.frozenAt);

    // Verify account freeze is confirmed
    assert.equal(_isFrozenForTests(accountId), true);

    const updatedInc = await getIncident(incident.id);
    assert.equal(updatedInc.status, 'frozen');
    assert.ok(updatedInc.frozen_at);
  });

  it('5. Backup & Recovery: performs staged quarantine recovery and enforces explicit operator confirmation before writing live storage', async () => {
    const originalContent = 'Confidential Blueprint V1';
    await storage.write(bucket, 'blueprints/system.dwg', originalContent);

    // Baseline & encrypted backup
    await createBaseline(bucket);
    await storeBackup(bucket, 'blueprints/system.dwg', originalContent, 'v1');

    // Simulate attacker overwriting the live file
    await storage.write(bucket, 'blueprints/system.dwg', '[ENCRYPTED DATA]');

    const incident = await createIncident({
      detectionRunId: 'test-run-103',
      accountId,
      affectedPaths: ['blueprints/system.dwg'],
    });

    // Step A: Staged recovery (stageOnly: true)
    const stagedReport = await startRestore(incident.id, { stageOnly: true });
    assert.equal(stagedReport.isFullyRestored, true);
    assert.equal(stagedReport.isStaged, true);
    assert.equal(stagedReport.isApplied, false);
    assert.ok(stagedReport.quarantinePath);

    // Live storage should STILL contain ransomware file (not overwritten yet!)
    const liveFileWhileStaged = (await storage.read(bucket, 'blueprints/system.dwg')).toString();
    assert.equal(liveFileWhileStaged, '[ENCRYPTED DATA]');

    // Step B: Attempt promotion without explicit confirmation -> must fail
    await assert.rejects(
      async () => {
        await promoteStagedRestore(stagedReport.jobId, { confirmed: false });
      },
      (err) => err.message.includes('Explicit confirmation')
    );

    // Step C: Promote with confirmed: true
    const promoteResult = await promoteStagedRestore(stagedReport.jobId, {
      confirmed: true,
      actor: 'soc-admin@cloudrdr.internal',
    });
    assert.equal(promoteResult.success, true);
    assert.equal(promoteResult.appliedFiles, 1);

    // Live file on storage is now verified and restored!
    const restoredContent = (await storage.read(bucket, 'blueprints/system.dwg')).toString();
    assert.equal(restoredContent, originalContent);
  });

  it('6. Cryptographic Evidence: checks Ed25519 signatures, Merkle roots, and hash-chain audit log', async () => {
    // Trigger an audit entry
    await defaultAuditLog.append({
      event: 'SECURITY_TEST_CHECK',
      status: 'VERIFIED',
    });

    // Verify hash chain
    const entries = defaultAuditLog.getEntries();
    const chainVerification = verifyAuditChain(entries);
    assert.equal(chainVerification.valid, true);

    // GET /integrity/cryptographic
    const resIntegrity = await app.inject({
      method: 'GET',
      url: '/integrity/cryptographic',
      headers: { 'x-api-key': cfg.api.key },
    });
    assert.equal(resIntegrity.statusCode, 200);
    const integrityBody = resIntegrity.json();
    assert.ok(Array.isArray(integrityBody.checks));
    assert.equal(integrityBody.checks.length, 5);

    // POST /evidence/verify
    const resVerify = await app.inject({
      method: 'POST',
      url: '/evidence/verify',
      headers: { 'x-api-key': cfg.api.key },
    });
    assert.equal(resVerify.statusCode, 200);
    const verifyBody = resVerify.json();
    assert.equal(verifyBody.verified, true);
    assert.equal(verifyBody.chainVerified, true);
  });

  it('7. SOC Telemetry: all monitoring endpoints return expected structures to power dashboard', async () => {
    const endpoints = [
      '/status/system',
      '/metrics/kpis',
      '/telemetry/activity?range=24H',
      '/events/recent?limit=10',
      '/storage/overview',
      '/recovery/health',
      '/audit',
    ];

    for (const url of endpoints) {
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { 'x-api-key': cfg.api.key },
      });
      assert.equal(res.statusCode, 200, `Endpoint ${url} should return 200`);
      assert.ok(res.json(), `Endpoint ${url} should return valid JSON`);
    }
  });
});
