/**
 * @file dashboard/js/state.js
 *
 * Central Reactive State Store for CloudRDR Admin Dashboard.
 * Manages in-memory state, event notification for UI components,
 * unified refresh orchestration, and filters.
 */

import { api } from './api.js';
import { CONFIG } from './config.js';

const initialState = {
  health: { status: 'loading', uptime: 0, timestamp: null },
  systemStatus: null,
  kpis: null,
  threatActivity: null,
  timeRange: '24H',
  detectionSummary: null,
  baseline: null,
  detectionRuns: [],
  incidents: [],
  selectedIncidentId: null,
  selectedIncident: null,
  securityEvents: [],
  recoveryHealth: null,
  cryptographicIntegrity: null,
  protectedStorage: null,
  restoreJob: null,
  auditLog: [],
  agentStatus: null,
  currentVerdict: 'normal',
  canaryTriggered: false,
  lastUpdated: null,
  isLoading: false,
  error: null,
  // Filters & UI state
  searchQuery: '',
  severityFilter: 'all',
  statusFilter: 'all',
  sidebarCollapsed: false,
  activeNav: 'overview',
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
  try {
    listener(currentState);
  } catch (err) {
    console.error('[state] initial subscriber error:', err);
  }
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Select an incident and fetch its details.
 * @param {string} incidentId
 */
export function selectIncident(incidentId) {
  const inc = currentState.incidents.find((i) => i.id === incidentId);
  setState({
    selectedIncidentId: incidentId,
    selectedIncident: inc || null,
  });
}

/**
 * Refresh all dashboard data in a single synchronized pass.
 */
export async function refreshAll() {
  setState({ isLoading: true, error: null });

  try {
    const [
      health,
      systemStatus,
      kpis,
      threatActivity,
      detectionSummary,
      baseline,
      detectionRuns,
      incidents,
      securityEvents,
      recoveryHealth,
      cryptographicIntegrity,
      protectedStorage,
      auditLog,
      agentStatus,
    ] = await Promise.allSettled([
      api.getHealth(),
      api.getSystemStatus(),
      api.getKpis(),
      api.getThreatActivity(currentState.timeRange),
      api.getDetectionEngineSummary(),
      api.getBaseline(CONFIG.BUCKET_NAME),
      api.getDetectionRuns(15),
      api.getIncidents(),
      api.getSecurityEvents(10),
      api.getRecoveryHealth(),
      api.getCryptographicIntegrity(),
      api.getProtectedStorage(),
      api.getAuditLog(),
      typeof api.getAgentStatus === 'function' ? api.getAgentStatus() : Promise.resolve(null),
    ]);

    const runsVal = detectionRuns.status === 'fulfilled' ? detectionRuns.value : [];
    const latestRun = runsVal.length > 0 ? runsVal[runsVal.length - 1] : null;
    const currentVerdict = latestRun?.verdict || 'normal';
    const canaryTriggered = latestRun?.canary_triggered || false;

    const incidentsVal = incidents.status === 'fulfilled' ? incidents.value : [];
    let selectedInc = currentState.selectedIncident;
    let selectedId = currentState.selectedIncidentId;

    if (!selectedId && incidentsVal.length > 0) {
      selectedId = incidentsVal[0].id;
      selectedInc = incidentsVal[0];
    } else if (selectedId) {
      selectedInc = incidentsVal.find((i) => i.id === selectedId) || null;
    }

    setState({
      health:
        health.status === 'fulfilled'
          ? health.value
          : { status: 'error', uptime: 0, timestamp: null },
      systemStatus: systemStatus.status === 'fulfilled' ? systemStatus.value : null,
      kpis: kpis.status === 'fulfilled' ? kpis.value : null,
      threatActivity: threatActivity.status === 'fulfilled' ? threatActivity.value : null,
      detectionSummary: detectionSummary.status === 'fulfilled' ? detectionSummary.value : null,
      baseline: baseline.status === 'fulfilled' ? baseline.value : null,
      detectionRuns: runsVal,
      incidents: incidentsVal,
      selectedIncidentId: selectedId,
      selectedIncident: selectedInc,
      securityEvents: securityEvents.status === 'fulfilled' ? securityEvents.value : [],
      recoveryHealth: recoveryHealth.status === 'fulfilled' ? recoveryHealth.value : null,
      cryptographicIntegrity:
        cryptographicIntegrity.status === 'fulfilled' ? cryptographicIntegrity.value : null,
      protectedStorage: protectedStorage.status === 'fulfilled' ? protectedStorage.value : null,
      auditLog: auditLog.status === 'fulfilled' ? auditLog.value : [],
      agentStatus: agentStatus.status === 'fulfilled' ? agentStatus.value : null,
      currentVerdict,
      canaryTriggered,
      lastUpdated: new Date().toISOString(),
      isLoading: false,
    });
  } catch (err) {
    console.error('[state] refreshAll failed:', err);
    setState({
      error: err.message || 'Failed to refresh telemetry',
      isLoading: false,
    });
  }
}
