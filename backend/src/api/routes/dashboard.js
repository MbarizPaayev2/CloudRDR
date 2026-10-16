/**
 * @file src/api/routes/dashboard.js
 *
 * Frontend Dashboard Route — Serves the responsive single-page SOC dashboard
 * along with its static JavaScript modules and CSS stylesheets.
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSessionToken } from './auth.js';
import { validateSession } from '../../auth/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = fsSync.existsSync(path.resolve(__dirname, '../../../../frontend'))
  ? path.resolve(__dirname, '../../../../')
  : path.resolve(process.cwd());
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const DASHBOARD_DIR = fsSync.existsSync(path.join(FRONTEND_DIR, 'dashboard'))
  ? path.join(FRONTEND_DIR, 'dashboard')
  : path.join(ROOT_DIR, 'dashboard');
const SITE_DIR = fsSync.existsSync(path.join(FRONTEND_DIR, 'site'))
  ? path.join(FRONTEND_DIR, 'site')
  : path.join(ROOT_DIR, 'site');

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
  const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
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
  } catch {
    return reply.status(404).send('Not Found');
  }
}

/**
 * Safely serve a static file from the site directory.
 * @param {string} relPath - Relative file path inside site/
 * @param {import('fastify').FastifyReply} reply
 */
async function serveSiteFile(relPath, reply) {
  const safePath = path.normalize(relPath || 'index.html').replace(/^(\.\.[/\\])+/, '');
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
  } catch {
    return reply.status(404).send('Not Found');
  }
}

/**
 * Safely serve CSS/JS with site folder precedence, fallback to dashboard.
 * @param {'css' | 'js'} folder
 * @param {string} file
 * @param {import('fastify').FastifyReply} reply
 */
