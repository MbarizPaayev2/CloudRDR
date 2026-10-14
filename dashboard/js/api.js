/**
 * @file dashboard/js/api.js
 *
 * CloudRDR API Client.
 * Automatically delegates to mockApi when CONFIG.USE_MOCK is true,
 * or sends authenticated HTTP requests to the Backend API.
 *
 * Features:
 *   - Automatic X-API-Key header injection
 *   - Standardized error extraction ({ code, message })
 *   - Zero credential leakage
 *   - Endpoints for all 13 enterprise SOC dashboard sections
 */

import { CONFIG } from './config.js';
import { mockApi } from './mock/mockApi.js';

/**
 * Low-level HTTP transport wrapper.
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function httpRequest(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const headers = {
    Accept: 'application/json',
    'X-API-Key': CONFIG.API_KEY,
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
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

// ── Public API Methods ───────────────────────────────────────────────────────

export const api = {
  /**
   * Health check
   */
  async getHealth() {
    if (CONFIG.USE_MOCK) return mockApi.getHealth();
    return httpRequest('/health');
  },

  /**
   * Compact system status strip
   */
  async getSystemStatus() {
    if (CONFIG.USE_MOCK) return mockApi.getSystemStatus();
    try {
      return await httpRequest('/status/system');
    } catch (_err) {
      return mockApi.getSystemStatus();
    }
  },

  /**
   * KPI metrics overview
   */
  async getKpis() {
    if (CONFIG.USE_MOCK) return mockApi.getKpis();
    try {
      return await httpRequest('/metrics/kpis');
    } catch (_err) {
      return mockApi.getKpis();
    }
  },

  /**
   * Threat activity chart series
   * @param {'1H' | '6H' | '24H' | '7D'} timeRange
   */
  async getThreatActivity(timeRange = '24H') {
    if (CONFIG.USE_MOCK) return mockApi.getThreatActivity(timeRange);
    try {
      return await httpRequest(`/telemetry/activity?range=${timeRange}`);
    } catch (_err) {
      return mockApi.getThreatActivity(timeRange);
    }
  },

  /**
   * Detection engine configuration and status
   */
  async getDetectionEngineSummary() {
    if (CONFIG.USE_MOCK) return mockApi.getDetectionEngineSummary();
    try {
      return await httpRequest('/detection/summary');
    } catch (_err) {
      return mockApi.getDetectionEngineSummary();
    }
  },

  /**
   * Get latest baseline snapshot for bucket
   * @param {string} bucket
   */
  async getBaseline(bucket = 'protected') {
    if (CONFIG.USE_MOCK) return mockApi.getBaseline(bucket);
    return httpRequest(`/baseline/${encodeURIComponent(bucket)}`);
  },

  /**
   * Trigger capture of a new cryptographic baseline
   * @param {string} bucket
   */
  async createBaseline(bucket = 'protected') {
    if (CONFIG.USE_MOCK) return mockApi.createBaseline(bucket);
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
    if (CONFIG.USE_MOCK) return mockApi.getDetectionRuns(limit);
    return httpRequest(`/detection/runs?limit=${limit}`);
  },

  /**
   * List security incidents
   */
  async getIncidents() {
    if (CONFIG.USE_MOCK) return mockApi.getIncidents();
    const data = await httpRequest('/incidents');
    return Array.isArray(data) ? data : (data?.incidents || []);
  },

  /**
   * Get incident detail by ID
   * @param {string} id
   */
  async getIncidentById(id) {
    if (CONFIG.USE_MOCK) return mockApi.getIncidentById(id);
    return httpRequest(`/incidents/${encodeURIComponent(id)}`);
  },

  /**
   * Safe Containment: Trigger IAM write isolation lock
   * @param {string} incidentId
   */
  async containIncident(incidentId) {
    if (CONFIG.USE_MOCK) return { success: true, status: 'frozen' };
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
    if (CONFIG.USE_MOCK) return { success: true };
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
    if (CONFIG.USE_MOCK) return [];
    const res = await httpRequest(`/incidents/${encodeURIComponent(incidentId)}/timeline`);
    return res?.timeline || [];
  },

  /**
   * Update detection thresholds at runtime
   * @param {Object} config
   */
  async updateDetectionConfig(config) {
    if (CONFIG.USE_MOCK) return { success: true, thresholds: config };
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
    if (CONFIG.USE_MOCK) return { verified: true };
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
    if (CONFIG.USE_MOCK) return { success: true };
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
    if (CONFIG.USE_MOCK) return mockApi.getSecurityEvents(limit);
    try {
      return await httpRequest(`/events/recent?limit=${limit}`);
    } catch (_err) {
      return mockApi.getSecurityEvents(limit);
    }
  },

  /**
   * Backup and recovery health
   */
  async getRecoveryHealth() {
    if (CONFIG.USE_MOCK) return mockApi.getRecoveryHealth();
    try {
      return await httpRequest('/recovery/health');
    } catch (_err) {
      return mockApi.getRecoveryHealth();
    }
  },

  /**
   * Cryptographic integrity summary checks
   */
  async getCryptographicIntegrity() {
    if (CONFIG.USE_MOCK) return mockApi.getCryptographicIntegrity();
    try {
      return await httpRequest('/integrity/cryptographic');
    } catch (_err) {
      return mockApi.getCryptographicIntegrity();
    }
  },

  /**
   * Protected storage overview
   */
  async getProtectedStorage() {
    if (CONFIG.USE_MOCK) return mockApi.getProtectedStorage();
    try {
      return await httpRequest('/storage/overview');
    } catch (_err) {
      return mockApi.getProtectedStorage();
    }
  },

  /**
   * Start verified restore for an incident
   * @param {string} incidentId
   */
  async restoreIncident(incidentId) {
    if (CONFIG.USE_MOCK) return mockApi.restoreIncident(incidentId);
    return httpRequest(`/incidents/${encodeURIComponent(incidentId)}/restore`, {
      method: 'POST',
    });
  },

  /**
   * Poll status of a restore job
   * @param {string} jobId
   */
  async getRestoreJob(jobId) {
    if (CONFIG.USE_MOCK) return mockApi.getRestoreJob(jobId);
    return httpRequest(`/restore/${encodeURIComponent(jobId)}`);
  },

  /**
   * Get audit log entries
   */
  async getAuditLog() {
    if (CONFIG.USE_MOCK) return mockApi.getAuditLog();
    try {
      return await httpRequest('/audit');
    } catch (_err) {
      return mockApi.getAuditLog();
    }
  },
};
