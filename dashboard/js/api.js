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
    // Return or rethrow standardized error shape
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
   * Get current baseline snapshot for bucket
   */
  async getBaseline(bucket = CONFIG.BUCKET_NAME) {
    if (CONFIG.USE_MOCK) return mockApi.getBaseline(bucket);
    return httpRequest(`/baseline/${encodeURIComponent(bucket)}`);
  },

  /**
   * Capture a new baseline snapshot
   */
  async createBaseline(bucket = CONFIG.BUCKET_NAME) {
    if (CONFIG.USE_MOCK) return mockApi.createBaseline(bucket);
    return httpRequest('/baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket }),
    });
  },

  /**
   * Fetch recent detection runs
   */
  async getDetectionRuns(limit = 50) {
    if (CONFIG.USE_MOCK) return mockApi.getDetectionRuns(limit);
    const data = await httpRequest(`/detection/runs?limit=${limit}`);
    return data?.runs || [];
  },

  /**
   * List all security incidents
   */
  async getIncidents() {
    if (CONFIG.USE_MOCK) return mockApi.getIncidents();
    const data = await httpRequest('/incidents');
    return data?.incidents || [];
  },

  /**
   * Fetch single incident by ID
   */
  async getIncidentById(id) {
    if (CONFIG.USE_MOCK) return mockApi.getIncidentById(id);
    return httpRequest(`/incidents/${encodeURIComponent(id)}`);
  },

  /**
   * Trigger verified restore for incident
   */
  async restoreIncident(incidentId) {
    if (CONFIG.USE_MOCK) return mockApi.restoreIncident(incidentId);
    return httpRequest(`/incidents/${encodeURIComponent(incidentId)}/restore`, {
      method: 'POST',
    });
  },

  /**
   * Query restore job status and per-file validation
   */
  async getRestoreJob(jobId) {
    if (CONFIG.USE_MOCK) return mockApi.getRestoreJob(jobId);
    return httpRequest(`/restore/${encodeURIComponent(jobId)}`);
  },

  /**
   * Query hash-chained audit ledger
   */
  async getAuditLog() {
    if (CONFIG.USE_MOCK) return mockApi.getAuditLog();
    // When live API has audit log route, call it, otherwise fallback gracefully
    try {
      const data = await httpRequest('/audit-log');
      return data?.entries || [];
    } catch (_err) {
      // Fallback to mock log until live endpoint lands
      return mockApi.getAuditLog();
    }
  },
};
