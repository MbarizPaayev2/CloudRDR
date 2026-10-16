/**
 * @file site/js/config.js
 * CloudRDR Frontend Runtime Configuration
 */

export const CONFIG = {
  // Base URL for the Fastify backend API
  API_BASE_URL: 'http://localhost:3000',

  // API Authentication key matching backend .env
  API_KEY: 'change-me-before-running',

  // Telemetry polling interval in milliseconds
  POLL_INTERVAL_MS: 5000,

  // When true, uses self-contained deterministic mock API
  // Switching to false connects directly to the live Fastify backend
  USE_MOCK: true,

  // Storage bucket monitored
  BUCKET_NAME: 'protected',

  // Account ID for the demo simulation
  ACCOUNT_ID: 'acc-cloudrdr-prod',
};
