/**
 * @file scripts/run-monitor.js
 *
 * Standalone monitor agent runner for CloudRDR.
 * Polls storage bucket on schedule, evaluates change rates,
 * and handles graceful process termination.
 *
 * Usage:
 *   npm run monitor
 */

import { MonitorAgent } from '../backend/src/monitor/monitorAgent.js';
import cfg from '../backend/src/config/index.js';
import logger from '../backend/src/utils/logger.js';

async function main() {
  console.log('\n[MONITOR] Starting CloudRDR Monitor Agent...');
  console.log(`Bucket:            ${cfg.storage.bucket}`);
  console.log(`Interval:          ${cfg.monitor.intervalSeconds}s`);
  console.log(`Detection Window:  ${cfg.detection.windowSeconds}s`);
  console.log(`Ransomware Rate:   ${cfg.detection.ransomwareRate * 100}%\n`);

  const agent = new MonitorAgent({
    bucket: cfg.storage.bucket,
    intervalSeconds: cfg.monitor.intervalSeconds,
  });

  await agent.start();

  const shutdown = () => {
    console.log('\n[MONITOR] Shutting down monitor agent gracefully...');
    agent.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.fatal({ err: err.message }, 'Failed to run monitor agent');
  process.exit(1);
});
