# CloudRDR — ISMS Gap Analysis (ISO/IEC 27001:2022)

**Project:** Cloud Ransomware Detection & Recovery (CloudRDR)  
**Academic Course:** Information Security, Year 3  
**Lead Author / Role:** Mübariz Paşayev (Project Manager & GRC Specialist)  
**Standard:** ISO/IEC 27001:2022 (Information Security Management System)  
**Version:** 1.0.0  
**Date:** Autumn 2026

---

## 1. Executive Summary

ISO/IEC 27001:2022 specifies requirements for establishing, implementing, maintaining, and continually improving an Information Security Management System (ISMS). In cloud computing environments, ransomware represents a multi-domain threat capable of compromising confidentiality, integrity, and availability simultaneously.

This gap analysis benchmarks the **CloudRDR** architecture and organizational controls against the **ISO/IEC 27001:2022 Annex A Controls** (organized across Organizational, People, Physical, and Technological themes) and core management system clauses (Clauses 4 through 10). It provides an empirical maturity scoring (CMMI Levels 0 to 5) of our cloud defenses and outlines the roadmap toward compliance.

---

## 2. ISO 27001:2022 Management Clauses Assessment

| Clause        | Requirement Summary         | Current State in CloudRDR                                                                                                                          | Target Maturity (0–5) | Current Maturity (0–5) | Action Item / Gap Closure                                             |
| ------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------: | :--------------------: | --------------------------------------------------------------------- |
| **Clause 4**  | Context of the Organization | Internal/external stakeholders identified (cloud operators, university evaluators). Target cloud environment scoped to S3/Supabase object buckets. |   Level 4 (Managed)   |        Level 4         | Document organizational risk boundaries in ISMS charter.              |
| **Clause 5**  | Leadership & Commitment     | Roles allocated (PM-GRC, Backend, Crypto, DevOps, Frontend, QA). Scope freeze formally approved by all leads.                                      |   Level 4 (Managed)   |        Level 4         | Formalize security policy signed by leadership.                       |
| **Clause 6**  | Planning & Risk Assessment  | Risk assessment methodology established using STRIDE threat modeling and qualitative $5 \times 5$ risk matrix.                                     |   Level 4 (Managed)   |        Level 4         | Maintain dynamic Risk Register with periodic re-evaluation.           |
| **Clause 7**  | Support & Resources         | Dedicated team roles; standard dev tooling (Node.js 18, Fastify, Supabase, Git, ESLint). Secrets vault identified.                                 |   Level 4 (Managed)   |        Level 3         | Establish formal key rotation policy for Ed25519 and AES master keys. |
| **Clause 8**  | Operation                   | Technical controls implemented: automated baseline capture, telemetry polling, sliding rate detector, automated freeze.                            | Level 5 (Optimizing)  |        Level 4         | Execute automated disaster recovery drill (`npm run simulate`).       |
| **Clause 9**  | Performance Evaluation      | 45 automated unit/integration tests running via `node:test`; M1–M9 metrics tracked in `detection_runs`.                                            | Level 5 (Optimizing)  |        Level 4         | Implement CI/CD dashboard tracking automated testing pass rates.      |
| **Clause 10** | Improvement                 | Post-incident root cause analysis and verified restore rollback mechanisms; continuous tuning of detection thresholds.                             |   Level 4 (Managed)   |        Level 3         | Document corrective action procedure following simulated attacks.     |

---

## 3. Annex A Controls Gap Analysis Matrix

ISO/IEC 27001:2022 restructures Annex A into **4 control themes**:

- **Theme 5**: Organizational Controls (37 controls)
- **Theme 6**: People Controls (8 controls)
- **Theme 7**: Physical Controls (14 controls)
- **Theme 8**: Technological Controls (34 controls)

Below is the detailed gap analysis for all controls pertinent to CloudRDR's ransomware protection mandate:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            MATURITY RATING LEGEND                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Level 0: Incomplete — Control not performed or absent                             │
│ Level 1: Initial — Ad-hoc, unorganized execution                                  │
│ Level 2: Repeatable — Performed with basic consistency                            │
│ Level 3: Defined — Documented, standardized across project                       │
│ Level 4: Managed — Quantitatively measured and controlled                         │
│ Level 5: Optimizing — Continuous automated improvement and verification          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Theme 5: Organizational Controls

