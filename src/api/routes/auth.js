/**
 * @file src/api/routes/auth.js
 *
 * Fastify routes for User Registration, Authentication, Session Validation,
 * and Logout.
 */

import * as authService from '../../auth/authService.js';
import { CloudRdrError, httpStatusForCode } from '../../utils/errors.js';

/**
 * Extract session token from cookie, Authorization header, or x-session-token.
 *
 * @param {import('fastify').FastifyRequest} request
 * @returns {string | null}
 */
export function extractSessionToken(request) {
  // 1. Authorization header: Bearer <token>
  const authHeader = request.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Cookie header: cloudrdr_session=<token>
  const cookieHeader = request.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/cloudrdr_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1].trim());
    }
  }

  // 3. Custom header: x-session-token
  const customHeader = request.headers['x-session-token'];
  if (customHeader) {
    return String(customHeader).trim();
  }

  return null;
}

/**
 * Fastify plugin for Authentication endpoints.
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function authRoutes(fastify) {
  // ── 1. Register ───────────────────────────────────────────────────────────
  fastify.post('/api/auth/register', async (request, reply) => {
    try {
      const { fullName, email, password, confirmPassword } = request.body || {};
      const ip = request.ip || request.socket.remoteAddress || '';
      const userAgent = request.headers['user-agent'] || '';

      const result = await authService.register({
        fullName,
        email,
        password,
        confirmPassword,
        ip,
        userAgent,
      });

      // Set secure HTTP-only session cookie
      reply.header(
        'Set-Cookie',
        `cloudrdr_session=${encodeURIComponent(result.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      );

      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof CloudRdrError) {
        return reply.status(httpStatusForCode(err.code)).send({
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // ── 2. Login ──────────────────────────────────────────────────────────────
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body || {};
      const ip = request.ip || request.socket.remoteAddress || '';
      const userAgent = request.headers['user-agent'] || '';

      const result = await authService.login({
        email,
        password,
        ip,
        userAgent,
      });

      reply.header(
        'Set-Cookie',
        `cloudrdr_session=${encodeURIComponent(result.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      );

      return reply.status(200).send(result);
    } catch (err) {
      if (err instanceof CloudRdrError) {
        return reply.status(httpStatusForCode(err.code)).send({
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  });

  // ── 3. Current User / Session Check ───────────────────────────────────────
  fastify.get('/api/auth/me', async (request, reply) => {
    const token = extractSessionToken(request);
    if (!token) {
      return reply.status(401).send({
        error: { code: 'unauthorized', message: 'No active session token provided.' },
      });
    }

    const sessionData = await authService.validateSession(token);
    if (!sessionData) {
      return reply.status(401).send({
        error: { code: 'unauthorized', message: 'Session is invalid or has expired.' },
      });
    }

    return reply.status(200).send({ user: sessionData.user });
  });

  // ── 4. Logout ─────────────────────────────────────────────────────────────
  fastify.post('/api/auth/logout', async (request, reply) => {
    const token = extractSessionToken(request);
    if (token) {
      await authService.logout(token);
    }

    // Invalidate session cookie immediately
    reply.header(
      'Set-Cookie',
      'cloudrdr_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );

    return reply.status(200).send({ ok: true, message: 'Logged out successfully.' });
  });
}
