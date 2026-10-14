# CloudRDR — Design System & Visual Specification (DESIGN.md)

> Official design specification for CloudRDR — Autonomous Cloud Ransomware Containment & Cryptographic Recovery Console.  
> Adheres to: **Vercel Web Interface Guidelines**, **Design Motion Principles** (Emil Kowalski & Jakub Krehel lenses), and **Awesome DESIGN.md** standards.

---

## 1. Brand Identity & Aesthetic Direction

- **Category**: Enterprise Cloud Security Operations Center (SOC) & Cryptographic Recovery.
- **Design Metaphor**: **Deep Space Cyber Command**. Ultra-clean, high-density, authoritative. Gives security operators and executives instant clarity and cryptographic certainty during high-stakes security incidents.
- **Surface Language**: **Doppelrand (Double-Bezel Architecture)**. Outer translucent boundary ring (`rgba(255, 255, 255, 0.08)`) with an inner OLED container (`#0B101D`) creating an authentic physical hardware console feel.
- **Accent Philosophy**: Strict semantic assignment. No arbitrary neon colors. Every color indicates a verified security state.

---

## 2. Color Palette & Design Tokens

### Base Surfaces
```css
--bg-app:          #050811;   /* Deep OLED black canvas */
--bg-surface:      #0B101D;   /* Primary card and panel surface */
--bg-surface-elev: #11182B;   /* Elevated interactive panels and modal popovers */
--bg-subtle:       #18223B;   /* Monospace code blocks, inputs, and chip pills */
--bg-glass:        rgba(11, 16, 29, 0.82); /* Glassmorphism floating navbar */
```

### Borders & Doppelrand
```css
--border-subtle:   rgba(255, 255, 255, 0.07);
--border-medium:   rgba(255, 255, 255, 0.12);
--border-active:   #3B82F6;
```

### Typography Tones
```css
--text-primary:    #F8FAFC;   /* 98% pure heading white */
--text-secondary:  #94A3B8;   /* Slate-400 crisp reading text */
--text-muted:      #64748B;   /* Slate-500 subtle telemetry metadata */
```

### Security Status Accents
| Status | Hex | Token | Usage |
|---|---|---|---|
| **Ransomware / Breach** | `#EF4444` | `--threat` | Laser Crimson. Critical alerts, freeze trigger, affected file tags |
| **Normal / Verified** | `#10B981` | `--normal` | Cyber Emerald. Clean baseline, Merkle root match, AEAD PASS |
| **Suspicious Activity** | `#F59E0B` | `--warning` | Warm Amber. High change-rate warning (10%–30%) |
| **IAM Cryo-Lock** | `#06B6D4` | `--frost` | Cryo Cyan. IAM bucket freeze, immutable quarantine state |
| **Enterprise Brand** | `#3B82F6` | `--brand` | Electric Cobalt. Primary CTAs, active tab indicators, focus rings |

---

## 3. Typography & Micro-Copy Rules

- **Headings & Body UI**: `Geist`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`.
- **Telemetry, Hashes & Numbers**: `Geist Mono`, `JetBrains Mono`, `monospace`.
- **Vercel Guidelines Compliance**:
  - `font-variant-numeric: tabular-nums`: Applied across all counters, change rates, timestamps, and hashes to prevent jitter.
  - `text-wrap: balance`: Applied to `h1`, `h2`, `h3`, `.hero-title`, and `.section-label` to prevent orphan words.
  - Ellipsis: Character `…` (`\u2026`) used for loading states (`"Connecting…"`, `"Restoring…"`) rather than `...`.
  - Units: Non-breaking space `&nbsp;` before units (`10&nbsp;MB`, `30&nbsp;%`, `10&nbsp;s`).

---

## 4. Motion Principles (Restraint & Production Polish)

Derived from **Design Motion Principles** (Emil Kowalski + Jakub Krehel lenses):

1. **Restraint & Speed**: Animations exist to explain state transitions, never to distract. Default durations are snappy (140ms–240ms).
2. **Spring Physics**:
   ```css
   --ease-snappy: cubic-bezier(0.16, 1, 0.3, 1); /* Rapid button presses & badge reveals */
   --ease-subtle: cubic-bezier(0.25, 1, 0.5, 1); /* Modal entries & accordion expansion */
   ```
3. **Compositor Only**: Animate `transform` and `opacity` exclusively. Never animate `width`, `height`, or `top/left` in loops.
4. **Active Feedback**: Interactive buttons scale to `0.98` on `:active` with immediate tactile recovery.
5. **Accessibility Requirement**: Full `@media (prefers-reduced-motion: reduce)` support:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

---

## 5. Web Interface & Accessibility Guidelines (WCAG 2.2 AA)

- **Focus Rings**: `:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }`. Never `outline: none` without replacement.
- **Skip Link**: `<a href="#merkle-hero" class="skip-link">Skip to main console content</a>` pinned at top of both console and landing page.
- **Icon Buttons**: Every icon-only button must include a descriptive `aria-label`. Decorative icons must have `aria-hidden="true"`.
- **Dynamic Updates**: Asynchronous live updates (verdict banner, telemetry updates) carry `aria-live="polite"`.
- **Scroll Margin**: All heading/section anchors include `scroll-margin-top: 5rem` to prevent collision with sticky navigation bars.

---

## 6. Console Layout Blueprint (3-Zone SOC Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Floating Island Header: Wordmark | Bucket | Health | Demo | Actions   │
├───────────────┬────────────────────────────────────────┬───────────────┤
│ Left Rail     │ Center Command Deck                    │ Right Rail    │
│ (330px)       │ (Fluid Canvas)                         │ (330px)       │
│               │                                        │               │
│ - Threat      │ - Merkle Tree Integrity Core           │ - Incident    │
│   Verdict     │ - Real-time Sliding Detection Window   │   History     │
│   Widget      │   (Chart.js with 10% & 30% thresholds) │ - Active Case │
│ - Canary      │ - Containment Action Controls          │   File        │
│   Sentinels   │ - Verified Restore Panel               │ - Tamper-proof│
│ - Hash-Chained│   (AES-256-GCM AEAD Tag & SHA Checks)  │   Audit Log   │
│   Baseline    │                                        │   Ledger      │
└───────────────┴────────────────────────────────────────┴───────────────┘
```
