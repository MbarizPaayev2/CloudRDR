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
  play: [['path', { d: 'M7 4.5v15l12-7.5-12-7.5z' }]],
  refresh: [
    ['path', { d: 'M21 12a9 9 0 1 1-2.64-6.36L21 8' }],
    ['path', { d: 'M21 3v5h-5' }],
  ],
  loader: [['path', { d: 'M21 12a9 9 0 1 1-6.22-8.56' }]],
  close: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
  copy: [
    ['rect', { x: 9, y: 9, width: 12, height: 12, rx: 2 }],
    ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }],
  ],
  back: [
    ['path', { d: 'M19 12H5' }],
    ['path', { d: 'm12 19-7-7 7-7' }],
  ],
  external: [
    ['path', { d: 'M7 17 17 7' }],
    ['path', { d: 'M8 7h9v9' }],
  ],
  alert: [
    [
      'path',
      {
        d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
      },
    ],
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  zap: [['path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' }]],
  freeze: [
    ['path', { d: 'M12 2v20' }],
    ['path', { d: 'M2 12h20' }],
    ['path', { d: 'm5 5 14 14' }],
    ['path', { d: 'm19 5-14 14' }],
  ],
  restore: [
    ['path', { d: 'M3 12a9 9 0 1 0 2.64-6.36L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  sign: [
    ['path', { d: 'M12 20h9' }],
    ['path', { d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z' }],
  ],
  link: [
    ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }],
    ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }],
  ],
  file: [
    ['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }],
    ['path', { d: 'M14 2v6h6' }],
  ],
  shield: [['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }]],
  shieldAlert: [
    ['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }],
    ['path', { d: 'M12 8v4' }],
    ['path', { d: 'M12 16h.01' }],
  ],
  shieldCheck: [
    ['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
  files: [
    [
      'path',
      {
        d: 'M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z',
      },
    ],
    ['path', { d: 'M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8' }],
  ],
  activity: [['path', { d: 'M22 12h-4l-3 9L9 3l-3 9H2' }]],
  database: [
    ['ellipse', { cx: 12, cy: 5, rx: 9, ry: 3 }],
    ['path', { d: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' }],
    ['path', { d: 'M3 12c0 1.66 4 3 9 3s9-1.34 9-3' }],
  ],
  databaseBackup: [
    ['ellipse', { cx: 12, cy: 5, rx: 9, ry: 3 }],
    ['path', { d: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' }],
    ['path', { d: 'M3 12c0 1.66 4 3 9 3s9-1.34 9-3' }],
    ['path', { d: 'm19 15-3 3 3 3' }],
  ],
  search: [
    ['circle', { cx: 11, cy: 11, r: 8 }],
    ['path', { d: 'm21 21-4.3-4.3' }],
  ],
  bell: [
    ['path', { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }],
    ['path', { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }],
  ],
  user: [
    ['path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: 12, cy: 7, r: 4 }],
  ],
  settings: [
    [
      'path',
      {
        d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
      },
    ],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
  chevronDown: [['path', { d: 'm6 9 6 6 6-6' }]],
  chevronRight: [['path', { d: 'm9 18 6-6-6-6' }]],
  panelLeft: [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M9 3v18' }],
  ],
  filter: [['polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }]],
  lock: [
    ['rect', { width: 18, height: 11, x: 3, y: 11, rx: 2, ry: 2 }],
    ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }],
  ],
  hardDrive: [
    ['line', { x1: 22, x2: 2, y1: 12, y2: 12 }],
    [
      'path',
      {
        d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
      },
    ],
    ['line', { x1: 6, x2: 6.01, y1: 16, y2: 16 }],
    ['line', { x1: 10, x2: 10.01, y1: 16, y2: 16 }],
  ],
  key: [
    [
      'path',
      {
        d: 'm21 2-2 2m-1.5 1.5L16 7l1 1-1.5 1.5-1-1-1.5 1.5 1 1-2 2-1-1a6.5 6.5 0 1 0-7 7 6.5 6.5 0 0 0 7-7l-1-1 3-3',
      },
    ],
    ['circle', { cx: 7.5, cy: 16.5, r: 1.5 }],
  ],
  eye: [
    ['path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
  server: [
    ['rect', { width: 20, height: 8, x: 2, y: 2, rx: 2, ry: 2 }],
    ['rect', { width: 20, height: 8, x: 2, y: 14, rx: 2, ry: 2 }],
    ['line', { x1: 6, x2: 6.01, y1: 6, y2: 6 }],
    ['line', { x1: 6, x2: 6.01, y1: 18, y2: 18 }],
  ],
  info: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 12, x2: 12, y1: 16, y2: 12 }],
    ['line', { x1: 12, x2: 12.01, y1: 8, y2: 8 }],
  ],
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
 * Convenience helper to replace the icon inside a button or container.
 * @param {HTMLElement} container
 * @param {keyof ICONS} name
 * @param {{ size?: number }} [opts]
 */
export function setButtonIcon(container, name, opts) {
  const existing = container.querySelector('svg.icon');
  const icon = createIcon(name, opts);
  if (existing) existing.replaceWith(icon);
  else container.prepend(icon);
}

/**
 * Set both icon and text on a button.
 * @param {HTMLButtonElement} btn
 * @param {keyof ICONS} iconName
 * @param {string} labelText
 */
export function setButtonContent(btn, iconName, labelText) {
  btn.replaceChildren();
  const icon = createIcon(iconName, { size: 14 });
  const span = document.createElement('span');
  span.textContent = labelText;
  btn.appendChild(icon);
  btn.appendChild(span);
}
