/**
 * @file site/js/components/merkleInspector.js
 * Cryptographic File Integrity & Merkle Proof Inspector.
 * Demonstrates RFC 6962 audit paths, NIST SP 800-38D AEAD tags, and hash diffs.
 */

const FILE_REGISTRY = [
  {
    name: '.canary/decoy_tokens.docx',
    type: 'TRIPWIRE CANARY OBJECT',
    size: '14.2 KB',
    isCanary: true,
  },
  { name: 'finance/q3_earnings.xlsx', type: 'Financial Ledger', size: '84.5 KB' },
  { name: 'database/users.sqlite', type: 'Relational Database', size: '1.2 MB' },
  { name: 'contracts/vendor_nda.pdf', type: 'Legal Agreement', size: '240 KB' },
  { name: 'keys/backup_private.pem', type: 'Encrypted Keypair', size: '3.1 KB' },
  { name: 'hr/employees_2026.csv', type: 'Confidential Records', size: '52.0 KB' },
  { name: 'legal/patents_draft.docx', type: 'Intellectual Property', size: '118 KB' },
  { name: 'production/secrets.env', type: 'Environment Vault', size: '1.8 KB' },
  { name: 'customer/orders.parquet', type: 'Columnar Analytics', size: '4.8 MB' },
  { name: 'audit/isms_policy_v2.pdf', type: 'ISO 27001 ISMS Manual', size: '620 KB' },
  { name: 'billing/invoices.json', type: 'Payment Records', size: '92.4 KB' },
  { name: 'code/cloudrdr_kernel.bin', type: 'System Executable', size: '512 KB' },
  { name: 'archives/backup_snap.tar', type: 'Cold Storage Archive', size: '12.0 MB' },
  { name: 'logs/access_audit.log', type: 'Append-Only Access Log', size: '310 KB' },
  { name: 'health/records.enc', type: 'HIPAA Encrypted Store', size: '890 KB' },
  { name: 'tokens/jwt_sign.key', type: 'Token Signing Secret', size: '2.4 KB' },
];

// Deterministic mock hash generator
function pseudoHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex1 = ('00000000' + (h >>> 0).toString(16)).slice(-8);
  const hex2 = ('00000000' + Math.imul(h, 31).toString(16)).slice(-8);
  const hex3 = ('00000000' + Math.imul(h, 127).toString(16)).slice(-8);
  const hex4 = ('00000000' + Math.imul(h, 8191).toString(16)).slice(-8);
  return `${hex1}${hex2}${hex3}${hex4}${hex4}${hex3}${hex2}${hex1}`;
}

let inspectorEl = null;

