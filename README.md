# CloudRDR — Cloud Ransomware Detection & Recovery

> University Project — Information Security, Year 3  
> Backend implementation: Node.js 18+, Fastify, Supabase Postgres, pino

CloudRDR watches a cloud object storage bucket, computes a SHA-256 cryptographic baseline of every protected file, detects ransomware-like mass modification using a change-rate threshold plus canary sentinel files, freezes the affected account, writes a signed incident record, and restores files from encrypted backups while proving the restored files match the baseline (`VALID` / `MODIFIED` / `MISSING`).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CloudRDR Backend                              │
│                                                                        │
│  ┌──────────┐    change events    ┌───────────────┐                    │
│  │  Monitor │───────────────────▶ │   Detection   │                    │
│  │  Agent   │                     │    Engine     │                    │
│  └────┬─────┘                     └───────┬───────┘                    │
│       │                                   │ ransomware verdict         │
│       │ poll changes                      ▼                            │
│       ▼                           ┌───────────────┐                    │
│  ┌──────────┐                     │   Response    │──▶ Freeze IAM      │
│  │ Storage  │                     │    Service    │──▶ Sign Record     │
│  │ Adapter  │                     └───────┬───────┘──▶ Hash Audit Log  │
│  └────┬─────┘                             │                            │
│       │                                   ▼                            │
│       ▼                           ┌───────────────┐                    │
│  ┌──────────┐                     │   Verified    │◀── Encrypted Backup│
│  │ Baseline │                     │    Restore    │──▶ Verify AEAD/Hash│
│  │ Service  │                     └───────────────┘──▶ Write VALID only│
│  └──────────┘                                                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       HTTP API (Fastify)                         │  │
│  │   /health   /baseline   /detection/runs   /incidents   /restore  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
          │                                        │
    ┌─────▼──────┐                           ┌─────▼──────┐
    │  Supabase  │                           │   Crypto   │
    │  Postgres  │                           │   Module   │
    │  Storage   │                           │ (Dev team) │
    └────────────┘                           └────────────┘
```

---

## Quick Start (under 10 minutes)

### 1. Prerequisites

- **Node.js**: ≥ 18.0.0
- **npm**: ≥ 9.0.0

### 2. Installation

```bash
git clone <repo-url> cloudrdr
cd cloudrdr
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
# Defaults are pre-configured for instant zero-dependency local dev
```

### 4. Run Locally (Zero Cloud Configuration Needed)

```bash
# Seed protected files and compute initial SHA-256 baseline
npm run seed

# Run the full end-to-end ransomware attack simulation
npm run simulate

# Start the Fastify API server & SOC Web Dashboard (open http://localhost:3000/dashboard)
npm run dev

# Start the background monitoring agent
npm run monitor

# Run threshold sweep experiment (generates docs/qa/01_THRESHOLD_SWEEP_EXPERIMENT.md)
npm run sweep

# Run formal benchmark metrics harness M1-M9 (generates docs/qa/02_BENCHMARK_METRICS_REPORT.md)
npm run metrics
```

### 5. Run Test Suite

```bash
# Run all 46 unit & integration tests across 14 test suites
npm test

# Run ESLint and Prettier
npm run lint
npm run format:check
```

---

## Environment Variables

| Variable                   | Default                 | Description                                                   |
| -------------------------- | ----------------------- | ------------------------------------------------------------- |
| `STORAGE_PROVIDER`         | `local`                 | `local` (filesystem fallback) or `supabase` (cloud storage)   |
| `STORAGE_BUCKET`           | `protected`             | Bucket name                                                   |
| `LOCAL_STORAGE_PATH`       | `./data/local-storage`  | Root path for local storage adapter                           |
| `SUPABASE_URL`             | —                       | Supabase URL (required when `STORAGE_PROVIDER=supabase`)      |
| `SUPABASE_SERVICE_KEY`     | —                       | Service role key (server-side only, bypasses RLS)             |
| `MONITOR_INTERVAL_SECONDS` | `10`                    | Frequency of storage polling in seconds                       |
| `WINDOW_SECONDS`           | `60`                    | Detection sliding window duration                             |
| `SUSPICIOUS_RATE`          | `0.10`                  | 10% change rate triggers suspicious alert                     |
| `RANSOMWARE_RATE`          | `0.30`                  | 30% change rate triggers immediate ransomware response        |
| `ALLOWLISTED_ACCOUNTS`     | —                       | Comma-separated cloud accounts exempt from bulk triggers      |
| `API_KEY`                  | `dev-secret-key-12345`  | API Key required on all endpoints (except `/health`)          |
| `DASHBOARD_ORIGIN`         | `http://localhost:3001` | Origin allowed by CORS                                        |
| `PORT`                     | `3000`                  | HTTP port                                                     |
| `LOG_LEVEL`                | `info`                  | Logging verbosity (`trace`, `debug`, `info`, `warn`, `error`) |

---

## Database Migration (`db/migrations/001_init.sql`)

