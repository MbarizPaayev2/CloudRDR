/**
 * @file dashboard/js/components/hashChain.js
 *
 * Hash chain audit ledger renderer.
 * Draws a horizontal scrolling chain of linked "nodes", each showing index,
 * short hash, and event name. Broken links are highlighted in seal-red.
 *
 * Security: textContent only, no innerHTML for API data.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
import { createIcon } from '../icons.js';

/**
 * Build an SVG chain-link connector between two nodes.
 * @param {boolean} broken
 * @returns {SVGElement}
 */
function buildConnector(broken) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 32 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('chain-connector');
  if (broken) svg.classList.add('broken');

  // Two chain ovals forming a link
  const color = broken ? '#B3261E' : '#9C8F78';

  // Left oval
  const r1 = document.createElementNS(SVG_NS, 'rect');
  r1.setAttribute('x', '1');
  r1.setAttribute('y', '8');
  r1.setAttribute('width', '13');
  r1.setAttribute('height', '8');
  r1.setAttribute('rx', '4');
  r1.setAttribute('fill', 'none');
  r1.setAttribute('stroke', color);
  r1.setAttribute('stroke-width', '2');
  svg.appendChild(r1);

  // Right oval
  const r2 = document.createElementNS(SVG_NS, 'rect');
  r2.setAttribute('x', '18');
  r2.setAttribute('y', '8');
  r2.setAttribute('width', '13');
  r2.setAttribute('height', '8');
  r2.setAttribute('rx', '4');
  r2.setAttribute('fill', 'none');
  r2.setAttribute('stroke', color);
  r2.setAttribute('stroke-width', '2');
  svg.appendChild(r2);

  if (broken) {
    // Gap line to show break
    const gap = document.createElementNS(SVG_NS, 'line');
    gap.setAttribute('x1', '13');
    gap.setAttribute('y1', '12');
    gap.setAttribute('x2', '19');
    gap.setAttribute('y2', '12');
    gap.setAttribute('stroke', '#B3261E');
    gap.setAttribute('stroke-width', '1');
    gap.setAttribute('stroke-dasharray', '2,2');
    svg.appendChild(gap);
  } else {
    // Connecting horizontal bar
    const bar = document.createElementNS(SVG_NS, 'line');
    bar.setAttribute('x1', '13');
    bar.setAttribute('y1', '12');
    bar.setAttribute('x2', '19');
    bar.setAttribute('y2', '12');
    bar.setAttribute('stroke', color);
    bar.setAttribute('stroke-width', '2');
    svg.appendChild(bar);
  }

  return svg;
}

/**
 * Shorten a hash for display.
 * @param {string} hash
 * @returns {string}
 */
function shortHash(hash) {
  if (!hash || hash.length <= 12) return hash || '—';
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * Get short event name from data object.
 * @param {object} data
 * @returns {string}
 */
function shortEvent(data) {
  if (!data || !data.event) return '—';
  // Convert GENESIS_BASELINE_CREATED → GENESIS
  return data.event.split('_')[0];
}

/**
 * Render the full hash chain into #chainScroll.
 * @param {Array<{index:number, hash:string, prevHash:string, data:object, valid:boolean}>} entries
 */
export function renderHashChain(entries) {
  const container = document.getElementById('chainScroll');
  const summaryEl = document.getElementById('chainSummaryText');
  if (!container) return;

  // Clear
  while (container.firstChild) container.removeChild(container.firstChild);

  if (!entries || entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-state-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.appendChild(createIcon('link', { size: 22 }));
    empty.appendChild(icon);
    const lbl = document.createElement('div');
    lbl.className = 'empty-state-label';
    lbl.textContent = 'No audit entries';
    empty.appendChild(lbl);
    container.appendChild(empty);
    return;
  }

  let firstBrokenIdx = -1;

  entries.forEach((entry, i) => {
    const isBroken = !entry.valid;
    if (isBroken && firstBrokenIdx === -1) firstBrokenIdx = i;

    // Chain link wrapper
    const linkWrap = document.createElement('div');
    linkWrap.className = 'chain-link';
    linkWrap.setAttribute('role', 'listitem');

    // Node
    const node = document.createElement('div');
    node.className = `chain-node ${isBroken ? 'broken-link' : 'valid-link'}`;
    node.setAttribute('tabindex', '0');
    node.setAttribute('title', `Block ${entry.index}: ${entry.valid ? 'valid' : 'BROKEN'}`);
    node.setAttribute(
      'aria-label',
      `Audit block ${entry.index}, hash ${shortHash(entry.hash)}, ${entry.valid ? 'valid' : 'chain broken here'}`
    );

    const idxDiv = document.createElement('div');
    idxDiv.className = 'chain-index';
    idxDiv.textContent = `Block ${entry.index}`;
    node.appendChild(idxDiv);

    const hashDiv = document.createElement('div');
    hashDiv.className = 'chain-hash';
    hashDiv.textContent = shortHash(entry.hash);
    node.appendChild(hashDiv);

    const eventDiv = document.createElement('div');
    eventDiv.className = 'chain-event';
    eventDiv.textContent = shortEvent(entry.data);
    node.appendChild(eventDiv);

    // Broken indicator
    if (isBroken) {
      const brkSpan = document.createElement('div');
      brkSpan.className = 'chain-broken-tag';
      brkSpan.appendChild(createIcon('alert', { size: 11 }));
      const brkText = document.createElement('span');
      brkText.textContent = 'Broken';
      brkSpan.appendChild(brkText);
      node.appendChild(brkSpan);
    }

    linkWrap.appendChild(node);

    // Add connector AFTER this node (not after last)
    if (i < entries.length - 1) {
      // Connector is broken if the NEXT block is invalid
      const nextBroken = !entries[i + 1].valid;
      linkWrap.appendChild(buildConnector(nextBroken));
    }

    container.appendChild(linkWrap);
  });

  // Update sidebar chain summary
  if (summaryEl) {
    if (firstBrokenIdx === -1) {
      summaryEl.textContent = `${entries.length} blocks — chain intact`;
      summaryEl.style.color = 'var(--verdigris)';
    } else {
      summaryEl.textContent = `Chain broken at block ${firstBrokenIdx}`;
      summaryEl.style.color = 'var(--seal)';
    }
  }
}
