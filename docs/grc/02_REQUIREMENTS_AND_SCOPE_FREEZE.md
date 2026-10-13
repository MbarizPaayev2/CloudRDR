# CloudRDR — Requirements & Scope Freeze Document

**Project:** Cloud Ransomware Detection & Recovery (CloudRDR)  
**Academic Course:** Information Security, Year 3  
**Lead Author / Role:** Mübariz Paşayev (Project Manager & GRC Specialist)  
**Status:** FROZEN (Baseline Approved)  
**Version:** 1.0.0  
**Effective Date:** Autumn 2026

---

## 1. Project Background & Purpose

Ransomware targeting cloud infrastructure increasingly encrypts unstructured data directly within object storage buckets via compromised IAM credentials or third-party service tokens. Traditional file system endpoint detection and response (EDR) solutions are blind to bucket-level REST API attacks.

**CloudRDR** bridges this gap by implementing an agent that monitors cloud bucket object metadata, measures empirical rate-of-change metrics against pre-computed cryptographic baselines, trips canary sentinels, programmatically isolates affected cloud accounts, and provides mathematically verifiable rollback from AES-256-GCM encrypted backups.

---

## 2. Functional Requirements (FR)

### 2.1 Baseline Management

- **FR-01 (Baseline Capture)**: The system MUST crawl all protected storage files and compute a SHA-256 content hash for each item without buffering whole files in memory.
- **FR-02 (Merkle Root Computation)**: The system MUST compute a deterministic pairwise SHA-256 Merkle root across all sorted baseline file hashes and store it in `baseline_snapshots`.
- **FR-03 (Version Idempotency)**: Re-baselining MUST create a new monotonically incremented `baseline_version` ($v1 \to v2 \to \dots$) without overwriting or duplicating historical rows.
- **FR-04 (Canary Sentinel Designation)**: Files matching canary naming conventions (e.g. `*.canary`, `canaries/*`) MUST be explicitly tagged (`is_canary = true`) in the database.

### 2.2 Monitoring & Telemetry

- **FR-05 (Storage Polling)**: The monitoring agent MUST poll storage entries every $T$ seconds (`MONITOR_INTERVAL_SECONDS`, default 10s) and track changes across three states: `created`, `modified`, and `deleted`.
- **FR-06 (Baseline Hash Comparison)**: For modified files, the agent MUST stream-hash the observed object and compare it against the active baseline hash, setting `matched_baseline: boolean`.
- **FR-07 (Change Event Ledger)**: All change observations MUST be persisted into the `change_events` database table with associated `account_id` and UTC timestamp.

### 2.3 Detection Engine

- **FR-08 (Sliding Window Evaluation)**: The engine MUST maintain a sliding window of duration $W$ seconds (`WINDOW_SECONDS`, default 60s) to aggregate unique modified/deleted files.
- **FR-09 (Rate Classification)**:
  - $\text{Rate} < 0.10$ ➔ `normal`
  - $0.10 \le \text{Rate} < 0.30$ ➔ `suspicious`
  - $\text{Rate} \ge 0.30$ ➔ `ransomware`
- **FR-10 (Canary Tripwire)**: ANY modification or deletion of a canary file MUST trigger an immediate `ransomware` verdict regardless of the current change rate.
- **FR-11 (Allowlist Bypass)**: Accounts specified in `ALLOWLISTED_ACCOUNTS` (e.g., enterprise backup jobs, migrations) MUST be classified as `normal`, with all exemptions formally logged.
- **FR-12 (Evaluation Telemetry)**: Every evaluation cycle MUST be persisted into `detection_runs`, including `normal` runs, to support threshold sweep research.

### 2.4 Incident Response & Containment

- **FR-13 (Automated Account Freeze)**: Upon a `ransomware` verdict, the system MUST invoke `freezeAccount(accountId)` with up to 3 automatic retries and exponential backoff, escalating to `freeze_failed` if unsuccessful.
- **FR-14 (Ed25519 Incident Signing)**: The system MUST build an incident record JSON (incorporating incident ID, affected paths, timestamps, Merkle root) and sign it using RFC 8032 Ed25519.
- **FR-15 (Tamper-Evident Audit Logging)**: Every major action (incident creation, freeze, restore) MUST append a block to an append-only SHA-256 hash-chained audit ledger.

### 2.5 Verified Recovery

- **FR-16 (AEAD Decryption & Verification)**: Backups MUST be encrypted using AES-256-GCM. Decryption MUST verify the 128-bit authentication tag before any bytes are trusted.
- **FR-17 (Baseline Comparison Check)**: The restored file's hash MUST be compared against `protected_files.baseline_sha256`:
  - Matching hash + verified AEAD tag ➔ `VALID`
  - Hash mismatch OR failed AEAD tag ➔ `MODIFIED`
  - No backup available ➔ `MISSING`
- **FR-18 (Safe Storage Write-back)**: Restored bytes MUST ONLY be written back to the live storage bucket if the outcome is strictly `VALID`.
- **FR-19 (Resolution Gate)**: An incident MUST transition to `resolved` if and only if 100% of affected files achieve `VALID` status.

### 2.6 Management API

- **FR-20 (RESTful Interface)**: The system MUST expose HTTP endpoints (`/health`, `/baseline`, `/detection/runs`, `/incidents`, `/restore`) with API key authentication and CORS protection.

---

## 3. Non-Functional Requirements (NFR)

