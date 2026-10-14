/**
 * @file dashboard/js/components/merkleTree.js
 *
 * Renders an animated SVG Merkle tree from a set of leaf states.
 * The tree is illustrative (derived from file count + affected_paths).
 *
 * API:
 *   initMerkleTree(svgEl, leafCount)
 *   setLeafState(index, 'healthy'|'corrupt'|'restored'|'missing')
 *   animateCorruption(corruptIndices, delayMs)
 *   animateRestore(indices, delayMs)
 *   setRootHash(hash, state)  // state: 'normal'|'compromised'|'restored'
 */

/* ── Layout constants ────────────────────────────────────────────────────── */
const SVG_NS  = 'http://www.w3.org/2000/svg';
const LEAF_R  = 9;       // leaf circle radius
const NODE_R  = 7;       // internal node radius
const ROOT_R  = 11;      // root node radius
const LEAF_ROW_Y  = 240; // Y position of leaf row
const COLORS = {
  healthy:   '#2F6F5E',   // verdigris
  corrupt:   '#B3261E',   // seal
  restored:  '#2F6F5E',   // verdigris (same as healthy after restore)
  missing:   '#9C8F78',   // ink-ghost
  internal:  '#D5C5A8',   // paper-deep
  internalC: '#E8A0A0',   // tinted red when corrupted subtree
  edge:      '#9C8F78',
  edgeC:     '#D4524A',
  root:      '#1B1A17',   // ink
  rootC:     '#B3261E',   // seal
};

/** @type {SVGSVGElement|null} */
let _svg = null;
/** @type {number} */
let _leafCount = 0;

// Leaf positions computed on init
const _leafPositions = [];
// Map from leaf index → SVGCircleElement
const _leafEls = new Map();
// Map from internal node key → SVGCircleElement
const _internalEls = new Map();
// Map from edge key → SVGLineElement
const _edgeEls = new Map();
/** @type {SVGCircleElement|null} */
let _rootEl = null;

/**
 * Compute a binary tree structure for `n` leaves.
 * Returns { leaves, internals, root, edges }
 * @param {number} n
 * @param {number} svgWidth
 */
function computeLayout(n, svgWidth) {
  // Clamp leaf count to power-of-2 range for a clean tree
  const count = Math.max(4, Math.min(n, 32));
  // Use the given count but lay them evenly
  const leafSpacing = svgWidth / (count + 1);
  const leaves = [];
  for (let i = 0; i < count; i++) {
    leaves.push({ x: leafSpacing * (i + 1), y: LEAF_ROW_Y, index: i });
  }

  // Build parent layers bottom-up
  const layers = [leaves];
  let current = leaves;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1] || current[i]; // odd: pair with self
      const px = (a.x + b.x) / 2;
      const py = a.y - 60;
      next.push({ x: px, y: py, childA: a, childB: b, layerIdx: layers.length });
    }
    layers.push(next);
    current = next;
  }

  const root = current[0];
  return { leaves, layers, root };
}

/**
 * Create an SVG element in SVG namespace.
 * @param {string} tag
 * @param {Record<string,string|number>} attrs
 * @returns {SVGElement}
 */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Draw a single edge (line) between two nodes.
 * @param {object} from
 * @param {object} to
 * @param {string} key
 */
function drawEdge(from, to, key) {
  const line = svgEl('line', {
    x1: from.x, y1: from.y,
    x2: to.x,   y2: to.y,
    stroke: COLORS.edge,
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
    opacity: 0.7,
  });
  _svg.insertBefore(line, _svg.firstChild); // edges behind nodes
  _edgeEls.set(key, line);
}

/**
 * Draw all nodes and edges for the computed layout.
 */
function drawTree(layout) {
  // Edges first (inserted at bottom of SVG so nodes appear on top)
  function walkEdges(node) {
    if (!node.childA) return;
    drawEdge(node, node.childA, `${node.x},${node.y}->${node.childA.x},${node.childA.y}`);
    if (node.childB && node.childB !== node.childA) {
      drawEdge(node, node.childB, `${node.x},${node.y}->${node.childB.x},${node.childB.y}`);
    }
    walkEdges(node.childA);
    walkEdges(node.childB);
  }
  walkEdges(layout.root);

  // Internal nodes (layers 1…n-1)
  for (let li = 1; li < layout.layers.length - 1; li++) {
    for (const node of layout.layers[li]) {
      const circle = svgEl('circle', {
        cx: node.x, cy: node.y,
        r: NODE_R,
        fill: COLORS.internal,
        stroke: COLORS.edge,
        'stroke-width': 1,
      });
      _svg.appendChild(circle);
      _internalEls.set(`${node.x},${node.y}`, { el: circle, node });
    }
  }

  // Root node
  const rootNode = layout.root;
  const rootCircle = svgEl('circle', {
    cx: rootNode.x, cy: rootNode.y,
    r: ROOT_R,
    fill: COLORS.root,
    stroke: 'none',
  });
  _svg.appendChild(rootCircle);
  _rootEl = rootCircle;

  // Root label
  const rootLabel = svgEl('text', {
    x: rootNode.x, y: rootNode.y - 18,
    'text-anchor': 'middle',
    'font-family': "'Martian Mono', monospace",
    'font-size': '8',
    fill: COLORS.edge,
  });
  rootLabel.textContent = 'ROOT';
  _svg.appendChild(rootLabel);

  // Leaf nodes
  for (const leaf of layout.leaves) {
    const g = svgEl('g', {
      role: 'img',
      'aria-label': `Leaf ${leaf.index}: healthy`,
    });
    const circle = svgEl('circle', {
      cx: leaf.x, cy: leaf.y,
      r: LEAF_R,
      fill: COLORS.healthy,
      stroke: 'white',
      'stroke-width': 1,
    });
    g.appendChild(circle);
    _svg.appendChild(g);
    _leafEls.set(leaf.index, { el: circle, g, x: leaf.x, y: leaf.y });
  }
}

