/**
 * @file src/detection/thresholds.js
 *
 * Configurable thresholds and classification logic for CloudRDR.
 */

import fs from 'node:fs';
import path from 'node:path';
import cfg from '../config/index.js';

/**
 * Default threshold settings.
 */
export const DEFAULT_THRESHOLDS = {
  windowSeconds: 60,
  suspiciousRate: 0.1,
  ransomwareRate: 0.3,
  entropyThreshold: 7.2,
  cumulativeDriftThreshold: 0.15,
  minRiskScoreRansomware: 60,
  minRiskScoreSuspicious: 30,
  enableProcessHeuristics: true,
  enableNoiseFilter: true,
  allowlistedAccounts: [],
};

let _runtimeThresholds = null;

// Hydrate persisted detection thresholds on startup (non-test mode)
if (process.env.NODE_ENV !== 'test') {
  try {
    const dbStorePath = path.resolve(process.cwd(), 'data', 'db-storage.json');
    if (fs.existsSync(dbStorePath)) {
      const parsed = JSON.parse(fs.readFileSync(dbStorePath, 'utf8'));
      if (Array.isArray(parsed.detection_config) && parsed.detection_config.length > 0) {
        _runtimeThresholds = { ...DEFAULT_THRESHOLDS, ...parsed.detection_config[0] };
      }
    }
  } catch {
    // Non-fatal
  }
}

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
    entropyThreshold: DEFAULT_THRESHOLDS.entropyThreshold,
    cumulativeDriftThreshold: DEFAULT_THRESHOLDS.cumulativeDriftThreshold,
    minRiskScoreRansomware: DEFAULT_THRESHOLDS.minRiskScoreRansomware,
    minRiskScoreSuspicious: DEFAULT_THRESHOLDS.minRiskScoreSuspicious,
    enableProcessHeuristics: DEFAULT_THRESHOLDS.enableProcessHeuristics,
    enableNoiseFilter: DEFAULT_THRESHOLDS.enableNoiseFilter,
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
    windowSeconds:
      typeof updates.windowSeconds === 'number' && updates.windowSeconds > 0
        ? updates.windowSeconds
        : current.windowSeconds,
    suspiciousRate:
      typeof updates.suspiciousRate === 'number' &&
      updates.suspiciousRate >= 0 &&
      updates.suspiciousRate <= 1
        ? updates.suspiciousRate
        : current.suspiciousRate,
    ransomwareRate:
      typeof updates.ransomwareRate === 'number' &&
      updates.ransomwareRate >= 0 &&
      updates.ransomwareRate <= 1
        ? updates.ransomwareRate
        : current.ransomwareRate,
    entropyThreshold:
      typeof updates.entropyThreshold === 'number' && updates.entropyThreshold >= 0
        ? updates.entropyThreshold
        : current.entropyThreshold,
    cumulativeDriftThreshold:
      typeof updates.cumulativeDriftThreshold === 'number'
        ? updates.cumulativeDriftThreshold
        : current.cumulativeDriftThreshold,
    minRiskScoreRansomware:
      typeof updates.minRiskScoreRansomware === 'number'
        ? updates.minRiskScoreRansomware
        : current.minRiskScoreRansomware,
    minRiskScoreSuspicious:
      typeof updates.minRiskScoreSuspicious === 'number'
        ? updates.minRiskScoreSuspicious
        : current.minRiskScoreSuspicious,
    enableProcessHeuristics:
      typeof updates.enableProcessHeuristics === 'boolean'
        ? updates.enableProcessHeuristics
        : current.enableProcessHeuristics,
    enableNoiseFilter:
      typeof updates.enableNoiseFilter === 'boolean'
        ? updates.enableNoiseFilter
        : current.enableNoiseFilter,
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
 * Classify a change rate, entropy, and threat indicators into a detection verdict.
 *
 * Verdict boundaries:
 *   - normal:      rate < suspiciousRate (and no canary / high entropy / critical indicators)
 *   - suspicious:  suspiciousRate <= rate < ransomwareRate OR drift exceeded OR medium risk score
 *   - ransomware:  rate >= ransomwareRate OR canary triggered OR entropyTriggered OR high risk score
 *
 * Allowlisted accounts are always classified as 'normal'.
 *
 * @param {number} rate Change rate between 0.0 and 1.0
 * @param {Object} [options]
 * @param {number} [options.suspiciousRate=0.10]
 * @param {number} [options.ransomwareRate=0.30]
 * @param {boolean} [options.canaryTriggered=false]
 * @param {boolean} [options.entropyTriggered=false]
 * @param {boolean} [options.heuristicTriggered=false]
 * @param {boolean} [options.driftExceeded=false]
 * @param {boolean} [options.shadowCopyTampering=false]
 * @param {number} [options.riskScore]
 * @param {boolean} [options.isAllowlisted=false]
 * @returns {'normal'|'suspicious'|'ransomware'}
 */
export function classifyRate(rate, options = {}) {
  const {
    suspiciousRate = DEFAULT_THRESHOLDS.suspiciousRate,
    ransomwareRate = DEFAULT_THRESHOLDS.ransomwareRate,
    canaryTriggered = false,
    entropyTriggered = false,
    heuristicTriggered = false,
    driftExceeded = false,
    shadowCopyTampering = false,
    riskScore = null,
    isAllowlisted = false,
  } = options;

  if (isAllowlisted) {
    return 'normal';
  }

  // If risk score is computed and decisive
  if (typeof riskScore === 'number') {
    if (riskScore >= (options.minRiskScoreRansomware || DEFAULT_THRESHOLDS.minRiskScoreRansomware)) {
      return 'ransomware';
    }
  }

  if (canaryTriggered || entropyTriggered || heuristicTriggered || shadowCopyTampering) {
    return 'ransomware';
  }

  if (rate >= ransomwareRate) {
    return 'ransomware';
  }

  if (typeof riskScore === 'number') {
    if (riskScore >= (options.minRiskScoreSuspicious || DEFAULT_THRESHOLDS.minRiskScoreSuspicious)) {
      return 'suspicious';
    }
  }

  if (rate >= suspiciousRate || driftExceeded) {
    return 'suspicious';
  }

  return 'normal';
}
