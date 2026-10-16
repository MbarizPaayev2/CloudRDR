/**
 * @file api/index.js
 * Vercel Serverless Function entry point for CloudRDR.
 * Delegates all incoming HTTP requests to Fastify buildServer.
 */

import { buildServer } from '../backend/src/api/server.js';

let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = buildServer({ enableLogger: false }).then(async (app) => {
      await app.ready();
      return app;
    });
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    await new Promise((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      app.server.emit('request', req, res);
    });
  } catch (err) {
    console.error('[VERCEL HANDLER ERROR]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: {
        code: 'serverless_handler_error',
        message: err.message,
        stack: err.stack,
      },
    }));
  }
}
