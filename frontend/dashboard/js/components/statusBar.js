/**
 * @file dashboard/js/components/statusBar.js
 *
 * Status Bar Component for CloudRDR Dashboard.
 * Displays:
 *   - System Health status indicator (Online / Offline / Checking)
 *   - Active Bucket name
 *   - Live Threat Verdict Badge (NORMAL / SUSPICIOUS / RANSOMWARE with pulsing alert)
 *   - Last updated telemetry timestamp
 *
 * Security:
 *   - Uses textContent exclusively for API data (No innerHTML XSS injection)
 */

/**
 * Format date to human-readable time string.
 * @param {string|Date} isoString
 * @returns {string}
 */
function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (_e) {
    return '—';
  }
}

/**
 * Render or update status bar elements based on state.
 * @param {import('../state.js').getState()} state
 */
export function updateStatusBar(state) {
  // 1. Bucket Name
  const bucketEl = document.getElementById('statusBarBucket');
  if (bucketEl) {
    bucketEl.textContent = state.baseline?.bucket || 'protected';
  }

  // 2. Health Indicator
  const healthText = document.getElementById('statusBarHealth');
  const healthDot = document.getElementById('healthDot');
  if (healthText && healthDot) {
    if (state.health?.status === 'ok') {
      healthText.textContent = `Online (${Math.round(state.health.uptime || 0)}s)`;
      healthDot.style.backgroundColor = 'var(--color-success)';
      healthDot.title = 'SOC Backend Operational';
    } else if (state.health?.status === 'loading') {
      healthText.textContent = 'Connecting...';
      healthDot.style.backgroundColor = 'var(--color-warning)';
      healthDot.title = 'Connecting to backend';
    } else {
      healthText.textContent = 'Offline';
      healthDot.style.backgroundColor = 'var(--color-danger)';
      healthDot.title = 'Backend unreachable';
    }
  }

  // 3. Threat Verdict Badge
  const verdictBadge = document.getElementById('verdictBadge');
  const verdictText = document.getElementById('statusBarVerdict');
  const verdictIcon = document.getElementById('verdictIcon');

  if (verdictBadge && verdictText) {
    const verdict = state.currentVerdict || 'normal';
    verdictBadge.className = `verdict-badge ${verdict}`;

    if (verdict === 'ransomware') {
      verdictText.textContent = state.canaryTriggered
        ? 'RANSOMWARE (CANARY TRIPPED)'
        : 'RANSOMWARE DETECTED';
      verdictBadge.classList.add('pulse-threat');
      if (verdictIcon) verdictIcon.textContent = '';
      verdictBadge.setAttribute('aria-label', 'Emergency: Ransomware attack in progress');
    } else if (verdict === 'suspicious') {
      verdictText.textContent = 'SUSPICIOUS ACTIVITY';
      verdictBadge.classList.remove('pulse-threat');
      if (verdictIcon) verdictIcon.textContent = '';
      verdictBadge.setAttribute('aria-label', 'Warning: Suspicious change rate');
    } else {
      verdictText.textContent = 'NORMAL';
      verdictBadge.classList.remove('pulse-threat');
      if (verdictIcon) verdictIcon.textContent = '';
      verdictBadge.setAttribute('aria-label', 'Status: Normal operations');
    }
  }

  // 4. Last Updated Timestamp
  const updatedEl = document.getElementById('statusBarUpdated');
  if (updatedEl) {
    updatedEl.textContent = formatTime(state.lastUpdated);
    if (state.lastUpdated) {
      updatedEl.setAttribute('datetime', state.lastUpdated);
    }
  }
}
