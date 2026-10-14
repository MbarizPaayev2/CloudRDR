/**
 * @file src/restore/restoreService.js
 *
 * Verified restore service for CloudRDR.
 * Restores files from encrypted backups, verifies AEAD authentication tags,
 * tests restored bytes against SHA-256 baselines (VALID / MODIFIED / MISSING),
 * writes verified files back to storage, and closes resolved incidents.
 */

import nodePath from 'node:path';
import fs from 'node:fs/promises';
import { getStorageAdapter } from '../adapters/storage/index.js';
import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import * as backup from '../contracts/backup.contract.js';
import * as crypto from '../contracts/crypto.contract.js';
import { verifyFileBytes } from './verifyRestore.js';
import * as incidentService from '../response/incidentService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { nowISO } from '../utils/time.js';
import logger from '../utils/logger.js';

/**
 * Start and execute a verified restore job for an incident.
 * Decrypts files from AES-256-GCM backup, stages them in an isolated quarantine
 * folder, verifies AEAD tags + SHA-256 baselines, and applies to storage if confirmed.
 *
 * @param {string} incidentId
 * @param {Object} [options={}]
 * @param {boolean} [options.stageOnly=false] When true, stages in quarantine without modifying live storage
 * @param {boolean} [options.applyImmediately=true]
 * @param {string} [options.quarantineDir='./data/quarantine']
 * @returns {Promise<Object>} Restore summary report
 */
export async function startRestore(incidentId, options = {}) {
  const {
    stageOnly = false,
    applyImmediately = true,
    quarantineDir = './data/quarantine',
  } = options;
  const db = getSupabaseClient();
  const storage = await getStorageAdapter();

  // 1. Fetch incident
  const incident = await incidentService.getIncident(incidentId);
  const affectedPaths = incident.affected_paths || [];
  let bucket = incident.record_json?.bucket || incident.bucket;
  if (!bucket && affectedPaths.length > 0) {
    const match = await supaQuery(
      db.from('protected_files').select('bucket').eq('path', affectedPaths[0]).limit(1)
    );
    if (match?.[0]?.bucket) {
      bucket = match[0].bucket;
    }
  }
  bucket = bucket || 'protected';

  if (affectedPaths.length === 0) {
    logger.warn({ incidentId }, 'restoreService: no affected paths found for incident');
  }

  // 2. Mark incident as restoring
  await incidentService.updateIncidentStatus(incidentId, 'restoring');

  // 3. Create restore_job record
  const [job] = await supaQuery(
    db.from('restore_jobs').insert({
      incident_id: incidentId,
      status: 'running',
      total_files: affectedPaths.length,
      valid_files: 0,
      modified_files: 0,
      started_at: nowISO(),
    })
  );

  const fileResults = [];
  let validCount = 0;
  let modifiedCount = 0;
  let missingCount = 0;
  const jobQuarantinePath = nodePath.resolve(quarantineDir, job.id);

  // 4. Process each affected file
  for (const path of affectedPaths) {
    try {
      // Find expected baseline hash from protected_files
      const protectedRows = await supaQuery(
        db
          .from('protected_files')
          .select('baseline_sha256')
          .eq('bucket', bucket)
          .eq('path', path)
          .order('baseline_version', { ascending: false })
          .limit(1)
      );

      const expectedSha256 = protectedRows?.[0]?.baseline_sha256 || '';

      const versionRef = incident.record_json?.baselineVersion || 'v1';
      // Call backup service (decrypts & verifies AEAD tag)
      const { bytes, aeadVerified } = await backup.restoreFile(bucket, path, versionRef);

      // Stage in quarantine folder first before touching storage
      const stagedFilePath = nodePath.join(jobQuarantinePath, path);
      if (bytes) {
        await fs.mkdir(nodePath.dirname(stagedFilePath), { recursive: true });
        await fs.writeFile(stagedFilePath, bytes);
      }

      // Verify restored content against baseline hash
      const verification = verifyFileBytes({
        restoredBytes: bytes,
        aeadVerified,
        expectedSha256,
      });

      // Write per-file result row
      await supaQuery(
        db.from('restore_results').insert({
          restore_job_id: job.id,
          path,
          expected_sha256: expectedSha256,
          restored_sha256: verification.restoredSha256,
          result: verification.result,
        })
      );

      if (verification.result === 'VALID') {
        validCount++;
        // CRITICAL: Only write back to storage if verified VALID and not stage-only
        if (applyImmediately && !stageOnly) {
          await storage.write(bucket, path, bytes);
          logger.info({ bucket, path }, 'restoreService: file verified VALID and written back');
        } else {
          logger.info(
            { bucket, path, stagedFilePath },
            'restoreService: file verified VALID and staged in quarantine'
          );
        }
      } else if (verification.result === 'MODIFIED') {
        modifiedCount++;
        logger.error(
          { bucket, path, expected: expectedSha256, got: verification.restoredSha256 },
          'restoreService: file verification FAILED (MODIFIED) — NOT restoring to storage'
        );
      } else {
        missingCount++;
        logger.error({ bucket, path }, 'restoreService: file MISSING in backup');
      }

      fileResults.push({
        path,
        expectedSha256,
        restoredSha256: verification.restoredSha256,
        result: verification.result,
        stagedPath: bytes ? stagedFilePath : null,
      });
    } catch (err) {
      modifiedCount++;
      logger.error(
        { bucket, path, err: err.message },
        'restoreService: unexpected error restoring file'
      );
      fileResults.push({
        path,
        expectedSha256: '',
        restoredSha256: '',
        result: 'MODIFIED',
        error: err.message,
      });
    }
  }

  // 5. Finalise restore job status
  const is100PercentValid = affectedPaths.length > 0 ? validCount === affectedPaths.length : true;

  const jobFinalStatus = is100PercentValid ? 'verified' : 'failed';
  const finishedAt = nowISO();

  await supaQuery(
    db
      .from('restore_jobs')
      .update({
        status: jobFinalStatus,
        valid_files: validCount,
        modified_files: modifiedCount,
        finished_at: finishedAt,
      })
      .eq('id', job.id)
  );

  // 6. Set incident to resolved ONLY if 100% VALID and applied to storage
  if (is100PercentValid && applyImmediately && !stageOnly) {
    await incidentService.updateIncidentStatus(incidentId, 'resolved', {
      resolved_at: finishedAt,
    });
    logger.info({ incidentId, jobId: job.id }, 'restoreService: incident RESOLVED (100% VALID)');
  } else if (is100PercentValid && stageOnly) {
    logger.info(
      { incidentId, jobId: job.id },
      'restoreService: restore job staged in quarantine (awaiting operator confirmation)'
    );
  } else {
    logger.warn(
      { incidentId, validCount, total: affectedPaths.length },
      'restoreService: restore job finished with errors — incident remains unresolved'
    );
  }

  // 7. Audit log entry
  crypto.appendAuditLog({
    event: 'restore_completed',
    incidentId,
    jobId: job.id,
    jobStatus: jobFinalStatus,
    validCount,
    modifiedCount,
    missingCount,
    totalFiles: affectedPaths.length,
    quarantinePath: jobQuarantinePath,
    appliedToLiveStorage: applyImmediately && !stageOnly,
  });

  return {
    jobId: job.id,
    incidentId,
    status: jobFinalStatus,
    totalFiles: affectedPaths.length,
    validFiles: validCount,
    modifiedFiles: modifiedCount,
    missingFiles: missingCount,
    isFullyRestored: is100PercentValid,
    quarantinePath: jobQuarantinePath,
    isStaged: true,
    isApplied: applyImmediately && !stageOnly,
    finishedAt,
    results: fileResults,
  };
}

