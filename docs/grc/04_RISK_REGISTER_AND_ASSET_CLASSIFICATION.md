# CloudRDR — Risk Register v1 & Asset Classification

**Project:** Cloud Ransomware Detection & Recovery (CloudRDR)  
**Academic Course:** Information Security, Year 3  
**Lead Author / Role:** Mübariz Paşayev (Project Manager & GRC Specialist)  
**Version:** 1.0.0  
**Effective Date:** Autumn 2026

---

## 1. Asset Classification Framework

Assets within the CloudRDR operational ecosystem are classified according to a 4-tier sensitivity hierarchy to ensure appropriate protection controls, encryption tiers, and access limitations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DATA CLASSIFICATION TIERS                         │
├───────────────┬────────────────────────────────────────────────────────┤
│ TIER          │ DEFINITION & HANDLING REQUIREMENTS                     │
├───────────────┼────────────────────────────────────────────────────────┤
│ RESTRICTED    │ Highest sensitivity. Cryptographic keys, secrets, and  │
│ (Level 4)     │ master service credentials. Never logged; encrypted in │
│               │ transit and at rest with hardware or AEAD isolation.   │
├───────────────┼────────────────────────────────────────────────────────┤
│ CONFIDENTIAL  │ Core business & protected data. Corporate documents,   │
│ (Level 3)     │ employee records, database rows, signed incident JSON. │
│               │ Accessible only via authenticated role-based channels. │
├───────────────┼────────────────────────────────────────────────────────┤
│ INTERNAL      │ Non-sensitive operational data. Normal telemetry runs, │
│ (Level 2)     │ change event timestamps, system performance logs.      │
├───────────────┼────────────────────────────────────────────────────────┤
│ PUBLIC        │ Freely accessible data. `/health` API endpoint, public │
│ (Level 1)     │ documentation, open research whitepaper.               │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Asset Inventory & Criticality Assessment

| Asset ID   | Asset Name                    | Description                                                                          | Asset Custodian |  Data Tier   | Confidentiality (1–5) | Integrity (1–5) | Availability (1–5) | Overall Criticality |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------ | --------------- | :----------: | :-------------------: | :-------------: | :----------------: | :-----------------: |
| **AST-01** | **Protected Storage Objects** | Enterprise documents and production data stored in cloud buckets.                    | DevOps (Rauf)   | CONFIDENTIAL |           4           |        5        |         5          |    **Critical**     |
| **AST-02** | **Canary Sentinel Files**     | Decoy files placed in storage as tripwires against unauthorized modifications.       | Backend (Elnur) |   INTERNAL   |           2           |        5        |         5          |      **High**       |
| **AST-03** | **Ed25519 Signing Keys**      | Private key used to digitally sign incident records.                                 | Crypto (Nigar)  |  RESTRICTED  |           5           |        5        |         4          |    **Critical**     |
| **AST-04** | **AES-256 Backup Master Key** | Symmetric key used to encrypt and decrypt protected file backups with AEAD.          | Crypto (Nigar)  |  RESTRICTED  |           5           |        5        |         5          |    **Critical**     |
| **AST-05** | **Postgres DB (Supabase)**    | Relational database containing baselines, detection telemetry, and incident records. | Backend (Elnur) | CONFIDENTIAL |           4           |        5        |         5          |    **Critical**     |
| **AST-06** | **Merkle Tree Roots**         | Cryptographic roots proving integrity of baseline catalog snapshots.                 | Crypto (Nigar)  | CONFIDENTIAL |           3           |        5        |         4          |      **High**       |
| **AST-07** | **Audit Log Ledger**          | Append-only SHA-256 hash-chained log preserving chronological system events.         | Crypto (Nigar)  | CONFIDENTIAL |           3           |        5        |         4          |      **High**       |
| **AST-08** | **Management REST API**       | Fastify server orchestrating baseline creation, detection monitoring, and restore.   | Backend (Elnur) |   INTERNAL   |           3           |        4        |         5          |      **High**       |

---

## 3. Risk Assessment Methodology

Risks are assessed using a standard $5 \times 5$ qualitative risk matrix combining **Likelihood** ($1 = \text{Rare}$ to $5 = \text{Almost Certain}$) and **Impact** ($1 = \text{Insignificant}$ to $5 = \text{Catastrophic}$).

$$\text{Risk Score} = \text{Likelihood} \times \text{Impact}$$

```
┌────────────────────────────────────────────────────────────────────────┐
│                        5 x 5 RISK MATRIX GUIDE                         │
├─────────────┬─────────────┬─────────────┬──────────────┬───────────────┤
│ 1–4: LOW    │ 5–9: MEDIUM │ 10–14: HIGH │ 15–25: CRITICAL               │
│ Acceptable  │ Monitor &   │ Implement   │ Immediate Mitigation &        │
│ with review │ manage      │ controls    │ Executive Escalation          │
└─────────────┴─────────────┴─────────────┴───────────────────────────────┘
```

