/**
 * @file dashboard/js/components/sealChip.js
 *
 * Wax-seal chip factory for file restore results.
 * Creates a DOM element representing VALID (intact), MODIFIED (cracked),
 * or MISSING (empty outline) seal.
 *
 * Security: returns DOM elements built with createElement / textContent only.
 */

/**
 * Build the inline SVG for the wax seal icon.
 * @param {'valid'|'modified'|'missing'} type
 * @returns {SVGElement}
 */
function buildSealSVG(type) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 14 14');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  if (type === 'valid') {
    // Intact seal: filled circle with checkmark
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '7'); circle.setAttribute('cy', '7'); circle.setAttribute('r', '6');
    circle.setAttribute('fill', '#2F6F5E');
    svg.appendChild(circle);
    const check = document.createElementNS(NS, 'polyline');
    check.setAttribute('points', '4,7 6.2,9.5 10,5');
    check.setAttribute('fill', 'none');
    check.setAttribute('stroke', 'white');
    check.setAttribute('stroke-width', '1.5');
    check.setAttribute('stroke-linecap', 'round');
    svg.appendChild(check);

  } else if (type === 'modified') {
    // Cracked seal: filled circle + crack lines
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '7'); circle.setAttribute('cy', '7'); circle.setAttribute('r', '6');
    circle.setAttribute('fill', '#B3261E');
    svg.appendChild(circle);
    // Crack 1
    const c1 = document.createElementNS(NS, 'polyline');
    c1.setAttribute('points', '5,4 7,7 5,10');
    c1.setAttribute('fill', 'none'); c1.setAttribute('stroke', '#EFE6D2');
    c1.setAttribute('stroke-width', '1.2'); c1.setAttribute('stroke-linecap', 'round');
    svg.appendChild(c1);
    // Crack 2
    const c2 = document.createElementNS(NS, 'line');
    c2.setAttribute('x1', '7'); c2.setAttribute('y1', '7');
    c2.setAttribute('x2', '10'); c2.setAttribute('y2', '5.5');
    c2.setAttribute('stroke', '#EFE6D2'); c2.setAttribute('stroke-width', '1');
    svg.appendChild(c2);

  } else {
    // Missing: empty circle outline only
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '7'); circle.setAttribute('cy', '7'); circle.setAttribute('r', '5.5');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#9C8F78');
    circle.setAttribute('stroke-width', '1.2');
    circle.setAttribute('stroke-dasharray', '2,2');
    svg.appendChild(circle);
  }

  return svg;
}

/**
 * Create a seal chip element.
 * @param {'VALID'|'MODIFIED'|'MISSING'} result
 * @returns {HTMLElement}
 */
export function createSealChip(result) {
  const type = (result || '').toLowerCase(); // 'valid' | 'modified' | 'missing'
  const validType = ['valid', 'modified', 'missing'].includes(type) ? type : 'missing';

  const span = document.createElement('span');
  span.className = `seal-chip ${validType}`;
  span.setAttribute('aria-label', `File result: ${result}`);

  span.appendChild(buildSealSVG(validType));

  const label = document.createElement('span');
  label.textContent = result || 'MISSING';
  span.appendChild(label);

  return span;
}
