/**
 * @file test/integration/attackCycle.test.js
 * Integration test:
 * Seeds files with local adapter, modifies 40% -> ransomware verdict,
 * incident created, freeze stub called, restore results all VALID.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { LocalFsStorage } from '../../src/adapters/storage/localFsStorage.js';
import { _setAdapterForTests } from '../../src/adapters/storage/index.js';
import { _resetClientForTests } from '../../src/adapters/db/supabaseClient.js';
import {
  _resetFreezeStateForTests,
  _isFrozenForTests,
} from '../../src/contracts/freeze.contract.js';
import { _resetBackupStoreForTests } from '../../src/contracts/backup.contract.js';
import { createBaseline } from '../../src/baseline/baselineService.js';
import { MonitorAgent } from '../../src/monitor/monitorAgent.js';
import { startRestore, getRestoreJob } from '../../src/restore/restoreService.js';
import { listIncidents } from '../../src/response/incidentService.js';

describe('Integration - Full Attack, Detection, Freeze, and Restore Cycle', () => {
  let tmpDir;
  let storage;
  const bucket = 'integration-bucket';
  const accountId = 'victim-account-1';

  beforeEach(async () => {
    _resetClientForTests();
    _resetFreezeStateForTests();
    _resetBackupStoreForTests();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudrdr-integration-'));
    storage = new LocalFsStorage(tmpDir);
    _setAdapterForTests(storage);
  });

  it('runs complete lifecycle: seed 100 files, attack 40 files, detect, freeze, restore 100% VALID', async () => {
    // 1. Seed 100 files (100 protected documents)
    for (let i = 1; i <= 100; i++) {
      await storage.write(
        bucket,
        `documents/doc_${i}.txt`,
        `Original document content for file #${i}`
      );
    }

    // 2. Capture initial baseline
    const baseline = await createBaseline(bucket);
    assert.equal(baseline.fileCount, 100);
    assert.equal(baseline.version, 1);
    assert.ok(baseline.merkleRoot);

    // 3. Initialise Monitor Agent and seed initial state
    const monitor = new MonitorAgent({
      bucket,
      accountId,
      intervalSeconds: 60,
    });
    await monitor.runCycle();

    // 4. SIMULATE RANSOMWARE ATTACK: Encrypt / modify 40 files (40% > 30% ransomware threshold)
    for (let i = 1; i <= 40; i++) {
      await storage.write(
        bucket,
        `documents/doc_${i}.txt`,
        `[LOCKED BY RANSOMWARE] File #${i} is encrypted! Pay 0.5 BTC.`
      );
    }

    // 5. Run monitor cycle to detect attack
    const changeEvents = await monitor.runCycle();
    assert.equal(changeEvents.length, 40);

    // Allow setImmediate async response queue to execute
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 6. Verify Freeze was called
    assert.equal(_isFrozenForTests(accountId), true, 'Account should be frozen');

    // 7. Verify Incident created
    const incidents = await listIncidents({ accountId });
    assert.ok(incidents.length > 0, 'Incident should be created');
    const incident = incidents[0];
    assert.equal(incident.status, 'frozen');
    assert.equal(incident.affected_paths.length, 40);
    assert.ok(incident.record_signature, 'Incident should be digitally signed');
    assert.ok(incident.signing_key_id);

    // 8. Execute Verified Restore
    const restoreReport = await startRestore(incident.id);
    assert.equal(restoreReport.totalFiles, 40);
    assert.equal(restoreReport.validFiles, 40);
    assert.equal(restoreReport.modifiedFiles, 0);
    assert.equal(restoreReport.missingFiles, 0);
    assert.equal(restoreReport.isFullyRestored, true);
    assert.equal(restoreReport.status, 'verified');

    // 9. Verify restore job status in DB
    const jobRecord = await getRestoreJob(restoreReport.jobId);
    assert.equal(jobRecord.status, 'verified');
    assert.equal(jobRecord.valid_files, 40);

    // 10. Verify actual files on disk have been restored back to their original content
    const restoredDoc1 = (await storage.read(bucket, 'documents/doc_1.txt')).toString();
    assert.equal(restoredDoc1, 'Original document content for file #1');
    const restoredDoc40 = (await storage.read(bucket, 'documents/doc_40.txt')).toString();
    assert.equal(restoredDoc40, 'Original document content for file #40');
  });
});
