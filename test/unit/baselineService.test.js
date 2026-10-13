/**
 * @file test/unit/baselineService.test.js
 * Unit tests for baseline service.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createBaseline, getBaseline } from '../../src/baseline/baselineService.js';
import { _resetClientForTests } from '../../src/adapters/db/supabaseClient.js';
import { _setAdapterForTests } from '../../src/adapters/storage/index.js';
import { LocalFsStorage } from '../../src/adapters/storage/localFsStorage.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('baselineService', () => {
  let tmpDir;
  let storage;
  const bucket = 'test-bucket';

  beforeEach(async () => {
    _resetClientForTests();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudrdr-test-'));
    storage = new LocalFsStorage(tmpDir);
    _setAdapterForTests(storage);
  });

  it('creates a baseline snapshot for empty bucket', async () => {
    const result = await createBaseline(bucket);
    assert.equal(result.bucket, bucket);
    assert.equal(result.version, 1);
    assert.equal(result.fileCount, 0);
    assert.ok(result.merkleRoot);

    const baseline = await getBaseline(bucket);
    assert.equal(baseline.version, 1);
    assert.equal(baseline.files.length, 0);
  });

  it('creates baseline and correctly tags canary files and computes hashes', async () => {
    await storage.write(bucket, 'docs/report.txt', 'Hello World');
    await storage.write(bucket, 'canaries/trap.canary', 'Canary Secret');

    const result = await createBaseline(bucket);
    assert.equal(result.version, 1);
    assert.equal(result.fileCount, 2);
    assert.ok(result.merkleRoot);

    const baseline = await getBaseline(bucket);
    assert.equal(baseline.files.length, 2);

    const reportFile = baseline.files.find((f) => f.path === 'docs/report.txt');
    const canaryFile = baseline.files.find((f) => f.path === 'canaries/trap.canary');

    assert.ok(reportFile);
    assert.equal(reportFile.is_canary, false);
    assert.equal(reportFile.size_bytes, 11);
    assert.ok(reportFile.baseline_sha256);

    assert.ok(canaryFile);
    assert.equal(canaryFile.is_canary, true);
    assert.ok(canaryFile.baseline_sha256);
  });

  it('increments version monotonically when re-baselined (idempotency)', async () => {
    await storage.write(bucket, 'file1.txt', 'Content 1');

    const v1 = await createBaseline(bucket);
    assert.equal(v1.version, 1);

    await storage.write(bucket, 'file2.txt', 'Content 2');
    const v2 = await createBaseline(bucket);
    assert.equal(v2.version, 2);
    assert.equal(v2.fileCount, 2);

    const current = await getBaseline(bucket);
    assert.equal(current.version, 2);
    assert.equal(current.files.length, 2);
  });
});
