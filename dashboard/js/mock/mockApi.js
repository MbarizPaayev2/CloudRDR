/**
 * @file dashboard/js/mock/mockApi.js
 *
 * Mock API Fixtures for CloudRDR Dashboard Demo.
 * Provides a complete, realistic forensic story:
 *   1. Initial clean operations (normal change rates < 5%)
 *   2. Sudden LockBit-style ransomware spike (44% modification + canary tripped)
 *   3. Automated account freeze & signed Ed25519 incident record
 *   4. Verified restore showing 100% VALID restoration against pre-attack SHA-256
 *   5. Hash-chained audit ledger with unbroken cryptographic links
 *   6. Full enterprise SOC data models (KPIs, System status, Recovery health, Storage overview)
 */

// Helper to generate ISO timestamps offset from now
const now = Date.now();
const minutesAgo = (m) => new Date(now - m * 60 * 1000).toISOString();
const secondsAgo = (s) => new Date(now - s * 1000).toISOString();
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();

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
   * GET /status/system
   * Compact system status strip (Section 3)
   */
  async getSystemStatus() {
    return {
      detectionEngine: {
        status: 'active',
        label: 'Active',
        detail: 'Sliding-window: 30s',
        lastChecked: secondsAgo(15),
      },
      cloudStorage: {
        status: 'connected',
        label: 'Connected',
        detail: 'local-storage / protected',
        lastChecked: secondsAgo(25),
      },
      baselineIntegrity: {
        status: 'verified',
        label: 'Verified',
        detail: 'Merkle root confirmed',
        lastChecked: minutesAgo(2),
      },
      backupService: {
        status: 'healthy',
        label: 'Healthy',
        detail: 'AES-256-GCM AEAD Tag verified',
        lastChecked: minutesAgo(5),
      },
    };
  },

  /**
   * GET /metrics/kpis
   * KPI Overview (Section 4)
   */
  async getKpis() {
    this._ensureState();
    const activeCount = this._mockIncidents.filter((i) => i.status !== 'resolved').length;
    return {
      protectedFiles: {
        total: 50,
        baselined: 50,
        coveragePct: 100,
        label: 'Protected Files',
        secondary: '100% valid baselines captured',
      },
      activeIncidents: {
        total: activeCount,
        critical: activeCount,
        high: 0,
        label: 'Active Incidents',
        secondary:
          activeCount > 0
            ? `${activeCount} critical threat contained (frozen)`
            : 'All incidents resolved (0 active threats)',
      },
      detectionEvents: {
        total: 24,
        diffPeriod: '+18 vs previous 1H period',
        label: 'Detection Events',
        secondary: 'Monitored across 60s sliding window',
      },
      backupIntegrity: {
        verifiedPct: 100,
        verifiedCount: 10,
        failedCount: 0,
        lastVerification: minutesAgo(4),
        label: 'Backup Integrity',
        secondary: '10/10 verified (0 failed)',
      },
    };
  },

  /**
   * GET /telemetry/activity?range=24H
   * Main Threat Activity Chart (Section 5)
   */
  async getThreatActivity(timeRange = '24H') {
    const points = [];
    let count = 12;
    let stepMinutes = 120; // 24h default

    if (timeRange === '1H') {
      count = 12;
      stepMinutes = 5;
    } else if (timeRange === '6H') {
      count = 12;
      stepMinutes = 30;
    } else if (timeRange === '7D') {
      count = 14;
      stepMinutes = 720;
    }

    for (let i = count - 1; i >= 0; i--) {
      const t = new Date(now - i * stepMinutes * 60 * 1000);
      let normal = Math.floor(Math.random() * 5) + 2;
      let suspicious = 0;
      let incidentMarker = false;

      // Spike during the last 20 minutes
      if (i === 1) {
        normal = 12;
        suspicious = 22;
        incidentMarker = true;
      } else if (i === 2) {
        suspicious = 7;
      }

      points.push({
        timestamp: t.toISOString(),
        timeLabel: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        normalModifications: normal,
        suspiciousModifications: suspicious,
        incidentMarker,
      });
    }

    return {
      timeRange,
      points,
    };
  },

  /**
   * GET /detection/summary
   * Detection Summary Panel (Section 6)
   */
  async getDetectionEngineSummary() {
    this._ensureState();
    const hasActive = this._mockIncidents.some((i) => i.status !== 'resolved');
    if (!hasActive) {
      return {
        status: 'active',
        modificationThreshold: 0.3,
        windowSeconds: 30,
        currentObservedRate: 0.02,
        verdict: 'normal',
        canaryTriggered: false,
        canaryPath: 'canary/tripwire_sentinel.docx',
        recentDetectionAt: minutesAgo(14),
        pendingCases: 0,
        mode: 'deterministic-simulation',
      };
    }
    return {
      status: 'active',
      modificationThreshold: 0.3,
      windowSeconds: 30,
      currentObservedRate: 0.44,
      verdict: 'ransomware',
      canaryTriggered: true,
      canaryPath: 'canary/tripwire_sentinel.docx',
      recentDetectionAt: minutesAgo(4),
      pendingCases: 1,
      mode: 'deterministic-simulation',
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

  _ensureState() {
    if (!this._mockIncidents) {
      this._mockIncidents = [
        {
          id: 'inc-9f81a7b4-32d8-4f1b-a944-598bc817ea20',
          detection_run_id: 'run-06',
          account_id: 'finance-prod-01',
          severity: 'Critical',
          detection_reason: 'CANARY_MODIFIED',
          status: 'frozen', // Active incident waiting for restoration
          status_label: 'Contained (Frozen)',
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
          severity: 'High',
          detection_reason: 'MASS_MODIFICATION',
          status: 'resolved',
          status_label: 'Recovery Verified',
          affected_paths: ['test/sample_a.txt', 'test/sample_b.txt', 'test/sample_c.txt'],
          detected_at: minutesAgo(180),
          frozen_at: minutesAgo(179.9),
          resolved_at: minutesAgo(175),
          record_signature:
            '88c3a9182739182739182739182739182739182739182739182739182739182739182739182739182739182739182739',
          signing_key_id: 'ed25519-hsm-soc-key-01',
        },
      ];
    }

    if (!this._mockEvents) {
      this._mockEvents = [
        {
          id: 'evt-01',
          type: 'canary_accessed',
          icon: 'alert',
          severity: 'Critical',
          description: 'Canary honeytoken modified: canary/tripwire_sentinel.docx',
          target: 'canary/tripwire_sentinel.docx',
          identity: 'service-acc-backup-sync',
          timestamp: minutesAgo(4),
        },
        {
          id: 'evt-02',
          type: 'threshold_exceeded',
          icon: 'activity',
          severity: 'Critical',
          description: 'Sliding-window modification threshold exceeded (44% > 30%)',
          target: 'finance-prod-01',
          identity: 'monitored-bucket',
          timestamp: minutesAgo(4.1),
        },
        {
          id: 'evt-03',
          type: 'identity_isolated',
          icon: 'freeze',
          severity: 'High',
          description: 'IAM deny-all write lock dispatched to account: finance-prod-01',
          target: 'finance-prod-01',
          identity: 'devops-freeze-service',
          timestamp: minutesAgo(3.9),
        },
        {
          id: 'evt-04',
          type: 'evidence_signed',
          icon: 'sign',
          severity: 'Info',
          description: 'Incident manifest sealed with Ed25519 signature',
          target: 'inc-9f81a7b4',
          identity: 'ed25519-hsm-soc-key-01',
          timestamp: minutesAgo(3.8),
        },
        {
          id: 'evt-05',
          type: 'backup_verified',
          icon: 'shieldCheck',
          severity: 'Success',
          description: 'AEAD authenticated decryption verified: 10/10 files valid',
          target: 'restore-job-77a82b',
          identity: 'recovery-daemon',
          timestamp: secondsAgo(15),
        },
        {
          id: 'evt-06',
          type: 'baseline_verified',
          icon: 'check',
          severity: 'Success',
          description: 'Merkle root verified against immutable baseline snapshot #1',
          target: 'f7bbb36aa01a...',
          identity: 'cloudrdr-agent-v1',
          timestamp: minutesAgo(120),
        },
      ];
    }
  },

  /**
   * GET /incidents
   * Incident Queue (Section 7)
   */
  async getIncidents() {
    this._ensureState();
    return [...this._mockIncidents];
  },

  /**
   * GET /incidents/:id
   */
  async getIncidentById(id) {
    this._ensureState();
    const found = this._mockIncidents.find((inc) => inc.id === id);
    if (!found) {
      throw { error: { code: 'not_found', message: `Incident ${id} not found` } };
    }
    return found;
  },

  /**
   * GET /events/recent
   * Recent Security Events Feed (Section 8)
   */
  async getSecurityEvents(limit = 10) {
    this._ensureState();
    return this._mockEvents.slice(0, limit);
  },

  /**
   * GET /recovery/health
   * Backup & Recovery Health (Section 9)
   */
  async getRecoveryHealth() {
    return {
      latestBackupAt: minutesAgo(120),
      lastSuccessfulRestoreAt: secondsAgo(15),
      pendingRecoveryJobs: 0,
      failedRecoveryJobs: 0,
      verifiedFilesCount: 10,
      overallIntegrity: 'VALID',
      activeProgress: 100,
      activeStatus: 'Completed & Verified',
      checks: [
        {
          name: 'AES-256-GCM AEAD Tag Authentication',
          result: 'VALID',
          details: 'Authentication tag verified before ciphertext decryption',
        },
        {
          name: 'Pre-Attack SHA-256 Baseline Match',
          result: 'VALID',
          details: 'Byte-for-byte SHA-256 matches pre-incident baseline',
        },
        {
          name: 'Backup Manifest Ed25519 Signature',
          result: 'VALID',
          details: 'HSM signature cryptographically verified',
        },
        {
          name: 'Merkle Root Consistency',
          result: 'VALID',
          details: 'Restored leaf digests recompute to trusted Merkle root',
        },
      ],
    };
  },

  /**
   * GET /integrity/cryptographic
   * Cryptographic Integrity Summary (Section 10)
   */
  async getCryptographicIntegrity() {
    return {
      lastSealedAt: minutesAgo(3.8),
      checks: [
        {
          id: 'chk-baseline',
          name: 'Baseline SHA-256 Hashes',
          result: 'Verified',
          lastVerifiedAt: minutesAgo(2),
          explanation: 'All 50 monitored objects match immutable baseline hashes.',
        },
        {
          id: 'chk-merkle',
          name: 'Trusted Merkle Root',
          result: 'Verified',
          lastVerifiedAt: minutesAgo(2),
          explanation: 'Root f7bbb36a... is cryptographically consistent with leaf digests.',
        },
        {
          id: 'chk-signature',
          name: 'Incident Manifest Signature',
          result: 'Verified',
          lastVerifiedAt: minutesAgo(3.8),
          explanation: 'Signed with Ed25519 HSM key (ed25519-hsm-soc-key-01).',
        },
        {
          id: 'chk-hashchain',
          name: 'Audit Hash-Chain',
          result: 'Verified',
          lastVerifiedAt: secondsAgo(10),
          explanation: 'Zero broken links across all 6 blocks from Genesis to latest.',
        },
        {
          id: 'chk-timestamp',
          name: 'RFC-3161 Evidence Timestamp',
          result: 'Verified',
          lastVerifiedAt: minutesAgo(3.8),
          explanation: 'Trusted UTC time token securely embedded in manifest.',
        },
      ],
    };
  },

  /**
   * GET /storage/overview
   * Protected Storage Overview (Section 11)
   */
  async getProtectedStorage() {
    return {
      provider: 'Local Filesystem Storage (S3 / Supabase Compliant)',
      protectedObjects: 50,
      validBaselines: 50,
      coveragePct: 100,
      requiringReview: 0,
      connectivity: 'Connected',
      versioning: 'Enabled',
      immutability: 'Active (WORM Policies)',
      prefixes: [
        {
          prefix: 'files/',
          count: 38,
          type: 'Corporate Spreadsheets & Documents',
          status: 'Protected',
        },
        { prefix: 'canary/', count: 2, type: 'Tripwire Sentinels (Zero-Touch)', status: 'Armed' },
        { prefix: 'evidence/', count: 5, type: 'Forensic Incident Bundles', status: 'Immutable' },
        { prefix: 'backup/', count: 50, type: 'AES-256-GCM Encrypted Backups', status: 'Verified' },
      ],
    };
  },

  /**
   * POST /incidents/:id/restore
   */
  async restoreIncident(incidentId) {
    this._ensureState();
    const incident = await this.getIncidentById(incidentId);

    incident.status = 'resolved';
    incident.status_label = 'Recovery Verified';
    incident.resolved_at = new Date().toISOString();

    // Generate verified recovery report for mock
    const results = (incident.affected_paths || []).map((path) => {
      const expectedSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      return {
        path,
        expected_sha256: expectedSha256,
        restored_sha256: expectedSha256,
        result: 'VALID',
        aead_verified: true,
      };
    });

    if (this._mockEvents) {
      this._mockEvents.unshift({
        id: `evt-restore-${Date.now()}`,
        type: 'backup_verified',
        icon: 'shieldCheck',
        severity: 'Success',
        description: `Recovery authorized & verified: ${results.length}/${results.length} files restored byte-for-byte`,
        target: incident.account_id,
        identity: 'soc-operator',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      jobId: `restore-job-${Date.now().toString(16)}`,
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
   * Demo Simulation Triggers
   */
  async triggerCanaryAlert() {
    this._ensureState();
    const newInc = {
      id: `inc-canary-${Date.now().toString(16).slice(-8)}`,
      detection_run_id: `run-${Date.now().toString(16).slice(-4)}`,
      account_id: 'finance-prod-01',
      severity: 'Critical',
      detection_reason: 'CANARY_MODIFIED',
      status: 'frozen',
      status_label: 'Contained (Frozen)',
      affected_paths: [
        'canary/tripwire_sentinel.docx',
        'canary/salary_2026.xlsx',
        'corporate/executive_memo.docx',
      ],
      detected_at: new Date().toISOString(),
      frozen_at: new Date().toISOString(),
      resolved_at: null,
      record_signature:
        '4a7e91bd8f26c3b88950d8847cb5c83f98c6d123e4b78912304918230948120938471928374918273491827349182734',
      signing_key_id: 'ed25519-hsm-soc-key-01',
    };
    this._mockIncidents.unshift(newInc);
    if (this._mockEvents) {
      this._mockEvents.unshift({
        id: `evt-canary-${Date.now()}`,
        type: 'canary_alert',
        icon: 'zap',
        severity: 'Critical',
        description:
          'Canary tripwire breached: canary/tripwire_sentinel.docx. Automated IAM write-freeze dispatched.',
        target: 'canary/tripwire_sentinel.docx',
        identity: 'tripwire-sentinel-daemon',
        timestamp: new Date().toISOString(),
      });
    }
    return newInc;
  },

  async simulateMassAttack() {
    this._ensureState();
    const newInc = {
      id: `inc-attack-${Date.now().toString(16).slice(-8)}`,
      detection_run_id: `run-${Date.now().toString(16).slice(-4)}`,
      account_id: 'finance-prod-01',
      severity: 'Critical',
      detection_reason: 'MASS_MODIFICATION',
      status: 'frozen',
      status_label: 'Contained (Frozen)',
      affected_paths: [
        'corporate/payroll_q3.xlsx',
        'financials/gl_ledger_2026.dat',
        'financials/q2_audit_report.pdf',
        'canary/tripwire_sentinel.docx',
        'legal/nda_templates.docx',
        'hr/employee_roster.csv',
      ],
      detected_at: new Date().toISOString(),
      frozen_at: new Date().toISOString(),
      resolved_at: null,
      record_signature:
        '33c1a892019481273948127394812739481273948127394812739481273948127394812739481273948127394812739',
      signing_key_id: 'ed25519-hsm-soc-key-01',
    };
    this._mockIncidents.unshift(newInc);
    if (this._mockEvents) {
      this._mockEvents.unshift({
        id: `evt-attack-${Date.now()}`,
        type: 'threshold_exceeded',
        icon: 'activity',
        severity: 'Critical',
        description:
          'Sliding-window modification threshold exceeded (44% > 30%). Automated IAM freeze active.',
        target: 'finance-prod-01',
        identity: 'detection-engine',
        timestamp: new Date().toISOString(),
      });
    }
    return newInc;
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
