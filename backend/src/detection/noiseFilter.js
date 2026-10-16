/**
 * @file src/detection/noiseFilter.js
 *
 * Noise filtering and path exclusion for CloudRDR Detection Engine.
 * Filters out benign high-velocity build, cache, and temp directory activity
 * that would otherwise trigger false positives in developer / enterprise environments.
 */

// Directories frequently generating legitimate bulk file creations/deletions
export const DEFAULT_EXCLUDED_DIRECTORY_PATTERNS = [
  /(^|\/|\\)node_modules(\/|\\)/i,
  /(^|\/|\\)\.git(\/|\\)/i,
  /(^|\/|\\)\.svn(\/|\\)/i,
  /(^|\/|\\)target(\/|\\)/i,
  /(^|\/|\\)dist(\/|\\)/i,
  /(^|\/|\\)build(\/|\\)/i,
  /(^|\/|\\)vendor(\/|\\)/i,
  /(^|\/|\\)__pycache__(\/|\\)/i,
  /(^|\/|\\)\.idea(\/|\\)/i,
  /(^|\/|\\)\.vscode(\/|\\)/i,
];

// File extension patterns that represent temporary files or cache
export const DEFAULT_EXCLUDED_EXTENSIONS = [
  /\.(tmp|temp|cache|swp|bak)$/i,
];

/**
 * Check whether a given file path is classified as benign developer/system noise.
 *
 * @param {string} filePath
 * @param {Object} [options]
 * @param {RegExp[]} [options.excludedDirs]
 * @param {RegExp[]} [options.excludedExts]
 * @returns {boolean} true if path is noise, false if it should be evaluated
 */
export function isNoisePath(filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') return false;

  const excludedDirs = options.excludedDirs || DEFAULT_EXCLUDED_DIRECTORY_PATTERNS;
  const excludedExts = options.excludedExts || DEFAULT_EXCLUDED_EXTENSIONS;

  for (const dirPattern of excludedDirs) {
    if (dirPattern.test(filePath)) {
      return true;
    }
  }

  for (const extPattern of excludedExts) {
    if (extPattern.test(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter an event list, excluding noise paths while preserving canary files
 * and explicit ransomware extensions or notes regardless of location.
 *
 * @param {Array<Object>} events
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true]
 * @param {Set<string>|string[]} [options.canaryPaths]
 * @returns {{ filteredEvents: Array<Object>, noiseFilteredCount: number }}
 */
export function filterNoiseEvents(events = [], options = {}) {
  const enabled = options.enabled !== false;
  if (!enabled || !events || events.length === 0) {
    return { filteredEvents: events || [], noiseFilteredCount: 0 };
  }

  const canarySet = options.canaryPaths instanceof Set
    ? options.canaryPaths
    : new Set(options.canaryPaths || []);

  const filteredEvents = [];
  let noiseFilteredCount = 0;

  for (const evt of events) {
    const p = evt.path || '';

    // Always keep canary events
    if (canarySet.has(p) || evt.is_canary) {
      filteredEvents.push(evt);
      continue;
    }

    // Check if path matches benign noise
    if (isNoisePath(p, options)) {
      noiseFilteredCount++;
      continue;
    }

    filteredEvents.push(evt);
  }

  return {
    filteredEvents,
    noiseFilteredCount,
  };
}
