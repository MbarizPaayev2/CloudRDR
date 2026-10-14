/**
 * @file site/js/components/hashChain.js
 * Cryptographic Hash Chain Audit Ledger Visualizer with interactive tampering simulator.
 */

import { getState, setState } from '../state.js';

/**
 * Initialize and render the Hash Chain Audit Ledger.
 * @param {HTMLElement} containerEl
 */
export function initHashChain(containerEl) {
  if (!containerEl) return () => {};

  containerEl.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">
            Tamper-Evident Security Log
          </span>
          <h2 class="panel-title">Hash-Chained Audit Ledger</h2>
        </div>
        <button id="tamperEntryBtn" class="btn btn-secondary btn-sm" title="Simulate attacker modifying history">
          ⚡ Tamper with Entry #1
        </button>
      </div>

      <p style="margin-bottom:var(--space-4);">
        Every state change is cryptographically linked to the previous block via SHA-256. Altering any past block invalidates all downstream hash pointers immediately.
      </p>

      <div id="tamperNotice" style="display:none;padding:12px;background:var(--status-ransomware-subtle);border:1px solid var(--status-ransomware);border-radius:var(--radius-sm);color:var(--status-ransomware);font-size:var(--text-sm);margin-bottom:16px;">
        <strong>✕ Chain integrity broken!</strong> Entry #1 payload was altered. Previous hash pointer mismatch detected.
      </div>

      <div class="chain-scroll-row" id="chainBlocksContainer">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  const blocksContainer = containerEl.querySelector('#chainBlocksContainer');
  const tamperNotice = containerEl.querySelector('#tamperNotice');
  const tamperBtn = containerEl.querySelector('#tamperEntryBtn');

  tamperBtn?.addEventListener('click', () => {
    const state = getState();
    const isNowTampered = !state.chainTampered;
    setState({ chainTampered: isNowTampered });
  });

  return function update(appState) {
    const isTampered = appState.chainTampered;
    const blocks = appState.auditLog || [];

    if (tamperNotice) {
      tamperNotice.style.display = isTampered ? 'block' : 'none';
    }

    if (tamperBtn) {
      tamperBtn.textContent = isTampered ? '✓ Restore Valid Chain' : '⚡ Tamper with Entry #1';
    }

    blocksContainer.innerHTML = blocks
      .map((block, idx) => {
        const isBlockTampered = isTampered && idx >= 1;
        const currentHash = isBlockTampered
          ? (idx === 1 ? '000000_MODIFIED_HASH_0000' : 'INVALID_CHAIN_LINK')
          : block.hash.slice(0, 16) + '...';

        const prevHash = block.prev_hash.slice(0, 12) + '...';

        return `
          <div class="chain-item ${isBlockTampered ? 'tampered' : ''}">
            <div style="font-weight:600;color:var(--text);margin-bottom:4px;">
              Block #${block.index} ${block.index === 0 ? '(Genesis)' : ''}
            </div>
            <div style="color:var(--text-muted);font-size:0.7rem;margin-bottom:6px;">
              ${block.action}
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);">
              Prev: <span class="mono">${prevHash}</span>
            </div>
            <div style="font-size:0.72rem;color:var(--text);margin-top:2px;">
              Hash: <span class="mono" style="color:${isBlockTampered ? 'var(--status-ransomware)' : 'var(--brand)'};">${currentHash}</span>
            </div>
            <div style="font-size:0.7rem;margin-top:6px;color:${isBlockTampered ? 'var(--status-ransomware)' : 'var(--status-healthy)'};font-weight:600;">
              ${isBlockTampered ? '✕ LINK INVALID' : '✓ ED25519 VERIFIED'}
            </div>
          </div>
          ${idx < blocks.length - 1 ? `<span class="chain-link-arrow" style="color:${isBlockTampered ? 'var(--status-ransomware)' : 'var(--text-muted)'};">→</span>` : ''}
        `;
      })
      .join('');
  };
}
