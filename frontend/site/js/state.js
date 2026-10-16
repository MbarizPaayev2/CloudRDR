/**
 * @file site/js/state.js
 * In-memory Reactive State Store for CloudRDR.
 */

const initialState = {
  health: { status: 'connecting', uptime: 0 },
  verdict: 'normal', // 'normal' | 'suspicious' | 'ransomware'
  changeRate: 0.0,
  canaryTriggered: false,
  canaryFile: 'canary/tripwire_sentinel.docx',
  canaryTriggeredAt: null,
  accountFrozen: false,
  frozenAt: null,

  baseline: {
    bucket: 'protected',
    merkle_root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    file_count: 16,
    version: 1,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    created_by: 'cloudrdr-agent',
  },

  // Telemetry history for Chart.js
  detectionRuns: [],

  // Incidents
  incidents: [],
  activeIncident: null,

  // Restore status
  activeRestoreJob: null,

  // Merkle DAG dynamic visual state
  corruptedLeaves: new Set(),
  restoredLeaves: new Set(),
  currentRootHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',

  // Hash-chained audit ledger
  auditLog: [],
  chainTampered: false,

  // Demo story playback
  isStoryPlaying: false,
  storyStep: '',
};

let state = { ...initialState };
const listeners = new Set();

/**
 * Get the current immutable state snapshot.
 * @returns {typeof initialState}
 */
export function getState() {
  return state;
}

/**
 * Update state and notify all subscribers.
 * @param {Partial<typeof initialState>} updates
 */
export function setState(updates) {
  state = { ...state, ...updates };
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.error('[State] Listener error:', err);
    }
  });
}

/**
 * Subscribe to state updates.
 * @param {(state: typeof initialState) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  listener(state); // Initial call
  return () => listeners.delete(listener);
}

/**
 * Reset state to initial baseline.
 */
export function resetState() {
  setState(initialState);
}
