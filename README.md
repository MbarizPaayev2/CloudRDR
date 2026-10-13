# CloudRDR — Cloud Ransomware Detection & Recovery

> University project — Information Security, Year 3  
> Backend implementation: Node.js 18+, Fastify, Supabase Postgres, pino

---

## Quick start (under 10 minutes)

### 1. Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### 2. Install
```bash
git clone <repo-url> cloudrdr
cd cloudrdr
npm install
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env — set API_KEY at minimum; everything else has sane defaults for local dev
```

### 4. Run (local storage, no Supabase needed)
```bash
npm run seed       # create a baseline over ./data/local-storage
npm run dev        # start API on http://localhost:3000
npm run monitor    # start polling agent (separate terminal)
```

### 5. Full simulated attack cycle
```bash
npm run simulate   # seeds files, modifies 40%, triggers detection → freeze → restore
```

### 6. Tests
```bash
npm test           # unit + integration
npm run lint       # ESLint
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `SUPABASE_URL` | — | Supabase project URL (required if `STORAGE_PROVIDER=supabase`) |
| `SUPABASE_SERVICE_KEY` | — | Service-role key (server-side only) |
| `STORAGE_PROVIDER` | `local` | `supabase` or `local` |
| `STORAGE_BUCKET` | `protected` | Bucket/folder name |
| `LOCAL_STORAGE_PATH` | `./data/local-storage` | Root path for local adapter |
| `MONITOR_INTERVAL_SECONDS` | `10` | Polling interval |
| `WINDOW_SECONDS` | `60` | Sliding detection window |
| `SUSPICIOUS_RATE` | `0.10` | Change-rate threshold for suspicious verdict |
| `RANSOMWARE_RATE` | `0.30` | Change-rate threshold for ransomware verdict |
| `ALLOWLISTED_ACCOUNTS` | — | Comma-separated account IDs exempt from bulk alerts |
| `API_KEY` | **required** | Shared secret for API authentication |
| `DASHBOARD_ORIGIN` | `http://localhost:3001` | CORS allowed origin |
| `PORT` | `3000` | HTTP server port |
| `LOG_LEVEL` | `info` | pino level |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     CloudRDR Backend                      │
│                                                           │
│  ┌──────────┐   events   ┌───────────────┐               │
│  │  Monitor │──────────▶ │   Detection   │               │
│  │  Agent   │            │    Engine     │               │
│  └──────────┘            └───────┬───────┘               │
│       │                          │ ransomware verdict     │
│       │ poll              ┌──────▼──────────┐            │
│       ▼                   │    Response     │            │
│  ┌──────────┐             │    Service      │            │
│  │ Storage  │             │  (freeze + log) │            │
│  │ Adapter  │             └──────┬──────────┘            │
│  └──────────┘                    │                       │
│       │                   ┌──────▼──────────┐            │
│  ┌──────────┐             │     Restore     │            │
│  │ Baseline │             │     Service     │            │
│  │ Service  │             └─────────────────┘            │
│  └──────────┘                                            │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │               HTTP API (Fastify)                  │   │
│  │  /health  /baseline  /detection  /incidents       │   │
│  │  /incidents/:id/restore  /restore/:jobId          │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
         │                    │
   ┌─────▼──────┐    ┌────────▼────────┐
   │  Supabase  │    │  Crypto Module  │
   │  Postgres  │    │  (Ed25519, AES) │
   │  Storage   │    │  (Crypto dev)   │
   └────────────┘    └─────────────────┘
```

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Liveness check |
| POST | `/baseline` | API key | Start baseline creation |
| GET | `/baseline/:bucket` | API key | Current snapshot + Merkle root |
| GET | `/detection/runs` | API key | Recent detection runs |
| GET | `/incidents` | API key | List all incidents |
| GET | `/incidents/:id` | API key | Single incident |
| POST | `/incidents/:id/restore` | API key | Start verified restore |
| GET | `/restore/:jobId` | API key | Restore job status + file results |

---

## Team interfaces

- **Crypto dev** → implement `src/contracts/crypto.contract.js`
- **DevOps** → implement `src/contracts/freeze.contract.js`; provision Supabase + bucket + IAM
- **Frontend** → consume the HTTP API above
- **QA** → use `npm run simulate` as an attack harness