---

## 4. Risk Register v1

| Risk ID    | Threat Description                                                                                                   | Affected Asset | Pre-Likelihood (1–5) | Pre-Impact (1–5) | Pre-Score (1–25) | CloudRDR Countermeasure / Control                                                                                                         | Post-Likelihood (1–5) | Post-Impact (1–5) | Post-Score (1–25) | Risk Level | Owner      |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | -------------- | :------------------: | :--------------: | :--------------: | ----------------------------------------------------------------------------------------------------------------------------------------- | :-------------------: | :---------------: | :---------------: | :--------: | ---------- |
| **RSK-01** | **Mass Ransomware Encryption**: Threat actor executes rapid mass modification on object storage bucket.              | AST-01         |          4           |        5         |      **20**      | Sliding window rate detection ($\ge 30\%$) triggers automated IAM write-freeze; recovery via verified restore.                            |           2           |         2         |       **4**       |    LOW     | Elnur H.   |
| **RSK-02** | **Canary Tampering**: Attacker touches or deletes canary sentinel file during directory traversal.                   | AST-02         |          4           |        4         |      **16**      | Any modification or deletion of a canary instantly triggers a `ransomware` verdict and freezes the account.                               |           1           |         2         |       **2**       |    LOW     | Elnur H.   |
| **RSK-03** | **Backup Corruption / Tampering**: Attacker alters encrypted backup files on disk to prevent successful restoration. | AST-01, AST-04 |          3           |        5         |      **15**      | Backups use AES-256-GCM authenticated encryption. AEAD authentication tag check failure marks file as `MODIFIED` and prevents write-back. |           1           |         3         |       **3**       |    LOW     | Nigar Ə.   |
| **RSK-04** | **Audit Log Modification**: Threat actor attempts to scrub incident history from the audit log.                      | AST-07         |          3           |        4         |      **12**      | Immutable SHA-256 hash-chaining; `verifyAuditChain()` detects any altered block index or corrupted link.                                  |           1           |         2         |       **2**       |    LOW     | Nigar Ə.   |
| **RSK-05** | **Signing Key Compromise**: Exposure of private Ed25519 signing key allows forging of incident records.              | AST-03         |          2           |        5         |      **10**      | Key isolation; server-side storage only; signing uses canonical RFC 8785 JSON; key ID binding.                                            |           1           |         3         |       **3**       |    LOW     | Nigar Ə.   |
| **RSK-06** | **Database Direct Injection**: Unauthorized user tries to alter baseline hashes directly in Postgres.                | AST-05, AST-06 |          3           |        4         |      **12**      | Row Level Security (RLS) active on all 7 tables with `deny_all` policies. Only backend service-role key can access.                       |           1           |         2         |       **2**       |    LOW     | Elnur H.   |
| **RSK-07** | **Management API Flooding (DoS)**: Attacker floods the API to disrupt monitoring and recovery operations.            | AST-08         |          4           |        3         |      **12**      | Built-in `@fastify/rate-limit` (100 req/min); mandatory API Key authentication; async event handling.                                     |           2           |         2         |       **4**       |    LOW     | Elnur H.   |
| **RSK-08** | **False Positive on Bulk Job**: Legitimate high-volume backup job triggers false ransomware freeze.                  | AST-01, AST-08 |          4           |        3         |      **12**      | Configurable `ALLOWLISTED_ACCOUNTS` exempts legitimate enterprise migration service accounts; exemptions logged.                          |           2           |         2         |       **4**       |    LOW     | Mübariz P. |
| **RSK-09** | **Secret Leaks in System Logs**: Sensitive keys or file contents printed to standard logging output.                 | AST-03, AST-04 |          3           |        4         |      **12**      | Pino automated redaction replaces sensitive keys (`*.serviceKey`, `*.apiKey`) with `[REDACTED]`.                                          |           1           |         2         |       **2**       |    LOW     | Elnur H.   |
| **RSK-10** | **Failure of Freeze API**: External cloud IAM freeze call fails due to cloud provider outage or network error.       | AST-01         |          3           |        4         |      **12**      | `freezeWithRetry()` executes up to 3 attempts with exponential backoff; escalates to `freeze_failed` for operator alerting.               |           1           |         3         |       **3**       |    LOW     | Rauf Q.    |

---

## 5. Risk Treatment & Monitoring Summary

All 10 primary operational risks have been reduced from High/Critical (scores $10 \dots 20$) down to acceptable **LOW** residual risk levels (scores $2 \dots 4$) via CloudRDR's automated defense controls.

The Risk Register is a living document reviewed bi-weekly by the Project Manager (Mübariz Paşayev) and updated following every simulated attack drill.
