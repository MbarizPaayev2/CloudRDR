/**
 * @file src/detection/canary.js
 *
 * Canary detection logic.
 * Canary (or sentinel) files are traps placed in storage to trigger immediate
 * ransomware alerts upon modification or deletion.
 */

/**
 * Default pattern matching canary files:
 * e.g., 'canaries/canary_1.docx', 'test.canary', '.canary.txt', 'canary-file.dat'
 */
const CANARY_REGEX = /(?:^|\/|\.)canary(?:[._\-/]|$)/i;

/**
 * Determine if a file path is a designated canary file based on naming pattern.
 * @param {string} path
 * @returns {boolean}
 */
export function isCanaryPath(path) {
  if (!path) return false;
  return CANARY_REGEX.test(path);
}

/**
 * Check a list of change events against canary paths.
 * If ANY canary file is modified or deleted, triggers immediately.
 *
 * @param {Array<{ path: string, event_type: string }>} events
 * @param {Set<string> | string[]} [knownCanaries] Set or array of known canary paths.
 * @returns {boolean} true if any canary file was modified or deleted.
 */
export function isCanaryTriggered(events, knownCanaries = null) {
  if (!events || events.length === 0) return false;

  const canarySet = knownCanaries instanceof Set
    ? knownCanaries
    : Array.isArray(knownCanaries)
    ? new Set(knownCanaries)
    : null;

  for (const evt of events) {
    if (evt.event_type === 'modified' || evt.event_type === 'deleted') {
      if (canarySet && canarySet.has(evt.path)) {
        return true;
      }
      if (isCanaryPath(evt.path)) {
        return true;
      }
    }
  }

  return false;
}
