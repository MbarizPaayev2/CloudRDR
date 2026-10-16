/**
 * @file src/utils/time.js
 * Tiny time-manipulation helpers used across the codebase.
 */

/**
 * Return a Date that is `seconds` seconds before `from` (default: now).
 * @param {number} seconds
 * @param {Date} [from]
 * @returns {Date}
 */
export function subtractSeconds(seconds, from = new Date()) {
  return new Date(from.getTime() - seconds * 1000);
}

/**
 * Return the current UTC timestamp as an ISO-8601 string.
 * @returns {string}
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Sleep for `ms` milliseconds. Useful in retry loops.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute exponential backoff delay with optional jitter.
 * @param {number} attempt  0-indexed attempt number.
 * @param {number} [baseMs] Base delay in ms (default 500).
 * @param {number} [maxMs]  Cap in ms (default 10 000).
 * @returns {number} Milliseconds to wait.
 */
export function backoffMs(attempt, baseMs = 500, maxMs = 10_000) {
  const exp = Math.min(baseMs * 2 ** attempt, maxMs);
  // ±25% jitter to avoid thundering herd
  const jitter = exp * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exp + jitter);
}