| Control ID | Control Name                                      | ISO 27001:2022 Requirement                                                                  | CloudRDR Current State & Implementation                                                                                                       | Current Maturity | Target Maturity | Gap & Remediation Action                                                  |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | :--------------: | :-------------: | ------------------------------------------------------------------------- |
| **A.5.15** | Access Control                                    | Rules to control physical and logical access to information and other associated assets.    | Access to backend database restricted via Postgres RLS (`deny_all` policies). HTTP API protected via mandatory API key.                       |   **Level 4**    |   **Level 5**   | Add role-based access control (RBAC) separating Operator and Admin tiers. |
| **A.5.24** | Information Security Incident Management Planning | Procedures to prepare for, detect, analyze, and communicate information security incidents. | Automated incident lifecycle state machine (`open → frozen → restoring → resolved`). NIST SP 800-61 incident response plan established.       |   **Level 4**    |   **Level 5**   | Automate external webhooks (PagerDuty / Slack) upon ransomware detection. |
| **A.5.25** | Assessment and Decision on Events                 | Evaluation of events to determine if they are classified as information security incidents. | `DetectionEngine` mathematically evaluates change rate ($W=60s$) against 10% (suspicious) and 30% (ransomware) thresholds + canary sentinels. |   **Level 5**    |   **Level 5**   | Fully automated; zero manual latency.                                     |
| **A.5.26** | Response to Incidents                             | Actions taken in response to security incidents according to documented procedures.         | Automated containment (`freezeAccount`) with exponential retry backoff, followed by Ed25519 digitally signed incident records.                |   **Level 5**    |   **Level 5**   | Tested and verified in automated attack simulator harness.                |
| **A.5.28** | Collection of Evidence                            | Identification, collection, acquisition, and preservation of evidence related to events.    | Incident records signed with Ed25519; logged into immutable SHA-256 hash-chained ledger. Forensic Merkle roots stored.                        |   **Level 5**    |   **Level 5**   | Fully meets legal non-repudiation and evidence admissibility criteria.    |
| **A.5.29** | Information Security During Disruption            | Planning to maintain information security at an appropriate level during disruption.        | High-priority IAM write-freeze blocks lateral attacker writes while preserving read access for recovery processes.                            |   **Level 4**    |   **Level 4**   | Fully documented in BCP/DRP manual.                                       |

### 3.2 Theme 8: Technological Controls

| Control ID | Control Name               | ISO 27001:2022 Requirement                                                                                     | CloudRDR Current State & Implementation                                                                                                                        | Current Maturity | Target Maturity | Gap & Remediation Action                                                     |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------: | :-------------: | ---------------------------------------------------------------------------- |
| **A.8.7**  | Protection Against Malware | Prevention, detection, and remediation controls against malware and malicious code.                            | **Primary system objective**: Rapid mass-modification detection ($\ge 30\%$ threshold), canary trap detection, and immediate cloud containment.                |   **Level 5**    |   **Level 5**   | Verified via `scripts/dev-simulate-attack.js` with 100% detection rate.      |
| **A.8.9**  | Configuration Management   | Configurations of hardware, software, services, and networks must be established and monitored.                | Configuration centralized in `src/config/index.js` with fail-fast validation (`process.exit(1)` on bad config). Defaults version-controlled in `.env.example`. |   **Level 4**    |   **Level 5**   | Integrate automated config drift detection.                                  |
| **A.8.12** | Data Leakage Prevention    | Measures applied to detect and prevent unauthorized extraction and disclosure of data.                         | Sensitive files and master keys redacted from logs via Pino redaction (`[REDACTED]`). Plaintext backups never stored unencrypted.                              |   **Level 4**    |   **Level 4**   | Maintain automated log sanitization verification in CI.                      |
| **A.8.13** | Information Backup         | Backup copies of information, software, and systems must be maintained and regularly tested.                   | Encrypted backups stored via AES-256-GCM. Verified restore validates AEAD authentication tags and SHA-256 baseline hashes prior to restore.                    |   **Level 5**    |   **Level 5**   | Verified restore refuses to restore tampered files (`MODIFIED`).             |
| **A.8.15** | Logging                    | Production logs recording activities, exceptions, faults, and security events must be generated and preserved. | Structured JSON logging with Pino. Immutable append-only audit log chained via SHA-256 hashes (`src/log/auditLog.js`).                                         |   **Level 4**    |   **Level 5**   | Implement remote syslog/S3 offsite log mirroring to prevent local tampering. |
| **A.8.16** | Monitoring Activities      | Networks, systems, and applications must be monitored for anomalous behavior.                                  | `MonitorAgent` continuously polls storage objects at configurable intervals (default 10s) and generates telemetry in `change_events`.                          |   **Level 5**    |   **Level 5**   | Continuous active monitoring implemented and tested.                         |
| **A.8.20** | Network Security           | Networks must be secured, managed, and controlled to protect information in systems.                           | HTTP server restricted with `@fastify/cors` bound to `DASHBOARD_ORIGIN` and `@fastify/rate-limit` (100 req/min).                                               |   **Level 4**    |   **Level 4**   | Enforce TLS 1.3 reverse proxy (Nginx/Cloudflare) in production deployment.   |
| **A.8.24** | Use of Cryptography        | Rules for the effective use of cryptography, including cryptographic key management, must be defined.          | RFC 8032 Ed25519 digital signatures, pairwise Merkle trees, SHA-256 stream hashing, AES-256-GCM authenticated encryption.                                      |   **Level 5**    |   **Level 5**   | Cryptographic primitives validated with standard test vectors.               |

