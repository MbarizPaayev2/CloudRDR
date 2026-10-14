/**
 * @file dashboard/js/components/baselinePanel.js
 *
 * Cryptographic Baseline Panel Component for CloudRDR Dashboard.
 * Displays:
 *   - Total protected files in active baseline
 *   - Snapshot timestamp
 *   - Shortened Merkle root with full hash tooltip & one-click copy
 *   - Baseline capture action trigger with loading/disabled state
 *
 * Security:
 *   - Strictly uses textContent to eliminate XSS risks
 */

import { api } from '../api.js';
import { refreshAll } from '../state.js';

let isCapturing = false;

/**
 * Format full hash into shortened readable form (e.g. f7bbb3...dd5a).
 * @param {string} hash
 * @returns {string}
 */
function shortenHash(hash) {
  if (!hash || hash.length < 16) return hash || '—';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

/**
 * Format ISO date string into readable local timestamp.
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (_e) {
    return '—';
  }
}

/**
 * Initialize baseline action button listener.
 */
export function initBaselinePanel() {
  const btn = document.getElementById('createBaselineBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (isCapturing) return;

    if (!confirm('Capture a new cryptographic SHA-256 baseline and compute Merkle tree root for protected bucket?')) {
      return;
    }

    isCapturing = true;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Capturing Baseline...';

    try {
      await api.createBaseline();
      await refreshAll();
    } catch (err) {
      alert(`Baseline creation failed: ${err.message || 'Unknown error'}`);
    } finally {
      isCapturing = false;
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

/**
 * Update baseline panel fields from state.
 * @param {import('../state.js').getState()} state
 */
export function updateBaselinePanel(state) {
  const baseline = state.baseline;

  // 1. Version Badge
  const versionBadge = document.getElementById('baselineVersionBadge');
  if (versionBadge) {
    versionBadge.textContent = baseline?.version ? `v${baseline.version}` : 'v—';
  }

  // 2. File Count
  const fileCountEl = document.getElementById('baselineFileCount');
  if (fileCountEl) {
    fileCountEl.textContent = baseline?.file_count !== undefined ? String(baseline.file_count) : '—';
  }

  // 3. Snapshot Date
  const dateEl = document.getElementById('baselineSnapshotDate');
  if (dateEl) {
    dateEl.textContent = formatDate(baseline?.created_at);
  }

  // 4. Merkle Root
  const merkleEl = document.getElementById('baselineMerkleRoot');
  if (merkleEl) {
    const root = baseline?.merkle_root || '';
    if (root) {
      merkleEl.textContent = shortenHash(root);
      merkleEl.setAttribute('title', root);
    } else {
      merkleEl.textContent = '—';
      merkleEl.removeAttribute('title');
    }
  }
}
