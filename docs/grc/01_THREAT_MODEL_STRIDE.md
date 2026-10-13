# CloudRDR — Threat Model Document (STRIDE)

**Project:** Cloud Ransomware Detection & Recovery (CloudRDR)  
**Academic Course:** Information Security, Year 3 (University Capstone)  
**Lead Author / Role:** Mübariz Paşayev (Project Manager & GRC Specialist)  
**Version:** 1.0.0  
**Classification:** Confidential / Academic Assessment  
**Date:** Autumn 2026

---

## 1. Executive Summary & Objective

CloudRDR is an automated cloud-native defense and recovery platform designed to protect cloud object storage (AWS S3, MinIO, Supabase Storage) against mass-encryption ransomware attacks. The primary security goals are:

1. **Real-time detection** of anomalous modification rates ($\ge 30\%$ per 60-second sliding window) and canary trap interactions.
2. **Immediate containment** via cloud IAM deny-all write freezes within seconds.
3. **Non-repudiation** using RFC 8032 Ed25519 digitally signed incident records and tamper-evident SHA-256 hash-chained audit logs.
4. **Provable restoration** using AES-256-GCM encrypted backups, validating restored content against cryptographic SHA-256 baselines with zero reliance on corrupted storage.

This document identifies potential attack vectors, evaluates threat actors, defines system trust boundaries, and applies the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) to ensure comprehensive defense-in-depth.

---

## 2. System Architecture & Trust Boundaries

### 2.1 Component Breakdown

- **Target Storage Bucket (`Bucket`)**: Stores enterprise objects and canary sentinels.
- **Monitoring Agent (`MonitorAgent`)**: Storage polling engine comparing etags, timestamps, and sizes.
- **Detection Engine (`DetectionEngine`)**: Sliding window accumulator evaluating change rates and canary trips.
- **Response Orchestrator (`ResponseService` & `FreezeClient`)**: Executes account containment and incident creation.
- **Crypto & Key Management (`CryptoModule`)**: SHA-256 stream hashing, pairwise Merkle root generation, Ed25519 signing, and AES-256-GCM AEAD decryption.
- **Database (`Postgres / Supabase`)**: Stores baseline versions, change telemetry, incident states, and restore jobs.
- **Management API (`Fastify HTTP Server`)**: Authenticated endpoint interface for operators and web dashboard.

### 2.2 Data Flow Diagram (DFD) & Trust Boundaries

```
                 [ EXTERNAL UNTRUSTED ZONE ]
                              │
                    Compromised Cloud User /
                    Ransomware Threat Actor
                              │
                    (Writes / Overwrites / Deletes)
                              ▼
  ╔══════════════════════════════════════════════════════════════╗
  ║ TRUST BOUNDARY 1: Cloud Storage Provider (S3 / Supabase)     ║
  ║                                                              ║
  ║    ┌───────────────────────────┐                             ║
  ║    │   Protected Files Bucket  │ (Object Store)              ║
  ║    │   + Canary Sentinel Traps │                             ║
  ║    └─────────────┬─────────────┘                             ║
  ╚══════════════════╪═══════════════════════════════════════════╝
                     │ Poll / Change Events
                     ▼
  ╔══════════════════════════════════════════════════════════════╗
  ║ TRUST BOUNDARY 2: CloudRDR Internal Compute Engine           ║
  ║                                                              ║
  ║  ┌─────────────────────────┐    Events    ┌───────────────┐  ║
  ║  │    Monitoring Agent     │─────────────▶│   Detection   │  ║
  ║  └────────────┬────────────┘              │    Engine     │  ║
  ║               │ Read Stream               └───────┬───────┘  ║
  ║               ▼                                   │ Ransomware
  ║  ┌─────────────────────────┐                      ▼ Verdict  ║
  ║  │   Crypto Engine (SHA256,│              ┌───────────────┐  ║
  ║  │   Merkle, Ed25519, GCM) │              │   Response    │  ║
  ║  └────────────┬────────────┘              │    Service    │  ║
  ║               │                           └───────┬───────┘  ║
  ║               ▼                                   │          ║
  ║  ┌─────────────────────────┐                      ▼          ║
  ║  │  Encrypted Backup Store │              ┌───────────────┐  ║
  ║  │  (AES-256-GCM + AEAD)   │◀─────────────│   Verified    │  ║
  ║  └─────────────────────────┘  Restore Req │    Restore    │  ║
  ║                                           └───────────────┘  ║
  ║                                                              ║
  ╚══════════════════╤═══════════════════════════════════════════╝
                     │ SQL / Service Role Only
                     ▼
  ╔══════════════════════════════════════════════════════════════╗
  ║ TRUST BOUNDARY 3: Isolated Persistence (Supabase Postgres)   ║
  ║   - protected_files (RLS deny_all)                           ║
  ║   - baseline_snapshots                                       ║
  ║   - change_events                                            ║
  ║   - detection_runs                                           ║
  ║   - incidents                                                ║
  ║   - restore_jobs & restore_results                           ║
  ╚══════════════════════════════════════════════════════════════╝
```

