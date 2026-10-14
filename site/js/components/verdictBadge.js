/**
 * @file site/js/components/verdictBadge.js
 * Real-time Threat Verdict Component.
 */

/**
 * Render or update a verdict badge.
 * @param {HTMLElement} badgeEl
 * @param {'normal' | 'suspicious' | 'ransomware'} verdict
 */
export function updateVerdictBadge(badgeEl, verdict = 'normal') {
  if (!badgeEl) return;

  badgeEl.className = `verdict-badge ${verdict}`;

  let iconSvg = '';
  let labelText = '';

  if (verdict === 'normal') {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`;
    labelText = 'NORMAL';
  } else if (verdict === 'suspicious') {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    labelText = 'SUSPICIOUS';
  } else {
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    labelText = 'RANSOMWARE';
  }

  badgeEl.innerHTML = `${iconSvg} <span>${labelText}</span>`;
  badgeEl.setAttribute('aria-label', `Threat verdict: ${labelText}`);
}
