/**
 * @file site/js/api.js
 * Unified API Client for CloudRDR.
 * Delegates seamlessly between live Fastify HTTP backend and offline Mock API.
 */

import { CONFIG } from './config.js';
import * as mockApi from './mock/mockApi.js';

/**
 * Perform an authenticated HTTP request to the Fastify backend.
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': CONFIG.API_KEY,
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data?.error?.message || `HTTP error ${response.status}`);
      err.code = data?.error?.code || 'network_error';
      throw err;
    }

    return data;
  } catch (err) {
    if (err.code) throw err;
    const networkErr = new Error(`Cannot reach backend at ${CONFIG.API_BASE_URL}: ${err.message}`);
    networkErr.code = 'offline';
    throw networkErr;
  }
}

// ── Exported API Methods ───────────────────────────────────────────────────

export async function getHealth() {
  if (CONFIG.USE_MOCK) return mockApi.getHealth();
  const res = await fetch(`${CONFIG.API_BASE_URL}/health`);
  return res.json();
}

export async function getBaseline(bucket = CONFIG.BUCKET_NAME) {
  if (CONFIG.USE_MOCK) return mockApi.getBaseline(bucket);
  return request(`/baseline/${encodeURIComponent(bucket)}`);
}

export async function createBaseline(bucket = CONFIG.BUCKET_NAME) {
  if (CONFIG.USE_MOCK) return mockApi.createBaseline(bucket);
  return request('/baseline', {
    method: 'POST',
    body: JSON.stringify({ bucket }),
  });
}

export async function getDetectionRuns(limit = 50) {
  if (CONFIG.USE_MOCK) return mockApi.getDetectionRuns(limit);
  return request(`/detection/runs?limit=${limit}`);
}

export async function getIncidents() {
  if (CONFIG.USE_MOCK) return mockApi.getIncidents();
  return request('/incidents');
}

export async function getIncident(id) {
  if (CONFIG.USE_MOCK) return mockApi.getIncident(id);
  return request(`/incidents/${encodeURIComponent(id)}`);
}

export async function startRestore(incidentId) {
  if (CONFIG.USE_MOCK) return mockApi.startRestore(incidentId);
  return request(`/incidents/${encodeURIComponent(incidentId)}/restore`, {
    method: 'POST',
  });
}

export async function getRestoreJob(jobId) {
  if (CONFIG.USE_MOCK) return mockApi.getRestoreJob(jobId);
  return request(`/restore/${encodeURIComponent(jobId)}`);
}

export async function getAuditLog() {
  if (CONFIG.USE_MOCK) return mockApi.getAuditLog();
  // Live backend audit logs fallback or dedicated endpoint
  return request('/incidents');
}
