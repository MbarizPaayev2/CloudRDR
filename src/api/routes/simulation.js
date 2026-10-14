/**
 * @file src/api/routes/simulation.js
 *
 * Controlled Ransomware Simulation & Canary Tripwire Endpoints.
 * Powers the interactive "Simulate Attack" and "Trip Canary Sentinel"
 * live demonstration workflow in the SOC Admin Dashboard.
 */

import crypto from 'node:crypto';
import { getSupabaseClient, supaQuery } from '../../adapters/db/supabaseClient.js';
import { appendAuditLog, signRecord } from '../../contracts/crypto.contract.js';
import { nowISO } from '../../utils/time.js';
import logger from '../../utils/logger.js';

/**
 * Fastify plugin for simulation endpoints.
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function simulationRoutes(fastify) {
  // ── 1. Simulate Mass Ransomware Attack ──────────────────────────────────────
  fastify.post('/api/simulate/attack', async (_request, reply) => {
    const db = getSupabaseClient();
    const now = nowISO();
    const accountId = 'sec-corp-acc-01';

    // 1. Create a Detection Run with verdict 'ransomware'
    const detectionRunId = crypto.randomUUID();
    const affectedPaths = [
      'corporate/financials_q3.xlsx',
      'corporate/executive_strategy.pdf',
      'corporate/payroll_records_2026.csv',
      'database/customer_pii_vault.sql',
      'blueprints/patents_cad.dwg',
      'canary/tripwire_sentinel.docx',
    ];

    await supaQuery(
      db.from('detection_runs').insert({
        id: detectionRunId,
        account_id: accountId,
        window_seconds: 30,
        total_files: 50,
        changed_files: 22,
        change_rate: 0.44,
        threshold: 0.3,
        canary_triggered: true,
        verdict: 'ransomware',
        created_at: now,
      })
    );

    // 2. Cryptographically seal incident record
    const incidentPayload = {
      account_id: accountId,
      detection_run_id: detectionRunId,
      affected_paths: affectedPaths,
      detected_at: now,
      containment: 'IAM_DENY_WRITE_ATTACHED',
      detection_reason: 'VELOCITY_SPIKE_44% + CANARY_BREACH',
    };
    const { signature, keyId } = signRecord(incidentPayload);

    // 3. Insert into incidents table with 'frozen' status
    const incidentId = crypto.randomUUID();
    const [incident] = await supaQuery(
      db.from('incidents').insert({
        id: incidentId,
        detection_run_id: detectionRunId,
        account_id: accountId,
        status: 'frozen',
        affected_paths: affectedPaths,
        detected_at: now,
        frozen_at: now,
        record_json: incidentPayload,
        record_signature: signature,
        signing_key_id: keyId,
      })
    );

    // 4. Record change events for telemetry
    for (const p of affectedPaths) {
      await supaQuery(
        db.from('change_events').insert({
          id: crypto.randomUUID(),
          bucket: 'protected',
          path: p,
          account_id: accountId,
          event_type: 'modified',
          observed_sha256: crypto.randomBytes(32).toString('hex'),
          observed_at: now,
          matched_baseline: false,
        })
      );
    }

    // 5. Append to hash-chained tamper-evident audit log
    await appendAuditLog({
      type: 'RANSOMWARE_CONTAINMENT_FREEZE',
      incidentId,
      accountId,
      severity: 'CRITICAL',
      affectedCount: affectedPaths.length,
      signatureSnippet: signature.slice(0, 16) + '...',
      timestamp: now,
    });

    logger.warn({ incidentId, accountId }, 'simulation: mass attack simulated & account isolated');

    return reply.status(200).send({
      success: true,
      verdict: 'ransomware',
      incidentId,
      incident: {
        id: incidentId,
        accountId,
        status: 'frozen',
        affectedPaths,
        detectedAt: now,
        detectionReason: 'VELOCITY_SPIKE_44% + CANARY_BREACH',
      },
    });
  });

  // ── 2. Trip Canary Sentinel Trap ───────────────────────────────────────────
  fastify.post('/api/simulate/canary', async (_request, reply) => {
    const db = getSupabaseClient();
    const now = nowISO();
    const accountId = 'sec-corp-acc-01';
    const canaryPath = 'canary/tripwire_sentinel.docx';

    const detectionRunId = crypto.randomUUID();
    await supaQuery(
      db.from('detection_runs').insert({
        id: detectionRunId,
        account_id: accountId,
        window_seconds: 10,
        total_files: 50,
        changed_files: 1,
        change_rate: 0.02,
        threshold: 0.3,
        canary_triggered: true,
        verdict: 'ransomware',
        created_at: now,
      })
    );

    const incidentPayload = {
      account_id: accountId,
      detection_run_id: detectionRunId,
      affected_paths: [canaryPath],
      detected_at: now,
      containment: 'IAM_DENY_WRITE_ATTACHED',
      detection_reason: 'CANARY_DECOY_TOUCHED',
    };
    const { signature, keyId } = signRecord(incidentPayload);

    const incidentId = crypto.randomUUID();
    const [incident] = await supaQuery(
      db.from('incidents').insert({
        id: incidentId,
        detection_run_id: detectionRunId,
        account_id: accountId,
        status: 'frozen',
        affected_paths: [canaryPath],
        detected_at: now,
        frozen_at: now,
        record_json: incidentPayload,
        record_signature: signature,
        signing_key_id: keyId,
      })
    );

    await supaQuery(
      db.from('change_events').insert({
        id: crypto.randomUUID(),
        bucket: 'protected',
        path: canaryPath,
        account_id: accountId,
        event_type: 'modified',
        observed_sha256: crypto.randomBytes(32).toString('hex'),
        observed_at: now,
        matched_baseline: false,
      })
    );

    await appendAuditLog({
      type: 'CANARY_TRIPWIRE_BREACH',
      incidentId,
      canaryPath,
      timestamp: now,
    });

    return reply.status(200).send({
      success: true,
      canaryTripped: true,
      incidentId,
      incident: {
        id: incidentId,
        accountId,
        status: 'frozen',
        affectedPaths: [canaryPath],
        detectedAt: now,
        detectionReason: 'CANARY_DECOY_TOUCHED',
      },
    });
  });

  // ── 3. Reset Simulation ────────────────────────────────────────────────────
  fastify.post('/api/simulate/reset', async (_request, reply) => {
    const db = getSupabaseClient();
    try {
      const openIncidents = (await supaQuery(db.from('incidents').select('id'))) || [];
      for (const inc of openIncidents) {
        await supaQuery(
          db.from('incidents').update({ status: 'resolved', resolved_at: nowISO() }).eq('id', inc.id)
        );
      }
    } catch {
      // Non-fatal
    }

    return reply.status(200).send({
      success: true,
      message: 'Active incidents marked resolved. All systems normal.',
    });
  });
}
