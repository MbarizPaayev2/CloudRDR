/**
 * @file test/unit/goAgent.test.js
 * Unit tests for CloudRDR Go Agent Manager API integration.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../../backend/src/api/server.js';
import cfg from '../../backend/src/config/index.js';
import { _resetClientForTests } from '../../backend/src/adapters/db/supabaseClient.js';

describe('Go Agent Integration — Manager API Endpoints', () => {
  let app;
  let registeredAgentId;

  before(async () => {
    _resetClientForTests();
    app = await buildServer({ enableLogger: false });
  });

  after(async () => {
    await app.close();
  });

  it('POST /api/agent/register enrolls a new Go Agent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/register',
      headers: {
        'x-agent-key': cfg.api.key,
      },
      payload: {
        hostname: 'cloud-vm-prod-01',
        ip: '10.0.1.42',
        platform: 'linux',
        version: '1.0.0',
        accountId: 'test-account',
        bucket: 'protected',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.ok(body.agentId);
    assert.ok(body.token);
    assert.equal(body.config.bucket, 'protected');
    registeredAgentId = body.agentId;
  });

  it('POST /api/agent/heartbeat accepts agent telemetry and keepalive', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/heartbeat',
      headers: {
        'x-agent-key': cfg.api.key,
      },
      payload: {
        agentId: registeredAgentId,
        cpuUsage: 0.8,
        ramUsageMb: 14.2,
        filesMonitored: 120,
        status: 'online',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.command, 'CONTINUE');
  });

  it('POST /api/agent/events processes batch change events with entropy', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agent/events',
      headers: {
        'x-agent-key': cfg.api.key,
      },
      payload: {
        agentId: registeredAgentId,
        accountId: 'test-account',
        bucket: 'protected',
        events: [
          {
            path: 'documents/report.pdf',
            eventType: 'modified',
            sha256: 'a1b2c3d4e5f6',
            entropy: 4.85,
            isCanary: false,
            observedAt: new Date().toISOString(),
          },
        ],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.processed, 1);
    assert.ok(body.verdict);
    assert.equal(body.action, 'CONTINUE');
  });

  it('GET /api/agent/status reports active connected agents', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agent/status',
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'online');
    assert.ok(body.connectedAgentsCount >= 1);
    const found = body.connectedAgents.find((a) => a.agentId === registeredAgentId);
    assert.ok(found);
    assert.equal(found.hostname, 'cloud-vm-prod-01');
  });

  it('GET /api/agent/download serves standalone zero-dependency Node.js agent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agent/download',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('application/javascript'));
    assert.ok(res.headers['content-disposition'].includes('cloudrdr-agent.js'));
    assert.ok(res.body.includes('calculateShannonEntropy'));
    assert.ok(!res.body.includes('./src/monitor/monitorAgent.js'), 'Must be fully self-contained');
  });

  it('GET /api/agent/download/go serves standalone Go agent source', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agent/download/go',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['content-disposition'].includes('cloudrdr-agent.go'));
    assert.ok(res.body.includes('package main'));
    assert.ok(res.body.includes('calculateShannonEntropy'));
  });

  it('GET /api/agent/install.sh generates automated bash installer downloading standalone agent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agent/install.sh',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('/api/agent/download'));
    assert.ok(res.body.includes('cloudrdr-agent.js'));
  });

  it('GET /api/agent/install.ps1 generates automated PowerShell installer downloading standalone agent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agent/install.ps1',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('/api/agent/download'));
    assert.ok(res.body.includes('cloudrdr-agent.js'));
  });
});