---

## 4. Gap Remediation Action Plan (Roadmap)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ISMS ROADMAP TO COMPLIANCE                      │
├─────────────────────┬───────────────────┬─────────────┬────────────────┤
│ MILESTONE           │ ACTIONS REQUIRED  │ OWNER       │ TARGET DATE    │
├─────────────────────┼───────────────────┼─────────────┼────────────────┤
│ Milestone 1 (M1)    │ Establish Threat  │ PM-GRC      │ Completed      │
│ Foundational Policy │ Model, Scope,     │ (Mübariz)   │ (14 Oct 2026)  │
│ & Architecture      │ and Gap Analysis  │             │                │
├─────────────────────┼───────────────────┼─────────────┼────────────────┤
│ Milestone 2 (M2)    │ Implement A.8.7,  │ Backend     │ Completed      │
│ Technical Controls  │ A.8.13, A.8.24    │ (Elnur) &   │ (14 Oct 2026)  │
│ (Core CloudRDR)     │ (Detection/Restore│ Crypto      │                │
│                     │ /Ed25519/GCM)     │ (Nigar)     │                │
├─────────────────────┼───────────────────┼─────────────┼────────────────┤
│ Milestone 3 (M3)    │ Deploy Secrets    │ DevOps      │ Next Sprint    │
│ Infrastructure & CI │ Vault (AWS KMS/   │ (Rauf)      │ (Week 4)       │
│                     │ Vault) & Actions  │             │                │
├─────────────────────┼───────────────────┼─────────────┼────────────────┤
│ Milestone 4 (M4)    │ UI Visualization  │ Frontend    │ Week 5         │
│ Operations & Audit  │ (A.8.16 Monitoring│ (Aysel) &   │                │
│ Verification        │ & Audit Log View) │ QA (Tural)  │                │
└─────────────────────┴───────────────────┴─────────────┴────────────────┘
```

---

## 5. Conclusion & Auditor Statement

The CloudRDR project achieves an exceptionally high degree of alignment with **ISO/IEC 27001:2022**, particularly within the technological controls (A.8.7, A.8.13, A.8.15, A.8.16, A.8.24) and incident management controls (A.5.24–A.5.28). The automated detection and cryptographically verified restore pipeline addresses the most severe compliance failure points identified in contemporary ransomware incidents.

---

## 6. ISMS Governance, Project Management & Control Task Tracking

In compliance with **ISO/IEC 27001:2022 Clause 5.3 (Organizational roles, responsibilities, and authorities)** and **Clause 6.2 (Information security objectives and planning to achieve them)**, the CloudRDR project enforces structured control governance through a centralized project tracking board.

Every security requirement, cryptographic primitive, defensive mechanism, and testing milestone is mapped to specific work weeks (W1–W12) and assigned to designated role owners (PM-GRC, Backend, Crypto, DevOps, QA, Frontend) to prevent duty conflicts and guarantee complete auditability.

### 6.1 Issue Tracking Board — In Progress & Backlog Control Tasks

The screenshot below displays the operational ISMS issue backlog and active sprint items, including experimental threshold sweeps (`CRDR-21`), Statement of Applicability (SoA) control mapping (`CRDR-44`), incident response planning (`CRDR-43`), BCP/DRP plans (`CRDR-42`), and key management protocols (`CRDR-33`):

<div align="center">
  <img src="../assets/isms-issue-tracking-board-1.png" alt="CloudRDR ISMS Issue Tracking Board - In Progress & Backlog" width="100%" />
  <p><em>Figure 6.1: CloudRDR ISMS Task Tracking Board — Active sprint and backlog control items mapped across work weeks (W1–W12) and security engineering domains.</em></p>
</div>

### 6.2 Issue Tracking Board — Completed (Done) Verification Milestones

The screenshot below validates the completion of core technical controls, including verified restore (`CRDR-34`), automated IAM account freeze (`CRDR-24`), real-time monitoring agent (`CRDR-16`), SHA-256 cryptographic baseline module (`CRDR-11`), and automated testing suites (`CRDR-36`, `CRDR-15`):

<div align="center">
  <img src="../assets/isms-issue-tracking-board-2.png" alt="CloudRDR ISMS Issue Tracking Board - Completed Verification Milestones" width="100%" />
  <p><em>Figure 6.2: CloudRDR ISMS Task Tracking Board — Verified milestones in 'Done' status confirming successful implementation of Annex A technological and incident response controls.</em></p>
</div>

### 6.3 Mapping of Tracked Control Tickets to ISO 27001:2022 Controls

The following register provides the cryptographic and organizational traceability matrix for project reporting:

| Ticket Key | Task Summary | Phase / Week | Owner Role | ISO 27001:2022 Mapping | Control Status |
|---|---|---|---|---|---|
| **CRDR-11** | SHA-256 baseline module | W3-4 | Crypto | A.8.24 (Use of Cryptography) | **Done** |
| **CRDR-15** | Baseline unit tests | W3-4 | QA | Clause 9.1 (Monitoring & Measurement) | **Done** |
| **CRDR-16** | Monitoring agent daemon | W5 | Backend | A.8.16 (Monitoring Activities) | **Done** |
| **CRDR-24** | Account freeze (IAM read-only) | W8 | DevOps | A.5.26 (Response to Incidents) & A.5.29 | **Done** |
| **CRDR-34** | Verified restore | W10 | Backend | A.8.13 (Information Backup) & A.5.28 | **Done** |
| **CRDR-36** | Backup & restore tests (M5, M6) | W10 | QA | A.8.13 (Backup Testing & Verification) | **Done** |
| **CRDR-21** | Threshold sweep experiment | W6-7 | QA | Clause 9.1 (Performance Evaluation) | **In Progress** |
| **CRDR-19** | Change-rate detector | W6-7 | Backend | A.8.7 (Protection Against Malware) | **Backlog** |
| **CRDR-28** | Hash-chained audit log | W9 | Crypto | A.8.15 (Logging) & A.5.28 (Evidence) | **Backlog** |
| **CRDR-32** | AES-256-GCM backup | W10 | Crypto | A.8.24 (Cryptography) & A.8.13 | **Backlog** |
| **CRDR-33** | Key management | W10 | Crypto | A.8.24 (Cryptographic Key Management) | **Backlog** |
| **CRDR-38** | Metrics M1–M9 measurement | W11 | QA | Clause 9.1 (Evaluation & Measurement) | **Backlog** |
| **CRDR-39** | Negative tests | W11 | QA | Clause 9.2 (Internal Audit / Testing) | **Backlog** |
| **CRDR-37** | End-to-end demo script | W11 | QA | Clause 8.1 (Operational Planning) | **Backlog** |
| **CRDR-42** | BCP/DRP plan | W12 | PM-GRC | A.5.29 & A.5.30 (ICT Readiness for BCP) | **Backlog** |
| **CRDR-43** | Incident response plan | W12 | PM-GRC | A.5.24 & A.5.25 (Incident Management) | **Backlog** |
| **CRDR-44** | SoA and control mapping | W12 | PM-GRC | Clause 6.1.3 (Statement of Applicability) | **Backlog** |
| **CRDR-46** | Final report | W12 | PM-GRC | Clause 9.3 (Management Review) | **Backlog** |
| **CRDR-47** | Presentation slides & rehearsal | W12 | PM-GRC | Clause 7.4 (Communication) | **Backlog** |

