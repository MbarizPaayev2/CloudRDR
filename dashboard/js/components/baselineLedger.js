/**
 * @file dashboard/js/components/baselineLedger.js
 *
 * Baseline "Sealed Ledger" panel in the left sidebar.
 * Renders file count, Merkle root (with copy), snapshot date, created-by.
 * Handles "Create Baseline" button with confirmation and loading state.
 *
 * Security: textContent only, no innerHTML for API data.
 */

import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { createIcon, setButtonContent } from '../icons.js';

/**
 * Format an ISO date string to a readable archival format.
 * @param {string} iso
 * @returns {string}
 */
function formatArchiveDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Shorten a hex hash for display.
 * @param {string} hash
 * @returns {string}
 */
function shortHash(hash) {
  if (!hash || hash.length < 16) return hash || '—';
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

/** Render baseline panel from current state. */
export function renderBaseline(state) {
  const skeleton = document.getElementById('baselineSkeleton');
  const content  = document.getElementById('baselineContent');
  const errEl    = document.getElementById('baselineError');

  if (!content) return;

  if (!state.baseline) {
    // Show skeleton if still loading, error if failed
    if (state.isLoading) {
      skeleton && (skeleton.style.display = 'block');
      content.style.display = 'none';
      errEl  && (errEl.style.display = 'none');
    } else {
      skeleton && (skeleton.style.display = 'none');
      content.style.display = 'none';
      errEl  && (errEl.style.display = 'block');
    }
    return;
  }

  // Hide skeleton, show content
  skeleton && (skeleton.style.display = 'none');
  content.style.display = 'block';
  errEl  && (errEl.style.display = 'none');

  const b = state.baseline;

  // File count
  const fcEl = document.getElementById('baselineFileCount');
  if (fcEl) fcEl.textContent = (b.file_count ?? '—').toString();

  // Version
  const vEl = document.getElementById('baselineVersion');
  if (vEl) vEl.textContent = `v${b.version ?? 1}`;

  // Merkle root chip
  const hashText = document.getElementById('merkleRootText');
  if (hashText) hashText.textContent = shortHash(b.merkle_root);

  // Store full hash on the chip for copy
  const chip = document.getElementById('merkleRootChip');
  if (chip) {
    chip.dataset.fullHash = b.merkle_root || '';
    chip.setAttribute('aria-label', `Copy Merkle root: ${shortHash(b.merkle_root)}`);
  }

  // Date
  const dateEl = document.getElementById('baselineDate');
  if (dateEl) {
    dateEl.textContent = formatArchiveDate(b.created_at);
    if (b.created_at) dateEl.setAttribute('datetime', b.created_at);
  }

  // Created by
  const byEl = document.getElementById('baselineCreatedBy');
  if (byEl) byEl.textContent = b.created_by || '—';

  // Header bucket
  const headerBucket = document.getElementById('headerBucket');
  if (headerBucket) headerBucket.textContent = b.bucket || 'protected';
}

/** Wire up the copy-hash button and create-baseline button. */
export function initBaselineLedger() {
  // Copy Merkle root on click / Enter
  const chip = document.getElementById('merkleRootChip');
  if (chip) {
    const doCopy = () => {
      const hash = chip.dataset.fullHash || '';
      if (!hash) return;
      navigator.clipboard?.writeText(hash).then(() => {
        const icon = chip.querySelector('.copy-icon');
        if (icon) {
          icon.textContent = '';
          icon.appendChild(createIcon('check', { size: 12 }));
          setTimeout(() => {
            icon.textContent = '';
            icon.appendChild(createIcon('copy', { size: 12 }));
          }, 1200);
        }
      });
    };
    chip.addEventListener('click', doCopy);
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); }
    });
  }

  // Create baseline button
  const btn = document.getElementById('createBaselineBtn');
  if (btn) {
    setButtonContent(btn, 'Capture New Baseline', 'sign', { leading: true });
    btn.addEventListener('click', async () => {
      if (!window.confirm('Create a new baseline snapshot now?\nThis will seal all current files as the new reference.')) return;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      setButtonContent(btn, 'Sealing…', 'loader', { spin: true, leading: true });
      try {
        const result = await api.createBaseline();
        setState({ baseline: result });
        renderBaseline(getState());
      } catch (err) {
        alert(`Baseline creation failed: [${err.code}] ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        setButtonContent(btn, 'Capture New Baseline', 'sign', { leading: true });
      }
    });
  }
}