/**
 * Explicitly promote and apply staged restore files to live storage after operator confirmation.
 *
 * @param {string} jobId
 * @param {Object} options
 * @param {boolean} options.confirmed Must be explicitly true
 * @param {string} [options.actor='operator']
 * @returns {Promise<Object>}
 */
export async function promoteStagedRestore(jobId, options = {}) {
  if (options.confirmed !== true) {
    throw new ValidationError(
      'Explicit confirmation (confirmed: true) is required before overwriting live storage files'
    );
  }

  const db = getSupabaseClient();
  const storage = await getStorageAdapter();

  const jobs = await supaQuery(db.from('restore_jobs').select('*').eq('id', jobId).limit(1));
  if (!jobs || jobs.length === 0) {
    throw new NotFoundError(`Restore job not found: ${jobId}`);
  }
  const job = jobs[0];

  const results = await supaQuery(
    db.from('restore_results').select('*').eq('restore_job_id', jobId).eq('result', 'VALID')
  );

  const incident = await incidentService.getIncident(job.incident_id);
  let bucket = incident.record_json?.bucket || incident.bucket;
  if (!bucket && results.length > 0) {
    const match = await supaQuery(
      db.from('protected_files').select('bucket').eq('path', results[0].path).limit(1)
    );
    if (match?.[0]?.bucket) {
      bucket = match[0].bucket;
    }
  }
  bucket = bucket || 'protected';
  const quarantineDir = nodePath.resolve('./data/quarantine', jobId);

  let appliedCount = 0;
  for (const item of results) {
    const stagedFile = nodePath.join(quarantineDir, item.path);
    try {
      const data = await fs.readFile(stagedFile);
      await storage.write(bucket, item.path, data);
      appliedCount++;
    } catch (err) {
      logger.error(
        { path: item.path, err: err.message },
        'Failed to write staged file to live storage'
      );
    }
  }

  const finishedAt = nowISO();
  await incidentService.updateIncidentStatus(job.incident_id, 'resolved', {
    resolved_at: finishedAt,
  });

  crypto.appendAuditLog({
    event: 'staged_restore_promoted',
    jobId,
    incidentId: job.incident_id,
    appliedFiles: appliedCount,
    actor: options.actor || 'soc-operator',
    timestamp: finishedAt,
  });

  logger.info({ jobId, appliedCount }, 'restoreService: staged files promoted to live storage');

  return {
    success: true,
    jobId,
    incidentId: job.incident_id,
    appliedFiles: appliedCount,
    resolvedAt: finishedAt,
  };
}

/**
 * Retrieve status and file results for a restore job.
 *
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
export async function getRestoreJob(jobId) {
  const db = getSupabaseClient();

  const jobs = await supaQuery(db.from('restore_jobs').select('*').eq('id', jobId).limit(1));

  if (!jobs || jobs.length === 0) {
    throw new NotFoundError(`Restore job not found: ${jobId}`);
  }

  const job = jobs[0];

  const results = await supaQuery(
    db
      .from('restore_results')
      .select('*')
      .eq('restore_job_id', jobId)
      .order('path', { ascending: true })
  );

  return {
    ...job,
    results: results || [],
  };
}
