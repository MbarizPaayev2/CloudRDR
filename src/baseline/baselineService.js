/**
 * @file src/baseline/baselineService.js
 *
 * Baseline service for CloudRDR.
 * Computes SHA-256 baselines of protected files in storage, builds Merkle trees,
 * tracks versioning, and persists snapshots to Postgres.
 */

import { getStorageAdapter } from '../adapters/storage/index.js';
import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import * as crypto from '../contracts/crypto.contract.js';
import { isCanaryPath } from '../detection/canary.js';
import logger from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Create a new baseline snapshot for a given bucket.
 * Streams each file through SHA-256 hashing without buffering whole files in memory.
 * Idempotent: each run creates a new version without duplicating existing version rows.
 *
 * @param {string} bucket Storage bucket name.
 * @param {Object} [options]
 * @param {string} [options.createdBy='cloudrdr-agent'] Identity creating the snapshot.
 * @returns {Promise<{ bucket: string, version: number, fileCount: number, merkleRoot: string, snapshotId: string }>}
 */
export async function createBaseline(bucket, options = {}) {
  const createdBy = options.createdBy || 'cloudrdr-agent';
  const adapter = await getStorageAdapter();
  const db = getSupabaseClient();

  logger.info({ bucket }, 'baselineService: starting baseline capture');

  // 1. List all files in the bucket
  const fileEntries = await adapter.list(bucket);

  // 2. Determine next baseline version
  const existingFiles = await supaQuery(
    db.from('protected_files')
      .select('baseline_version')
      .eq('bucket', bucket)
      .order('baseline_version', { ascending: false })
      .limit(1)
  );

  const currentVersion = existingFiles && existingFiles.length > 0
    ? existingFiles[0].baseline_version
    : 0;
  const nextVersion = currentVersion + 1;

  // 3. Stream-hash each file
  // Sort files deterministically by path for consistent Merkle root calculation
  const sortedEntries = [...fileEntries].sort((a, b) => a.path.localeCompare(b.path));
  const fileRows = [];
  const leafHashes = [];

  for (const entry of sortedEntries) {
    try {
      const stream = await adapter.readStream(bucket, entry.path);
      const sha256 = await crypto.hashStream(stream);
      const isCanary = isCanaryPath(entry.path);

      leafHashes.push(sha256);
      fileRows.push({
        bucket,
        path: entry.path,
        size_bytes: entry.size,
        baseline_sha256: sha256,
        baseline_version: nextVersion,
        is_canary: isCanary,
      });
    } catch (err) {
      logger.error({ bucket, path: entry.path, err: err.message }, 'baselineService: failed to hash file');
      throw err;
    }
  }

  // 4. Compute Merkle root over ordered leaf hashes
  const rootHash = crypto.merkleRoot(leafHashes);

  // 5. Insert rows into protected_files
  if (fileRows.length > 0) {
    await supaQuery(db.from('protected_files').insert(fileRows));
  }

  // 6. Insert snapshot into baseline_snapshots
  const [snapshot] = await supaQuery(
    db.from('baseline_snapshots').insert({
      bucket,
      merkle_root: rootHash,
      file_count: fileRows.length,
      created_by: createdBy,
    })
  );

  logger.info(
    { bucket, version: nextVersion, fileCount: fileRows.length, merkleRoot: rootHash },
    'baselineService: baseline created successfully'
  );

  return {
    bucket,
    version: nextVersion,
    fileCount: fileRows.length,
    merkleRoot: rootHash,
    snapshotId: snapshot?.id || null,
  };
}

/**
 * Retrieve the current/latest baseline snapshot and protected file records for a bucket.
 *
 * @param {string} bucket Storage bucket name.
 * @returns {Promise<{ snapshot: Object, version: number, files: Array<Object> }>}
 */
export async function getBaseline(bucket) {
  const db = getSupabaseClient();

  const snapshots = await supaQuery(
    db.from('baseline_snapshots')
      .select('*')
      .eq('bucket', bucket)
      .order('created_at', { ascending: false })
      .limit(1)
  );

  if (!snapshots || snapshots.length === 0) {
    throw new NotFoundError(`No baseline snapshot found for bucket: ${bucket}`);
  }

  const latestSnapshot = snapshots[0];

  // Find latest version from protected_files
  const versionRow = await supaQuery(
    db.from('protected_files')
      .select('baseline_version')
      .eq('bucket', bucket)
      .order('baseline_version', { ascending: false })
      .limit(1)
  );

  const version = versionRow?.[0]?.baseline_version ?? 1;

  const files = await supaQuery(
    db.from('protected_files')
      .select('*')
      .eq('bucket', bucket)
      .eq('baseline_version', version)
      .order('path', { ascending: true })
  );

  return {
    snapshot: latestSnapshot,
    version,
    files: files || [],
  };
}
