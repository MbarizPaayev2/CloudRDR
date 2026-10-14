/**
 * @file dashboard/js/mock/mockApi.js
 *
 * Mock API Fixtures for CloudRDR Dashboard Demo.
 * Provides a complete, realistic forensic story:
 *   1. Initial clean operations (normal change rates < 5%)
 *   2. Sudden LockBit-style ransomware spike (45% modification + canary tripped)
 *   3. Automated account freeze & signed Ed25519 incident record
 *   4. Verified restore showing 100% VALID restoration against pre-attack SHA-256
 *   5. Hash-chained audit ledger with unbroken cryptographic links
 */

// Helper to generate ISO timestamps offset from now
const now = Date.now();
const minutesAgo = (m) => new Date(now - m * 60 * 1000).toISOString();
const secondsAgo = (s) => new Date(now - s * 1000).toISOString();

export const mockApi = {
  /**
   * GET /health
   */
  async getHealth() {
    return {
      status: 'ok',
      uptime: 86420.5,
      timestamp: new Date().toISOString(),
      provider: 'local-filesystem (mock)',
    };
  },

  /**
   * GET /baseline/:bucket
   */
  async getBaseline(bucket = 'protected') {
    return {
      bucket,
      version: 1,
      merkle_root: 'f7bbb36aa01a64a15ccf3ebfebfc51482d32323d59c01b94dbea44d21a32dd5a',
      file_count: 50,
      created_at: minutesAgo(120),
      created_by: 'cloudrdr-agent-v1',
    };
  },

  /**
   * POST /baseline
   */
  async createBaseline(bucket = 'protected') {
    return {
      bucket,
      version: 2,
      merkle_root: '9c5a1df4702ba064e438c71b69f6888463db8122c608f7aa9580eb5c3b934789',
      file_count: 50,
      created_at: new Date().toISOString(),
      created_by: 'soc-operator-manual',
    };
  },

  /**
   * GET /detection/runs?limit=50
   * Real-time sliding window telemetry: baseline -> spike -> containment
   */
  async getDetectionRuns(limit = 15) {
    const runs = [
      {
        id: 'run-01',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 1,
        change_rate: 0.02,
        threshold: 0.3,
        canary_triggered: false,
        verdict: 'normal',
        created_at: minutesAgo(14),
      },
      {
        id: 'run-02',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 2,
        change_rate: 0.04,
        threshold: 0.3,
        canary_triggered: false,
        verdict: 'normal',
        created_at: minutesAgo(12),
      },
      {
        id: 'run-03',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 1,
        change_rate: 0.02,
        threshold: 0.3,
        canary_triggered: false,
        verdict: 'normal',
        created_at: minutesAgo(10),
      },
      {
        id: 'run-04',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 4,
        change_rate: 0.08,
        threshold: 0.3,
        canary_triggered: false,
        verdict: 'normal',
        created_at: minutesAgo(8),
      },
      {
        id: 'run-05',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 7,
        change_rate: 0.14,
        threshold: 0.3,
        canary_triggered: false,
        verdict: 'suspicious',
        created_at: minutesAgo(6),
      },
      {
        id: 'run-06',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 22,
        change_rate: 0.44,
        threshold: 0.3,
        canary_triggered: true, // Attack hit canary trap!
        verdict: 'ransomware',
        created_at: minutesAgo(4),
      },
      {
        id: 'run-07',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 24,
        change_rate: 0.48,
        threshold: 0.3,
        canary_triggered: true,
        verdict: 'ransomware',
        created_at: minutesAgo(2),
      },
      {
        id: 'run-08',
        account_id: 'finance-prod-01',
        window_seconds: 60,
        total_files: 50,
        changed_files: 0,
        change_rate: 0.0,
        threshold: 0.3,
        canary_triggered: false,
        verdict: 'normal',
        created_at: secondsAgo(30),
      },
    ];

    return runs.slice(-limit);
  },

  /**
   * GET /incidents
   */
  async getIncidents() {
    return [
      {
        id: 'inc-9f81a7b4-32d8-4f1b-a944-598bc817ea20',
        detection_run_id: 'run-06',
        account_id: 'finance-prod-01',
        status: 'frozen', // Active incident waiting for restoration
        affected_paths: [
          'corporate/payroll_q3.xlsx',
          'corporate/executive_memo.docx',
          'financials/gl_ledger_2026.dat',
          'financials/q2_audit_report.pdf',
          'canary/tripwire_sentinel.docx', // Canary file
          'legal/nda_templates.docx',
          'hr/employee_roster.csv',
          'operations/vendor_invoices.pdf',
          'research/cloud_sec_patent.pdf',
          'database/backup_dump.sql',
        ],
        detected_at: minutesAgo(4),
        frozen_at: minutesAgo(3.9),
        resolved_at: null,
        record_signature:
          '4a7e91bd8f26c3b88950d8847cb5c83f98c6d123e4b78912304918230948120938471928374918273491827349182734',
        signing_key_id: 'ed25519-hsm-soc-key-01',
      },
      {
        id: 'inc-3a10b982-8411-4822-b582-771928491823',
        detection_run_id: 'run-prev-01',
        account_id: 'dev-sandbox-02',
        status: 'resolved',
        affected_paths: ['test/sample_a.txt', 'test/sample_b.txt', 'test/sample_c.txt'],
        detected_at: minutesAgo(180),
        frozen_at: minutesAgo(179.9),
        resolved_at: minutesAgo(175),
        record_signature:
          '88c3a9182739182739182739182739182739182739182739182739182739182739182739182739182739182739182739',
        signing_key_id: 'ed25519-hsm-soc-key-01',
      },
    ];
  },

  /**
   * GET /incidents/:id
   */
  async getIncidentById(id) {
    const list = await this.getIncidents();
    const found = list.find((inc) => inc.id === id);
    if (!found) {
      throw { error: { code: 'not_found', message: `Incident ${id} not found` } };
    }
    return found;
  },

  /**
   * POST /incidents/:id/restore
   */
  async restoreIncident(incidentId) {
    const incident = await this.getIncidentById(incidentId);

    // Generate verified recovery report for mock
    const results = incident.affected_paths.map((path) => {
      // Deterministic mock hashes
      const expectedSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      return {
        path,
        expected_sha256: expectedSha256,
        restored_sha256: expectedSha256,
        result: 'VALID',
        aead_verified: true,
      };
    });

    return {
      jobId: 'restore-job-77a82b',
      incidentId,
      status: 'verified',
      totalFiles: results.length,
      validFiles: results.length,
      modifiedFiles: 0,
      missingFiles: 0,
      isFullyRestored: true,
      startedAt: new Date(Date.now() - 4500).toISOString(),
      finishedAt: new Date().toISOString(),
      results,
    };
  },

  /**
   * GET /restore/:jobId
   */
  async getRestoreJob(jobId) {
    return {
      id: jobId,
      incident_id: 'inc-9f81a7b4-32d8-4f1b-a944-598bc817ea20',
      status: 'verified',
      total_files: 10,
      valid_files: 10,
      modified_files: 0,
      started_at: new Date(Date.now() - 4500).toISOString(),
      finished_at: new Date().toISOString(),
      results: [
        {
          path: 'corporate/payroll_q3.xlsx',
          expected_sha256: '4a8b71...9f',
          restored_sha256: '4a8b71...9f',
          result: 'VALID',
        },
        {
          path: 'canary/tripwire_sentinel.docx',
          expected_sha256: '11c2e4...3a',
          restored_sha256: '11c2e4...3a',
          result: 'VALID',
        },
      ],
    };
  },

  /**
   * Cryptographic Hash-Chained Audit Log Entries
   * Proves immutability from Genesis Block to Latest Event
   */
  async getAuditLog() {
    return [
      {
        index: 0,
        hash: '0000a89b71239c4a89b71239c4a89b71239c4a89b71239c4a89b71239c4a89b7',
        prevHash: '0'.repeat(64),
        timestamp: minutesAgo(120),
        data: { event: 'GENESIS_BASELINE_CREATED', version: 1, fileCount: 50 },
        valid: true,
      },
      {
        index: 1,
        hash: '71a4f0283c18b7201948b8172938471928374918273491827349182734918273',
        prevHash: '0000a89b71239c4a89b71239c4a89b71239c4a89b71239c4a89b71239c4a89b7',
        timestamp: minutesAgo(90),
        data: { event: 'MONITOR_AGENT_CALIBRATED', agentId: 'mon-01' },
        valid: true,
      },
      {
        index: 2,
        hash: '99b8c12748192837491827349182734918273491827349182734918273491827',
        prevHash: '71a4f0283c18b7201948b8172938471928374918273491827349182734918273',
        timestamp: minutesAgo(4),
        data: { event: 'RANSOMWARE_SPIKE_DETECTED', changeRate: 0.44, canaryTriggered: true },
        valid: true,
      },
      {
        index: 3,
        hash: 'c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01234',
        prevHash: '99b8c12748192837491827349182734918273491827349182734918273491827',
        timestamp: minutesAgo(3.9),
        data: { event: 'IAM_WRITE_FREEZE_DISPATCHED', accountId: 'finance-prod-01' },
        valid: true,
      },
      {
        index: 4,
        hash: 'e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
        prevHash: 'c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01234',
        timestamp: minutesAgo(3.8),
        data: { event: 'INCIDENT_RECORD_SIGNED', keyId: 'ed25519-hsm-soc-key-01' },
        valid: true,
      },
      {
        index: 5,
        hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        prevHash: 'e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
        timestamp: secondsAgo(10),
        data: { event: 'VERIFIED_RESTORE_100_PERCENT_VALID', filesRestored: 10 },
        valid: true,
      },
    ];
  },
};
