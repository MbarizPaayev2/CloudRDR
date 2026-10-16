/**
 * @file test/unit/api.test.js
 * Tests for Fastify HTTP API endpoints, auth, and error handling.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../../backend/src/api/server.js';
import cfg from '../../backend/src/config/index.js';
import { _resetClientForTests } from '../../backend/src/adapters/db/supabaseClient.js';

describe('HTTP API - Authentication and Endpoints', () => {
  let app;

  before(async () => {
    _resetClientForTests();
    app = await buildServer({ enableLogger: false });
  });

  after(async () => {
    await app.close();
  });

  it('GET /health allows unauthenticated requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
  });

  it('GET /incidents returns 401 when API key is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/incidents',
    });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'unauthorized');
  });

  it('GET /incidents returns 401 when API key is invalid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/incidents',
      headers: {
        'x-api-key': 'wrong-key',
      },
    });
    assert.equal(res.statusCode, 401);
  });

  it('GET /incidents returns 200 when API key is valid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/incidents',
      headers: {
        'x-api-key': cfg.api.key,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(Array.isArray(body.incidents));
  });

  it('POST /baseline validates input and returns consistent error shape on invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/baseline',
      headers: {
        'x-api-key': cfg.api.key,
      },
      payload: {}, // Missing bucket
    });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.error.code, 'validation_error');
    assert.ok(body.error.message);
  });

  it('GET / renders marketing overview unauthenticated, and GET /dashboard redirects unauthenticated requests to /login', async () => {
    const resRoot = await app.inject({
      method: 'GET',
      url: '/',
    });
    assert.equal(resRoot.statusCode, 200);
    assert.ok(resRoot.headers['content-type']?.includes('text/html'));
    assert.ok(resRoot.body.includes('CloudRDR'));

    // Unauthenticated GET /dashboard redirects to /login
    const resDashUnauth = await app.inject({
      method: 'GET',
      url: '/dashboard',
    });
    assert.equal(resDashUnauth.statusCode, 302);
    assert.ok(resDashUnauth.headers.location?.startsWith('/login'));

    // Public auth pages render unauthenticated
    const resLogin = await app.inject({
      method: 'GET',
      url: '/login',
    });
    assert.equal(resLogin.statusCode, 200);
    assert.ok(resLogin.body.includes('Sign In to CloudRDR'));

    const resRegister = await app.inject({
      method: 'GET',
      url: '/register',
    });
    assert.equal(resRegister.statusCode, 200);
    assert.ok(resRegister.body.includes('Register Account'));
  });
});