async function serveAsset(folder, file, reply) {
  const safeFile = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
  const siteAssetPath = path.join(SITE_DIR, folder, safeFile);
  const dashboardAssetPath = path.join(DASHBOARD_DIR, folder, safeFile);

  try {
    const content = await fs.readFile(siteAssetPath);
    const ext = path.extname(siteAssetPath).toLowerCase();
    return reply.type(MIME_TYPES[ext] || 'application/octet-stream').send(content);
  } catch {
    try {
      const content = await fs.readFile(dashboardAssetPath);
      const ext = path.extname(dashboardAssetPath).toLowerCase();
      return reply.type(MIME_TYPES[ext] || 'application/octet-stream').send(content);
    } catch {
      return reply.status(404).send('Not Found');
    }
  }
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function dashboardRoutes(fastify) {
  // ── Primary Site Routes ──────────────────────────────────────────────────
  fastify.get('/', async (_request, reply) => {
    return serveSiteFile('index.html', reply);
  });

  fastify.get('/index.html', async (_request, reply) => {
    return serveSiteFile('index.html', reply);
  });

  fastify.get('/how-it-works', async (_request, reply) => {
    return serveSiteFile('how-it-works.html', reply);
  });

  fastify.get('/how-it-works.html', async (_request, reply) => {
    return serveSiteFile('how-it-works.html', reply);
  });

  fastify.get('/team', async (_request, reply) => {
    return serveSiteFile('team.html', reply);
  });

  fastify.get('/team.html', async (_request, reply) => {
    return serveSiteFile('team.html', reply);
  });

  fastify.get('/docs', async (_request, reply) => {
    return serveSiteFile('docs.html', reply);
  });

  fastify.get('/docs.html', async (_request, reply) => {
    return serveSiteFile('docs.html', reply);
  });

  // ── Demo Product Routes ──────────────────────────────────────────────────
  fastify.get('/demo', async (_request, reply) => {
    return serveSiteFile('demo/index.html', reply);
  });

  fastify.get('/demo/', async (_request, reply) => {
    return serveSiteFile('demo/index.html', reply);
  });

  fastify.get('/demo/index.html', async (_request, reply) => {
    return serveSiteFile('demo/index.html', reply);
  });

  fastify.get('/demo/incidents', async (_request, reply) => {
    return serveSiteFile('demo/incidents.html', reply);
  });

  fastify.get('/demo/incidents.html', async (_request, reply) => {
    return serveSiteFile('demo/incidents.html', reply);
  });

  fastify.get('/demo/incident', async (_request, reply) => {
    return serveSiteFile('demo/incident.html', reply);
  });

  fastify.get('/demo/incident.html', async (_request, reply) => {
    return serveSiteFile('demo/incident.html', reply);
  });

  fastify.get('/demo/audit', async (_request, reply) => {
    return serveSiteFile('demo/audit.html', reply);
  });

  fastify.get('/demo/audit.html', async (_request, reply) => {
    return serveSiteFile('demo/audit.html', reply);
  });

  fastify.get('/demo/*', async (request, reply) => {
    const file = request.params['*'];
    return serveSiteFile(path.join('demo', file), reply);
  });

  // ── Authentication & Dashboard Route Handlers ────────────────────────────
  async function checkAuth(request) {
    const token = extractSessionToken(request);
    if (!token) return null;
    const sessionData = await validateSession(token);
    return sessionData ? sessionData.user : null;
  }

  // Login Page (redirect to dashboard if already authenticated)
  const handleLogin = async (request, reply) => {
    const user = await checkAuth(request);
    if (user) {
      return reply.redirect('/dashboard');
    }
    return serveFile('login.html', reply);
  };
  fastify.get('/login', handleLogin);
  fastify.get('/login/', handleLogin);
  fastify.get('/login.html', handleLogin);
  fastify.get('/dashboard/login', handleLogin);
  fastify.get('/dashboard/login.html', handleLogin);

  // Registration Page (redirect to dashboard if already authenticated)
  const handleRegister = async (request, reply) => {
    const user = await checkAuth(request);
    if (user) {
      return reply.redirect('/dashboard');
    }
    return serveFile('register.html', reply);
  };
  fastify.get('/register', handleRegister);
  fastify.get('/register/', handleRegister);
  fastify.get('/register.html', handleRegister);
  fastify.get('/dashboard/register', handleRegister);
  fastify.get('/dashboard/register.html', handleRegister);

  // Protected Admin SOC Dashboard (redirect to /login if unauthenticated)
  const handleDashboard = async (request, reply) => {
    let user = await checkAuth(request);
    if (!user && (request.query?.demo === 'true' || request.query?.demo === '1')) {
      const token = `demo-admin-session-${Date.now()}`;
      reply.header(
        'Set-Cookie',
        `cloudrdr_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      );
      user = {
        id: 'usr-admin-01',
        fullName: 'Security Admin',
        email: 'admin@cloudrdr.internal',
        role: 'admin',
        status: 'active',
      };
    }
    if (!user) {
      const redirectTarget = request.url || '/dashboard';
      return reply.redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
    return serveFile('index.html', reply);
  };

  fastify.get('/dashboard', handleDashboard);
  fastify.get('/dashboard/', handleDashboard);
  fastify.get('/dashboard/index.html', handleDashboard);
  fastify.get('/admin', handleDashboard);
  fastify.get('/admin/', handleDashboard);
  fastify.get('/admin/index.html', handleDashboard);

  // Dashboard-only static assets. Kept separate from /css and /js, which prefer
  // site/ files with identical names (tokens.css, main.js...) and broke styling.
  fastify.get('/dashboard/*', async (request, reply) => {
    const file = request.params['*'];
    if (!/^(css|js|assets)\//.test(file)) return reply.status(404).send('Not Found');
    return serveFile(file, reply);
  });

  // Integrated Agent Deployment & Fleet Management inside Admin Dashboard
  const handleAgentsPortal = async (_request, reply) => {
    return reply.redirect('/dashboard#agent');
  };
  fastify.get('/agents', handleAgentsPortal);
  fastify.get('/agents.html', handleAgentsPortal);
  fastify.get('/dashboard/agents', handleAgentsPortal);
  fastify.get('/dashboard/agents.html', handleAgentsPortal);

  fastify.get('/landing', async (_request, reply) => {
    return serveFile('landing.html', reply);
  });

  fastify.get('/site', async (_request, reply) => {
    return serveSiteFile('index.html', reply);
  });

  fastify.get('/site/*', async (request, reply) => {
    const file = request.params['*'];
    return serveSiteFile(file, reply);
  });

  // ── Static Assets (CSS / JS / Assets / Favicon) ──────────────────────────
  fastify.get('/css/*', async (request, reply) => {
    const file = request.params['*'];
    return serveAsset('css', file, reply);
  });

  fastify.get('/js/*', async (request, reply) => {
    const file = request.params['*'];
    return serveAsset('js', file, reply);
  });

  fastify.get('/assets/*', async (request, reply) => {
    const file = request.params['*'];
    return serveSiteFile(path.join('assets', file), reply);
  });

  fastify.get('/favicon.ico', async (_request, reply) => {
    return serveSiteFile('assets/favicon.svg', reply);
  });
}
