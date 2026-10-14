/**
 * @file src/api/routes/dashboard.js
 *
 * Frontend Dashboard Route — Serves the responsive single-page SOC dashboard
 * along with its static JavaScript modules and CSS stylesheets.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DASHBOARD_DIR = path.resolve(__dirname, '../../../dashboard');
const SITE_DIR = path.resolve(__dirname, '../../../site');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

/**
 * Safely serve a static file from the dashboard directory.
 * @param {string} relPath - Relative file path inside dashboard/
 * @param {import('fastify').FastifyReply} reply
 */
async function serveFile(relPath, reply) {
  // Normalize and prevent directory traversal
  const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(DASHBOARD_DIR, safePath);

  if (!filePath.startsWith(DASHBOARD_DIR)) {
    return reply.status(403).send('Forbidden');
  }

  try {
    const stat = await fs.stat(filePath);
    const targetPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const content = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    return reply.type(mime).send(content);
  } catch (_err) {
    return reply.status(404).send('Not Found');
  }
}

/**
 * Safely serve a static file from the site directory.
 * @param {string} relPath - Relative file path inside site/
 * @param {import('fastify').FastifyReply} reply
 */
async function serveSiteFile(relPath, reply) {
  const safePath = path.normalize(relPath || 'index.html').replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(SITE_DIR, safePath);

  if (!filePath.startsWith(SITE_DIR)) {
    return reply.status(403).send('Forbidden');
  }

  try {
    const stat = await fs.stat(filePath);
    const targetPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const content = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    return reply.type(mime).send(content);
  } catch (_err) {
    return reply.status(404).send('Not Found');
  }
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function dashboardRoutes(fastify) {
  fastify.get('/', async (_request, reply) => {
    return serveFile('landing.html', reply);
  });

  fastify.get('/landing', async (_request, reply) => {
    return serveFile('landing.html', reply);
  });

  fastify.get('/dashboard', async (_request, reply) => {
    return serveFile('index.html', reply);
  });

  // Dedicated Site Routes (Multi-Page Website)
  fastify.get('/site', async (_request, reply) => {
    return serveSiteFile('index.html', reply);
  });

  fastify.get('/site/', async (_request, reply) => {
    return serveSiteFile('index.html', reply);
  });

  fastify.get('/site/*', async (request, reply) => {
    const file = request.params['*'];
    return serveSiteFile(file, reply);
  });

  fastify.get('/css/*', async (request, reply) => {
    const file = request.params['*'];
    return serveFile(path.join('css', file), reply);
  });

  fastify.get('/js/*', async (request, reply) => {
    const file = request.params['*'];
    return serveFile(path.join('js', file), reply);
  });

  fastify.get('/favicon.ico', async (_request, reply) => {
    return reply.status(204).send();
  });
}
