/**
 * @file test/qa-audit.js
 * Comprehensive In-Depth Automated QA Audit Script for CloudRDR.
 * Tests every API endpoint, auth barrier, lifecycle simulation, and HTML element binding.
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildServer } from '../backend/src/api/server.js';
import cfg from '../backend/src/config/index.js';

const API_KEY = cfg.api.key || 'cloudrdr-default-key-2026';
const authHeaders = {
  'x-api-key': API_KEY,
};

async function runQaAudit() {
  console.log('================================================================');
  console.log('              CLOUDRDR AUTOMATED COMPREHENSIVE QA AUDIT         ');
  console.log('================================================================\n');

  const app = await buildServer({ enableLogger: false });
  await app.ready();

  const results = [];
  function record(name, pass, detail = '') {
    results.push({ name, pass, detail });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${detail ? '(' + detail + ')' : ''}`);
    if (!pass) throw new Error(`QA Assertion Failed: ${name} — ${detail}`);
  }

  try {
    // ── SECTION 1: PUBLIC ROUTES & HEALTH CHECK ─────────────────────────────
    console.log('\n--- SECTION 1: PUBLIC & STATIC ROUTES ---');
    {
      const res = await app.inject({ method: 'GET', url: '/health' });
      record('/health status code 200', res.statusCode === 200);
      const json = res.json();
      record('/health payload status ok', json.status === 'ok');
    }
    {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      record('/api/health status code 200', res.statusCode === 200);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/' });
      record('GET / serves landing page', res.statusCode === 200 && res.headers['content-type'].includes('text/html'));
    }
    {
      const res = await app.inject({ method: 'GET', url: '/login' });
      record('GET /login serves login page', res.statusCode === 200);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/register' });
      record('GET /register serves registration page', res.statusCode === 200);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/dashboard' });
      record('GET /dashboard redirects unauthenticated requests', res.statusCode === 302, res.headers.location);
    }

    // ── SECTION 2: AUTHENTICATION & ACCESS CONTROL ──────────────────────────
    console.log('\n--- SECTION 2: AUTHENTICATION & SESSION MANAGEMENT ---');
    {
      // 2.1 Missing API key / session on protected route
      const res = await app.inject({ method: 'GET', url: '/incidents' });
      record('GET /incidents blocked without auth (401)', res.statusCode === 401);
    }
    {
      // 2.2 Invalid API key
      const res = await app.inject({
        method: 'GET',
        url: '/incidents',
        headers: { 'x-api-key': 'invalid-bogus-key' },
      });
      record('GET /incidents blocked with invalid API key (401)', res.statusCode === 401);
    }
    {
      // 2.3 Valid API key
      const res = await app.inject({
        method: 'GET',
        url: '/incidents',
        headers: authHeaders,
      });
      record('GET /incidents allowed with valid API key (200)', res.statusCode === 200);
      const body = res.json();
      record('/incidents returns array', Array.isArray(body.incidents));
    }
    {
      // 2.4 User Registration, Login & Session Cookie Flow
      const testEmail = `qa-operator-${Date.now()}@cloudrdr.internal`;
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          fullName: 'QA Security Lead',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          role: 'admin',
        },
      });
      record('POST /api/auth/register succeeds (201)', regRes.statusCode === 201);
      const regBody = regRes.json();
      record('Register returns session token', !!regBody.token && !!regBody.user);

      // Verify Session via /api/auth/me
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${regBody.token}` },
      });
      record('GET /api/auth/me verifies session token (200)', meRes.statusCode === 200);
      const meBody = meRes.json();
      record('GET /api/auth/me returns correct user', meBody.user.email === testEmail);

      // Verify Session allows accessing /dashboard without redirect
      const dashRes = await app.inject({
        method: 'GET',
        url: '/dashboard',
        headers: { cookie: `cloudrdr_session=${encodeURIComponent(regBody.token)}` },
      });
      record('Session cookie grants access to /dashboard (200 HTML)', dashRes.statusCode === 200);
    }

    // ── SECTION 3: BASELINE SERVICE & AUTO-SEEDING ──────────────────────────
    console.log('\n--- SECTION 3: BASELINES & CRYPTOGRAPHIC SEEDING ---');
    {
      const basePost = await app.inject({
        method: 'POST',
        url: '/baseline',
        headers: authHeaders,
        payload: { bucket: 'protected', autoSeed: true },
      });
      record('POST /baseline captures snapshot (201)', basePost.statusCode === 201);
      const baseData = basePost.json();
      record('Baseline snapshot has valid Merkle Root', typeof baseData.merkleRoot === 'string' && baseData.merkleRoot.length === 64);
      record('Baseline captures at least 1 object', baseData.fileCount > 0, `${baseData.fileCount} files`);

      const baseGet = await app.inject({
        method: 'GET',
        url: '/baseline/protected',
        headers: authHeaders,
      });
      record('GET /baseline/protected returns snapshot (200)', baseGet.statusCode === 200);
      const getJson = baseGet.json();
      record('getBaseline returns root-level merkle_root', !!getJson.merkle_root);
      record('getBaseline returns root-level file_count', getJson.file_count > 0);
      record('getBaseline returns files array', Array.isArray(getJson.files));
    }

    // ── SECTION 4: SOC TELEMETRY ENDPOINTS ──────────────────────────────────
    console.log('\n--- SECTION 4: SOC TELEMETRY ENDPOINTS ---');
    {
      const res = await app.inject({ method: 'GET', url: '/status/system', headers: authHeaders });
      record('GET /status/system returns 200', res.statusCode === 200);
      const data = res.json();
      record('status/system has detectionEngine', !!data.detectionEngine);
      record('status/system has cloudStorage', !!data.cloudStorage);
      record('status/system has baselineIntegrity', !!data.baselineIntegrity);
      record('status/system has backupService', !!data.backupService);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/metrics/kpis', headers: authHeaders });
      record('GET /metrics/kpis returns 200', res.statusCode === 200);
      const data = res.json();
      record('kpis has protectedFiles', typeof data.protectedFiles?.total === 'number');
      record('kpis has activeIncidents', typeof data.activeIncidents?.total === 'number');
      record('kpis has detectionEvents', typeof data.detectionEvents?.total === 'number');
      record('kpis has backupIntegrity', typeof data.backupIntegrity?.verifiedPct === 'number');
    }
    {
      const res = await app.inject({ method: 'GET', url: '/telemetry/activity?range=24H', headers: authHeaders });
      record('GET /telemetry/activity returns 200', res.statusCode === 200);
      const data = res.json();
      record('activity returns points array', Array.isArray(data.points) && data.points.length > 0);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/events/recent?limit=10', headers: authHeaders });
      record('GET /events/recent returns 200', res.statusCode === 200);
      const data = res.json();
      record('events/recent returns array', Array.isArray(data));
    }
    {
      const res = await app.inject({ method: 'GET', url: '/storage/overview', headers: authHeaders });
      record('GET /storage/overview returns 200', res.statusCode === 200);
      const data = res.json();
      record('storage/overview has prefixes array', Array.isArray(data.prefixes) && data.prefixes.length > 0);
      record('prefixes support both prefix and name', !!data.prefixes[0].prefix && !!data.prefixes[0].name);
      record('prefixes support both count and objectCount', data.prefixes[0].count !== undefined && data.prefixes[0].objectCount !== undefined);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/recovery/health', headers: authHeaders });
      record('GET /recovery/health returns 200', res.statusCode === 200);
      const data = res.json();
      record('recovery/health has checks array', Array.isArray(data.checks));
      record('checks items support status and result', !!data.checks[0].status && !!data.checks[0].result);
      record('recovery/health has latestRestoreSummary', !!data.latestRestoreSummary);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/integrity/cryptographic', headers: authHeaders });
      record('GET /integrity/cryptographic returns 200', res.statusCode === 200);
      const data = res.json();
      record('integrity checks array present', Array.isArray(data.checks) && data.checks.length > 0);
      record('checks item has name, check, result, status', !!data.checks[0].name && !!data.checks[0].check && !!data.checks[0].result && !!data.checks[0].status);
    }
    {
      const res = await app.inject({ method: 'POST', url: '/evidence/verify', headers: authHeaders });
      record('POST /evidence/verify returns 200', res.statusCode === 200);
      const data = res.json();
      record('evidence/verify returns verified boolean', typeof data.verified === 'boolean');
      record('evidence/verify supports totalAuditBlocks and entriesCount', typeof data.totalAuditBlocks === 'number' && typeof data.entriesCount === 'number');
      record('evidence/verify returns merkleRoot', !!data.merkleRoot);
    }
    {
      const res = await app.inject({ method: 'GET', url: '/audit', headers: authHeaders });
      record('GET /audit returns 200', res.statusCode === 200);
      const data = res.json();
      record('audit returns hash-chained entries', Array.isArray(data) && data.length > 0);
      record('audit block contains hash, prevHash, valid', !!data[0].hash && !!data[0].prevHash && typeof data[0].valid === 'boolean');
    }

    // ── SECTION 5: DETECTION ENGINE API ─────────────────────────────────────
    console.log('\n--- SECTION 5: DETECTION ENGINE & CONFIGURATION ---');
    {
      const res = await app.inject({ method: 'GET', url: '/detection/summary', headers: authHeaders });
      record('GET /detection/summary returns 200', res.statusCode === 200);
      const data = res.json();
      record('summary returns windowSeconds', typeof data.windowSeconds === 'number');
      record('summary returns modificationThreshold', typeof data.modificationThreshold === 'number');
    }
    {
      const updateRes = await app.inject({
        method: 'POST',
        url: '/detection/config',
        headers: authHeaders,
        payload: { windowSeconds: 45, ransomwareRate: 0.35 },
      });
      record('POST /detection/config updates thresholds (200)', updateRes.statusCode === 200);
      const upData = updateRes.json();
      record('thresholds updated to windowSeconds: 45', upData.thresholds.windowSeconds === 45);
      record('thresholds updated to ransomwareRate: 0.35', upData.thresholds.ransomwareRate === 0.35);

      // Verify immediate reflection on GET /detection/summary
      const sumCheck = await app.inject({ method: 'GET', url: '/detection/summary', headers: authHeaders });
      const sumJson = sumCheck.json();
      record('GET /detection/summary reflects updated windowSeconds: 45', sumJson.windowSeconds === 45);
      record('GET /detection/summary reflects updated modificationThreshold: 0.35', sumJson.modificationThreshold === 0.35);

      // Restore default thresholds
      await app.inject({
        method: 'POST',
        url: '/detection/config',
        headers: authHeaders,
        payload: { windowSeconds: 30, ransomwareRate: 0.30 },
      });
    }

    // ── SECTION 6: AGENT DEPLOYMENT & FLEET MANAGEMENT ──────────────────────
    console.log('\n--- SECTION 6: AGENT FLEET API & PERSISTENCE ---');
    {
      const statusRes = await app.inject({ method: 'GET', url: '/api/agent/status' });
      record('GET /api/agent/status returns 200', statusRes.statusCode === 200);
      const stData = statusRes.json();
      record('agent status has connectedAgents list', Array.isArray(stData.connectedAgents) && stData.connectedAgents.length > 0);
    }
    let newAgentId = '';
    {
      // Register new agent
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/agent/register',
        payload: {
          hostname: 'qa-test-storage-node',
          platform: 'Linux (Ubuntu 24.04 LTS)',
          arch: 'x86_64',
          group: 'qa-cluster',
          engine: 'Node.js v2.4.0',
          watchPath: './data/local-storage',
          version: '2.4.0',
        },
      });
      record('POST /api/agent/register succeeds (200)', regRes.statusCode === 200);
      const regJson = regRes.json();
      newAgentId = regJson.agentId;
      record('agent assigned agentId and token', !!newAgentId && !!regJson.token);

      // Verify new agent is listed in /api/agent/status
      const stRes2 = await app.inject({ method: 'GET', url: '/api/agent/status' });
      const stJson2 = stRes2.json();
      const found = stJson2.connectedAgents.some((a) => a.agentId === newAgentId);
      record('new agent persisted and returned in GET /api/agent/status', found);
    }
    {
      // Ping agent via POST /api/agent/ping
      const pingRes = await app.inject({
        method: 'POST',
        url: '/api/agent/ping',
        payload: { agentId: newAgentId, clientRttMs: 14 },
      });
      record('POST /api/agent/ping succeeds (200)', pingRes.statusCode === 200);
      const pingJson = pingRes.json();
      record('ping returns ok: true', pingJson.ok === true && pingJson.status === 'online');
    }
    {
      // Restart agent via POST /api/agent/restart
      const restartRes = await app.inject({
        method: 'POST',
        url: '/api/agent/restart',
        payload: { agentId: newAgentId },
      });
      record('POST /api/agent/restart succeeds (200)', restartRes.statusCode === 200);
      const resJson = restartRes.json();
      record('restart returns RESTART_ACK command', resJson.command === 'RESTART_ACK');
    }
    {
      // Agent downloads & install scripts
      const dlJs = await app.inject({ method: 'GET', url: '/api/agent/download' });
      record('GET /api/agent/download serves JS runner (200)', dlJs.statusCode === 200 && dlJs.body.includes('CloudRDR Enterprise'));

      const dlGo = await app.inject({ method: 'GET', url: '/api/agent/download/go' });
      record('GET /api/agent/download/go serves Go source (200)', dlGo.statusCode === 200 && dlGo.body.includes('package main'));

      const dlC = await app.inject({ method: 'GET', url: '/api/agent/download/c' });
      record('GET /api/agent/download/c serves C source (200)', dlC.statusCode === 200 && dlC.body.includes('cloudrdr_sha256.h'));

      const sysd = await app.inject({ method: 'GET', url: '/api/agent/systemd.service' });
      record('GET /api/agent/systemd.service serves systemd unit (200)', sysd.statusCode === 200 && sysd.body.includes('ExecStart=/usr/local/bin/cloudrdr-agent'));

      const instC = await app.inject({ method: 'GET', url: '/api/agent/install-c.sh' });
      record('GET /api/agent/install-c.sh serves Linux C installer (200)', instC.statusCode === 200 && instC.body.includes('cloudrdr-agent'));

      const instSh = await app.inject({ method: 'GET', url: '/api/agent/install.sh' });
      record('GET /api/agent/install.sh serves bash script (200)', instSh.statusCode === 200 && instSh.body.includes('#!/usr/bin/env bash'));

      const instPs = await app.inject({ method: 'GET', url: '/api/agent/install.ps1' });
      record('GET /api/agent/install.ps1 serves powershell script (200)', instPs.statusCode === 200 && instPs.body.includes('$env:CLOUDRDR_MANAGER'));

      const compose = await app.inject({ method: 'GET', url: '/api/agent/docker-compose.yml' });
      record('GET /api/agent/docker-compose.yml serves yaml (200)', compose.statusCode === 200 && compose.body.includes('cloudrdr-agent'));
    }

    // ── SECTION 7: REAL ATTACK, 1-BYTE TAMPER, FREEZE & VERIFIED RESTORE ────
    console.log('\n--- SECTION 7: ATTACK SIMULATION, TAMPER, FREEZE & CRYPTOGRAPHIC RESTORE ---');
    {
      // 7.1 Single-byte Tamper Simulation (Merkle DAG Demo)
      const tamperRes = await app.inject({
        method: 'POST',
        url: '/api/simulate/tamper',
        headers: authHeaders,
        payload: { revert: false },
      });
      record('POST /api/simulate/tamper mutates 1 byte (200)', tamperRes.statusCode === 200);
      const tamperData = tamperRes.json();
      record('tamper detects sha256 mismatch', tamperData.observedSha256 !== tamperData.expectedSha256);

      // Revert tamper
      const revertRes = await app.inject({
        method: 'POST',
        url: '/api/simulate/tamper',
        headers: authHeaders,
        payload: { revert: true },
      });
      record('POST /api/simulate/tamper reverts 1 byte (200)', revertRes.statusCode === 200);
      const revertData = revertRes.json();
      record('revert restores matching baseline sha256', revertData.observedSha256 === revertData.expectedSha256);
    }
    {
      // 7.2 Simulate Full Ransomware Attack (Creates real clean baseline backup + corrupts files + freezes)
      const attackRes = await app.inject({
        method: 'POST',
        url: '/api/simulate/attack',
        headers: authHeaders,
      });
      record('POST /api/simulate/attack launches attack (200)', attackRes.statusCode === 200);
      const attackJson = attackRes.json();
      record('attack creates incident with status: frozen', attackJson.incident?.status === 'frozen');
      const incidentId = attackJson.incidentId;

      // Verify incident details & timeline
      const incGet = await app.inject({ method: 'GET', url: `/incidents/${incidentId}`, headers: authHeaders });
      record('GET /incidents/:id retrieves incident (200)', incGet.statusCode === 200);
      const incTimeline = await app.inject({ method: 'GET', url: `/incidents/${incidentId}/timeline`, headers: authHeaders });
      record('GET /incidents/:id/timeline returns forensic timeline (200)', incTimeline.statusCode === 200);

      // Verify GET /integrity/cryptographic reports MODIFIED due to active threat
      const integCheck = await app.inject({ method: 'GET', url: '/integrity/cryptographic', headers: authHeaders });
      const integJson = integCheck.json();
      const baseChk = integJson.checks.find((c) => c.id === 'chk-baseline');
      record('chk-baseline status is MODIFIED during active incident', baseChk?.status === 'MODIFIED');

      // 7.3 Authorize Verified Restore for the Incident
      const restoreRes = await app.inject({
        method: 'POST',
        url: `/incidents/${incidentId}/restore`,
        headers: authHeaders,
        payload: { applyImmediately: true },
      });
      record('POST /incidents/:id/restore executes verified restore (200)', restoreRes.statusCode === 200);
      const restoreJson = restoreRes.json();
      record('restore verifies files valid (0 mismatches)', restoreJson.validFiles > 0 && restoreJson.modifiedFiles === 0, `${restoreJson.validFiles} valid`);

      // Verify incident status is now resolved
      const incAfter = await app.inject({ method: 'GET', url: `/incidents/${incidentId}`, headers: authHeaders });
      record('Incident status updated to resolved', incAfter.json().status === 'resolved');

      // Verify GET /integrity/cryptographic is back to Verified
      const integAfter = await app.inject({ method: 'GET', url: '/integrity/cryptographic', headers: authHeaders });
      const baseChkAfter = integAfter.json().checks.find((c) => c.id === 'chk-baseline');
      record('chk-baseline status restored to Verified after recovery', baseChkAfter?.status === 'Verified');
    }

    // ── SECTION 8: FRONTEND HTML & DOM ELEMENTS AUDIT ───────────────────────
    console.log('\n--- SECTION 8: FRONTEND HTML & SCRIPT INTEGRITY ---');
    {
      const indexPath = fs.existsSync(path.resolve('frontend/dashboard/index.html'))
        ? path.resolve('frontend/dashboard/index.html')
        : path.resolve('dashboard/index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf8');

      // Crucial DOM element IDs that main.js binds to
      const requiredIds = [
        'settingWindowSeconds',
        'settingRansomwareRate',
        'btnSaveSettings',
        'storagePrefixList',
        'merkleRootHashText',
        'merkleLeafGrid',
        'btnTamperMerkleDemo',
        'cryptoIntegrityTableBody',
        'evidenceOverallBadge',
        'signedManifestPre',
        'auditChainContainer',
        'auditChainBadge',
        'recoveryLatestSummary',
        'recoveryOverallBadge',
        'agentFleetTableBody',
        'agentKpiTotalNodes',
        'agentKpiNodeBreakdown',
        'agentKpiCanaries',
        'btnPingAgent',
        'btnRestartAgent',
        'btnEnrollConfiguredNode',
        'agentCmdSnippet',
        'btnCopyAgentCmd',
        'btnTriggerRecoveryWorkflow',
        'viewEvidenceBtn',
        'btnTestDetectionPolicy',
      ];

      for (const id of requiredIds) {
        const hasId = indexHtml.includes(`id="${id}"`);
        record(`dashboard/index.html contains #${id}`, hasId);
      }

      // Check for zero-emoji compliance in dashboard files
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const baseDashboardDir = fs.existsSync('frontend/dashboard') ? 'frontend/dashboard' : 'dashboard';
      const filesToCheck = [
        `${baseDashboardDir}/index.html`,
        `${baseDashboardDir}/login.html`,
        `${baseDashboardDir}/register.html`,
        `${baseDashboardDir}/js/main.js`,
        `${baseDashboardDir}/js/api.js`,
      ];
      for (const f of filesToCheck) {
        const content = fs.readFileSync(path.resolve(f), 'utf8');
        const hasEmoji = emojiRegex.test(content);
        record(`Zero emoji rule strictly satisfied in ${f}`, !hasEmoji);
      }
    }

    console.log('\n================================================================');
    console.log(`QA AUDIT PASSED: ${results.length}/${results.length} tests strictly verified!`);
    console.log('================================================================\n');
  } finally {
    await app.close();
  }
}

runQaAudit().catch((err) => {
  console.error('\n[FATAL QA FAILURE]:', err);
  process.exit(1);
});
