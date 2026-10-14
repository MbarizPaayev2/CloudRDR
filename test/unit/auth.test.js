/**
 * @file test/unit/auth.test.js
 * Comprehensive unit and integration tests for CloudRDR Registration,
 * Authentication, Session Persistence, and Dashboard Access Control.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../../src/api/server.js';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';
import { _resetClientForTests } from '../../src/adapters/db/supabaseClient.js';

describe('CloudRDR Authentication & User Management', () => {
  let app;

  before(async () => {
    _resetClientForTests();
    app = await buildServer({ enableLogger: false });
  });

  after(async () => {
    await app.close();
  });

  /* ─── 1. Password Hashing & Cryptographic Verification ─────────────────── */
  describe('Password Hashing Utility (scrypt)', () => {
    it('generates a unique scrypt hash with random salt', () => {
      const pwd = 'CorrectHorseBatteryStaple123!';
      const hash1 = hashPassword(pwd);
      const hash2 = hashPassword(pwd);

      assert.notEqual(hash1, hash2, 'Salts must produce distinct hash strings');
      assert.ok(hash1.startsWith('scrypt$'), 'Must use scrypt format identifier');
    });

    it('verifies correct passwords and rejects incorrect passwords', () => {
      const pwd = 'CyberDefense2026$#';
      const hash = hashPassword(pwd);

      assert.equal(verifyPassword(pwd, hash), true, 'Correct password must verify');
      assert.equal(
        verifyPassword('WrongPassword123!', hash),
        false,
        'Wrong password must be rejected'
      );
      assert.equal(verifyPassword('', hash), false, 'Empty password must be rejected');
      assert.equal(
        verifyPassword(pwd, 'invalid$hash$format'),
        false,
        'Malformed hash must not throw'
      );
    });
  });

  /* ─── 2. User Registration ─────────────────────────────────────────────── */
  describe('User Registration (POST /api/auth/register)', () => {
    it('successfully registers an internal operator and returns session', async () => {
      const payload = {
        fullName: 'Marcus Vance',
        email: 'm.vance@cloudrdr.internal',
        password: 'SecurePassword2026!',
        confirmPassword: 'SecurePassword2026!',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload,
      });

      assert.equal(res.statusCode, 201);
      const body = res.json();

      assert.ok(body.user);
      assert.equal(body.user.fullName, 'Marcus Vance');
      assert.equal(body.user.email, 'm.vance@cloudrdr.internal');
      assert.equal(body.user.role, 'analyst');
      assert.equal(body.user.status, 'active');
      assert.equal(body.user.password_hash, undefined, 'Must NEVER expose password hash');
      assert.ok(body.token, 'Must return session token');

      // Check Set-Cookie header
      const cookieHeader = res.headers['set-cookie'];
      assert.ok(cookieHeader, 'Must set session cookie');
      assert.ok(cookieHeader.includes('cloudrdr_session='));
      assert.ok(cookieHeader.includes('HttpOnly'));
    });

    it('rejects duplicate email addresses with 409 Conflict', async () => {
      const payload = {
        fullName: 'Marcus Vance Duplicate',
        email: 'M.VANCE@cloudrdr.internal', // Case-insensitive duplicate test
        password: 'AnotherPassword999!',
        confirmPassword: 'AnotherPassword999!',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload,
      });

      assert.equal(res.statusCode, 409);
      const body = res.json();
      assert.equal(body.error.code, 'conflict');
      assert.ok(body.error.message.includes('already exists'));
    });

    it('rejects mismatched password and confirmation with 400', async () => {
      const payload = {
        fullName: 'Elena Rostova',
        email: 'e.rostova@cloudrdr.internal',
        password: 'StrongPassword123!',
        confirmPassword: 'DifferentPassword456!',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload,
      });

      assert.equal(res.statusCode, 400);
      const body = res.json();
      assert.equal(body.error.code, 'validation_error');
      assert.ok(body.error.message.includes('Passwords do not match'));
    });

    it('rejects weak passwords shorter than 8 characters', async () => {
      const payload = {
        fullName: 'Short Pwd User',
        email: 'short@cloudrdr.internal',
        password: 'short1',
        confirmPassword: 'short1',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload,
      });

      assert.equal(res.statusCode, 400);
      const body = res.json();
      assert.ok(body.error.message.includes('at least 8 characters'));
    });
  });

  /* ─── 3. User Login & Credential Verification ──────────────────────────── */
  describe('User Login (POST /api/auth/login)', () => {
    it('authenticates valid credentials and issues session cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'm.vance@cloudrdr.internal',
          password: 'SecurePassword2026!',
        },
      });

      assert.equal(res.statusCode, 200);
      const body = res.json();

      assert.equal(body.user.email, 'm.vance@cloudrdr.internal');
      assert.equal(body.user.password_hash, undefined);
      assert.ok(body.token);

      const cookie = res.headers['set-cookie'];
      assert.ok(cookie.includes('cloudrdr_session='));
    });

    it('rejects incorrect password with 400 validation error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'm.vance@cloudrdr.internal',
          password: 'IncorrectPassword999!',
        },
      });

      assert.equal(res.statusCode, 400);
      const body = res.json();
      assert.ok(body.error.message.includes('Invalid email address or password'));
    });

    it('rejects non-existent email address with generic error message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'ghost@cloudrdr.internal',
          password: 'SomePassword123!',
        },
      });

      assert.equal(res.statusCode, 400);
      const body = res.json();
      assert.ok(body.error.message.includes('Invalid email address or password'));
    });
  });

  /* ─── 4. Session Validation (GET /api/auth/me) ─────────────────────────── */
  describe('Session Validation (GET /api/auth/me)', () => {
    it('returns 401 when no session token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      assert.equal(res.statusCode, 401);
    });

    it('returns current user profile when valid session cookie is provided', async () => {
      // First login
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'm.vance@cloudrdr.internal',
          password: 'SecurePassword2026!',
        },
      });
      const token = loginRes.json().token;

      // Check /api/auth/me with Cookie
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          cookie: `cloudrdr_session=${token}`,
        },
      });

      assert.equal(meRes.statusCode, 200);
      const body = meRes.json();
      assert.equal(body.user.email, 'm.vance@cloudrdr.internal');
      assert.equal(body.user.role, 'analyst');
    });

    it('returns current user profile when valid Authorization Bearer header is provided', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'm.vance@cloudrdr.internal',
          password: 'SecurePassword2026!',
        },
      });
      const token = loginRes.json().token;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      assert.equal(meRes.statusCode, 200);
      assert.equal(meRes.json().user.fullName, 'Marcus Vance');
    });
  });

  /* ─── 5. Protected Dashboard Route Access & Redirects ──────────────────── */
  describe('Protected Dashboard Route Access Control', () => {
    it('redirects unauthenticated browser requests from /dashboard to /login', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/dashboard',
      });

      assert.equal(res.statusCode, 302);
      assert.ok(res.headers.location.startsWith('/login?redirect='));
    });

    it('redirects unauthenticated browser requests from /admin to /login', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin',
      });

      assert.equal(res.statusCode, 302);
      assert.ok(res.headers.location.startsWith('/login?redirect='));
    });

    it('allows access to /dashboard when user has an active session cookie', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'm.vance@cloudrdr.internal',
          password: 'SecurePassword2026!',
        },
      });
      const token = loginRes.json().token;

      const dashRes = await app.inject({
        method: 'GET',
        url: '/dashboard',
        headers: {
          cookie: `cloudrdr_session=${token}`,
        },
      });

      assert.equal(dashRes.statusCode, 200);
      assert.ok(dashRes.headers['content-type']?.includes('text/html'));
      assert.ok(dashRes.body.includes('Security Overview'));
    });

    it('redirects already-authenticated users from /login to /dashboard', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'm.vance@cloudrdr.internal',
          password: 'SecurePassword2026!',
        },
      });
      const token = loginRes.json().token;

      const res = await app.inject({
        method: 'GET',
        url: '/login',
        headers: {
          cookie: `cloudrdr_session=${token}`,
        },
      });

      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, '/dashboard');
    });
  });

  /* ─── 6. Logout and Session Invalidation ────────────────────────────────── */
  describe('User Logout & Session Invalidation (POST /api/auth/logout)', () => {
    it('invalidates the session and prevents subsequent dashboard access', async () => {
      // 1. Login
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'm.vance@cloudrdr.internal',
          password: 'SecurePassword2026!',
        },
      });
      const token = loginRes.json().token;

      // 2. Logout
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          cookie: `cloudrdr_session=${token}`,
        },
      });

      assert.equal(logoutRes.statusCode, 200);
      // Cookie cleared
      const setCookie = logoutRes.headers['set-cookie'];
      assert.ok(setCookie.includes('Max-Age=0'));

      // 3. Try to access /api/auth/me with revoked token
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          cookie: `cloudrdr_session=${token}`,
        },
      });
      assert.equal(meRes.statusCode, 401);

      // 4. Try to access /dashboard with revoked token -> must redirect to /login
      const dashRes = await app.inject({
        method: 'GET',
        url: '/dashboard',
        headers: {
          cookie: `cloudrdr_session=${token}`,
        },
      });
      assert.equal(dashRes.statusCode, 302);
      assert.ok(dashRes.headers.location.startsWith('/login'));
    });
  });
});
