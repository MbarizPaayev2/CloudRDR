/**
 * @file dashboard/js/components/frostOverlay.js
 *
 * Frost overlay for frozen incidents.
 * Appends a translucent frost element over a given target container,
 * then removes it when the incident is no longer frozen.
 *
 * Security: DOM element creation only, no innerHTML.
 */

/** @type {Map<string, HTMLElement>} incidentId → overlay element */
const _overlays = new Map();

/**
 * Show frost overlay on a target element.
 * @param {HTMLElement} targetEl   Element to frost over
 * @param {string} incidentId      Incident ID (for deduplication)
 */
export function showFrost(targetEl, incidentId) {
  if (_overlays.has(incidentId)) return; // already frosted
  if (!targetEl) return;

  // Ensure target has position: relative for absolute child
  const pos = window.getComputedStyle(targetEl).position;
  if (pos === 'static') targetEl.style.position = 'relative';

  const overlay = document.createElement('div');
  overlay.className = 'frost-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('role', 'presentation');

  targetEl.appendChild(overlay);
  _overlays.set(incidentId, overlay);
}

/**
 * Remove frost overlay for a given incident.
 * @param {string} incidentId
 */
export function removeFrost(incidentId) {
  const overlay = _overlays.get(incidentId);
  if (overlay) {
    overlay.remove();
    _overlays.delete(incidentId);
  }
}

/**
 * Remove all frost overlays.
 */
export function clearAllFrost() {
  for (const [id, el] of _overlays) {
    el.remove();
    _overlays.delete(id);
  }
}
