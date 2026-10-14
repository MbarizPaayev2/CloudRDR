/**
 * @file api/index.js
 * Vercel Serverless Function entry point for CloudRDR.
 * Delegates all incoming HTTP requests to Fastify buildServer.
 */

import { buildServer } from '../src/api/server.js';

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
  const app = await getApp();
  app.server.emit('request', req, res);
}
