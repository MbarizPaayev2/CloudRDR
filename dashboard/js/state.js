/**
 * @file dashboard/js/state.js
 * Central in-memory state store and subscription system for CloudRDR.
 */

export const state = {
  health: { status: 'loading', uptime: 0 },
  baseline: null,
  detectionRuns: [],
  incidents: [],
  selectedIncidentId: null,
  restoreJob: null,
  auditLog: [],
  currentVerdict: 'normal',
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(partial) {
  Object.assign(state, partial);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
