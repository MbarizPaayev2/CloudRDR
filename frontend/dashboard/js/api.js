/**
 * @file dashboard/js/api.js
 *
 * CloudRDR Production API Client.
 * Connects directly to the Fastify Backend API with real-world telemetry,
 * real cryptographic baselines, and live C-native monitoring agent streams.
 * Zero mock fallbacks.
 */

import { CONFIG } from './config.js';

/**
 * Low-level HTTP transport wrapper.
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function httpRequest(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('cloudrdr_token') : null;
  const headers = {
    Accept: 'application/json',
    'X-API-Key': CONFIG.API_KEY || 'cloudrdr-default-key-2026',
    ...(token ? { Authorization: `Bearer ${token}`, 'x-session-token': token } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { credentials: 'include', ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errPayload = data?.error || {
        code: `http_${res.status}`,
        message: data?.message || res.statusText || 'Operation failed',
      };
      throw errPayload;
    }

    return data;
  } catch (err) {
    if (err && err.code && err.message) {
      throw err;
    }
    throw {
      code: 'network_error',
      message: err.message || 'Network connection failed or backend unreachable',
    };
  }
}

// ── Public API Methods (Real Backend Data) ──────────────────────────────────

export const api = {
  /**
   * Health check
   */
  async getHealth() {
    return httpRequest('/health');
  },

  /**
   * Compact system status strip
   */
  async getSystemStatus() {
    return httpRequest('/status/system');
  },

  /**
   * KPI metrics overview
   */
  async getKpis() {
    return httpRequest('/metrics/kpis');
  },

  /**
   * Threat activity chart series
   * @param {'1H' | '6H' | '24H' | '7D'} timeRange
   */
  async getThreatActivity(timeRange = '24H') {
    return httpRequest(`/telemetry/activity?range=${timeRange}`);
  },

  /**
   * Detection engine configuration and status
   */
  async getDetectionEngineSummary() {
    return httpRequest('/detection/summary');
  },

  /**
   * Get latest baseline snapshot for bucket
   * @param {string} bucket
   */
  async getBaseline(bucket = 'protected') {
    return httpRequest(`/baseline/${encodeURIComponent(bucket)}`);
  },

  /**
   * Trigger capture of a new cryptographic baseline
   * @param {string} bucket
   */
  async createBaseline(bucket = 'protected') {
    return httpRequest('/baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket }),
    });
  },

  /**
   * List recent sliding-window detection runs
   * @param {number} [limit=50]
   */
  async getDetectionRuns(limit = 50) {
    const res = await httpRequest(`/detection/runs?limit=${limit}`);
    return res?.runs || [];
  },

  /**
   * List security incidents
   */
  async getIncidents() {
    const data = await httpRequest('/incidents');
    return Array.isArray(data) ? data : data?.incidents || [];
  },

  /**
   * Get incident detail by ID
   * @param {string} id
   */
  async getIncidentById(id) {
    return httpRequest(`/incidents/${encodeURIComponent(id)}`);
  },

  /**
   * Safe Containment: Trigger IAM write isolation lock
   * @param {string} incidentId
   */
  async containIncident(incidentId) {
    return httpRequest(`/incidents/${encodeURIComponent(incidentId)}/contain`, {
      method: 'POST',
    });
  },

  /**
   * Acknowledge alert or transition incident state
   * @param {string} incidentId
   * @param {string} status
   * @param {string} [note]
   */
  async updateIncidentStatus(incidentId, status, note = '') {
    return httpRequest(`/incidents/${encodeURIComponent(incidentId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
  },

  /**
   * Retrieve forensic timeline for incident
   * @param {string} incidentId
   */
  async getIncidentTimeline(incidentId) {
    const res = await httpRequest(`/incidents/${encodeURIComponent(incidentId)}/timeline`);
    return res?.timeline || [];
  },

  /**
   * Update detection thresholds at runtime
   * @param {Object} config
   */
  async updateDetectionConfig(config) {
    return httpRequest('/detection/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  /**
   * On-demand cryptographic evidence verification
   */
  async verifyCryptographicEvidence() {
    return httpRequest('/evidence/verify', {
      method: 'POST',
    });
  },

  /**
   * Promote staged restore to live storage
   * @param {string} incidentId
   * @param {string} jobId
   */
  async promoteRestore(incidentId, jobId) {
    return httpRequest(`/incidents/${encodeURIComponent(incidentId)}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, confirmed: true }),
    });
  },

  /**
   * Recent security events feed
   */
  async getSecurityEvents(limit = 10) {
    const res = await httpRequest(`/events/recent?limit=${limit}`);
    return res?.events || [];
  },

  /**
   * Backup and recovery health
   */
  async getRecoveryHealth() {
    return httpRequest('/recovery/health');
  },

  /**
   * Cryptographic integrity summary checks
   */
  async getCryptographicIntegrity() {
    return httpRequest('/integrity/cryptographic');
  },

  /**
   * Protected storage overview
   */
  async getProtectedStorage() {
    return httpRequest('/storage/overview');
  },

  /**
   * Start verified restore for an incident
   * @param {string} incidentId
   */
  async restoreIncident(incidentId) {
    return httpRequest(`/incidents/${encodeURIComponent(incidentId)}/restore`, {
      method: 'POST',
    });
  },

  /**
   * Poll status of a restore job
   * @param {string} jobId
   */
  async getRestoreJob(jobId) {
    return httpRequest(`/restore/${encodeURIComponent(jobId)}`);
  },

  /**
   * Get audit log entries
   */
  async getAuditLog() {
    const res = await httpRequest('/audit');
    return Array.isArray(res) ? res : res?.entries || [];
  },

  /**
   * Simulate a mass ransomware attack
   */
  async simulateMassAttack() {
    return httpRequest('/api/simulate/attack', {
      method: 'POST',
    });
  },

  /**
   * Trip the canary decoy tripwire
   */
  async triggerCanaryAlert() {
    return httpRequest('/api/simulate/canary', {
      method: 'POST',
    });
  },

  /**
   * Reset simulation state
   */
  async resetSimulation() {
    return httpRequest('/api/simulate/reset', {
      method: 'POST',
    });
  },

  /**
   * Simulate or revert 1-byte file tamper on disk and recompute Merkle root
   * @param {boolean} [revert]
   */
  async simulateTamper(revert = false) {
    return httpRequest('/api/simulate/tamper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revert }),
    });
  },

  /**
   * Live Agent Status & Registered Fleet
   */
  async getAgentStatus() {
    return httpRequest('/api/agent/status');
  },

  /**
   * Measure real RTT ping and update heartbeat for an agent node via POST /api/agent/ping
   * @param {string} agentId
   */
  async pingAgent(agentId = 'agt-c-native-01') {
    const t0 = performance.now();
    const res = await httpRequest('/api/agent/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    const rttMs = Math.max(1, Math.round(performance.now() - t0));
    return { ...res, rttMs };
  },

  /**
   * Restart / Re-sync agent daemon
   * @param {string} [agentId]
   */
  async restartAgent(agentId = 'agt-c-native-01') {
    return httpRequest('/api/agent/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
  },

  /**
   * Enroll a new agent node via API
   * @param {Object} payload
   */
  async registerAgent(payload) {
    return httpRequest('/api/agent/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
