/**
 * @file src/detection/rateWindow.js
 *
 * Sliding time window and rate calculation utilities.
 * Pure functions so QA can unit test with synthetic event lists.
 */

import { subtractSeconds } from '../utils/time.js';

/**
 * Filter an array of events to only those falling within the sliding window.
 *
 * @param {Array<{ observed_at: string|Date }>} events
 * @param {number} windowSeconds
 * @param {Date} [now=new Date()]
 * @returns {Array<typeof events[0]>}
 */
export function filterEventsInWindow(events, windowSeconds, now = new Date()) {
  if (!events || events.length === 0) return [];
  const cutoff = subtractSeconds(windowSeconds, now).getTime();

  return events.filter((e) => {
    const t = new Date(e.observed_at).getTime();
    return t >= cutoff && t <= now.getTime();
  });
}

/**
 * Compute change rate metrics from a window of events.
 * Only events where `matched_baseline === false` (or deleted) count towards changed files.
 * Multiple events for the same file in the window are de-duplicated.
 *
 * @param {Array<{ path: string, matched_baseline?: boolean, event_type?: string }>} eventsInWindow
 * @param {number} totalProtectedFiles Total protected files for the account / bucket.
 * @returns {{ uniqueChangedPaths: string[], changedCount: number, changeRate: number }}
 */
export function computeChangeMetrics(eventsInWindow, totalProtectedFiles) {
  const uniqueChanged = new Set();

  for (const evt of eventsInWindow) {
    // If the file was deleted or its content does NOT match the baseline, count as changed
    if (evt.event_type === 'deleted' || evt.matched_baseline === false) {
      uniqueChanged.add(evt.path);
    }
  }

  const uniqueChangedPaths = Array.from(uniqueChanged).sort();
  const changedCount = uniqueChangedPaths.length;
  const changeRate =
    totalProtectedFiles > 0 ? Number((changedCount / totalProtectedFiles).toFixed(4)) : 0;

  return {
    uniqueChangedPaths,
    changedCount,
    changeRate,
  };
}
