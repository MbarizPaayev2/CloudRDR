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

# Start the Fastify API server
npm run dev

# Start the background monitoring agent
npm run monitor
```

### 5. Run Test Suite

```bash
# Run unit & integration tests
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

### Endpoints:

| Method | Endpoint                   | Auth    | Description                                                             |
| ------ | -------------------------- | ------- | ----------------------------------------------------------------------- |
| `GET`  | `/health`                  | None    | Service liveness and uptime check                                       |
| `POST` | `/baseline`                | API Key | Initiate baseline creation (Body: `{ "bucket": "protected" }`)          |
| `GET`  | `/baseline/:bucket`        | API Key | Retrieve latest snapshot, Merkle root, and files                        |
| `GET`  | `/detection/runs?limit=50` | API Key | Query historical detection runs and verdicts                            |
| `GET`  | `/incidents`               | API Key | List incidents (optional query params: `?status=frozen&accountId=acc1`) |
| `GET`  | `/incidents/:id`           | API Key | Get detailed incident record and digital signature                      |
| `POST` | `/incidents/:id/restore`   | API Key | Trigger verified restore pipeline for incident                          |
| `GET`  | `/restore/:jobId`          | API Key | Inspect restore job progress and per-file validation states             |

---

## Teammate Contract Interfaces

To allow concurrent development across teammates, contracts with functioning stubs are defined under `src/contracts/`. Swapping a stub for a production implementation requires changing **one import line only**:

### 1. Crypto Developer (`src/contracts/crypto.contract.js`)

- `hashStream(stream)` ➔ Returns SHA-256 lowercase hex string via streaming.
- `merkleRoot(hashes[])` ➔ Pairwise SHA-256 Merkle tree calculation.
- `signRecord(record)` ➔ Signs incident payload using Ed25519 (returns `{ signature, keyId }`).
- `verifyRecord(record, signature)` ➔ Validates signature.
- `appendAuditLog(entry)` ➔ Appends entry to tamper-evident hash-chained audit log.

### 2. Backup Developer (`src/contracts/backup.contract.js`)

- `restoreFile(bucket, path, versionRef)` ➔ Decrypts AES-256-GCM backup, validates AEAD tag, returns `{ bytes, aeadVerified }`.

### 3. DevOps Engineer (`src/contracts/freeze.contract.js`)

- `freezeAccount(accountId)` ➔ Applies IAM deny-all write policy to cloud account/bucket.
- `unfreezeAccount(accountId)` ➔ Restores normal IAM permissions.

### 4. QA Engineer

- Run `npm run simulate` to test ransomware behavior, canary triggers, and recovery verification.
