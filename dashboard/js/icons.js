/**
 * @file dashboard/js/icons.js
 *
 * Single SVG icon set for the console (ui-ux-pro-max rules: `no-emoji-icons`,
 * `icon-style-consistent`). Lucide-style geometry: 24px grid, 1.75 stroke,
 * round caps/joins.
 *
 * Security: icons are built with createElementNS from a static path table —
 * no innerHTML, no API data ever reaches this module.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** name → array of [tag, attrs] primitives */
const ICONS = {
  play:     [['path', { d: 'M7 4.5v15l12-7.5-12-7.5z' }]],
  refresh:  [['path', { d: 'M21 12a9 9 0 1 1-2.64-6.36L21 8' }], ['path', { d: 'M21 3v5h-5' }]],
  loader:   [['path', { d: 'M21 12a9 9 0 1 1-6.22-8.56' }]],
  close:    [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
  copy:     [['rect', { x: 9, y: 9, width: 12, height: 12, rx: 2 }], ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }]],
  back:     [['path', { d: 'M19 12H5' }], ['path', { d: 'm12 19-7-7 7-7' }]],
  external: [['path', { d: 'M7 17 17 7' }], ['path', { d: 'M8 7h9v9' }]],
  alert:    [['path', { d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }], ['path', { d: 'M12 9v4' }], ['path', { d: 'M12 17h.01' }]],
  zap:      [['path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' }]],
  freeze:   [['path', { d: 'M12 2v20' }], ['path', { d: 'M2 12h20' }], ['path', { d: 'm5 5 14 14' }], ['path', { d: 'm19 5-14 14' }]],
  restore:  [['path', { d: 'M3 12a9 9 0 1 0 2.64-6.36L3 8' }], ['path', { d: 'M3 3v5h5' }]],
  check:    [['path', { d: 'M20 6 9 17l-5-5' }]],
  sign:     [['path', { d: 'M12 20h9' }], ['path', { d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z' }]],
  link:     [['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }], ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }]],
  file:     [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['path', { d: 'M14 2v6h6' }]],
};

/**
 * Create a decorative SVG icon (aria-hidden; the visible label carries meaning).
 * @param {keyof ICONS} name
 * @param {{ size?: number, className?: string }} [opts]
 * @returns {SVGSVGElement}
 */
export function createIcon(name, { size = 16, className = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `icon icon-${name} ${className}`.trim());

  for (const [tag, attrs] of ICONS[name] || []) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}

/**
 * Replace a button's content with `label` + trailing icon in a nested
 * circular wrapper (high-end-visual-design "button-in-button" pattern).
 * @param {HTMLElement} btn
 * @param {string} label  static UI text (never API data)
 * @param {keyof ICONS} iconName
 * @param {{ spin?: boolean, leading?: boolean }} [opts]
 */
export function setButtonContent(btn, label, iconName, { spin = false, leading = false } = {}) {
  if (!btn) return;
  btn.textContent = '';
  const text = document.createElement('span');
  text.className = 'btn-label';
  text.textContent = label;

  const wrap = document.createElement('span');
  wrap.className = 'btn-icon-wrapper';
  wrap.appendChild(createIcon(iconName, { size: 14, className: spin ? 'icon-spin' : '' }));

  if (leading) { btn.append(wrap, text); } else { btn.append(text, wrap); }
}
