/**
 * @file site/js/main.js
 * CloudRDR Main Orchestration Module.
 * Telemetry polling (5s), visibility change pausing, and story triggers.
 */

import { CONFIG } from './config.js';
import { getState, setState, subscribe } from './state.js';
import * as api from './api.js';

let pollTimer = null;

/**
 * Poll telemetry from API and update reactive state.
 */
export async function pollTelemetry() {
  try {
    const [health, baseline, runs, incidents, auditLog] = await Promise.all([
      api.getHealth().catch(() => ({ status: 'offline', uptime: 0 })),
      api.getBaseline(CONFIG.BUCKET_NAME).catch(() => null),
      api.getDetectionRuns(50).catch(() => []),
      api.getIncidents().catch(() => []),
      api.getAuditLog().catch(() => []),
    ]);

    const latestRun = runs[runs.length - 1] || {};
    const state = getState();

    // If story is currently playing, preserve story-driven state
    if (!state.isStoryPlaying) {
      setState({
        health,
        baseline: baseline || state.baseline,
        detectionRuns: runs,
        incidents,
        auditLog,
        verdict: latestRun.verdict || 'normal',
        changeRate: Number(latestRun.change_rate) || 0.0,
        canaryTriggered: Boolean(latestRun.canary_triggered),
      });
    }
  } catch (err) {
    console.warn('[Telemetry] Poll warning:', err.message);
  }
}

/**
 * Start the background polling loop.
 */
export function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTelemetry();
  pollTimer = setInterval(pollTelemetry, CONFIG.POLL_INTERVAL_MS);

  // Pause polling when tab is hidden (Rule: pause on hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    } else {
      if (!pollTimer) {
        pollTelemetry();
        pollTimer = setInterval(pollTelemetry, CONFIG.POLL_INTERVAL_MS);
      }
    }
  });
}

/**
 * Stop background polling.
 */
export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
