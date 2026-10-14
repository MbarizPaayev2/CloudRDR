/**
 * @file src/detection/thresholds.js
 *
 * Configurable thresholds and classification logic for CloudRDR.
 */

import cfg from '../config/index.js';

/**
 * Default threshold settings.
 */
export const DEFAULT_THRESHOLDS = {
  windowSeconds: 60,
  suspiciousRate: 0.1,
  ransomwareRate: 0.3,
  allowlistedAccounts: [],
};

let _runtimeThresholds = null;

/**
 * Retrieve active detection thresholds from configuration or runtime override.
 * @returns {typeof DEFAULT_THRESHOLDS}
 */
export function getThresholds() {
  if (_runtimeThresholds) {
    return { ..._runtimeThresholds };
  }
  return {
    windowSeconds: cfg.detection.windowSeconds ?? DEFAULT_THRESHOLDS.windowSeconds,
    suspiciousRate: cfg.detection.suspiciousRate ?? DEFAULT_THRESHOLDS.suspiciousRate,
    ransomwareRate: cfg.detection.ransomwareRate ?? DEFAULT_THRESHOLDS.ransomwareRate,
    allowlistedAccounts:
      cfg.detection.allowlistedAccounts ?? DEFAULT_THRESHOLDS.allowlistedAccounts,
  };
}

/**
 * Update active detection thresholds at runtime.
 * @param {Partial<typeof DEFAULT_THRESHOLDS>} updates
 * @returns {typeof DEFAULT_THRESHOLDS}
 */
export function updateThresholds(updates = {}) {
  const current = getThresholds();
  _runtimeThresholds = {
    windowSeconds: typeof updates.windowSeconds === 'number' && updates.windowSeconds > 0
      ? updates.windowSeconds
      : current.windowSeconds,
    suspiciousRate: typeof updates.suspiciousRate === 'number' && updates.suspiciousRate >= 0 && updates.suspiciousRate <= 1
      ? updates.suspiciousRate
      : current.suspiciousRate,
    ransomwareRate: typeof updates.ransomwareRate === 'number' && updates.ransomwareRate >= 0 && updates.ransomwareRate <= 1
      ? updates.ransomwareRate
      : current.ransomwareRate,
    allowlistedAccounts: Array.isArray(updates.allowlistedAccounts)
      ? updates.allowlistedAccounts
      : current.allowlistedAccounts,
  };
  return { ..._runtimeThresholds };
}

/**
 * Reset thresholds to default config (for tests).
 */
export function resetThresholdsForTests() {
  _runtimeThresholds = null;
}

/**
 * Classify a change rate into a detection verdict.
 *
 * Verdict boundaries:
 *   - normal:      rate < suspiciousRate (and no canary triggered)
 *   - suspicious:  suspiciousRate <= rate < ransomwareRate
 *   - ransomware:  rate >= ransomwareRate OR canary triggered
 *
 * Allowlisted accounts are always classified as 'normal'.
 *
 * @param {number} rate Change rate between 0.0 and 1.0
 * @param {Object} [options]
 * @param {number} [options.suspiciousRate=0.10]
 * @param {number} [options.ransomwareRate=0.30]
 * @param {boolean} [options.canaryTriggered=false]
 * @param {boolean} [options.isAllowlisted=false]
 * @returns {'normal'|'suspicious'|'ransomware'}
 */
export function classifyRate(rate, options = {}) {
  const {
    suspiciousRate = DEFAULT_THRESHOLDS.suspiciousRate,
    ransomwareRate = DEFAULT_THRESHOLDS.ransomwareRate,
    canaryTriggered = false,
    isAllowlisted = false,
  } = options;

  if (isAllowlisted) {
    return 'normal';
  }

  if (canaryTriggered) {
    return 'ransomware';
  }

  if (rate >= ransomwareRate) {
    return 'ransomware';
  }

  if (rate >= suspiciousRate) {
    return 'suspicious';
  }

  return 'normal';
}
