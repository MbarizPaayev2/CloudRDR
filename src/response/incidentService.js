/**
 * @file src/response/incidentService.js
 *
 * Incident management service for CloudRDR.
 * Tracks incidents through their lifecycle:
 * open -> frozen -> restoring -> resolved (or freeze_failed).
 */

import { getSupabaseClient, supaQuery } from '../adapters/db/supabaseClient.js';
import { NotFoundError } from '../utils/errors.js';
import { nowISO } from '../utils/time.js';
import logger from '../utils/logger.js';

/**
 * Create a new open incident from a detection run.
 *
 * @param {Object} params
 * @param {string} params.detectionRunId
 * @param {string} params.accountId
 * @param {string[]} [params.affectedPaths=[]]
 * @returns {Promise<Object>} The created incident record
 */
export async function createIncident({ detectionRunId, accountId, affectedPaths = [] }) {
  const db = getSupabaseClient();
  const now = nowISO();

  const [incident] = await supaQuery(
    db.from('incidents').insert({
      detection_run_id: detectionRunId,
      account_id: accountId,
      status: 'open',
      affected_paths: affectedPaths,
      detected_at: now,
    })
  );

  logger.info(
    { incidentId: incident.id, accountId },
    'incidentService: created new incident (open)'
  );
  return incident;
}

/**
 * Update an incident's status and metadata.
 *
 * @param {string} incidentId
 * @param {string} status
 * @param {Object} [updates={}]
 * @returns {Promise<Object>}
 */
export async function updateIncidentStatus(incidentId, status, updates = {}) {
  const db = getSupabaseClient();

  const [updated] = await supaQuery(
    db
      .from('incidents')
      .update({
        status,
        ...updates,
      })
      .eq('id', incidentId)
  );

  if (!updated) {
    throw new NotFoundError(`Incident not found: ${incidentId}`);
  }

  logger.info({ incidentId, status }, 'incidentService: incident status updated');
  return updated;
}

/**
 * Get an incident by its ID.
 *
 * @param {string} incidentId
 * @returns {Promise<Object>}
 */
export async function getIncident(incidentId) {
  const db = getSupabaseClient();

  const incidents = await supaQuery(db.from('incidents').select('*').eq('id', incidentId).limit(1));

  if (!incidents || incidents.length === 0) {
    throw new NotFoundError(`Incident not found: ${incidentId}`);
  }

  return incidents[0];
}

/**
 * List incidents, optionally filtered by status or account.
 *
 * @param {Object} [filter={}]
 * @param {string} [filter.status]
 * @param {string} [filter.accountId]
 * @returns {Promise<Array<Object>>}
 */
export async function listIncidents(filter = {}) {
  const db = getSupabaseClient();
  let query = db.from('incidents').select('*').order('detected_at', { ascending: false });

  if (filter.status) {
    query = query.eq('status', filter.status);
  }
  if (filter.accountId) {
    query = query.eq('account_id', filter.accountId);
  }

  const results = await supaQuery(query);
  return results || [];
}
