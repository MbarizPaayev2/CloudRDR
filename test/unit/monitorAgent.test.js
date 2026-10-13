/**
 * @file test/unit/monitorAgent.test.js
 * Unit tests for monitor agent and event source resilience.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PollingEventSource } from '../../src/monitor/eventSource.js';
import { MonitorAgent } from '../../src/monitor/monitorAgent.js';
import { LocalFsStorage } from '../../src/adapters/storage/localFsStorage.js';
import { _resetClientForTests } from '../../src/adapters/db/supabaseClient.js';
import { _setAdapterForTests } from '../../src/adapters/storage/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('Monitor - EventSource and Resilience', () => {
  let tmpDir;
  let storage;
  const bucket = 'monitored-bucket';

  beforeEach(async () => {
    _resetClientForTests();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudrdr-monitor-test-'));
    storage = new LocalFsStorage(tmpDir);
    _setAdapterForTests(storage);
  });

  it('detects created, modified, and deleted events across poll cycles', async () => {
    const eventSource = new PollingEventSource(storage, bucket, 'test-acc');

    // First cycle seeds baseline
    await storage.write(bucket, 'file1.txt', 'v1');
    const firstEvents = await eventSource.poll();
    assert.equal(firstEvents.length, 0); // initial seeding run emits no change

    // Modify file1 and create file2
    await storage.write(bucket, 'file1.txt', 'v2-modified');
    await storage.write(bucket, 'file2.txt', 'new-file');
    const secondEvents = await eventSource.poll();

    assert.equal(secondEvents.length, 2);
    const mod = secondEvents.find((e) => e.path === 'file1.txt');
    const created = secondEvents.find((e) => e.path === 'file2.txt');
    assert.equal(mod.event_type, 'modified');
    assert.equal(created.event_type, 'created');

    // Delete file2
    const absPath = path.join(tmpDir, bucket, 'file2.txt');
    await fs.unlink(absPath);
    const thirdEvents = await eventSource.poll();
    assert.equal(thirdEvents.length, 1);
    assert.equal(thirdEvents[0].path, 'file2.txt');
    assert.equal(thirdEvents[0].event_type, 'deleted');
  });

  it('does not crash monitor cycle on a single failing / unreadable file', async () => {
    // Inject a storage adapter where reading a specific file throws
    const flakyStorage = {
      ...storage,
      list: (b, p) => storage.list(b, p),
      readStream: async (b, p) => {
        if (p === 'broken.txt') {
          throw new Error('EACCES: permission denied');
        }
        return storage.readStream(b, p);
      },
    };
    _setAdapterForTests(flakyStorage);

    await storage.write(bucket, 'good.txt', 'Fine');
    await storage.write(bucket, 'broken.txt', 'Broken');

    const agent = new MonitorAgent({
      bucket,
      accountId: 'test-acc',
      intervalSeconds: 60,
    });

    // Seed first run
    await agent.runCycle();

    // Now update both files
    await storage.write(bucket, 'good.txt', 'Fine Updated');
    await storage.write(bucket, 'broken.txt', 'Broken Updated');

    // runCycle should complete gracefully without throwing
    const processed = await agent.runCycle();
    assert.ok(Array.isArray(processed));
    assert.equal(processed.length, 2);
    const brokenEvt = processed.find((e) => e.path === 'broken.txt');
    assert.ok(brokenEvt);
    assert.equal(brokenEvt.observed_sha256, null); // Gracefully skipped
  });
});
