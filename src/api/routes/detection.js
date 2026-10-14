/**
 * @file src/api/routes/detection.js
 *
 * Detection engine query endpoints.
 */

import { getSupabaseClient, supaQuery } from '../../adapters/db/supabaseClient.js';
import { getThresholds, updateThresholds } from '../../detection/thresholds.js';
import { appendAuditLog } from '../../contracts/crypto.contract.js';
import { ValidationError } from '../../utils/errors.js';
import { nowISO } from '../../utils/time.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function detectionRoutes(fastify) {
  // GET /detection/runs?limit=
  fastify.get('/detection/runs', async (request, reply) => {
    const rawLimit = request.query?.limit;
    const limit = rawLimit ? Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 500) : 50;

    const db = getSupabaseClient();
    const runs = await supaQuery(
      db.from('detection_runs').select('*').order('created_at', { ascending: false }).limit(limit)
    );

    return reply.status(200).send({
      runs: runs || [],
      limit,
    });
  });

  // GET /detection/summary - live detection engine telemetry and thresholds
  fastify.get('/detection/summary', async (_request, reply) => {
    const db = getSupabaseClient();
    const thresholds = getThresholds();

    const runs = await supaQuery(
      db.from('detection_runs').select('*').order('created_at', { ascending: false }).limit(1)
    );
    const latestRun = runs?.[0] || null;

    const openIncidents = await supaQuery(
      db.from('incidents').select('id, status').in('status', ['open', 'frozen', 'restoring'])
    );

    const canaryRows = await supaQuery(
      db.from('protected_files').select('path').eq('is_canary', true).limit(1)
    );
    const canaryPath = canaryRows?.[0]?.path || 'canaries/sentinel.canary';

    return reply.status(200).send({
      status: 'active',
      modificationThreshold: thresholds.ransomwareRate,
      suspiciousThreshold: thresholds.suspiciousRate,
      windowSeconds: thresholds.windowSeconds,
      currentObservedRate: latestRun ? Number(latestRun.change_rate) : 0.0,
      verdict: latestRun ? latestRun.verdict : 'normal',
      canaryTriggered: latestRun ? Boolean(latestRun.canary_triggered) : false,
      canaryPath,
      recentDetectionAt: latestRun?.created_at || null,
      pendingCases: openIncidents?.length || 0,
      mode: 'live-monitoring',
    });
  });

  // POST /detection/config - update detection thresholds
  fastify.post('/detection/config', async (request, reply) => {
    const { windowSeconds, suspiciousRate, ransomwareRate, allowlistedAccounts } = request.body || {};

    if (windowSeconds !== undefined && (typeof windowSeconds !== 'number' || windowSeconds <= 0)) {
      throw new ValidationError('windowSeconds must be a positive number');
    }
    if (suspiciousRate !== undefined && (typeof suspiciousRate !== 'number' || suspiciousRate < 0 || suspiciousRate > 1)) {
      throw new ValidationError('suspiciousRate must be a float between 0.0 and 1.0');
    }
    if (ransomwareRate !== undefined && (typeof ransomwareRate !== 'number' || ransomwareRate < 0 || ransomwareRate > 1)) {
      throw new ValidationError('ransomwareRate must be a float between 0.0 and 1.0');
    }

    const updated = updateThresholds({
      windowSeconds,
      suspiciousRate,
      ransomwareRate,
      allowlistedAccounts,
    });

    const actor = request.user?.email || 'api_operator';
    await appendAuditLog({
      event: 'DETECTION_CONFIG_UPDATED',
      thresholds: updated,
      actor,
      timestamp: nowISO(),
    });

    return reply.status(200).send({
      success: true,
      thresholds: updated,
    });
  });
}
