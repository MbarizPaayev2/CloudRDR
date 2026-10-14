/**
 * @file site/js/components/merkleTree.js
 * Living Cryptographic Merkle DAG Visualization Component.
 * Supports calm baseline, climbing corruption, and verified leaf recovery.
 */

import { getState } from '../state.js';

/**
 * Render or update the Merkle Tree SVG inside a container element.
 * @param {HTMLElement} containerEl
 * @param {Object} [options]
 * @param {boolean} [options.compact=false]
 */
export function initMerkleTree(containerEl, options = {}) {
  if (!containerEl) return;

  const isCompact = options.compact || false;
  const width = isCompact ? 540 : 780;
  const height = isCompact ? 230 : 280;

  // 16 Leaves (Level 0) up to Root (Level 4)
  const leavesCount = 16;
  const nodes = [];
  const links = [];

  // Generate hierarchy coordinates with generous vertical breathing room
  const levelHeights = [
    height - 24, // L0 Leaves
    height - 72, // L1 (8 nodes)
    height - 120, // L2 (4 nodes)
    height - 165, // L3 (2 nodes)
    26,          // L4 Root Apex
  ];

  let idCounter = 0;

  // Level 0: Leaves
  const level0 = [];
  const xStep = width / (leavesCount + 1);
  for (let i = 0; i < leavesCount; i++) {
    const node = {
      id: idCounter++,
      level: 0,
      index: i,
      x: xStep * (i + 1),
      y: levelHeights[0],
      isLeaf: true,
      label: i === 0 ? 'CANARY' : `f_${i}`,
    };
    nodes.push(node);
    level0.push(node);
  }

  // Build upper levels
  let currentLevel = level0;
  for (let lvl = 1; lvl <= 4; lvl++) {
    const nextLevel = [];
    const parentCount = currentLevel.length / 2;
    for (let p = 0; p < parentCount; p++) {
      const leftChild = currentLevel[p * 2];
      const rightChild = currentLevel[p * 2 + 1];
      const parentNode = {
        id: idCounter++,
        level: lvl,
        index: p,
        x: (leftChild.x + rightChild.x) / 2,
        y: levelHeights[lvl],
        isLeaf: false,
        label: lvl === 4 ? 'ROOT' : `h_${lvl}_${p}`,
        children: [leftChild, rightChild],
      };
      nodes.push(parentNode);
      nextLevel.push(parentNode);

      links.push({ source: parentNode, target: leftChild });
      links.push({ source: parentNode, target: rightChild });
    }
    currentLevel = nextLevel;
  }

  const rootNode = currentLevel[0];

  // Render SVG Markup with High-End Layout
  containerEl.innerHTML = `
    <div class="merkle-panel-inner">
      <div class="merkle-panel-header">
        <div class="merkle-header-left">
          <div class="merkle-title-row">
            <span class="merkle-badge-pulse" id="merkleHeaderPulse"></span>
            <span class="merkle-header-title">Root Integrity DAG</span>
            <span class="merkle-leaf-counter">16 Leaves</span>
          </div>
          <div class="merkle-hash-row">
            <div class="merkle-hash-pill" id="copyRootBtn" role="button" tabindex="0" title="Click to copy full Merkle root SHA-256 hash" aria-label="Copy Merkle Root Hash">
              <span class="hash-prefix">ROOT:</span>
              <code id="merkleRootHashDisplay" class="mono">e3b0c44298fc...7852b855</code>
              <svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </div>
          </div>
        </div>
        <div class="merkle-header-right">
          <span id="merkleMatchBadge" class="status-chip valid">Matches Baseline</span>
        </div>
      </div>

      <svg class="merkle-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cryptographic Merkle Tree DAG">
        <g class="merkle-links-group"></g>
        <g class="merkle-particles-group"></g>
        <g class="merkle-nodes-group"></g>
      </svg>

      <div class="merkle-tree-legend">
        <span class="legend-item"><span class="legend-dot canary"></span> Canary Decoy</span>
        <span class="legend-item"><span class="legend-dot protected"></span> 15 Protected Blobs</span>
        <span class="legend-item"><span class="legend-dot parent"></span> Pairwise Parents</span>
        <span class="legend-item"><span class="legend-dot apex"></span> Root Apex</span>
      </div>
    </div>
  `;

  const svgEl = containerEl.querySelector('.merkle-svg');
  const linksGroup = svgEl.querySelector('.merkle-links-group');
  const particlesGroup = svgEl.querySelector('.merkle-particles-group');
  const nodesGroup = svgEl.querySelector('.merkle-nodes-group');

  // Draw links
  links.forEach((link) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', link.source.x);
    line.setAttribute('y1', link.source.y);
    line.setAttribute('x2', link.target.x);
    line.setAttribute('y2', link.target.y);
    line.setAttribute('class', 'merkle-link');
    line.setAttribute('data-source', link.source.id);
    line.setAttribute('data-target', link.target.id);
    linksGroup.appendChild(line);
  });

  // Draw nodes
  nodes.forEach((node) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'merkle-node-wrapper');
    g.setAttribute('data-node-id', node.id);
    g.setAttribute('data-level', node.level);
    g.setAttribute('data-index', node.index);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);

    let radius = 6;
    let strokeColor = 'var(--status-healthy)';
    let fillColor = 'var(--surface)';
    let strokeWidth = '2';

    if (node.level === 4) {
      radius = 11;
      strokeColor = 'var(--brand)';
      strokeWidth = '2.5';
    } else if (node.level === 0) {
      if (node.index === 0) {
        radius = 7;
        strokeColor = '#FF5F56';
        fillColor = 'rgba(255, 95, 86, 0.15)';
      } else {
        radius = 5.5;
        strokeColor = 'var(--status-healthy)';
      }
    } else {
      radius = 6;
      strokeColor = 'var(--border)';
      strokeWidth = '1.75';
    }

    circle.setAttribute('r', radius);
    circle.setAttribute('fill', fillColor);
    circle.setAttribute('stroke', strokeColor);
    circle.setAttribute('stroke-width', strokeWidth);
    circle.setAttribute('class', 'merkle-node-circle');

    g.appendChild(circle);

    // Only label Root Apex and Canary Leaf — completely eliminates 15 overlapping text labels!
    if (node.level === 4) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y - 15);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'var(--font-mono)');
      text.setAttribute('font-size', '9px');
      text.setAttribute('font-weight', '700');
      text.setAttribute('letter-spacing', '0.04em');
      text.setAttribute('fill', 'var(--brand)');
      text.textContent = 'ROOT (SHA-256)';
      g.appendChild(text);
    } else if (node.level === 0 && node.index === 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y + 16);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'var(--font-mono)');
      text.setAttribute('font-size', '8px');
      text.setAttribute('font-weight', '700');
      text.setAttribute('letter-spacing', '0.05em');
      text.setAttribute('fill', '#FF5F56');
      text.textContent = 'CANARY';
      g.appendChild(text);
    }

    nodesGroup.appendChild(g);
  });

  // Mock File metadata for rich node inspection
  const FILE_METADATA = [
    { name: '.canary/decoy_tokens.docx', type: 'TRIPWIRE CANARY FILE', size: '14.2 KB' },
    { name: 'finance/q3_earnings.xlsx', type: 'Protected Object', size: '84.5 KB' },
    { name: 'database/users.sqlite', type: 'Protected Object', size: '1.2 MB' },
    { name: 'contracts/vendor_nda.pdf', type: 'Protected Object', size: '240 KB' },
    { name: 'keys/backup_private.pem', type: 'Protected Object', size: '3.1 KB' },
    { name: 'hr/employees_2026.csv', type: 'Protected Object', size: '52.0 KB' },
    { name: 'legal/patents_draft.docx', type: 'Protected Object', size: '118 KB' },
    { name: 'production/secrets.env', type: 'Protected Object', size: '1.8 KB' },
    { name: 'customer/orders.parquet', type: 'Protected Object', size: '4.8 MB' },
    { name: 'audit/isms_policy_v2.pdf', type: 'Protected Object', size: '620 KB' },
    { name: 'billing/invoices.json', type: 'Protected Object', size: '92.4 KB' },
    { name: 'code/cloudrdr_kernel.bin', type: 'Protected Object', size: '512 KB' },
    { name: 'archives/backup_snap.tar', type: 'Protected Object', size: '12.0 MB' },
    { name: 'logs/access_audit.log', type: 'Protected Object', size: '310 KB' },
    { name: 'health/records.enc', type: 'Protected Object', size: '890 KB' },
    { name: 'tokens/jwt_sign.key', type: 'Protected Object', size: '2.4 KB' }
  ];

  // Tooltip container
  let tooltip = containerEl.querySelector('.merkle-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'merkle-tooltip';
    tooltip.style.display = 'none';
    containerEl.style.position = 'relative';
    containerEl.appendChild(tooltip);
  }

  let currentCorrupted = new Set();

  // Attach hover events to nodes
  nodes.forEach((node) => {
    const g = nodesGroup.querySelector(`[data-node-id="${node.id}"]`);
    if (!g) return;
    g.style.cursor = 'pointer';

    g.addEventListener('mouseenter', (e) => {
      const circle = g.querySelector('.merkle-node-circle');
      if (circle) {
        circle.style.transform = 'scale(1.4)';
        circle.style.transformOrigin = `${node.x}px ${node.y}px`;
        circle.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      const isAffected = node.level === 0 ? currentCorrupted.has(node.index) : false;
      const rect = containerEl.getBoundingClientRect();
      const svgRect = svgEl.getBoundingClientRect();
      const scaleX = svgRect.width / width;
      const scaleY = svgRect.height / height;
      const posX = (node.x * scaleX);
      const posY = (node.y * scaleY);

      if (node.level === 0) {
        const file = FILE_METADATA[node.index] || { name: `file_${node.index}.dat`, type: 'Object', size: '20 KB' };
        tooltip.innerHTML = `
          <div style="font-weight:700;color:var(--text);margin-bottom:2px;">${file.name}</div>
          <div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:3px;">${file.type} &middot; ${file.size}</div>
          <div style="font-family:var(--font-mono);font-size:0.65rem;color:${isAffected ? 'var(--status-ransomware)' : 'var(--status-healthy)'};">
            ${isAffected ? '&#x26A0; TAMPERED (DIFFERS FROM BASELINE)' : '&#x2713; SHA-256 MATCHES BASELINE'}
          </div>
          <div style="font-size:0.62rem;color:var(--text-muted);margin-top:2px;">RFC 6962: SHA-256(0x00 || file_bytes)</div>
        `;
      } else if (node.level === 4) {
        tooltip.innerHTML = `
          <div style="font-weight:700;color:var(--brand);margin-bottom:2px;">Merkle Root Digest (Level 4)</div>
          <div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:3px;">Full Storage Bucket Representation</div>
          <div style="font-size:0.62rem;color:var(--text-muted);">Pairwise cryptographic tree apex</div>
        `;
      } else {
        tooltip.innerHTML = `
          <div style="font-weight:700;color:var(--text);margin-bottom:2px;">Intermediate DAG Node (${node.label})</div>
          <div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:3px;">Level ${node.level} &middot; Pairwise Hash</div>
          <div style="font-size:0.62rem;color:var(--text-muted);">H = SHA-256(0x01 || left || right)</div>
        `;
      }

      tooltip.style.left = `${posX}px`;
      tooltip.style.top = `${posY}px`;
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';
    });

    g.addEventListener('mouseleave', () => {
      const circle = g.querySelector('.merkle-node-circle');
      if (circle) {
        circle.style.transform = 'scale(1)';
      }
      tooltip.style.opacity = '0';
      tooltip.style.display = 'none';
    });
  });

  // Wire Copy Pill / Button
  const copyBtn = containerEl.querySelector('#copyRootBtn');
  copyBtn?.addEventListener('click', () => {
    let hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    try {
      const state = getState();
      if (state && state.currentRootHash) hash = state.currentRootHash;
    } catch {
      // In standalone scenarios or hero, use displayed root
      const rootDisplay = containerEl.querySelector('#merkleRootHashDisplay');
      if (rootDisplay && rootDisplay.getAttribute('data-full-hash')) {
        hash = rootDisplay.getAttribute('data-full-hash');
      }
    }
    navigator.clipboard.writeText(hash).then(() => {
      const codeEl = copyBtn.querySelector('code');
      const origText = codeEl ? codeEl.textContent : '';
      if (codeEl) codeEl.textContent = 'COPIED TO CLIPBOARD!';
      setTimeout(() => { if (codeEl) codeEl.textContent = origText; }, 1600);
    }).catch(() => {});
  });

  // Return update function
  return function update(appState) {
    const corrupted = appState.corruptedLeaves || new Set();
    currentCorrupted = corrupted;
    const hasCorrupt = corrupted.size > 0;

    // Update root text & status badge
    const rootEl = containerEl.querySelector('#merkleRootHashDisplay');
    const badgeEl = containerEl.querySelector('#merkleMatchBadge');
    const pulseEl = containerEl.querySelector('#merkleHeaderPulse');
    if (rootEl && badgeEl) {
      if (hasCorrupt) {
        const fullHash = appState.currentRootHash || 'a8f9c1b34e62d590e8b211f49a2cd7081bc598e213ad459bc76319802d354aef';
        rootEl.textContent = fullHash.slice(0, 16) + '...';
        rootEl.setAttribute('data-full-hash', fullHash);
        rootEl.style.color = 'var(--status-ransomware)';
        badgeEl.className = 'status-chip modified';
        badgeEl.textContent = 'Differs from Baseline';
        if (pulseEl) pulseEl.className = 'merkle-badge-pulse compromised';
      } else {
        const fullHash = appState.baseline?.merkle_root || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        rootEl.textContent = fullHash.slice(0, 16) + '...';
        rootEl.setAttribute('data-full-hash', fullHash);
        rootEl.style.color = 'var(--text)';
        badgeEl.className = 'status-chip valid';
        badgeEl.textContent = 'Matches Baseline';
        if (pulseEl) pulseEl.className = 'merkle-badge-pulse';
      }
    }

    // Determine affected upper nodes
    const affectedNodeIds = new Set();
    nodes.forEach((node) => {
      if (node.level === 0 && corrupted.has(node.index)) {
        affectedNodeIds.add(node.id);
      }
    });

    // Propagate up to parents
    links.forEach((link) => {
      if (affectedNodeIds.has(link.target.id)) {
        affectedNodeIds.add(link.source.id);
      }
    });

    // Update node visuals
    nodes.forEach((node) => {
      const g = nodesGroup.querySelector(`[data-node-id="${node.id}"]`);
      const circle = g?.querySelector('.merkle-node-circle');
      if (!circle) return;

      const isAffected = affectedNodeIds.has(node.id);
      if (isAffected) {
        circle.setAttribute('stroke', 'var(--status-ransomware)');
        circle.setAttribute('fill', 'var(--status-ransomware-subtle)');
        if (node.level === 4) {
          circle.style.filter = 'drop-shadow(0 0 8px rgba(217, 54, 54, 0.7))';
        }
      } else {
        circle.style.filter = 'none';
        if (node.level === 4) {
          circle.setAttribute('stroke', 'var(--brand)');
          circle.setAttribute('fill', 'var(--surface)');
        } else if (node.level === 0 && node.index === 0) {
          circle.setAttribute('stroke', '#FF5F56');
          circle.setAttribute('fill', 'rgba(255, 95, 86, 0.15)');
        } else if (node.level === 0) {
          circle.setAttribute('stroke', 'var(--status-healthy)');
          circle.setAttribute('fill', 'var(--surface)');
        } else {
          circle.setAttribute('stroke', 'var(--border)');
          circle.setAttribute('fill', 'var(--surface)');
        }
      }
    });

    // Update link visuals
    links.forEach((link) => {
      const line = linksGroup.querySelector(`[data-source="${link.source.id}"][data-target="${link.target.id}"]`);
      if (!line) return;

      const isCompromised = affectedNodeIds.has(link.target.id) && affectedNodeIds.has(link.source.id);
      if (isCompromised) {
        line.setAttribute('stroke', 'var(--status-ransomware)');
        line.setAttribute('stroke-dasharray', '4,3');
        line.setAttribute('stroke-width', '2');
      } else {
        line.setAttribute('stroke', 'var(--border)');
        line.removeAttribute('stroke-dasharray');
        line.setAttribute('stroke-width', '1.5');
      }
    });

    // ── Cryptographic Travelling Pulse Wave Animation ──
    if (particlesGroup) {
      particlesGroup.innerHTML = '';
      if (hasCorrupt) {
        const activeLinks = links.filter(l => affectedNodeIds.has(l.target.id) && affectedNodeIds.has(l.source.id));
        activeLinks.forEach((link, idx) => {
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          p.setAttribute('r', '3.5');
          p.setAttribute('fill', '#D93636');
          p.setAttribute('class', 'merkle-pulse-particle');
          particlesGroup.appendChild(p);

          const startX = link.target.x;
          const startY = link.target.y;
          const endX = link.source.x;
          const endY = link.source.y;
          const duration = 520;
          const startTime = performance.now() + (idx * 55);

          function step(now) {
            if (now < startTime) {
              p.setAttribute('cx', startX);
              p.setAttribute('cy', startY);
              p.setAttribute('opacity', '0');
              requestAnimationFrame(step);
              return;
            }
            const progress = Math.min((now - startTime) / duration, 1);
            const curX = startX + (endX - startX) * progress;
            const curY = startY + (endY - startY) * progress;
            p.setAttribute('cx', curX);
            p.setAttribute('cy', curY);
            p.setAttribute('opacity', `${0.9 * (1 - progress * 0.3)}`);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              p.remove();
              if (link.source.level === 4 && idx === activeLinks.length - 1) {
                // Apex Halo ripple when wave reaches the root
                const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                halo.setAttribute('cx', rootNode.x);
                halo.setAttribute('cy', rootNode.y);
                halo.setAttribute('r', '11');
                halo.setAttribute('fill', 'none');
                halo.setAttribute('stroke', '#D93636');
                halo.setAttribute('stroke-width', '2');
                halo.setAttribute('class', 'merkle-apex-halo');
                particlesGroup.appendChild(halo);
                setTimeout(() => { halo.remove(); }, 2000);
              }
            }
          }
          requestAnimationFrame(step);
        });
      }
    }
  };
}
