/**
 * @file dashboard/js/components/canaryCage.js
 *
 * Canary Cage component: updates the canary bird SVG and status text.
 * Healthy = bird bobs (CSS animation).
 * Triggered = bird goes still and grey.
 *
 * Security: textContent only.
 */

let _wasTriggered = false;

/**
 * Update the canary cage based on current state.
 * @param {boolean} canaryTriggered
 * @param {string} verdict
 */
export function updateCanaryCage(canaryTriggered, verdict) {
  const wrap   = document.getElementById('canaryCageWrap');
  const text   = document.getElementById('canaryStatusText');

  if (!wrap || !text) return;

  if (canaryTriggered || verdict === 'ransomware') {
    wrap.className = 'canary-cage-wrap triggered';
    text.textContent = 'Silent — Canary file touched';
    text.style.color = 'var(--seal)';

    // Show a warning label if newly triggered
    if (!_wasTriggered) {
      const flash = document.createElement('div');
      flash.style.cssText = `
        font-family: var(--font-stamp);
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        color: var(--seal);
        margin-top: 4px;
      `;
      flash.textContent = '⚠ TRIPWIRE BREACHED';
      // Remove any existing flash
      const old = wrap.querySelector('.canary-flash');
      if (old) old.remove();
      flash.className = 'canary-flash';
      wrap.appendChild(flash);
    }
    _wasTriggered = true;
  } else {
    wrap.className = 'canary-cage-wrap healthy';
    text.textContent = 'Singing';
    text.style.color = 'var(--verdigris)';
    // Remove flash if present
    const flash = wrap.querySelector('.canary-flash');
    if (flash) flash.remove();
    _wasTriggered = false;
  }
}
