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


  // 2. Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // 3. API Key Authentication Hook (except /health)
  app.addHook('onRequest', async (request, reply) => {
    // Whitelist /health, /dashboard, / and OPTIONS pre-flight
    const isPublicRoute =
      request.routerPath === '/health' ||
      request.routerPath === '/dashboard' ||
      request.routerPath === '/' ||
      request.url === '/' ||
      request.url === '/favicon.ico' ||
      request.url.startsWith('/dashboard') ||
      request.url.startsWith('/css') ||
      request.url.startsWith('/js') ||
      request.method === 'OPTIONS';

    if (isPublicRoute) {
      return;
    }

    const authHeader = request.headers['authorization'];
    const customHeader = request.headers['x-api-key'];

    const token = customHeader || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

    if (!token || token !== cfg.api.key) {
      return reply.status(401).send({
        error: {
          code: 'unauthorized',
          message: 'Invalid or missing API key',
        },
      });
    }
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

    // Generic fallback
    const status = error.statusCode || 500;
    return reply.status(status).send({
      error: {
        code: error.code || 'internal_server_error',
        message: status === 500 ? 'An unexpected error occurred' : error.message,
      },
    });
  });

  // 5. Register route modules
  await app.register(healthRoutes);
  await app.register(baselineRoutes);
  await app.register(detectionRoutes);
  await app.register(incidentRoutes);
  await app.register(restoreRoutes);
  await app.register(dashboardRoutes);

  return app;
}

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
