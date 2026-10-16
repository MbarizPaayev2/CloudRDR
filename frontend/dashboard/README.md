# CloudRDR — Forensic Evidence Archive Dashboard

> A plain HTML/CSS/JS dashboard for the CloudRDR university project.
> Design concept: **The Notary's Archive** — forensic evidence, sealed ledgers, wax seals, and cryptographic chains.

---

## Quick Start

### Option A — Via the backend server (recommended)

```bash
npm start          # starts Fastify on http://localhost:3000
```

Open `http://localhost:3000` in Chrome or Firefox.

### Option B — Static file server

```bash
npx serve dashboard/
```

### Option C — Double-click

Open `dashboard/index.html` directly in Chrome (note: ES modules require a server for cross-origin safety; use Option A or B for full functionality).

---

## Configuration

Edit `dashboard/js/config.js` to switch between mock and live API:

```js
USE_MOCK: true,          // false = real backend
API_BASE_URL: 'http://localhost:3000',
API_KEY: 'dev-secret-key-12345',
POLL_INTERVAL_MS: 5000,
```

**To connect to the real API:** set `USE_MOCK: false` and point `API_BASE_URL` at your backend. No other file changes needed.

---

## Design System

| Token         | Value     | Usage                   |
| ------------- | --------- | ----------------------- |
| `--paper`     | `#EFE6D2` | Page background         |
| `--ink`       | `#1B1A17` | Primary text, UI chrome |
| `--seal`      | `#B3261E` | RANSOMWARE / MODIFIED   |
| `--verdigris` | `#2F6F5E` | NORMAL / VALID          |
| `--canary`    | `#F2C230` | SUSPICIOUS              |
| `--frost`     | `#9CC9D9` | Frozen accounts         |

Fonts: **Fraunces** (display/headings, variable weight 200–900) · **Martian Mono** (hashes, paths, data) · **Special Elite** (stamps, labels)

---

## Demo Checklist (for live presentation)

- [ ] Page loads with paper background, grain texture, ledger lines visible
- [ ] Wordmark "CloudRDR / Forensic Evidence Archive" appears in the black header
- [ ] Left sidebar shows: current verdict (NORMAL in light weight), canary bird bobbing, baseline file count and Merkle root chip
- [ ] Center hero: Merkle tree SVG renders with green (verdigris) leaves, all healthy
- [ ] Detection chart shows ink-pen trace with dashed red threshold line
- [ ] Right rail shows case file items, stamped with status (FROZEN, RESOLVED)
- [ ] Click a case file → detail panel opens with Timeline / Evidence / Signature / Restore tabs
- [ ] Hash chain scrolls horizontally at the bottom, all links verdigris
- [ ] Click **▶ Play Story**:
  - [ ] Verdict flips NORMAL → SUSPICIOUS → RANSOMWARE with stamp slam
  - [ ] Canary bird goes grey and silent, "TRIPWIRE BREACHED" appears
  - [ ] Merkle leaves turn red one by one, root hash turns red
  - [ ] Page edges pulse red
  - [ ] Frozen incident appears with frost overlay
  - [ ] Hash chain updates with new audit events
  - [ ] Leaves re-seal one by one (verdigris), root restores
  - [ ] "100% VERIFIED ✓" banner appears in restore tab

---

## Architecture

```
dashboard/
├── index.html                  HTML skeleton, all element IDs
├── css/
│   ├── tokens.css              Design tokens + Google Fonts import
│   ├── animations.css          All @keyframes
│   └── styles.css              Layout, components, responsive
└── js/
    ├── config.js               API_BASE_URL, API_KEY, USE_MOCK
    ├── api.js                  Fetch wrapper (delegates to mock or real)
    ├── state.js                In-memory store + subscribe()
    ├── main.js                 Bootstrap, polling, Play Story
    ├── mock/
    │   └── mockApi.js          Full story fixtures (no network needed)
    └── components/
        ├── merkleTree.js       SVG tree, corruption/restore animation
        ├── verdictStamp.js     Verdict word + stamp slam
        ├── baselineLedger.js   Baseline panel + copy-hash
        ├── detectionChart.js   Chart.js ink-pen line chart
        ├── canaryCage.js       Canary bob / still state
        ├── caseFile.js         Incident list + tabbed detail + restore
        ├── sealChip.js         VALID/MODIFIED/MISSING wax seal chips
        ├── hashChain.js        Horizontal chain of audit blocks
        └── frostOverlay.js     Frost CSS overlay for frozen incidents
```

---

## Security Notes

- All API data rendered via `textContent` — zero XSS risk
- API key lives only in `config.js`, never logged or emitted to DOM
- Stack traces never shown to user — only `error.code` + `error.message`
- Polling pauses when browser tab is hidden (Page Visibility API)

---

## Browser Compatibility

Tested: Chrome 120+, Firefox 121+

Requires: ES modules, CSS custom properties, `fetch()`, `navigator.clipboard`
