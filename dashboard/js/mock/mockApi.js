/**
 * @file dashboard/js/mock/mockApi.js
 * Mock API providing deterministic simulation fixtures for offline demo.
 */

export const mockApi = {
  async getHealth() {
    return { status: 'ok', uptime: 1245.8, timestamp: new Date().toISOString() };
  },
  async getBaseline() {
    return {
      bucket: 'protected',
      merkle_root: 'f7bbb36aa01a64a15ccf3ebfebfc51482d32323d59c01b94dbea44d21a32dd5a',
      file_count: 50,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    };
  },
  async createBaseline() {
    return {
      bucket: 'protected',
      merkle_root: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      file_count: 50,
      version: 2,
    };
  },
  async getDetectionRuns() {
    return [];
  },
  async getIncidents() {
    return [];
  },
  async getIncidentById(_id) {
    return null;
  },
  async restoreIncident(_id) {
    return { jobId: 'job-mock-01', status: 'queued' };
  },
  async getRestoreJob(_jobId) {
    return null;
  },
};
