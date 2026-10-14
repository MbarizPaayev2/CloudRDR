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
  const width = isCompact ? 500 : 780;
  const height = isCompact ? 220 : 280;

  // 16 Leaves (Level 0) up to Root (Level 4)
  // Levels:
  // L4: Root (1 node)
  // L3: 2 nodes
  // L2: 4 nodes
  // L1: 8 nodes
  // L0: 16 leaves
  const leavesCount = 16;
  const nodes = [];
  const links = [];

  // Generate hierarchy coordinates
  const levelHeights = [
    height - 35, // L0 Leaves
    height - 95, // L1
    height - 150, // L2
    height - 200, // L3
    25,           // L4 Root
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

  // Render SVG Markup
  containerEl.innerHTML = `
    <div class="merkle-panel-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;">
            Merkle Root Integrity DAG (16 Leaves)
          </span>
          <div style="margin-top:2px;display:flex;align-items:center;gap:8px;">
            <code id="merkleRootHashDisplay" class="mono" style="font-size:0.8rem;color:var(--text);background:var(--surface-subtle);padding:3px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);">
              e3b0c44298fc...7852b855
            </code>
            <span id="merkleMatchBadge" class="status-chip valid">Matches Baseline</span>
          </div>
        </div>
        <button id="copyRootBtn" class="copy-hash-btn" aria-label="Copy Merkle Root Hash" title="Copy Root Digest">
          Copy Root
        </button>
      </div>

      <svg class="merkle-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Interactive Merkle Tree">
        <g class="merkle-links-group"></g>
        <g class="merkle-nodes-group"></g>
      </svg>
    </div>
  `;

  const svgEl = containerEl.querySelector('.merkle-svg');
  const linksGroup = svgEl.querySelector('.merkle-links-group');
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
    const radius = node.level === 4 ? 12 : node.level === 0 ? 6 : 8;
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'var(--surface)');
    circle.setAttribute('stroke', 'var(--status-healthy)');
    circle.setAttribute('stroke-width', node.level === 4 ? '3' : '2');
    circle.setAttribute('class', 'merkle-node-circle');

    g.appendChild(circle);

    if (node.level === 4 || node.level === 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.level === 4 ? node.y - 16 : node.y + 16);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'var(--font-mono)');
      text.setAttribute('font-size', node.level === 4 ? '11px' : '9px');
      text.setAttribute('fill', 'var(--text-muted)');
      text.textContent = node.label;
      g.appendChild(text);
    }

    nodesGroup.appendChild(g);
  });

  // Wire Copy Button
  const copyBtn = containerEl.querySelector('#copyRootBtn');
  copyBtn?.addEventListener('click', () => {
    const state = getState();
    navigator.clipboard.writeText(state.currentRootHash);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy Root'; }, 1800);
  });

  // Return update function
  return function update(appState) {
    const corrupted = appState.corruptedLeaves || new Set();
    const hasCorrupt = corrupted.size > 0;

    // Update root text
    const rootEl = containerEl.querySelector('#merkleRootHashDisplay');
    const badgeEl = containerEl.querySelector('#merkleMatchBadge');
    if (rootEl && badgeEl) {
      if (hasCorrupt) {
        rootEl.textContent = (appState.currentRootHash || 'TAMPERED').slice(0, 20) + '...';
        rootEl.style.color = 'var(--status-ransomware)';
        badgeEl.className = 'status-chip modified';
        badgeEl.textContent = 'Differs from Baseline';
      } else {
        rootEl.textContent = (appState.baseline?.merkle_root || 'e3b0c442...').slice(0, 20) + '...';
        rootEl.style.color = 'var(--text)';
        badgeEl.className = 'status-chip valid';
        badgeEl.textContent = 'Matches Baseline';
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
      } else {
        circle.setAttribute('stroke', 'var(--status-healthy)');
        circle.setAttribute('fill', 'var(--surface)');
      }
    });

    // Update link visuals
    links.forEach((link) => {
      const line = linksGroup.querySelector(`[data-source="${link.source.id}"][data-target="${link.target.id}"]`);
      if (!line) return;

      const isCompromised = affectedNodeIds.has(link.target.id) && affectedNodeIds.has(link.source.id);
      if (isCompromised) {
        line.setAttribute('stroke', 'var(--status-ransomware)');
        line.setAttribute('stroke-dasharray', '3,3');
      } else {
        line.setAttribute('stroke', 'var(--border)');
        line.removeAttribute('stroke-dasharray');
      }
    });
  };
}
