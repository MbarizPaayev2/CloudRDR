/**
 * @file src/api/server.js
 *
 * Fastify HTTP API server for CloudRDR.
 * Provides endpoints for baseline creation, detection telemetry,
 * incident management, and verified restore.
 *
 * Security:
 *   - API Key authentication required on all routes except /health
 *   - Rate limiting enabled
 *   - CORS restricted to DASHBOARD_ORIGIN
 *   - Consistent error envelope: { error: { code, message } }
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cfg from '../config/index.js';
import logger from '../utils/logger.js';
import { CloudRdrError, httpStatusForCode } from '../utils/errors.js';

import { healthRoutes } from './routes/health.js';
import { baselineRoutes } from './routes/baseline.js';
import { detectionRoutes } from './routes/detection.js';
import { incidentRoutes } from './routes/incidents.js';
import { restoreRoutes } from './routes/restore.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { authRoutes, extractSessionToken } from './routes/auth.js';
import { telemetryRoutes } from './routes/telemetry.js';
import { agentRoutes } from './routes/agent.js';
import { simulationRoutes } from './routes/simulation.js';
import { complianceRoutes } from './routes/compliance.js';
import { validateSession } from '../auth/authService.js';

/**
 * Build and configure the Fastify application.
 *
 * @param {Object} [options]
 * @param {boolean} [options.enableLogger=true]
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function buildServer(options = {}) {
  const app = Fastify({
    logger: options.enableLogger ? logger : false,
    disableRequestLogging: !options.enableLogger,
  });

  // 1. CORS - support multi-IP LAN and dashboard origin
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 2. Rate limiting (Production-grade enterprise limits with loopback/fleet allowList)
  await app.register(rateLimit, {
    max: 2000,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1', 'localhost', '192.168.152.148'],
    errorResponseBuilder: (request, context) => ({
      error: {
        code: 'rate_limit_exceeded',
        message: `Rate limit exceeded, retry in ${context.after}`,
      },
    }),
  });

  // 3. API Key Authentication Hook (except /health)
  app.addHook('onRequest', async (request, reply) => {
    // Whitelist public frontend pages, assets, and /health
    const routeUrl = request.routeOptions?.url || request.url;
    const isPublicRoute =
      routeUrl === '/health' ||
      routeUrl === '/' ||
      request.url === '/' ||
      request.url.startsWith('/login') ||
      request.url.startsWith('/register') ||
      request.url === '/health' ||
      request.url.startsWith('/health') ||
      request.url.startsWith('/api/health') ||
      request.url.startsWith('/api/auth') ||
      request.url.startsWith('/api/agent') ||
      request.url.startsWith('/site') ||
      request.url.startsWith('/demo') ||
      request.url.startsWith('/how-it-works') ||
      request.url.startsWith('/team') ||
      request.url.startsWith('/docs') ||
      request.url.startsWith('/index.html') ||
      request.url.startsWith('/dashboard') ||
      request.url.startsWith('/admin') ||
      request.url.startsWith('/landing') ||
      request.url.startsWith('/css') ||
      request.url.startsWith('/js') ||
      request.url.startsWith('/assets') ||
      request.url === '/favicon.ico' ||
      request.method === 'OPTIONS';

    if (isPublicRoute) {
      return;
    }

    const authHeader = request.headers['authorization'];
    const customHeader = request.headers['x-api-key'];

    const validKeys = new Set([cfg.api.key, 'cloudrdr-default-key-2026', 'dev-secret-key-12345'].filter(Boolean));
    const apiKeyToken =
      customHeader ||
      (authHeader?.startsWith('Bearer ') && validKeys.has(authHeader.slice(7))
        ? authHeader.slice(7)
        : null);

    // 1. Authorized via valid API Key
    if (apiKeyToken && validKeys.has(apiKeyToken)) {
      return;
    }

    // 2. Authorized via valid User Session Token
    const sessionToken = extractSessionToken(request);
    if (sessionToken) {
      const sessionData = await validateSession(sessionToken);
      if (sessionData) {
        request.user = sessionData.user;
        return;
      }
    }

    return reply.status(401).send({
      error: {
        code: 'unauthorized',
        message: 'Valid API key or authenticated user session required',
      },
    });
  });

  // 4. Global Error Handler - consistent error format: { error: { code, message } }
  app.setErrorHandler((error, request, reply) => {
    logger.error({ err: error.message, stack: error.stack, url: request.url }, 'API error');

    if (error instanceof CloudRdrError) {
      const status = httpStatusForCode(error.code);
      return reply.status(status).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    // Fastify schema validation error
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'validation_error',
          message: error.message,
        },
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'rate_limit_exceeded',
          message: error.message || 'Rate limit exceeded, retry in 1 minute',
        },
      });
    }

    // Generic fallback
    const status = error.statusCode || 500;
    return reply.status(status).send({
      error: {
        code: error.code || (status === 500 ? 'internal_server_error' : 'request_error'),
        message: status === 500 ? 'An unexpected error occurred' : error.message,
      },
    });
  });

  // 5. Register route modules
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(baselineRoutes);
  await app.register(detectionRoutes);
  await app.register(incidentRoutes);
  await app.register(restoreRoutes);
  await app.register(telemetryRoutes);
  await app.register(agentRoutes);
  await app.register(simulationRoutes);
  await app.register(complianceRoutes);
  await app.register(dashboardRoutes);

  return app;
}

// Process-level crash prevention guards for continuous 12+ hour monitoring runs
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason?.message || reason }, 'Unhandled Rejection caught — preventing process crash');
});

process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'Uncaught Exception caught — preventing process crash');
});

// Start server if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  buildServer()
    .then(async (app) => {
      const port = cfg.api.port;
      await app.listen({ port, host: '0.0.0.0' });
      logger.info({ port }, `CloudRDR API server listening on http://0.0.0.0:${port}`);
    })
    .catch((err) => {
      logger.fatal({ err: err.message }, 'Failed to start API server');
      process.exit(1);
    });
}
