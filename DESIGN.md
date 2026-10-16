# DESIGN.md — CloudRDR Autonomous Ransomware Defense & Recovery Platform

<!-- hallmark: preset=dark-technical; palette=void-obsidian; fonts=Space Grotesk+IBM Plex Sans+JetBrains Mono; layout=soc-command-grid; motion=compositor-spring-gsap; density=high; score=P5 H5 E5 S5 R5 V5 -->

## 1. Brand & Product Essence

**Product Category**: Enterprise Cloud Security Operations Center (SOC) & Cryptographic Ransomware Recovery Command Plane  
**Aesthetic Direction**: Industrial Precision / Void-Obsidian Telemetry Grid (`hallmark` + `baseline-ui` + `industrial-brutalist-ui`)  
**Core Philosophy**: Every pixel in a live ransomware incident console must communicate verified state, cryptographic provenance, or actionable containment controls. Decorative chrome, fake terminal traffic-light dots, animated backdrop blurs, and unverified static mock indicators are strictly prohibited.

---

## 2. Color & Surface Tokens

All colors are defined in [`dashboard/css/styles.css`](file:///d:/Users/007/Desktop/CloudRDR/dashboard/css/styles.css) via CSS custom properties on `:root`.

### Surfaces & Backgrounds
| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--bg-void` | `#050507` | Root canvas background (`body`) |
| `--bg-surface-1` | `#0b0c10` | Primary panel & table surface |
| `--bg-surface-2` | `#11131a` | Elevated card, modal, and interactive control background |
| `--bg-surface-3` | `#181b24` | Hover state surface and active row highlight |

### Semantic Status & Accent Palette
| Token | Value | Semantic Role |
| :--- | :--- | :--- |
| `--accent-cyan` | `#06b6d4` | Primary interactive focus, active telemetry, and baseline verification |
| `--status-safe` | `#10b981` | Normal state, verified SHA-256 digests, active heartbeats, intact hash chains |
| `--status-warn` | `#f59e0b` | Elevated entropy, canary access triggers, or degraded node latency |
| `--status-danger` | `#ef4444` | Active ransomware containment (`FROZEN`), hash mismatches, or broken chains |

### Borders & Hairlines
- **Default Structural Hairline**: `1px solid rgba(255, 255, 255, 0.07)` (`--border-subtle`)
- **Interactive / Focus Border**: `1px solid rgba(6, 182, 212, 0.45)`
- **Containment Alert Border**: `1px solid rgba(239, 68, 68, 0.45)`

---

## 3. Typography & Numeric Discipline

### Font Stack
- **Display & Section Headings (`--font-display`)**: `'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif`
  - Enforces `text-wrap: balance` and tight tracking (`-0.02em`).
- **UI Body & Operational Copy (`--font-sans`)**: `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif`
  - Enforces `text-wrap: pretty` and `max-width: 68ch` on descriptive prose.
- **Telemetry, Digests, & Logs (`--font-mono`)**: `'JetBrains Mono', monospace`
  - Used for all SHA-256 hashes, timestamps, latencies, entropy scores, and CLI snippets.

### Tabular Numerics (`tabular-nums`)
Every counter, KPI value, table cell, badge, latency readout, and countdown timer enforces:
```css
font-variant-numeric: tabular-nums;
```
This prevents horizontal layout jitter during high-frequency SSE telemetry updates (`1s–5s` polling and live event streams).

---

## 4. Layout, Spatial Architecture & Responsive Rules

- **Viewport Overflow**: `html, body { overflow-x: clip; }` prevents horizontal scrollbar bleed across all viewports.
- **Navigation Architecture**:
  - Single unified top command bar (`.top-bar`) housing brand identity, live protection state badge, primary view tabs (`role="tab"`), action dropdowns (`aria-expanded`, `aria-controls`), and operator session controls.
  - Sub-views switch cleanly inside `.main-workspace` without nested scrollbars.
- **Responsive Breakpoints**:
  - `<= 1280px`: Secondary telemetry columns collapse into stacked 2-column grids.
  - `<= 768px`: Top bar wraps cleanly, navigation tabs scroll horizontally with hidden scrollbars, and KPI/fleet cards stack into a single full-width column (`1fr`).

---

## 5. Interactive States & Accessibility (`fixing-accessibility`)

Every interactive control (`.btn`, `.cmd-tab`, `.fleet-filter-btn`, `.os-card`, form inputs) implements the 8-state lifecycle:
1. **Default**: Crisp 1px border, `white-space: nowrap` (never wraps button labels onto two lines).
2. **Hover**: Subtle surface elevation (`translateY(-1px)`) and border luminance increase.
3. **Focus-Visible**: High-contrast keyboard ring (`outline: 2px solid var(--accent-cyan); outline-offset: 2px`).
4. **Active / Pressed**: `transform: translateY(0) scale(0.99)` tactile feedback.
5. **Disabled / Busy**: `opacity: 0.55; cursor: not-allowed; pointer-events: none` during in-flight API calls.
6. **Loading**: Inline text update (`SCANNING...`, `VERIFYING...`, `PINGING...`) bound to live `Promise` execution.
7. **Error**: Semantic danger border + `role="status" aria-live="polite"` error banner linked via `aria-describedby`.
8. **Success**: Verified status toast + immediate state store synchronization (`refreshAll()`).

### ARIA & Semantic Requirements
- All icon-only or decorative `<svg>` elements carry `aria-hidden="true"`.
- Tab strips use `role="tablist"` and buttons use `role="tab"` with synchronized `aria-selected="true|false"`.
- Dropdown triggers declare `aria-haspopup="true"`, `aria-expanded`, and `aria-controls`.
- Authentication forms (`login.html`, `register.html`) bind inputs to error containers via `aria-describedby`.

---

## 6. Motion & Animation Performance (`gsap-core`, `gsap-performance`, `fixing-motion-performance`)

- **Compositor-Only Properties**: Animations are restricted to `transform` (`x`, `y`, `scale`, `rotation`) and `opacity` (`autoAlpha`).
- **Banned Properties**: Animating `backdrop-filter: blur()`, `box-shadow`, `width`, `height`, `top`, or `left` in CSS `@keyframes` or JS loops is forbidden.
- **GSAP View Transitions**:
  - View switching (`switchMainView`) uses `gsap.fromTo()` with `overwrite: 'auto'`, `duration: 0.24`, `ease: 'power2.out'`, `stagger: 0.03`, and `clearProps: 'transform,opacity,visibility'` on completion so residual inline transforms never trap fixed modals or stacking contexts.
- **Reduced Motion**: All JS and CSS animations respect `@media (prefers-reduced-motion: reduce)` and `window.matchMedia('(prefers-reduced-motion: no-preference)')`.
