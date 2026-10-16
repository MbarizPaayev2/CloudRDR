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
  const wrap = document.getElementById('canaryCageWrap');
  const text = document.getElementById('canaryStatusText');

  if (!wrap || !text) return;

  if (canaryTriggered || verdict === 'ransomware') {
    wrap.className = 'canary-cage-wrap triggered';
    text.textContent = 'TRIPWIRE BREACH DETECTED';
    text.style.color = 'var(--threat)';

    // Show a warning label if newly triggered
    if (!_wasTriggered) {
      const flash = document.createElement('div');
      flash.style.cssText = `
        font-family: var(--font-mono);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--threat);
        margin-top: 3px;
      `;
      flash.textContent = 'CANARY FILE TAMPERED';
      const old = wrap.querySelector('.canary-flash');
      if (old) old.remove();
      flash.className = 'canary-flash';
      wrap.appendChild(flash);
    }
    _wasTriggered = true;
  } else {
    wrap.className = 'canary-cage-wrap healthy';
    text.textContent = 'Tripwire Sentinel Armed';
    text.style.color = 'var(--normal)';
    const flash = wrap.querySelector('.canary-flash');
    if (flash) flash.remove();
    _wasTriggered = false;
  }
}
