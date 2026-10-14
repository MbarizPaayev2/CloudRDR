/**
 * @file site/js/mock/mockApi.js
 * Deterministic Mock API for CloudRDR.
 * Perfectly mirrors Fastify backend response envelopes.
 */

import { CONFIG } from '../config.js';

let mockBaseline = {
  bucket: 'protected',
  merkle_root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  file_count: 16,
  version: 1,
  created_at: new Date(Date.now() - 3600000).toISOString(),
  created_by: 'cloudrdr-agent',
};

let mockIncidents = [
  {
    id: 'inc-92a1-4fd2',
    detection_run_id: 'run-8821',
    account_id: CONFIG.ACCOUNT_ID,
    status: 'resolved',
    affected_paths: [
      'finance/ledger_2026.xlsx',
      'legal/contracts/vendor_agreement.pdf',
      'engineering/source_bundle.tar.gz',
      'canary/tripwire_sentinel.docx',
    ],
    detected_at: new Date(Date.now() - 86400000).toISOString(),
    frozen_at: new Date(Date.now() - 86395000).toISOString(),
    resolved_at: new Date(Date.now() - 86100000).toISOString(),
    record_signature: '7f9a8b12c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
    signing_key_id: 'ed25519-prod-key-01',
  },
];

let mockRestoreJobs = {
  'job-restore-01': {
    id: 'job-restore-01',
    incident_id: 'inc-92a1-4fd2',
    status: 'verified',
    total_files: 16,
    valid_files: 16,
    modified_files: 0,
    started_at: new Date(Date.now() - 86200000).toISOString(),
    finished_at: new Date(Date.now() - 86100000).toISOString(),
    results: Array.from({ length: 16 }, (_, i) => ({
      path: i === 0 ? 'canary/tripwire_sentinel.docx' : `data/file_${String(i).padStart(2, '0')}.dat`,
      expected_sha256: `a${i}b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8${i}a`,
      restored_sha256: `a${i}b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8${i}a`,
      result: 'VALID',
    })),
  },
};

let mockAuditLog = [
  {
    index: 0,
    prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'b149a8fe071d2c67ef91e32d56ab0912cb84ef92a17013c72b892a0149e01fbc',
    action: 'BASELINE_SEALED',
    timestamp: new Date(Date.now() - 87000000).toISOString(),
    data: { bucket: 'protected', file_count: 16, merkle_root: mockBaseline.merkle_root },
  },
  {
    index: 1,
    prev_hash: 'b149a8fe071d2c67ef91e32d56ab0912cb84ef92a17013c72b892a0149e01fbc',
    hash: '59c20a17eb91024dbca801fc091f278bc09128fef8721c4091ab76019fec92a4',
    action: 'RANSOMWARE_CONTAINED',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    data: { account_id: CONFIG.ACCOUNT_ID, action: 'IAM_FREEZE_APPLIED' },
  },
  {
    index: 2,
    prev_hash: '59c20a17eb91024dbca801fc091f278bc09128fef8721c4091ab76019fec92a4',
    hash: 'ca81920fe1789bfa901248ecba0912f7182930a0192847cb1928374659102938',
    action: 'RESTORE_VERIFIED_100',
    timestamp: new Date(Date.now() - 86100000).toISOString(),
    data: { incident_id: 'inc-92a1-4fd2', verified_files: 16, status: 'RESOLVED' },
  },
];

// ── Mock API Methods ───────────────────────────────────────────────────────

export async function getHealth() {
  return { status: 'ok', uptime: Math.floor(performance.now() / 1000), timestamp: new Date().toISOString() };
}

export async function getBaseline(_bucket = CONFIG.BUCKET_NAME) {
  return { ...mockBaseline };
}

export async function createBaseline(bucket = CONFIG.BUCKET_NAME) {
  mockBaseline = {
    ...mockBaseline,
    bucket,
    version: mockBaseline.version + 1,
    created_at: new Date().toISOString(),
  };
  return { ...mockBaseline };
}

export async function getDetectionRuns(limit = 50) {
  const runs = [];
  const now = Date.now();
  for (let i = limit - 1; i >= 0; i--) {
    const time = new Date(now - i * 10000).toISOString();
    runs.push({
      id: `run-${i}`,
      created_at: time,
      change_rate: (Math.sin(i / 5) * 0.04 + 0.02).toFixed(4),
      threshold: 0.30,
      canary_triggered: false,
      verdict: 'normal',
    });
  }
  return runs;
}

export async function getIncidents() {
  return [...mockIncidents];
}

export async function getIncident(id) {
  const inc = mockIncidents.find((i) => i.id === id);
  if (!inc) {
    const err = new Error(`Incident ${id} not found`);
    err.code = 'not_found';
    throw err;
  }
  return { ...inc };
}

export async function startRestore(incidentId) {
  const jobId = `job-restore-${Date.now()}`;
  mockRestoreJobs[jobId] = {
    id: jobId,
    incident_id: incidentId,
    status: 'running',
    total_files: 16,
    valid_files: 0,
    modified_files: 0,
    started_at: new Date().toISOString(),
    finished_at: null,
    results: [],
  };
  return { job_id: jobId, status: 'running' };
}

export async function getRestoreJob(jobId) {
  const job = mockRestoreJobs[jobId];
  if (!job) {
    const err = new Error(`Restore job ${jobId} not found`);
    err.code = 'not_found';
    throw err;
  }
  return { ...job };
}

export async function getAuditLog() {
  return [...mockAuditLog];
}

// ── Helper to push live incident for story playback ────────────────────────
export function _addMockIncident(incident) {
  mockIncidents.unshift(incident);
}

export function _addMockAuditBlock(entry) {
  mockAuditLog.push(entry);
}