---

## 3. Threat Actor Profiles

| Threat Actor                                            | Motivation                                         | Capabilities                                                                 | Target Vectors                                                                |
| ------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **External Cybercrime Syndicate (Ransomware Operator)** | Financial extortion, double-extortion exfiltration | Compromised IAM credentials, automated mass encryption tools, wiper payloads | Object storage bulk write/delete, tampering with backups, audit log wiping    |
| **Malicious Insider / Rogue Administrator**             | Sabotage, extortion, grievance                     | Valid administrative credentials, API access                                 | Disabling monitoring agent, altering detection thresholds, deleting baselines |
| **Compromised CI/CD Pipeline / Service Account**        | Supply chain infiltration                          | Automated script execution, token theft                                      | Mass writes masked as legitimate bulk operations                              |

---

## 4. STRIDE Threat Analysis

### 4.1 Spoofing (Identity & Authenticity)

| Threat ID | Threat Description                                                                                    | Affected Component | Impact   | CloudRDR Countermeasure / Mitigation                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TH-S1** | Attacker impersonates the management dashboard to forge API commands (e.g., triggering fake restore). | `Fastify HTTP API` | High     | Mandatory API key authentication (`x-api-key` / `Bearer` token) on all endpoints (except `/health`). Strict CORS policy bound to `DASHBOARD_ORIGIN`.     |
| **TH-S2** | Attacker spoofs incident record metadata to cover tracks.                                             | `IncidentService`  | Critical | Every incident record is converted to RFC 8785 canonical JSON and digitally signed with a private **Ed25519** key. Verifiers check public key signature. |
| **TH-S3** | Attacker impersonates legitimate service account during mass encryption to bypass rate rules.         | `DetectionEngine`  | High     | `ALLOWLISTED_ACCOUNTS` strictly vetted; canary file rule overrides allowlists—canary modifications trigger ransomware alerts regardless of identity.     |

### 4.2 Tampering (Data Integrity)

| Threat ID | Threat Description                                                                    | Affected Component         | Impact   | CloudRDR Countermeasure / Mitigation                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------- | -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TH-T1** | Ransomware modifies protected files in bulk within the storage bucket.                | `Storage Bucket`           | Critical | **Core feature**: Sliding time window ($W=60s$) detects change rates $\ge 30\%$. Immediate IAM write-freeze terminates attacker sessions.                                                       |
| **TH-T2** | Attacker modifies baseline records in database to match ransomware ciphertext hashes. | `Postgres protected_files` | Critical | Database tables protected with Row Level Security (`deny_all` to `anon`/`authenticated`). Cryptographic **Merkle root** stored in `baseline_snapshots` proves baseline tamper-evidence.         |
| **TH-T3** | Attacker tampers with backup files on disk to corrupt recovery.                       | `BackupStore`              | Critical | All backups are encrypted using **AES-256-GCM**. Decryption strictly requires AEAD authentication tag validation; any tampered byte halts restoration (`MODIFIED`).                             |
| **TH-T4** | Attacker tampers with past incident entries in audit logs.                            | `AuditLog`                 | High     | Hash-chained audit ledger links each entry via $\text{SHA-256}(\text{index} \Vert \text{prevHash} \Vert \text{timestamp} \Vert \text{payload})$. `verifyAuditChain()` detects any altered byte. |

### 4.3 Repudiation (Audit & Accountability)

| Threat ID | Threat Description                                                                     | Affected Component | Impact | CloudRDR Countermeasure / Mitigation                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------- | ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TH-R1** | Compromised user account denies responsibility for initiating mass file modifications. | `ChangeEvents`     | Medium | All observed changes are tagged with `account_id` and timestamped in `change_events` table before processing.                                                             |
| **TH-R2** | Administrator claims an incident was falsely reported or fabricated.                   | `IncidentService`  | High   | RFC 8032 Ed25519 signature incorporates incident ID, detection run summary, affected file hashes, Merkle root, and timestamps. Non-repudiation guaranteed mathematically. |