/**
 * Initialise the Merkle tree into the given SVG element.
 * @param {SVGSVGElement} svgElement
 * @param {number} leafCount
 */
export function initMerkleTree(svgElement, leafCount) {
  _svg = svgElement;
  _leafCount = leafCount;
  _leafEls.clear();
  _internalEls.clear();
  _edgeEls.clear();
  _leafPositions.length = 0;

  // Clear existing content
  while (_svg.firstChild) _svg.removeChild(_svg.firstChild);

  const width = _svg.clientWidth || 600;
  const layout = computeLayout(leafCount, width);

  // Set SVG height to fit the tree
  const treeHeight = LEAF_ROW_Y + LEAF_R + 16;
  _svg.setAttribute('viewBox', `0 0 ${width} ${treeHeight}`);
  _svg.setAttribute('height', treeHeight);

  drawTree(layout);

  // Store leaf positions for animation
  for (const leaf of layout.leaves) {
    _leafPositions.push({ x: leaf.x, y: leaf.y });
  }
}

/**
 * Set the visual state of a single leaf.
 * @param {number} index
 * @param {'healthy'|'corrupt'|'restored'|'missing'} state
 */
export function setLeafState(index, state) {
  const entry = _leafEls.get(index);
  if (!entry) return;
  const color = COLORS[state] || COLORS.healthy;
  entry.el.setAttribute('fill', color);
  entry.g.setAttribute('aria-label', `Leaf ${index}: ${state}`);

  // Brief scale flash
  entry.el.style.transition = 'fill 300ms ease, r 150ms ease';
}

/**
 * Animate corruption climbing from leaves to root.
 * @param {number[]} corruptIndices  - leaf indices to corrupt
 * @param {number} [baseDelayMs]     - starting delay
 */
export function animateCorruption(corruptIndices, baseDelayMs = 0) {
  corruptIndices.forEach((idx, i) => {
    setTimeout(() => {
      setLeafState(idx, 'corrupt');
      // Animate the leaf element: scale up briefly
      const entry = _leafEls.get(idx);
      if (entry) {
        entry.el.setAttribute('r', LEAF_R + 3);
        setTimeout(() => entry.el.setAttribute('r', LEAF_R), 200);
      }
    }, baseDelayMs + i * 120);
  });

  // After leaves, corrupt root
  const totalLeafDelay = baseDelayMs + corruptIndices.length * 120 + 400;
  setTimeout(() => {
    if (_rootEl) {
      _rootEl.setAttribute('fill', COLORS.rootC);
      _rootEl.setAttribute('r', ROOT_R + 3);
      setTimeout(() => _rootEl.setAttribute('r', ROOT_R), 250);
    }
    // Corrupt some internal nodes
    for (const [, entry] of _internalEls) {
      entry.el.setAttribute('fill', COLORS.internalC);
    }
    // Turn edges red
    for (const [, line] of _edgeEls) {
      line.setAttribute('stroke', COLORS.edgeC);
    }
  }, totalLeafDelay);
}

/**
 * Animate restore: re-seal leaves one by one, then restore root.
 * @param {number[]} indices
 * @param {number} [baseDelayMs]
 */
export function animateRestore(indices, baseDelayMs = 0) {
  indices.forEach((idx, i) => {
    setTimeout(() => {
      setLeafState(idx, 'restored');
      const entry = _leafEls.get(idx);
      if (entry) {
        entry.el.setAttribute('r', LEAF_R + 3);
        setTimeout(() => entry.el.setAttribute('r', LEAF_R), 200);
      }
    }, baseDelayMs + i * 100);
  });

  const totalDelay = baseDelayMs + indices.length * 100 + 500;
  setTimeout(() => {
    if (_rootEl) {
      _rootEl.setAttribute('fill', COLORS.root);
      _rootEl.setAttribute('r', ROOT_R + 3);
      setTimeout(() => _rootEl.setAttribute('r', ROOT_R), 250);
    }
    for (const [, entry] of _internalEls) {
      entry.el.setAttribute('fill', COLORS.internal);
    }
    for (const [, line] of _edgeEls) {
      line.setAttribute('stroke', COLORS.edge);
    }
  }, totalDelay);
}

/**
 * Update the root node color and display hash.
 * @param {string} hash
 * @param {'normal'|'compromised'|'restored'} state
 */
export function setRootHash(hash, state = 'normal') {
  const rootHashEl = document.getElementById('merkleRootDisplay');
  if (rootHashEl) {
    rootHashEl.textContent = hash ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : '—';
    rootHashEl.className = `merkle-root-hash ${state === 'normal' ? '' : state}`;
  }
  if (_rootEl) {
    _rootEl.setAttribute('fill', state === 'compromised' ? COLORS.rootC : COLORS.root);
  }
}

/** Return the leaf count currently displayed. */
export function getLeafCount() {
  return _leafCount;
}
