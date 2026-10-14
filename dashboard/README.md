# CloudRDR — Security Operations & Recovery Dashboard

> **Cloud Ransomware Detection & Recovery (CloudRDR)**  
> University Capstone Project — Information Security, Year 3  
> Live Evaluation & Demonstration Dashboard

---

## 1. Overview

The **CloudRDR Dashboard** is a zero-dependency, frameworkless Security Operations Center (SOC) single-page application designed for real-time ransomware telemetry monitoring, automated incident response inspection, and cryptographically verified disaster recovery.

It operates seamlessly in two modes:
1. **Interactive Demo Mode (Offline Mock):** Pre-loaded with a realistic full-lifecycle incident sequence (baseline establishment → telemetry spike → canary trap tripwire → automated IAM freeze → AES-256-GCM verified restore → 100% cryptographic certification).
2. **Live Production Mode (Backend API):** Directly consumes the CloudRDR Fastify REST API (`http://localhost:3000`) with authenticated `X-API-Key` headers.

---

## 2. Technical Stack

- **Markup & Layout:** Semantic HTML5, accessible ARIA roles, high-contrast responsive grid (laptop & projector optimized).
- **Styling:** Vanilla CSS3 with custom properties (CSS variables) supporting instant Light/Dark theme switching without flicker.
- **Client Logic:** Standard ES2022 JavaScript Modules (`import`/`export`), zero build step, zero bundling, zero node_modules required for runtime.
- **Visualizations:** Pinned [Chart.js v4.4.1](https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js) loaded via cdnjs.
- **Security Engineering:** Strict zero-XSS policy — all dynamic server data and telemetry hashes are injected exclusively via `element.textContent` and DOM nodes; `innerHTML` is strictly prohibited for external payloads.

---

## 3. Quick Start (Under 1 Minute)

### Option A: Static HTTP Server (Recommended)
From the repository root, start any static web server:

```bash
# Using Node.js npx serve
npx serve dashboard -p 3001

# Or using Python 3
python -m http.server 3001 --directory dashboard
```
Open your browser at: **`http://localhost:3001`**

### Option B: Direct Browser Launch
Because the dashboard utilizes standard ES modules, you can serve the directory or launch directly in modern browsers (Chrome, Firefox, Safari, Edge).

---

## 4. Configuration (`dashboard/js/config.js`)

Environment settings and API targets are maintained centrally in `dashboard/js/config.js` and can be adjusted dynamically or persisted via local storage:

| Setting | Default Value | Description |
|---|---|---|
| `API_BASE_URL` | `http://localhost:3000` | Backend Fastify HTTP API root |
| `API_KEY` | `change-me-before-running` | Shared secret transmitted via `X-API-Key` |
| `BUCKET_NAME` | `protected` | Default monitored storage bucket |
| `POLL_INTERVAL_MS` | `5000` | Telemetry polling frequency (5 seconds) |
| `USE_MOCK` | `true` | When true, renders deterministic demo data without backend |
| `THEME` | `dark` | Default color palette (`dark` or `light`) |

> **Pro Tip:** Toggle between Mock and Live API in real-time by clicking the **"Demo Mock / Live API"** switch directly in the dashboard header bar.

---

## 5. Live Demo Walkthrough & Evaluator Checklist

Follow this 6-step checklist during academic presentations to demonstrate the end-to-end security pipeline:

### 📸 Step 1: Pre-Attack Baseline State
- **Panel:** *Cryptographic Baseline* & *System Status Bar*
- **What to show:**
  - System health badge indicates `NORMAL (0.0% change velocity)`.
  - Merkle root displayed with 64-character SHA-256 hash (click `Copy` button to demonstrate clipboard integration).
  - Baseline file count shows 50 protected enterprise files.
  - Audit Ledger shows Block `#0` (`GENESIS_BASELINE_CREATED`) with 64 zero previous hash.

### 📸 Step 2: Ransomware Attack Velocity Spike & Canary Trip
- **Panel:** *Sliding-Window Change Rate Telemetry* (Chart.js)
- **What to show:**
  - Telemetry line tracks sliding-window modification rates over time.
  - Horizontal reference lines highlight the `10% Suspicious` warning and `30% Ransomware` critical thresholds.
  - Sudden jump to **44% change rate** with a prominent **red circular marker** indicating `canary/tripwire_sentinel.docx` was touched.
  - Global status bar pulses with a high-visibility **RANSOMWARE ALERT** badge.

