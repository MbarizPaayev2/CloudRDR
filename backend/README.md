# CloudRDR Backend (Legacy Node.js Reference)

> **Qeyd**: CloudRDR platformasının əsas və aktiv istehsalat backend mühərriki **Python Flask** arxitekturasına keçirilmişdir və [`backend_py/`](../backend_py/) qovluğunda yerləşir. Bu qovluq (`backend/`) əvvəlki Node.js Fastify implementasiyasını arxitektura arxivi və müqayisəli benchmark kimi saxlayır.

---

## 1. Qovluq Quruluşu (Node.js Reference)

```
backend/
├── db/                      # Verilənlər bazası sxemləri və miqrasiyalar
│   └── init.sql             # PostgreSQL / Supabase ilkin cədvəl sxemi
│
└── src/                     # Node.js backend mənbə kodu
    ├── adapters/            # Kənar xidmət adapterləri (Cloud, Storage, DB)
    ├── api/                 # Fastify HTTP serveri və marşrutlar
    ├── auth/                # İcazələndirmə və sessiya idarəetməsi
    ├── backup/              # AES-256-GCM authenticated şifrələmə
    ├── baseline/            # SHA-256 axın həşlənməsi və Merkle DAG
    ├── crypto/              # Ed25519 rəqəmsal imzalar və kanonik JSON
    ├── detection/           # Ransomware aşkarlama mühərriki
    ├── log/                 # Dəyişdirilməz hash-chained audit jurnalı
    ├── response/            # Avtomatlaşdırılmış IAM/OS containment
    └── restore/             # Karantin əsaslı AEAD bərpa xidməti
```

---

## 2. İşə Salma Qaydaları

* **Aktiv Python Flask Serveri (Tövsiyə olunan):**
  ```bash
  python app.py
  # və ya
  npm start
  ```

* **Legacy Node.js Serveri:**
  ```bash
  npm run start:node
  # və ya
  node backend/src/api/server.js
  ```
