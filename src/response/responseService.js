/**
 * @file src/response/responseService.js
 *
 * Incident response orchestration for CloudRDR.
 * When ransomware is detected:
 *   1. Creates incident record in database.
 *   2. Freezes account with retry + backoff (escalates if failed).
 *   3. Packages full incident metadata.
 *   4. Digitally signs the record using Ed25519 (crypto module).
 *   5. Appends entry to hash-chained audit log.
 */

import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import * as freezeClient from './freezeClient.js';
import * as incidentService from './incidentService.js';
import * as crypto from '../contracts/crypto.contract.js';
import { sleep, backoffMs, nowISO } from '../utils/time.js';
import logger from '../utils/logger.js';

/**
 * Perform account freeze with up to `maxAttempts` retries and backoff.
 *
 * @param {string} accountId
 * @param {number} [maxAttempts=3]
 * @returns {Promise<{ success: boolean, frozenAt?: string, error?: string }>}
 */
export async function freezeWithRetry(accountId, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      logger.info(
        { accountId, attempt: attempt + 1 },
        'responseService: attempting account freeze'
      );
      const res = await freezeClient.freezeAccount(accountId);
      return { success: true, frozenAt: res.at };
    } catch (err) {
      logger.warn(
        { accountId, attempt: attempt + 1, err: err.message },
        'responseService: freeze attempt failed'
      );
      if (attempt < maxAttempts - 1) {
        const delay = backoffMs(attempt, 200, 2000);
        await sleep(delay);
      }
    }
  }

  return { success: false, error: `Freeze failed after ${maxAttempts} attempts` };
}

/**
 * Handle a ransomware detection verdict.
 * Invoked asynchronously from detection engine so detection is never blocked.
 *
 * @param {Object} params
 * @param {string} params.detectionRunId
 * @param {string} params.accountId
 * @param {string} params.bucket
 * @param {string[]} params.affectedPaths
 * @param {Object} params.detectionRunSummary
 * @returns {Promise<Object>} The finalised incident record
 */
export async function handleRansomwareVerdict({
  detectionRunId,
  accountId,
  bucket,
  affectedPaths = [],
  detectionRunSummary = {},
}) {
  logger.info({ accountId, detectionRunId }, 'responseService: handling ransomware verdict');

  // 1. Create incident (status: open)
  const incident = await incidentService.createIncident({
    detectionRunId,
    accountId,
    affectedPaths,
  });

  // 2. Call freezeClient with retry
  const freezeResult = await freezeWithRetry(accountId, 3);
  let status = 'frozen';
  let frozenAt = null;

  if (freezeResult.success) {
    frozenAt = freezeResult.frozenAt || nowISO();
    logger.info(
      { incidentId: incident.id, accountId, frozenAt },
      'responseService: account frozen successfully'
    );
  } else {
    status = 'freeze_failed';
    logger.fatal(
      { incidentId: incident.id, accountId, error: freezeResult.error },
      'responseService: ESCALATION: Account freeze failed! Manual intervention required!'
    );
  }

  // 3. Fetch current baseline snapshot for Merkle root and snapshot reference
  const db = getSupabaseClient();
  let snapshot = null;
  if (bucket) {
    const snapshots = await supaQuery(
      db
        .from('baseline_snapshots')
        .select('*')
        .eq('bucket', bucket)
        .order('created_at', { ascending: false })
        .limit(1)
    );
    snapshot = snapshots?.[0] || null;
  }

  // 4. Build the incident record JSON
  const recordPayload = {
    incidentId: incident.id,
    detectionRunId,
    detectionRunSummary,
    accountId,
    bucket,
    affectedPaths,
    detectedAt: incident.detected_at,
    frozenAt,
    freezeStatus: freezeResult.success ? 'frozen' : 'failed',
    baselineSnapshotId: snapshot?.id || null,
    merkleRoot: snapshot?.merkle_root || null,
  };

  // 5. Sign the incident record
  const { signature, keyId } = crypto.signRecord(recordPayload);

  // 6. Append to tamper-evident audit log
  crypto.appendAuditLog({
    event: 'incident_created',
    incidentId: incident.id,
    status,
    signature,
    keyId,
    record: recordPayload,
  });

  // 7. Update incident with freeze status, signature and signed record
  const updated = await incidentService.updateIncidentStatus(incident.id, status, {
    frozen_at: frozenAt,
    record_json: recordPayload,
    record_signature: signature,
    signing_key_id: keyId,
  });

  return updated;
}
