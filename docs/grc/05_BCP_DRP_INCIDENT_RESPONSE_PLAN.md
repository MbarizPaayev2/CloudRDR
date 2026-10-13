# CloudRDR — BCP/DRP, Incident Response Plan (NIST SP 800-61), SoA & Capstone Slides

**Project:** Cloud Ransomware Detection & Recovery (CloudRDR)  
**Academic Course:** Information Security, Year 3  
**Lead Author / Role:** Mübariz Paşayev (Project Manager & GRC Specialist)  
**Version:** 1.0.0  
**Effective Date:** Autumn 2026

---

# SECTION 1: Business Continuity Plan (BCP) & Disaster Recovery Plan (DRP)

## 1. Objectives & Metrics

The Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP) ensure uninterrupted availability and mathematical recoverability of enterprise cloud data under active ransomware extortion attacks.

| Metric                               | Target Specification        |     CloudRDR Empirical Achievement      | Justification & Validation                                                                                             |
| ------------------------------------ | --------------------------- | :-------------------------------------: | ---------------------------------------------------------------------------------------------------------------------- |
| **Recovery Point Objective (RPO)**   | **$\le 60\text{ seconds}$** |       **$\le 10\text{ seconds}$**       | Storage polling interval ($10\text{s}$) captures changes near real-time; encrypted backups snapshot baseline versions. |
| **Recovery Time Objective (RTO)**    | **$\le 15\text{ minutes}$** | **$\le 12\text{ seconds}$ (100 files)** | Automated restore pipeline iterates, AEAD-verifies, and writes back files without manual human latency.                |
| **Maximum Tolerable Downtime (MTD)** | **$< 1\text{ hour}$**       |         **$< 1\text{ minute}$**         | Read operations remain accessible post-freeze; write operations restored upon resolution.                              |

## 2. Disaster Recovery Scenarios & Playbooks

### Scenario A: Mass Ransomware Attack (Active Encryption Wave)

1. **Trigger**: Detection engine records $\ge 30\%$ modification rate or canary interaction.
2. **Immediate Containment**: `FreezeClient` applies IAM write deny-all policy. Attacker sessions dropped.
3. **Recovery Activation**: Operator or automated daemon triggers `POST /incidents/:id/restore`.
4. **Verification**: Restored bytes compared against `protected_files.baseline_sha256` + AEAD tag validation.
5. **Storage Re-write**: Only files verified strictly `VALID` are restored to the live bucket.
6. **Incident Closure**: Incident marked `resolved` upon 100% VALID recovery.

### Scenario B: Accidental / Malicious Sentinel Deletion

1. **Trigger**: Canary sentinel file deleted by adversary or rogue script.
2. **Automated Response**: Immediate `ransomware` alert generated; account frozen within seconds.
3. **Investigation**: Operator examines `record_json.affectedPaths` via `GET /incidents/:id`.
4. **Restoration**: Canary and accompanying files restored and re-baselined.

---

# SECTION 2: Incident Response Plan (NIST SP 800-61 Rev 2 Alignment)

CloudRDR implements the 4-phase incident response lifecycle specified in **NIST SP 800-61 Rev 2** (_Computer Security Incident Handling Guide_):

