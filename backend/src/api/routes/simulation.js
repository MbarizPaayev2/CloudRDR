/**
 * @file src/api/routes/simulation.js
 *
 * Controlled Ransomware Simulation & Canary Tripwire Endpoints.
 * Powers the interactive "Simulate Attack" and "Trip Canary Sentinel"
 * live demonstration workflow in the SOC Admin Dashboard.
 */

import crypto from 'node:crypto';
import { getSupabaseClient, supaQuery } from '../../adapters/db/supabaseClient.js';
import { getStorageAdapter } from '../../adapters/storage/index.js';
import * as backup from '../../contracts/backup.contract.js';
import { appendAuditLog, signRecord, hashBuffer, merkleRoot } from '../../contracts/crypto.contract.js';
import { isCanaryPath } from '../../detection/canary.js';
import { nowISO } from '../../utils/time.js';
import logger from '../../utils/logger.js';

/**
 * Ensures clean baseline records and AES-256-GCM backups exist for target paths,
 * then writes simulated ransomware-encrypted bytes to storage so that subsequent
 * verified restore operations perform genuine cryptographic decryption & hash verification.
 *
 * @param {string} bucket
 * @param {string[]} paths
 */
async function ensureSimulationBaselineAndCorrupt(bucket, paths) {
  const db = getSupabaseClient();
  const storage = await getStorageAdapter();
  const existingRows = (await supaQuery(
    db.from('protected_files').select('path, baseline_sha256, baseline_version').eq('bucket', bucket)
  )) || [];
  const existingMap = new Map(existingRows.map((r) => [r.path, r]));

  const newRows = [];
  const allHashes = existingRows.map((r) => r.baseline_sha256).filter(Boolean);

  for (const filePath of paths) {
    let cleanBytes = null;
    const existing = existingMap.get(filePath);
    const version = existing?.baseline_version || 1;

    // 1. If clean backup already exists in backup store, reuse it
    try {
      const prior = await backup.restoreFile(bucket, filePath, `v${version}`);
      if (prior?.aeadVerified && prior.bytes) {
        cleanBytes = prior.bytes;
      }
    } catch {
      // ignore
    }

    // 2. Otherwise try reading storage if it matches baseline hash
    if (!cleanBytes) {
      try {
        const diskBytes = await storage.read(bucket, filePath);
        if (diskBytes && diskBytes.length > 0) {
          const diskHash = hashBuffer(diskBytes);
          if (!existing || diskHash === existing.baseline_sha256) {
            cleanBytes = diskBytes;
          }
        }
      } catch {
        // ignore
      }
    }

    // 3. Fallback to canonical synthetic seed asset
    if (!cleanBytes) {
      cleanBytes = Buffer.from(
        `CloudRDR Verified Enterprise Asset [${filePath}] — Authentic Baseline Record v1\n`,
        'utf8'
      );
    }

    const cleanHash = hashBuffer(cleanBytes);

    try {
      await backup.storeBackup(bucket, filePath, cleanBytes, `v${version}`);
      if (version !== 1) {
        await backup.storeBackup(bucket, filePath, cleanBytes, 'v1');
      }
    } catch {
      // Non-fatal if backup store is mocked in unit tests
    }

    if (!existing) {
      newRows.push({
        bucket,
        path: filePath,
        size_bytes: cleanBytes.length,
        baseline_sha256: cleanHash,
        baseline_version: 1,
        is_canary: isCanaryPath(filePath),
      });
      allHashes.push(cleanHash);
    } else if (existing.baseline_sha256 !== cleanHash) {
      await supaQuery(
        db
          .from('protected_files')
          .update({ baseline_sha256: cleanHash })
          .eq('bucket', bucket)
          .eq('path', filePath)
      );
    }

    try {
      const corruptedBytes = Buffer.concat([
        Buffer.from('RANSOMWARE_CIPHERTEXT_HEADER_V1:', 'utf8'),
        crypto.randomBytes(48),
      ]);
      await storage.write(bucket, filePath, corruptedBytes);
    } catch {
      // Non-fatal if storage write is mocked
    }
  }

  if (newRows.length > 0) {
    await supaQuery(db.from('protected_files').insert(newRows));
    const rootHash = merkleRoot(allHashes);
    await supaQuery(
      db.from('baseline_snapshots').insert({
        bucket,
        merkle_root: rootHash,
        file_count: existingRows.length + newRows.length,
        created_by: 'cloudrdr-baseline-seeder',
      })
    );
  }
}

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
    const bucket = 'protected';

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

    await ensureSimulationBaselineAndCorrupt(bucket, affectedPaths);

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
      bucket,
      baselineVersion: 'v1',
      detection_run_id: detectionRunId,
      affected_paths: affectedPaths,
      detected_at: now,
      containment: 'IAM_DENY_WRITE_ATTACHED',
      detection_reason: 'VELOCITY_SPIKE_44% + CANARY_BREACH',
    };
    const { signature, keyId } = signRecord(incidentPayload);

    // 3. Insert into incidents table with 'frozen' status
    const incidentId = crypto.randomUUID();
    const [_incident] = await supaQuery(
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
    const bucket = 'protected';
    const canaryPath = 'canary/tripwire_sentinel.docx';

    await ensureSimulationBaselineAndCorrupt(bucket, [canaryPath]);

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
      bucket,
      detection_run_id: detectionRunId,
      affected_paths: [canaryPath],
      detected_at: now,
      containment: 'IAM_DENY_WRITE_ATTACHED',
      detection_reason: 'CANARY_DECOY_TOUCHED',
    };
    const { signature, keyId } = signRecord(incidentPayload);

    const incidentId = crypto.randomUUID();
    const [_incident] = await supaQuery(
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

  // ── 4. Simulate 1-Byte File Tamper / Revert (Merkle DAG Inspector) ─────────
  fastify.post('/api/simulate/tamper', async (request, reply) => {
    const { revert = false, targetPath = 'corporate/executive_strategy.pdf' } = request.body || {};
    const bucket = 'protected';
    const storage = await getStorageAdapter();
    const db = getSupabaseClient();
    const now = nowISO();

    const cleanBytes = Buffer.from(
      `CloudRDR Verified Enterprise Asset [${targetPath}] — Authentic Baseline Record v1\n`,
      'utf8'
    );
    const cleanHash = hashBuffer(cleanBytes);

    if (revert) {
      try {
        await storage.write(bucket, targetPath, cleanBytes);
      } catch {
        // Non-fatal
      }
      const rows = (await supaQuery(
        db.from('protected_files').select('baseline_sha256').eq('bucket', bucket)
      )) || [];
      const hashes = rows.map((r) => r.baseline_sha256).filter(Boolean);
      const rootHash = hashes.length > 0 ? merkleRoot(hashes) : cleanHash;

      await appendAuditLog({
        type: 'MERKLE_TAMPER_REVERTED',
        targetPath,
        restoredSha256: cleanHash,
        merkleRoot: rootHash,
        timestamp: now,
      });

      return reply.status(200).send({
        ok: true,
        tampered: false,
        targetPath,
        observedSha256: cleanHash,
        expectedSha256: cleanHash,
        merkleRoot: rootHash,
      });
    }

    // Tamper 1 byte on disk
    const tamperedBytes = Buffer.from(cleanBytes);
    tamperedBytes[0] = tamperedBytes[0] ^ 0xff;
    const tamperedHash = hashBuffer(tamperedBytes);

    try {
      await backup.storeBackup(bucket, targetPath, cleanBytes, 'v1');
      await storage.write(bucket, targetPath, tamperedBytes);
    } catch {
      // Non-fatal
    }

    const rows = (await supaQuery(
      db.from('protected_files').select('path, baseline_sha256').eq('bucket', bucket)
    )) || [];
    const mutatedHashes = rows.length > 0
      ? rows.map((r) => (r.path === targetPath ? tamperedHash : r.baseline_sha256)).filter(Boolean)
      : [tamperedHash];
    const tamperedRoot = merkleRoot(mutatedHashes);

    await appendAuditLog({
      type: 'MERKLE_SINGLE_BYTE_TAMPER_DETECTED',
      targetPath,
      expectedSha256: cleanHash,
      observedSha256: tamperedHash,
      tamperedMerkleRoot: tamperedRoot,
      timestamp: now,
    });

    return reply.status(200).send({
      ok: true,
      tampered: true,
      targetPath,
      expectedSha256: cleanHash,
      observedSha256: tamperedHash,
      tamperedMerkleRoot: tamperedRoot,
    });
  });
}
