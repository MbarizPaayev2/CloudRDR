/**
 * @file src/restore/restoreService.js
 *
 * Verified restore service for CloudRDR.
 * Restores files from encrypted backups, verifies AEAD authentication tags,
 * tests restored bytes against SHA-256 baselines (VALID / MODIFIED / MISSING),
 * writes verified files back to storage, and closes resolved incidents.
 */

import { getStorageAdapter } from '../adapters/storage/index.js';
import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import * as backup from '../contracts/backup.contract.js';
import * as crypto from '../contracts/crypto.contract.js';
import { verifyFileBytes } from './verifyRestore.js';
import * as incidentService from '../response/incidentService.js';
import { NotFoundError } from '../utils/errors.js';
import { nowISO } from '../utils/time.js';
import logger from '../utils/logger.js';

/**
 * Start and execute a verified restore job for an incident.
 *
 * @param {string} incidentId
 * @returns {Promise<Object>} Restore summary report
 */
export async function startRestore(incidentId) {
  const db = getSupabaseClient();
  const storage = await getStorageAdapter();

  // 1. Fetch incident
  const incident = await incidentService.getIncident(incidentId);
  const bucket = incident.record_json?.bucket || 'protected';
  const affectedPaths = incident.affected_paths || [];

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

  // 4. Process each affected file
  for (const path of affectedPaths) {
    try {
      // Find expected baseline hash from protected_files
      const protectedRows = await supaQuery(
        db.from('protected_files')
          .select('baseline_sha256')
          .eq('bucket', bucket)
          .eq('path', path)
          .order('baseline_version', { ascending: false })
          .limit(1)
      );

      const expectedSha256 = protectedRows?.[0]?.baseline_sha256 || '';

      // Call backup service (decrypts & verifies AEAD tag)
      const { bytes, aeadVerified } = await backup.restoreFile(
        bucket,
        path,
        incident.record_json?.baselineSnapshotId
      );

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
        // CRITICAL: Only write back to storage if verified VALID
        await storage.write(bucket, path, bytes);
        logger.info({ bucket, path }, 'restoreService: file verified VALID and written back');
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
      });
    } catch (err) {
      modifiedCount++;
      logger.error({ bucket, path, err: err.message }, 'restoreService: unexpected error restoring file');
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
  const is100PercentValid =
    affectedPaths.length > 0
      ? validCount === affectedPaths.length
      : true;

  const jobFinalStatus = is100PercentValid ? 'verified' : 'failed';
  const finishedAt = nowISO();

  await supaQuery(
    db.from('restore_jobs')
      .update({
        status: jobFinalStatus,
        valid_files: validCount,
        modified_files: modifiedCount,
        finished_at: finishedAt,
      })
      .eq('id', job.id)
  );

  // 6. Set incident to resolved ONLY if 100% VALID
  if (is100PercentValid) {
    await incidentService.updateIncidentStatus(incidentId, 'resolved', {
      resolved_at: finishedAt,
    });
    logger.info({ incidentId, jobId: job.id }, 'restoreService: incident RESOLVED (100% VALID)');
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
    finishedAt,
    results: fileResults,
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

  const jobs = await supaQuery(
    db.from('restore_jobs')
      .select('*')
      .eq('id', jobId)
      .limit(1)
  );

  if (!jobs || jobs.length === 0) {
    throw new NotFoundError(`Restore job not found: ${jobId}`);
  }

  const job = jobs[0];

  const results = await supaQuery(
    db.from('restore_results')
      .select('*')
      .eq('restore_job_id', jobId)
      .order('path', { ascending: true })
  );

  return {
    ...job,
    results: results || [],
  };
}