When deploying to Supabase Postgres, execute `db/migrations/001_init.sql` in the Supabase SQL editor or via `supabase db push`.

### Tables Created:

1. `protected_files` — Baseline file catalog with versioning and canary flags (`UNIQUE (bucket, path, baseline_version)`).
2. `baseline_snapshots` — Merkle root snapshots per baseline execution.
3. `change_events` — Sliding window event stream indexed on `(observed_at DESC, account_id)`.
4. `detection_runs` — Telemetry for all evaluations (including normal verdicts for threshold analysis).
5. `incidents` — Lifecycle tracking (`open` ➔ `frozen` ➔ `restoring` ➔ `resolved` / `freeze_failed`).
6. `restore_jobs` — Multi-file restore job execution status.
7. `restore_results` — Granular per-file verification outcomes (`VALID`, `MODIFIED`, `MISSING`).

> **Security Note:** Row Level Security (RLS) is enabled with `deny_all` policies on all tables. Only the service role key can access database tables.

---

## HTTP REST API

All endpoints return JSON and require `x-api-key: <API_KEY>` or `Authorization: Bearer <API_KEY>`, except `/health`.

Errors follow a consistent structure:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Field 'bucket' is required"
  }
}
```

| Method | Endpoint                   | Auth    | Description                                                             |
| ------ | -------------------------- | ------- | ----------------------------------------------------------------------- |
| `GET`  | `/`                        | None    | Web Dashboard (Security SOC GUI)                                        |
| `GET`  | `/dashboard`               | None    | Web Dashboard (Security SOC GUI)                                        |
| `GET`  | `/health`                  | None    | Service liveness and uptime check                                       |
| `POST` | `/baseline`                | API Key | Initiate baseline creation (Body: `{ "bucket": "protected" }`)          |
| `GET`  | `/baseline/:bucket`        | API Key | Retrieve latest snapshot, Merkle root, and files                        |
| `GET`  | `/detection/runs?limit=50` | API Key | Query historical detection runs and verdicts                            |
| `GET`  | `/incidents`               | API Key | List incidents (optional query params: `?status=frozen&accountId=acc1`) |
| `GET`  | `/incidents/:id`           | API Key | Get detailed incident record and digital signature                      |
| `POST` | `/incidents/:id/restore`   | API Key | Trigger verified restore pipeline for incident                          |
| `GET`  | `/restore/:jobId`          | API Key | Inspect restore job progress and per-file validation states             |

---

## Cryptography & Integrity Modules (`src/crypto/`, `src/log/`, `src/backup/`)

The cryptographic layer is implemented with high security standards:

### 1. RFC 8032 Ed25519 Signatures (`src/crypto/ed25519.js`)

- `generateEd25519KeyPair()`: Produces PKCS#8 / SPKI DER keys with deterministic `keyId`.
- `signRecordEd25519(record)`: Serializes object using deterministic recursive canonical JSON (RFC 8785) before Ed25519 signing.
- `verifyRecordEd25519(record, signature)`: Validates signature using constant-time comparison to eliminate timing side-channels.

### 2. Hash-Chained Audit Ledger & Chain Verifier (`src/log/`)

- `AuditLog` (`src/log/auditLog.js`): Genesis block starts with `prevHash = 00...00`. Each block links cryptographically: `hash = SHA256(index : prevHash : timestamp : canonicalJson(data))`. Supports append-only persistence to `data/audit-log/audit.jsonl`.
- `verifyAuditChain(entries)` (`src/log/chainVerifier.js`): Walks the chain from genesis to head, validates every link and recomputes hashes. Detects any tampered block or broken link (QA Tampering test M7).

### 3. AES-256-GCM Authenticated Encryption (`src/backup/backupService.js`)

- Encrypts protected backup files using `aes-256-gcm` with random 96-bit IV and 128-bit authentication tag.
- Binds `bucket : path : versionRef` as Additional Authenticated Data (AAD).
- Any corrupted ciphertext byte, modified tag, or mismatched metadata causes AEAD verification to immediately fail (`aeadVerified: false`) and suppresses plaintext output.

---

## Teammate Contract Interfaces

To allow concurrent development across teammates, contracts are defined under `src/contracts/`:

### 1. Crypto Modules (`src/contracts/crypto.contract.js`)

- Exports production SHA-256 streaming, Merkle tree root, Ed25519 signing, and hash-chained audit logging.

### 2. Backup Service (`src/contracts/backup.contract.js`)

- Exports production AES-256-GCM authenticated encryption and decryption with AEAD tag validation.

### 3. DevOps Engineer (`src/contracts/freeze.contract.js`)

- `freezeAccount(accountId)` ➔ Applies IAM deny-all write policy to cloud account/bucket.
- `unfreezeAccount(accountId)` ➔ Restores normal IAM permissions.

### 4. QA Engineer

- Run `npm run simulate` to test ransomware behavior, canary triggers, and recovery verification.
- Run `npm test` to execute all 45 unit and integration tests across 14 test suites.
