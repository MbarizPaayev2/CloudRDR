/**
 * @file src/api/routes/dashboard.js
 *
 * Frontend Dashboard Route — Aysel Bağırova
 * Serves the responsive single-page SOC dashboard at / and /dashboard.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DASHBOARD_HTML_PATH = path.resolve(__dirname, '../../dashboard/index.html');

let _cachedHtml = null;

async function getDashboardHtml() {
  if (!_cachedHtml || process.env.NODE_ENV !== 'production') {
    _cachedHtml = await fs.readFile(DASHBOARD_HTML_PATH, 'utf8');
  }
  return _cachedHtml;
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function dashboardRoutes(fastify) {
  fastify.get('/', async (_request, reply) => {
    const html = await getDashboardHtml();
    return reply.type('text/html; charset=utf-8').send(html);
  });

  fastify.get('/dashboard', async (_request, reply) => {
    const html = await getDashboardHtml();
    return reply.type('text/html; charset=utf-8').send(html);
  });
}
