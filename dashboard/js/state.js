/**
 * @file dashboard/js/state.js
 *
 * Central Reactive State Store for CloudRDR Dashboard.
 * Manages in-memory state, event notification for UI components,
 * and unified refresh orchestration.
 */

import { api } from './api.js';
import { CONFIG } from './config.js';

const initialState = {
  health: { status: 'loading', uptime: 0, timestamp: null },
  baseline: null,
  detectionRuns: [],
  incidents: [],
  selectedIncidentId: null,
  selectedIncident: null,
  restoreJob: null,
  auditLog: [],
  currentVerdict: 'normal',
  canaryTriggered: false,
  lastUpdated: null,
  isLoading: false,
  error: null,
};

let currentState = { ...initialState };
const listeners = new Set();

/**
 * Get current snapshot of the state.
 * @returns {typeof initialState}
 */
export function getState() {
  return currentState;
}

/**
 * Mutate state and notify all subscribers.
 * @param {Partial<typeof initialState>} partial
 */
export function setState(partial) {
  currentState = { ...currentState, ...partial };
  for (const listener of listeners) {
    try {
      listener(currentState);
    } catch (err) {
      console.error('[state] subscriber error:', err);
    }
  }
}

/**
 * Subscribe to state changes.
 * @param {(state: typeof initialState) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  // Call listener immediately with current state
  try {
    listener(currentState);
  } catch (err) {
    console.error('[state] initial subscriber call error:', err);
  }
  return () => listeners.delete(listener);
}

/**
 * Select an incident to view its detailed timeline and affected files.
 * @param {string|null} incidentId
 */
export async function selectIncident(incidentId) {
  if (!incidentId) {
    setState({ selectedIncidentId: null, selectedIncident: null });
    return;
  }

  // Find in already loaded list or fetch from API
  let found = currentState.incidents.find((i) => i.id === incidentId);
  if (!found) {
    try {
      found = await api.getIncidentById(incidentId);
    } catch (_err) {
      found = null;
    }
  }

  setState({ selectedIncidentId: incidentId, selectedIncident: found });
}

/**
 * Determine global threat verdict from recent runs.
 * @param {Array<any>} runs
 * @returns {{ verdict: 'normal'|'suspicious'|'ransomware', canaryTriggered: boolean }}
 */
function deriveVerdict(runs) {
  if (!runs || runs.length === 0) {
    return { verdict: 'normal', canaryTriggered: false };
  }

  // Look at the latest run
  const latest = runs[runs.length - 1];
  return {
    verdict: latest.verdict || 'normal',
    canaryTriggered: Boolean(latest.canary_triggered),
  };
}

/**
 * Orchestrate complete data refresh across all panels.
 * Preserves existing telemetry on partial failures to prevent blank screens.
 * @param {{ background?: boolean }} [options]
 */
export async function refreshAll(options = {}) {
  const isBackground = Boolean(options.background);
  if (!isBackground) {
    setState({ isLoading: true });
  }

  try {
    const [healthRes, baselineRes, runsRes, incidentsRes, auditRes] = await Promise.allSettled([
      api.getHealth(),
      api.getBaseline(CONFIG.BUCKET_NAME),
      api.getDetectionRuns(50),
      api.getIncidents(),
      api.getAuditLog(),
    ]);

    // Check for errors without wiping out valid panels
    let errorDetail = null;
    const rejected = [healthRes, baselineRes, runsRes, incidentsRes, auditRes].find(
      (r) => r.status === 'rejected'
    );
    if (rejected && rejected.reason) {
      const err = rejected.reason;
      errorDetail = {
        code: err.code || err.error?.code || 'api_error',
        message: err.message || err.error?.message || 'Failed to communicate with backend API',
      };
    }

    const health =
      healthRes.status === 'fulfilled'
        ? healthRes.value
        : currentState.health || { status: 'offline', uptime: 0 };
    const baseline =
      baselineRes.status === 'fulfilled' ? baselineRes.value : currentState.baseline;
    const runs =
      runsRes.status === 'fulfilled' ? runsRes.value : currentState.detectionRuns;
    const incidents =
      incidentsRes.status === 'fulfilled' ? incidentsRes.value : currentState.incidents;
    const auditLog =
      auditRes.status === 'fulfilled' ? auditRes.value : currentState.auditLog;

    const { verdict, canaryTriggered } = deriveVerdict(runs);

    // Keep selected incident synced if available
    let selectedIncident = currentState.selectedIncident;
    if (currentState.selectedIncidentId) {
      selectedIncident =
        incidents.find((i) => i.id === currentState.selectedIncidentId) || selectedIncident;
    } else if (incidents.length > 0) {
      // Default select the first active/frozen incident or the latest incident
      const firstActive = incidents.find((i) => i.status !== 'resolved') || incidents[0];
      selectedIncident = firstActive;
    }

    setState({
      health,
      baseline,
      detectionRuns: runs,
      incidents,
      selectedIncidentId: selectedIncident ? selectedIncident.id : null,
      selectedIncident,
      auditLog,
      currentVerdict: verdict,
      canaryTriggered,
      lastUpdated: new Date().toISOString(),
      isLoading: false,
      error: errorDetail,
    });
  } catch (err) {
    console.error('[state] refresh failed:', err);
    setState({
      isLoading: false,
      error: {
        code: err.code || err.error?.code || 'refresh_failed',
        message: err.message || err.error?.message || 'Failed to refresh telemetry from backend',
      },
    });
  }
}

