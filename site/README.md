# CloudRDR — Official Website & Product Console

> **Cloud Ransomware Detection & Recovery**  
> 3rd-year University Information Security Capstone (ISMS, Cloud Security, Cryptography)  
> *Aesthetic:* Calm, light, minimal, modern developer tool experience.

---

## 1. Quick Start Guide

### Option A: Direct Local Static Execution (Zero Dependencies)
Double-click `index.html` or serve with any zero-config local HTTP server:
```bash
# Using npx serve (recommended)
npx serve site

# Or using Python built-in server
python -m http.server 3001 --directory site
```
Open **`http://localhost:3001`** in any modern web browser.

### Option B: Full Stack Live Backend
1. Start the Fastify backend server in project root:
   ```bash
   npm start
   ```
2. In `site/js/config.js`, switch `USE_MOCK: false` to connect directly to the live Fastify backend on port `3000`.

---

## 2. Directory Structure

```
site/
├── index.html              # Marketing Landing Page (Hero Merkle tree, comparison, 6 steps)
├── how-it-works.html       # Detailed 6-stage technical walkthrough & plain-language glossary
├── team.html               # Engineering governance & role responsibilities
├── docs.html               # ISMS deliverables (Risk register, BCP/DRP, incident playbook)
├── README.md               # Run steps and screenshot checklist
│
├── demo/                   # Interactive SOC Console Suite
│   ├── index.html          # Main Dashboard (Merkle DAG, Chart.js velocity, canary, account status)
│   ├── incidents.html      # Incidents Queue table
│   ├── incident.html       # Forensic case file & verified restore modal
│   └── audit.html          # Tamper-evident hash chain ledger with interactive tamper button
│
├── css/
│   ├── tokens.css          # Design tokens (Bricolage Grotesque, JetBrains Mono, hex palette, dark mode)
│   ├── base.css            # Base resets, container widths, focus rings, dotted grids
│   ├── components.css      # Shared nav, buttons, panels, chips, table styles, skeletons
│   └── pages.css           # Page-specific layout rules (stepper, demo layout, tabs)
│
└── js/
    ├── config.js           # API_BASE_URL, API_KEY, POLL_INTERVAL_MS, USE_MOCK
    ├── api.js              # Universal fetch wrapper with X-API-Key and error handling
    ├── state.js            # In-memory reactive state store with subscriptions
    ├── main.js             # Telemetry polling orchestrator (5s cadence, visibility pause)
    ├── mock/
    │   ├── mockApi.js      # Self-contained mock API matching Fastify response envelopes
    │   └── story.js        # "Play Story" attack-to-recovery interactive narrative
    └── components/
        ├── nav.js          # Shared topbar and footer injector + theme switcher
        ├── merkleTree.js   # Living SVG Merkle DAG (calm, climbing corruption, verified restore)
        ├── detectionChart.js # Chart.js sliding-window velocity monitor with threshold lines
        ├── verdictBadge.js # Real-time verdict badge (NORMAL, SUSPICIOUS, pulsing RANSOMWARE)
        ├── incidentTable.js# Security incidents table
        ├── incidentDetail.js# Forensic case file tabs & verified restore progress bar
        └── hashChain.js    # Tamper-evident hash-chained audit log with tampering toggle
```

---

## 3. Design System & Typography

- **Fonts:**
  - `Bricolage Grotesque` (Variable light 300–400 for hero headlines; 600 for section titles)
  - `JetBrains Mono` (400–600 for SHA-256 hashes, telemetry numbers, and tabular figures)
- **Palette:**
  - Background: `#FAFAF8` (Dark: `#0C0E14`)
  - Surface: `#FFFFFF` (Dark: `#141822`)
  - Subtle Surface: `#F2F2EE` (Dark: `#1B2130`)
  - Text: `#16181D` (Dark: `#F4F6FB`)
  - Text Muted: `#6A6F7A` (Dark: `#8E95A5`)
  - Hairline Border: `#E4E4DF` (Dark: `rgba(255, 255, 255, 0.09)`)
  - Brand Accent: `#2F4BFF`
  - Status Healthy: `#1F9D6B`
  - Status Suspicious: `#E0A100`
  - Status Ransomware: `#D93636`
  - Status Frozen: `#4FA3C7`
- **Dark Mode:** Supports automatic `prefers-color-scheme` and manual toggle button with local storage persistence.

---

## 4. Demo Screenshot Checklist

When capturing presentation slides and capstone documentation, capture these 5 key moments:

- [ ] **1. Calm State (Dashboard):** All 16 Merkle DAG leaves green, Root shows `Matches Baseline`, Verdict badge is green `NORMAL`, account is active.
- [ ] **2. Attack Velocity Surge (Chart):** Chart.js line spiking above the 30% dashed threshold line with red marker on canary modification.
- [ ] **3. Active Ransomware Verdict & Tree Corruption:** Top border turns thin red, leaf nodes turn red one by one, corruption climbing up the branches to the root, showing `Differs from Baseline`.
- [ ] **4. Automated IAM Account Lockdown:** Account status badge switches to frost-blue `FROZEN (READ-ONLY)` confirming sub-10s containment.
- [ ] **5. Verified Restore & Proven Provenance:** Restore progress bar reaches 100%, leaves return to green, "100% verified" banner confirms all files match baseline SHA-256 and AEAD authentication tags.
- [ ] **6. Tamper-Evident Broken Chain:** In `demo/audit.html`, click "Tamper with Entry #1" to capture the visible red gap and broken previous hash pointer.