```
┌────────────────────────────────────────────────────────────────────────┐
│               NIST SP 800-61 Rev 2 INCIDENT LIFECYCLE                   │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 1: PREPARATION                                                  │
│  - Compute initial SHA-256 baseline (`createBaseline()`)               │
│  - Compute pairwise Merkle root & store in `baseline_snapshots`        │
│  - Plant canary sentinels (`canaries/sentinel.canary`)                 │
│  - Configure threshold parameters ($W=60s$, Rate=0.30)                 │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 2: DETECTION & ANALYSIS                                         │
│  - Continuous polling agent (`MonitorAgent`) tracks storage state      │
│  - Stream-hashing checks changes against baseline                      │
│  - Mathematical sliding-window evaluation (`DetectionEngine`)          │
│  - Canary tripwire detection (`isCanaryTriggered()`)                   │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 3: CONTAINMENT, ERADICATION & RECOVERY                          │
│  - Automated account containment (`freezeAccount()`) with retry        │
│  - Ed25519 digital signature of canonical incident record              │
│  - Append incident block to hash-chained audit log                     │
│  - Execute verified restore (`startRestore()`) via AES-256-GCM backups │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 4: POST-INCIDENT ACTIVITY                                       │
│  - Verify audit chain integrity (`verifyAuditChain()`)                 │
│  - Root cause analysis and attacker vector analysis                    │
│  - Baseline re-generation ($v1 \to v2$) and threshold re-calibration   │
└────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 3: Statement of Applicability (SoA)

The Statement of Applicability (SoA) maps CloudRDR's security controls to **ISO/IEC 27001:2022 Annex A** and the **NIST Cybersecurity Framework (CSF) 2.0** core functions (Govern, Identify, Protect, Detect, Respond, Recover).

| ISO 27001:2022 Control         | NIST CSF 2.0 Function |  Status  | CloudRDR Technical Implementation                                           | Justification for Inclusion                                   |
| ------------------------------ | --------------------- | :------: | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **A.5.15 Access Control**      | **PROTECT (PR.AA)**   | Included | Fastify API Key auth + Supabase Postgres Row Level Security (`deny_all`).   | Prevents unauthorized access to telemetry and baselines.      |
| **A.5.24 Incident Planning**   | **RESPOND (RS.MA)**   | Included | Automated incident state machine (`open → frozen → restoring → resolved`).  | Standardized lifecycle for rapid containment.                 |
| **A.5.25 Event Assessment**    | **DETECT (DE.AE)**    | Included | Sliding window rate calculation ($W=60s$, $\ge 30\%$) and canary sentinels. | Eliminates human latency in identifying ransomware attacks.   |
| **A.5.26 Incident Response**   | **RESPOND (RS.RP)**   | Included | Automated cloud IAM write-freeze with 3-attempt exponential backoff.        | Halts data loss within seconds of detection.                  |
| **A.5.28 Evidence Collection** | **RESPOND (RS.AN)**   | Included | Ed25519 digital signatures + Merkle tree root forensic binding.             | Guarantees non-repudiation and legal evidence admissibility.  |
| **A.8.7 Anti-Malware**         | **PROTECT (PR.PS)**   | Included | Behavioral rate-of-change detection and canary tripwire traps.              | Directly counters unauthorized file modification.             |
| **A.8.12 Data Leakage**        | **PROTECT (PR.DS)**   | Included | Pino automated redaction of sensitive credentials and master keys.          | Prevents credential harvesting from logs.                     |
| **A.8.13 Information Backup**  | **RECOVER (RC.RP)**   | Included | AES-256-GCM encrypted backup store + verified restore validation.           | Enables guaranteed recovery without paying extortion ransoms. |
| **A.8.15 Security Logging**    | **DETECT (DE.CM)**    | Included | Append-only SHA-256 hash-chained audit log with tamper detection.           | Provides immutable chronological event provenance.            |
| **A.8.16 Monitoring**          | **DETECT (DE.CM)**    | Included | Continuous storage polling agent tracking created/modified/deleted files.   | Core telemetry collection mechanism.                          |
| **A.8.24 Cryptography**        | **PROTECT (PR.DS)**   | Included | RFC 8032 Ed25519, AES-256-GCM, pairwise Merkle trees, SHA-256 streaming.    | Enforces mathematical integrity and confidentiality.          |

---

# SECTION 4: Final Capstone Presentation Slide Deck Outline

This outline provides the slide-by-slide structure for the final university defense presentation:

```
┌────────────────────────────────────────────────────────────────────────┐
│          CloudRDR FINAL PRESENTATION SLIDE DECK (12 SLIDES)            │
├──────┬────────────────────────┬────────────────────────────────────────┤
│ SLIDE│ TITLE                  │ KEY VISUALS & BULLET POINTS            │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 1    │ Title & Team           │ CloudRDR: Cloud Ransomware Detection & │
│      │                        │ Recovery. Year 3 InfoSec Capstone.     │
│      │                        │ Team: Mübariz, Elnur, Nigar, Rauf,     │
│      │                        │ Aysel, Tural.                          │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 2    │ The Cloud Ransomware   │ Why traditional EDR fails against cloud│
│      │ Problem                │ storage attacks. Direct REST API-based │
│      │                        │ bucket encryption. Statistics & impact.│
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 3    │ CloudRDR Architecture  │ High-level ASCII architecture diagram. │
│      │ Overview               │ Monitor Agent ➔ Detection Engine ➔     │
│      │                        │ Response ➔ Verified Restore.           │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 4    │ Detection Engine:      │ Sliding window math ($W=60s$). Rate    │
│      │ Dual-Trigger Mechanism │ thresholds ($10\% / 30\%$). Canary     │
│      │                        │ tripwires. Allowlist bulk exceptions.  │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 5    │ Cryptographic Integrity│ SHA-256 stream-hashing, pairwise Merkle│
│      │ & Non-Repudiation      │ roots, RFC 8032 Ed25519 signatures,   │
│      │                        │ RFC 8785 canonical JSON serializer.    │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 6    │ Immutable Audit Log    │ Hash-chained ledger ($\text{prevHash}$ │
│      │ (QA Test M7)           │ links). Tamper detection verifier with │
│      │                        │ exact broken index identification.     │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 7    │ Verified Restore       │ AES-256-GCM authenticated encryption.  │
│      │ Mechanics              │ AEAD authentication tag verification.  │
│      │                        │ Baseline comparison (VALID/MODIFIED).  │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 8    │ GRC & Compliance       │ ISO/IEC 27001:2022 Gap Analysis.       │
│      │ (ISO 27001 & NIST)     │ NIST SP 800-61 Incident Response Plan. │
│      │                        │ Risk Register v1 (10 risks mitigated). │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 9    │ Live Demo: The Full    │ Execution of `npm run simulate`:       │
│      │ Attack Cycle           │ Seed ➔ Attack (50%) ➔ Detect ➔         │
│      │                        │ Freeze ➔ Sign ➔ Restore 100% VALID.    │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 10   │ Test Suite & Empirical │ 45 unit/integration tests running via  │
│      │ Metrics                │ `node:test`. 0 ESLint warnings.        │
│      │                        │ Detection latency $< 1\text{s}$ local. │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 11   │ Teammate Interfaces &  │ Clean contract decoupling: Crypto,     │
│      │ Modularity             │ DevOps, Frontend, QA interfaces.       │
├──────┼────────────────────────┼────────────────────────────────────────┤
│ 12   │ Conclusion & Future    │ Summary of achievements. Transition to │
│      │ Work (Phase 2)         │ AWS KMS, kernel minifilters, ML. Q&A.  │
└──────┴────────────────────────┴────────────────────────────────────────┘
```