| ID         | Category                       | Requirement Specification                                                                                             | Validation Method                                  |
| ---------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **NFR-01** | **Performance (Latency)**      | Ransomware detection MUST occur within 60 seconds of attack threshold breach.                                         | Verified in `test/integration/attackCycle.test.js` |
| **NFR-02** | **Containment SLA**            | Account freeze request MUST complete within 10 seconds of verdict issuance.                                           | Verified in `scripts/dev-simulate-attack.js`       |
| **NFR-03** | **Memory Efficiency**          | File hashing MUST use stream pipelining; heap memory MUST remain $< 150 \text{ MB}$ even when handling large files.   | Stream inspection in `baselineService.js`          |
| **NFR-04** | **Fault Tolerance**            | A locked, corrupt, or inaccessible file MUST NOT crash the monitoring agent cycle.                                    | Verified in `test/unit/monitorAgent.test.js`       |
| **NFR-05** | **Security (Confidentiality)** | Secrets, credentials, and full hashes of sensitive files MUST be redacted from system logs.                           | Pino redaction verified in `logger.js`             |
| **NFR-06** | **Security (Integrity)**       | Signature verification MUST execute in constant time to prevent side-channel timing attacks.                          | Constant-time verify in `ed25519.js`               |
| **NFR-07** | **Portability**                | The backend MUST operate on local storage without cloud credentials for offline testing and university demonstration. | Verified via `LocalFsStorage`                      |
| **NFR-08** | **Code Quality**               | Test coverage MUST exceed 90% across core units; 100% pass rate in CI; zero lint warnings.                            | Verified via `npm test` & `npm run lint`           |

---

## 4. Scope Allocation & Work Division

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CloudRDR TEAM BOUNDARIES                        │
├─────────────────────────┬──────────────────────────────────────────────┤
│ ROLE                    │ RESPONSIBILITIES & DELIVERABLES              │
├─────────────────────────┼──────────────────────────────────────────────┤
│ PM-GRC                  │ Threat Model (STRIDE), Requirements & Scope, │
│ (Mübariz Paşayev)       │ ISMS Gap Analysis (ISO 27001), Risk Register,│
│                         │ BCP/DRP & Incident Response Plans, Slides.   │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Backend                 │ DB Schema (RLS), Monitoring Agent, Detection │
│ (Elnur Hüseynov)        │ Engine, Incident Service, Verified Restore,  │
│                         │ Fastify REST API, Contract Interfaces.       │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Cryptography            │ SHA-256 Hashing, Pairwise Merkle Tree,       │
│ (Nigar Əliyeva)         │ Ed25519 Signing, Hash-Chained Audit Ledger,  │
│                         │ AES-256-GCM AEAD Encrypted Backups.          │
├─────────────────────────┼──────────────────────────────────────────────┤
│ DevOps                  │ Cloud Storage Setup (S3/Supabase), Secrets   │
│ (Rauf Quliyev)          │ Vault, Cloud IAM Deny-All Policies, CI/CD.   │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Frontend                │ Operator Dashboard (HTML5/Chart.js), Real-   │
│ (Aysel Bağırova)        │ time telemetry charts, Incident UI.          │
├─────────────────────────┼──────────────────────────────────────────────┤
│ QA & Security Testing   │ Attack Simulator, Threshold Sweep Experi-    │
│ (Tural Səfərov)         │ ment (TP/FP analysis), M1–M9 Metrics Harness.│
└─────────────────────────┴──────────────────────────────────────────────┘
```

### 4.1 In-Scope (Phase 1 Baseline)

- Object storage bucket protection via periodic polling.
- Sliding-window rate-of-change detection with configurable thresholds.
- Canary sentinel file placement and tripwire logic.
- Mock/IAM cloud account freeze execution with exponential retry.
- Ed25519 digital signing of incident records.
- Immutable hash-chained audit logging with tamper detection.
- AES-256-GCM authenticated encrypted backup store.
- Verified file restoration comparing pre-attack baselines with live state.
- Fastify REST API with API key security and error standardization.

### 4.2 Out-of-Scope (Deferred to Phase 2)

- Direct kernel filesystem minifilter drivers (e.g. Windows Filter Manager).
- Machine learning behavioral anomaly detection (clustering / neural classifiers).
- Multi-region cross-cloud active-active failover replication.
- Automated reverse engineering of ransomware PE binaries.

---

## 5. Scope Freeze Sign-Off

By signing below, the project stakeholders confirm that the functional and non-functional specifications are agreed upon, dependencies are aligned, and the scope for the Year 3 Information Security Capstone is officially **FROZEN**.

| Role                      | Name            | Signature / Status | Date        |
| ------------------------- | --------------- | :----------------: | ----------- |
| **Project Manager & GRC** | Mübariz Paşayev |     `APPROVED`     | 14 Oct 2026 |
| **Backend Lead**          | Elnur Hüseynov  |     `APPROVED`     | 14 Oct 2026 |
| **Cryptography Lead**     | Nigar Əliyeva   |     `APPROVED`     | 14 Oct 2026 |
| **DevOps Lead**           | Rauf Quliyev    |     `APPROVED`     | 14 Oct 2026 |
| **Frontend Lead**         | Aysel Bağırova  |     `APPROVED`     | 14 Oct 2026 |
| **QA & Testing Lead**     | Tural Səfərov   |     `APPROVED`     | 14 Oct 2026 |