### 📸 Step 3: Automated Containment & Incident Record
- **Panel:** *Security Incidents Table*
- **What to show:**
  - Incident `inc-9f81a7b4...` appears with status `FROZEN`.
  - Note the timestamp difference: Detection at `T` and IAM Deny-All freeze executed at `T + 0.1m`, well within the strict 10-second SLA.
  - Victim account identified: `finance-prod-01`.

### 📸 Step 4: Forensic Investigation & Digital Signature
- **Panel:** *Incident Investigation Detail*
- **What to show:**
  - Click on the active incident in the list to inspect forensic details.
  - **Forensic Timeline:** Visual steps tracking `Detected` → `Frozen` → `Restoring` → `Resolved`.
  - **Ed25519 Signature Chip:** Displays `VALID (HSM-Backed)` proving non-repudiation of the tamper-evident incident record.
  - **Affected Files List:** Scroll through the affected files list, noting the highlighted `[CANARY]` badge next to tripwire files.

### 📸 Step 5: Cryptographic Verified Restore Pipeline
- **Panel:** *Cryptographic Verified Restore Pipeline*
- **What to show:**
  - Click the **"🛡️ Start Verified Restore"** button.
  - Observe the browser confirmation prompt detailing the cryptographic verification protocol.
  - Watch the animated progress bar advance to **100%**.
  - **Per-File Verification Table:**
    - Expected Pre-Attack SHA-256 vs Restored Backup SHA-256.
    - Status chips showing green `VALID` chips.
    - Zero modified or missing files.
  - Highlight the final certification banner:  
    `✓ 100% VERIFIED: All restored files match pre-attack cryptographic baseline SHA-256 and valid AEAD tags.`

### 📸 Step 6: Hash-Chained Audit Ledger Verification
- **Panel:** *Hash-Chained Audit Ledger*
- **What to show:**
  - Header badge indicates `✓ Chain Valid (6 Blocks)`.
  - Each block displays its sequential index, cryptographic hash, previous block's SHA-256, UTC timestamp, and integrity chip.
  - Every block links backward to its predecessor until the Genesis block.
  - Explain that if an attacker or rogue administrator modifies any historical entry, the broken link immediately highlights in **RED (`❌ BROKEN LINK`)**, and all subsequent blocks are flagged as **`UNTRUSTED`**.

---

## 6. Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────┐
│               CloudRDR Frontend Dashboard                │
│                                                          │
│   ┌───────────────┐     subscribe     ┌──────────────┐   │
│   │ State Store   │ ────────────────▶ │  Components  │   │
│   │  (state.js)   │                   │ (Panels/DOM) │   │
│   └───────▲───────┘                   └──────────────┘   │
│           │                                              │
│           │ update                                       │
│   ┌───────┴───────┐                                      │
│   │   api.js /    │                                      │
│   │  mockApi.js   │                                      │
│   └───────▲───────┘                                      │
└───────────┼──────────────────────────────────────────────┘
            │ HTTP (X-API-Key)
            ▼
┌──────────────────────────────────────────────────────────┐
│                   Backend REST API                       │
│  /health  /baseline  /detection/runs  /incidents         │
│  /incidents/:id/restore  /restore/:jobId                 │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Security Guarantees

1. **Zero-XSS by Design:** All object paths, bucket names, and commit signatures are rendered via DOM text nodes. No `eval` or unsafe HTML templating.
2. **Credential Sanitization:** API keys reside solely in configuration memory and are transmitted via HTTP headers; keys are never printed in debug logs or rendered in user-visible DOM nodes.
3. **Tab Visibility Lifecycle:** Automatic polling automatically sleeps when browser tabs are minimized or hidden (`document.visibilityState === 'hidden'`) to preserve bandwidth and battery life.
4. **Resilient Error Preservation:** Network or API disconnections produce top-level dismissible alerts without resetting loaded data panels to blank states.
