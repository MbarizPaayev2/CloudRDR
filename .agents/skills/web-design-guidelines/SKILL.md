---
name: web-design-guidelines
description: "Review UI code for Web Interface Guidelines compliance. Use when asked to 'review my UI', 'check accessibility', 'audit design', 'review UX', or 'check my site against best practices'."
metadata:
  author: vercel
  version: 1.0.0
  argument-hint: "<file-or-pattern>"
---

# Web Interface Guidelines (Vercel)

Review UI code for compliance with Vercel Web Interface Guidelines.

## Guidelines & Rules

### 1. Accessibility (a11y)
- **Buttons & Icons**: Icon-only buttons MUST have `aria-label`. Decorative icons need `aria-hidden="true"`.
- **Form Controls**: Every input/control needs an explicit `<label>` or `aria-label`.
- **Keyboard Navigation**: Interactive elements MUST support keyboard interaction (`Enter`/`Space` handlers or native elements).
- **Semantics**: Use `<button>` for actions, `<a>` for navigation (never `<div onclick>`). Use hierarchical `<h1>`–`<h6>` headings and provide a skip link for main content.
- **Dynamic Updates**: Asynchronous live updates (toasts, alerts, security verdicts) need `aria-live="polite"` or `role="alert"`.

### 2. Focus States
- **Focus Rings**: Interactive elements MUST have visible `:focus-visible` styling (e.g. `outline: 2px solid var(--accent)` or focus ring).
- **Never Kill Focus**: Never use `outline: none` without providing a visible replacement.
- **Compound Controls**: Use `:focus-within` for card or search input groups.

### 3. Forms & Inputs
- **Autocomplete & Types**: Explicit `type` (`email`, `text`, `number`) and appropriate `autocomplete` attributes.
- **Paste Friendly**: Never block paste (`onPaste` + `preventDefault`).
- **Loading State**: Submit buttons remain enabled until request starts; show spinner or progress during execution.
- **Spellcheck**: Disable spellcheck on technical identifiers, code, and hashes (`spellcheck="false"`).

### 4. Animation & Motion
- **Reduced Motion**: Always honor `@media (prefers-reduced-motion: reduce)`. Provide instant or zero-transform fallbacks.
- **Compositor Only**: Animate `transform` and `opacity` only. Avoid animating `width`, `height`, `margin`, or `left/top` to prevent layout thrashing.
- **Never `transition: all`**: Explicitly specify transitioned properties (e.g. `transition: transform 180ms ease, opacity 180ms ease`).
- **Motion Restraint**: Animations must be purposeful, snappy (120ms–240ms), and never obstruct urgent user actions.

### 5. Typography & Micro-copy
- **Ellipsis**: Use `…` (character `\u2026`) instead of three periods `...`.
- **Tabular Figures**: Use `font-variant-numeric: tabular-nums` for numeric counters, timestamps, hashes, and rates.
- **Balanced Text**: Apply `text-wrap: balance` on headings to prevent single-word orphan wraps.
- **Units & Spacing**: Use non-breaking spaces `&nbsp;` before units (`10&nbsp;MB`, `30&nbsp;%`).

### 6. Performance & Images
- **Explicit Dimensions**: Images need explicit `width` and `height` to prevent Cumulative Layout Shift (CLS).
- **Resource Hints**: Preconnect to critical domains (`<link rel="preconnect" ...>`).
- **Virtualization**: Large data lists handle truncation gracefully (`text-overflow: ellipsis`, `overflow: hidden`).