export function openMerkleInspector(leafIndex, options = {}) {
  const isCorrupted = options.isCorrupted || false;
  const isRestored = options.isRestored || false;
  const currentRoot =
    options.currentRoot || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const file = FILE_REGISTRY[leafIndex] || {
    name: `object_leaf_${leafIndex}.dat`,
    type: 'Protected Cloud Object',
    size: '42.0 KB',
  };

  const baselineHash = pseudoHash(`file_${leafIndex}_baseline_seed`);
  const observedHash = isCorrupted
    ? pseudoHash(`file_${leafIndex}_attack_encrypted_${Date.now()}`)
    : baselineHash;

  const siblingHash = pseudoHash(`file_${leafIndex ^ 1}_baseline_seed`);
  const parentHash = pseudoHash(`parent_node_L1_${Math.floor(leafIndex / 2)}`);
  const aeadTag = pseudoHash(`aead_mac_128_${leafIndex}`).slice(0, 32);

  // Status configuration
  let statusBadge = `<span class="status-chip valid">100% BASELINE VERIFIED</span>`;
  let entropyStatus = `<span style="color:var(--status-healthy);">Low (4.12 bits/byte · Plaintext Structured)</span>`;
  let tagStatus = `<span style="color:var(--status-healthy);font-weight:600;">AUTHENTIC (Tag matches baseline)</span>`;

  if (isCorrupted) {
    statusBadge = `<span class="status-chip modified">CRYPTOGRAPHIC TAMPERING DETECTED</span>`;
    entropyStatus = `<span style="color:var(--status-ransomware);font-weight:700;">High (7.98 bits/byte · Ransomware Ciphertext)</span>`;
    tagStatus = `<span style="color:var(--status-ransomware);font-weight:600;">INVALID (AEAD Tag Check Failed)</span>`;
  } else if (isRestored) {
    statusBadge = `<span class="status-chip valid" style="background:rgba(39,201,63,0.18);">NIST AES-256-GCM AEAD RESTORED</span>`;
  }

  if (!inspectorEl) {
    inspectorEl = document.createElement('div');
    inspectorEl.id = 'merkleInspectorOverlay';
    inspectorEl.className = 'merkle-inspector-overlay';
    document.body.appendChild(inspectorEl);
  }

  inspectorEl.innerHTML = `
    <div class="merkle-inspector-modal spotlight-card" role="dialog" aria-modal="true" aria-labelledby="inspectorFileTitle">
      <div class="inspector-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="inspector-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);letter-spacing:0.04em;">
              LEAF NODE #${String(leafIndex).padStart(2, '0')} // RFC 6962 DAG
            </div>
            <h2 id="inspectorFileTitle" class="inspector-title">${file.name}</h2>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${statusBadge}
          <button id="closeInspectorBtn" class="inspector-close-btn" aria-label="Close Inspector">&times;</button>
        </div>
      </div>

      <div class="inspector-body">
        <!-- Section 1: Cryptographic Digests & Entropy -->
        <div class="inspector-section">
          <div class="inspector-section-label">1. Dual SHA-256 Digest Analysis</div>
          <div class="inspector-hash-grid">
            <div class="inspector-hash-box">
              <div class="hash-box-label">Original Baseline Digest (Sealed)</div>
              <code class="mono hash-box-val">${baselineHash}</code>
            </div>
            <div class="inspector-hash-box ${isCorrupted ? 'corrupted' : ''}">
              <div class="hash-box-label">Current Observed Storage Digest</div>
              <code class="mono hash-box-val">${observedHash}</code>
            </div>
          </div>
          <div class="inspector-meta-row">
            <span>Object Type: <strong>${file.type}</strong> (${file.size})</span>
            <span>Entropy Randomness: ${entropyStatus}</span>
          </div>
        </div>

        <!-- Section 2: NIST AEAD Tag Verification -->
        <div class="inspector-section">
          <div class="inspector-section-label">2. NIST SP 800-38D AES-256-GCM AEAD Tag</div>
          <div class="inspector-aead-box">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:6px;">
              <span style="color:var(--text-muted);">128-bit Authentication Tag:</span>
              <span>${tagStatus}</span>
            </div>
            <code class="mono" style="font-size:0.72rem;color:var(--brand);">${aeadTag}</code>
          </div>
        </div>

        <!-- Section 3: RFC 6962 Merkle Proof Path -->
        <div class="inspector-section">
          <div class="inspector-section-label">3. RFC 6962 Audit Proof Path (Leaf &rarr; Merkle Root)</div>
          <div class="inspector-proof-steps">
            <div class="proof-step">
              <span class="proof-idx">L0</span>
              <div class="proof-content">
                <span class="proof-tag">Leaf Digest:</span>
                <code class="mono">${observedHash.slice(0, 24)}...${observedHash.slice(-8)}</code>
              </div>
            </div>
            <div class="proof-step">
              <span class="proof-idx">L1</span>
              <div class="proof-content">
                <span class="proof-tag">Sibling Pair:</span>
                <code class="mono">${siblingHash.slice(0, 24)}...${siblingHash.slice(-8)}</code>
                <span style="color:var(--text-muted);font-size:0.65rem;">&rarr; Folded Parent: ${parentHash.slice(0, 16)}...</span>
              </div>
            </div>
            <div class="proof-step">
              <span class="proof-idx">L4</span>
              <div class="proof-content">
                <span class="proof-tag">Merkle Root:</span>
                <code class="mono" style="color:var(--brand);">${currentRoot}</code>
                <span style="color:${isCorrupted ? 'var(--status-ransomware)' : 'var(--status-healthy)'};font-size:0.68rem;font-weight:700;">
                  ${isCorrupted ? '▲ ROOT MISMATCH (PROVED TAMPERED)' : '● 100% INVARIANT MATCH (AUTHENTIC)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="inspector-footer">
        <button id="copyProofJsonBtn" class="btn btn-secondary btn-sm" style="font-size:0.75rem;">
          Copy RFC 6962 Proof (JSON)
        </button>
        <button id="closeInspectorDoneBtn" class="btn btn-primary btn-sm" style="font-size:0.75rem;">
          Done
        </button>
      </div>
    </div>
  `;

  inspectorEl.classList.add('active');

  // Close handlers
  const close = () => {
    inspectorEl.classList.remove('active');
  };

  inspectorEl.querySelector('#closeInspectorBtn')?.addEventListener('click', close);
  inspectorEl.querySelector('#closeInspectorDoneBtn')?.addEventListener('click', close);

  inspectorEl.addEventListener('click', (e) => {
    if (e.target === inspectorEl) close();
  });

  const onEsc = (e) => {
    if (e.key === 'Escape') {
      close();
      window.removeEventListener('keydown', onEsc);
    }
  };
  window.addEventListener('keydown', onEsc);

  // Copy proof
  const copyBtn = inspectorEl.querySelector('#copyProofJsonBtn');
  copyBtn?.addEventListener('click', () => {
    const proofPayload = {
      spec: 'RFC 6962',
      leaf_index: leafIndex,
      file_path: file.name,
      baseline_sha256: baselineHash,
      observed_sha256: observedHash,
      aead_tag_128: aeadTag,
      status: isCorrupted ? 'TAMPERED' : 'VALID',
      merkle_root: currentRoot,
      verified_at: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(proofPayload, null, 2)).then(() => {
      copyBtn.textContent = 'Proof Copied to Clipboard';
      setTimeout(() => {
        copyBtn.textContent = 'Copy RFC 6962 Proof (JSON)';
      }, 2000);
    });
  });
}
