/**
 * @file src/api/routes/incidents.js
 *
 * Incident listing and management endpoints.
 */

import {
  listIncidents,
  getIncident,
  updateIncidentStatus,
} from '../../response/incidentService.js';
import { freezeWithRetry } from '../../response/responseService.js';
import { startRestore, promoteStagedRestore } from '../../restore/restoreService.js';
import { appendAuditLog } from '../../contracts/crypto.contract.js';
import { getSupabaseClient, supaQuery } from '../../adapters/db/supabaseClient.js';
import { ValidationError } from '../../utils/errors.js';
import { nowISO } from '../../utils/time.js';

const VALID_STATUSES = [
  'open',
  'acknowledged',
  'frozen',
  'restoring',
  'resolved',
  'closed',
  'freeze_failed',
];

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function incidentRoutes(fastify) {
  // GET /incidents - list all incidents
  fastify.get('/incidents', async (request, reply) => {
    const { status, accountId } = request.query || {};
    const incidents = await listIncidents({ status, accountId });
    return reply.status(200).send({
      incidents,
      count: incidents.length,
    });
  });

  // GET /incidents/:id - single incident details
  fastify.get('/incidents/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      throw new ValidationError('Incident ID parameter is required');
    }

    const incident = await getIncident(id);
    return reply.status(200).send(incident);
  });

  // PATCH /incidents/:id/status - update incident state (e.g. acknowledge alert)
  fastify.patch('/incidents/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { status, note } = request.body || {};

    if (!id) throw new ValidationError('Incident ID is required');
    if (!status || !VALID_STATUSES.includes(status)) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const current = await getIncident(id);
    const actor = request.user?.email || request.headers['x-api-key'] ? 'api_operator' : 'unknown';

    const updated = await updateIncidentStatus(id, status, {
      ...(status === 'resolved' && !current.resolved_at ? { resolved_at: nowISO() } : {}),
      ...(status === 'frozen' && !current.frozen_at ? { frozen_at: nowISO() } : {}),
    });

    // Record privileged action in audit trail
    await appendAuditLog({
      event: 'INCIDENT_STATUS_UPDATED',
      incidentId: id,
      previousStatus: current.status,
      newStatus: status,
      actor,
      note: note || null,
      timestamp: nowISO(),
    });

    return reply.status(200).send({
      success: true,
      incident: updated,
    });
  });

  // POST /incidents/:id/contain - dispatch safe containment / IAM write freeze
  fastify.post('/incidents/:id/contain', async (request, reply) => {
    const { id } = request.params;
    if (!id) throw new ValidationError('Incident ID is required');

    const incident = await getIncident(id);
    const accountId = incident.account_id;
    const actor = request.user?.email || 'api_operator';

    // Execute safe containment with retries
    const freezeRes = await freezeWithRetry(accountId, 3);
    const frozenAt = freezeRes.frozenAt || nowISO();

    if (!freezeRes.success) {
      await updateIncidentStatus(id, 'freeze_failed');
      await appendAuditLog({
        event: 'CONTAINMENT_DISPATCH_FAILED',
        incidentId: id,
        accountId,
        error: freezeRes.error,
        actor,
      });
      return reply.status(502).send({
        error: {
          code: 'containment_failed',
          message: freezeRes.error || 'Failed to apply containment policy',
        },
      });
    }

    const updated = await updateIncidentStatus(id, 'frozen', {
      frozen_at: frozenAt,
    });

    await appendAuditLog({
      event: 'CONTAINMENT_DISPATCHED_AND_VERIFIED',
      incidentId: id,
      accountId,
      status: 'frozen',
      actor,
      timestamp: frozenAt,
    });

    return reply.status(200).send({
      success: true,
      incidentId: id,
      status: 'frozen',
      frozenAt,
      incident: updated,
    });
  });

  // GET /incidents/:id/timeline - retrieve forensic timeline for incident
  fastify.get('/incidents/:id/timeline', async (request, reply) => {
    const { id } = request.params;
    if (!id) throw new ValidationError('Incident ID is required');

    const incident = await getIncident(id);
    const db = getSupabaseClient();

    // Fetch related restore jobs
    const jobs =
      (await supaQuery(
        db
          .from('restore_jobs')
          .select('*')
          .eq('incident_id', id)
          .order('started_at', { ascending: true })
      )) || [];

    const timeline = [];

    // 1. Detection
    timeline.push({
      event: 'DETECTION_TRIGGERED',
      label: 'Ransomware Detected',
      timestamp: incident.detected_at,
      severity: 'Critical',
      details: `Suspected ransomware triggered for account ${incident.account_id}. ${incident.affected_paths?.length || 0} files affected.`,
    });

    // 2. Containment
    if (incident.frozen_at) {
      timeline.push({
        event: 'CONTAINMENT_CONFIRMED',
        label: 'Account Write Isolation (Frozen)',
        timestamp: incident.frozen_at,
        severity: 'High',
        details: 'IAM deny-all write lock verified. Environment isolated.',
      });
    }

    // 3. Digital Signature
    if (incident.record_signature) {
      timeline.push({
        event: 'EVIDENCE_SEALED',
        label: 'Ed25519 Forensic Seal',
        timestamp: incident.frozen_at || incident.detected_at,
        severity: 'Info',
        details: `Cryptographic manifest signed with key ${incident.signing_key_id || 'ed25519-soc-key'}.`,
      });
    }

    // 4. Restore Jobs
    for (const job of jobs) {
      timeline.push({
        event: 'RESTORE_EXECUTED',
        label: `Verified Recovery Job (${job.status})`,
        timestamp: job.started_at,
        severity: job.status === 'verified' ? 'Success' : 'Warning',
        details: `${job.valid_files}/${job.total_files} files verified against pre-attack SHA-256 baseline.`,
      });
    }

    // 5. Resolution
    if (incident.resolved_at) {
      timeline.push({
        event: 'INCIDENT_RESOLVED',
        label: 'Incident Resolved & Closed',
        timestamp: incident.resolved_at,
        severity: 'Success',
        details: 'All protected files verified valid. Storage state restored.',
      });
    }

    return reply.status(200).send({
      incidentId: id,
      timeline,
    });
  });

  // POST /incidents/:id/restore - start verified restore
  fastify.post('/incidents/:id/restore', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      throw new ValidationError('Incident ID parameter is required');
    }

    const { stageOnly, applyImmediately } = request.body || {};
    const report = await startRestore(id, { stageOnly, applyImmediately });
    return reply.status(200).send(report);
  });

  // POST /incidents/:id/promote - promote staged restore to live storage
  fastify.post('/incidents/:id/promote', async (request, reply) => {
    const { id } = request.params;
    const { jobId, confirmed } = request.body || {};

    if (!id) throw new ValidationError('Incident ID is required');
    if (!jobId) throw new ValidationError('Job ID is required');

    const result = await promoteStagedRestore(jobId, {
      confirmed: confirmed === true,
      actor: request.user?.email || 'api_operator',
    });

    return reply.status(200).send(result);
  });
}