### 4.4 Information Disclosure (Confidentiality)

| Threat ID | Threat Description                                       | Affected Component | Impact   | CloudRDR Countermeasure / Mitigation                                                                                                                                        |
| --------- | -------------------------------------------------------- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TH-I1** | Plaintext backups leaked from backup repository.         | `BackupStore`      | Critical | All backup copies are encrypted at rest using **AES-256-GCM** with random 96-bit IVs and derived 256-bit master keys. Plaintext never touches unencrypted storage.          |
| **TH-I2** | Service keys or API secrets exposed in application logs. | `Logger (Pino)`    | High     | Automated Pino redaction active: paths like `*.serviceKey`, `*.apiKey`, `*.secret` are censored as `[REDACTED]`. File contents and full hashes excluded from standard logs. |
| **TH-I3** | Client-side exposure of Supabase service role key.       | `SupabaseClient`   | Critical | Service role key is strictly isolated to backend server environment. Zero client-side script exposure.                                                                      |

### 4.5 Denial of Service (Availability)

| Threat ID | Threat Description                                                               | Affected Component | Impact   | CloudRDR Countermeasure / Mitigation                                                                                                           |
| --------- | -------------------------------------------------------------------------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **TH-D1** | Flooding HTTP API to prevent operator access during active ransomware incident.  | `Fastify HTTP API` | High     | Built-in `@fastify/rate-limit` enforcing 100 requests per minute per IP. Async non-blocking response processing via Node.js event queue.       |
| **TH-D2** | Attacker deletes all files in protected bucket.                                  | `Storage Bucket`   | Critical | Deletion is captured by `EventSource` (`event_type: 'deleted'`) and counted toward change rate; verified restore re-creates files from backup. |
| **TH-D3** | Memory exhaustion via streaming multi-gigabyte files into memory during hashing. | `MonitorAgent`     | Medium   | All file reads utilize Node.js stream pipelining (`adapter.readStream()` ➔ `crypto.hashStream()`), never loading full files into heap memory.  |

### 4.6 Elevation of Privilege (Authorization)

| Threat ID | Threat Description                                                                     | Affected Component | Impact   | CloudRDR Countermeasure / Mitigation                                                                                                            |
| --------- | -------------------------------------------------------------------------------------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **TH-E1** | Anonymous or authenticated Supabase user escalates to modify database tables directly. | `Postgres RLS`     | Critical | RLS enabled across all 7 tables with restrictive `deny_all` policies. Only the backend running with the service-role key can bypass RLS.        |
| **TH-E2** | Attacker abuses freeze API to freeze arbitrary production cloud accounts.              | `FreezeClient`     | High     | Freeze operations are triggered strictly internally by the automated detection engine upon meeting verifiable ransomware mathematical criteria. |

---

## 5. Security Controls Traceability Matrix

| STRIDE Category          | Identified Threat | Implemented Control                               | Verified Test Case                                               |
| ------------------------ | ----------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| **Spoofing**             | TH-S1, TH-S2      | Fastify API Key auth + Ed25519 signing            | `test/unit/api.test.js`, `test/unit/crypto.test.js`              |
| **Tampering**            | TH-T1, TH-T3      | Detection engine (30% rate) + AES-256-GCM AEAD    | `test/unit/detection.test.js`, `test/unit/backupService.test.js` |
| **Repudiation**          | TH-R1, TH-R2      | Hash-chained audit log + Ed25519 signatures       | `test/unit/auditLog.test.js` (M7 test)                           |
| **Info Disclosure**      | TH-I1, TH-I2      | AES-256 encryption at rest + Pino redaction       | `test/unit/backupService.test.js`                                |
| **Denial of Service**    | TH-D1, TH-D3      | Fastify rate limiting + Stream-based SHA-256      | `test/unit/baselineService.test.js`                              |
| **Privilege Escalation** | TH-E1             | Postgres Row Level Security (`deny_all` policies) | `db/migrations/001_init.sql`                                     |

---

## 6. Residual Risk Assessment & Recommendations

1. **Host-Level Compromise**: If an attacker gains root access to the Node.js server itself, session signing keys and database service keys could be compromised.  
   _Recommendation for Phase 2:_ Transition Ed25519 signing keys and AES master keys to a Hardware Security Module (HSM) or AWS KMS.
2. **Detection Latency Window**: Detection occurs within the 60-second sliding window. Sophisticated "low-and-slow" ransomware encrypting 1 file every 10 minutes could stay below the 10% rate.  
   _Mitigation:_ Canary files placed in strategic root and folder positions detect slow traversals immediately.
