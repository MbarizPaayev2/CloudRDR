# CloudRDR Backend Architecture

Bu qovluq CloudRDR platformasının əsas backend məntiqini, aşkarlama mühərrikini, kriptoqrafik xidmətlərini, bərpa sistemini və verilənlər bazası sxemlərini saxlayır.

## Qovluq Quruluşu

```
backend/
├── db/                      # Verilənlər bazası sxemləri və miqrasiyalar
│   └── init.sql             # PostgreSQL / Supabase ilkin cədvəl sxemi
│
└── src/                     # Backend mənbə kodu
    ├── adapters/            # Kənar xidmət adapterləri (Cloud, Storage, DB)
    │   ├── cloud/           # AWS IAM və KMS inteqrasiyası
    │   ├── db/              # PostgreSQL və Supabase müştərisi
    │   └── storage/         # S3 və lokal fayl sistemi yaddaşı
    │
    ├── alerting/            # Təhlükəsizlik bildirişləri və webhook xidmətləri
    ├── api/                 # Fastify HTTP serveri və marşrutlar
    │   ├── routes/          # REST API marşrutları (agent, auth, baseline, dashboard, detection, incidents, restore, simulation, telemetry)
    │   └── server.js        # Serverin konfiqurasiyası və qeydiyyatı
    │
    ├── auth/                # İcazələndirmə və sessiya idarəetməsi
    ├── backup/              # AES-256-GCM authenticated şifrələmə və ehtiyat nüsxə
    ├── baseline/            # SHA-256 axın həşlənməsi və Merkle DAG beyzlayn xidməti
    ├── config/              # Konfiqurasiya yükləyicisi və mühit dəyişənləri
    ├── contracts/           # Daxili xidmət interfeysləri və müqavilələr
    ├── crypto/              # Ed25519 rəqəmsal imzalar, Merkle ağacı və kanonik JSON
    ├── detection/           # Ransomware aşkarlama mühərriki, evristikalar və kanareyka
    ├── log/                 # Dəyişdirilməz hash-chained audit jurnalı və yoxlayıcı
    ├── response/            # Avtomatlaşdırılmış IAM/OS containment (freeze/unfreeze)
    ├── restore/             # Karantin əsaslı AEAD bərpa xidməti və təsdiq
    └── utils/               # Loqqer və köməkçi funksiyalar
```

## İşə Salma Qaydaları

1. **İstehsalat və ya inkişaf serveri:**
   ```bash
   node backend/src/api/server.js
   ```

2. **Dəyişikliklərin izlənilməsi ilə (Watch rejimi):**
   ```bash
   node --watch backend/src/api/server.js
   ```
