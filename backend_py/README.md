# CloudRDR Enterprise Python Flask Backend

Bu qovluq CloudRDR platformasının əsas **Python Flask** backend mühərrikini, aşkarlama sistemini, kriptoqrafik xidmətlərini, dəyişdirilməz audit jurnalını və REST API interfeyslərini saxlayır.

---

## 1. Arxitektura və Qovluq Quruluşu

```
backend_py/
├── app.py                   # Əsas Flask tətbiqi, CORS, autentifikasiya və Blueprint qeydiyyatı
├── config.py                # Mühit konfiqurasiyası və parametrlər (.env inteqrasiyası)
├── crypto_utils.py          # SHA-256, Merkle Tree DAG, RFC 8032 Ed25519 və Shannon entropiyası
├── audit_log.py             # Dəyişdirilməz hash-chained audit jurnalı və zəncir bütövlüyü yoxlayıcısı
├── database.py              # Thread-safe yaddaşdaxili verilənlər bazası və data/db-storage.json sinxronizasiyası
├── requirements.txt         # Minimal asılılıqlar (Flask, flask-cors, cryptography, python-dotenv)
└── routes/                  # Modulyar REST API Blueprint-ləri
    ├── health_routes.py     # /health, /api/health
    ├── auth_routes.py       # /api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout
    ├── telemetry_routes.py  # /status/system, /metrics/kpis, /telemetry/activity, /evidence/verify, /audit, /events/recent
    ├── detection_routes.py  # /detection/summary, /detection/runs, /detection/config
    ├── baseline_routes.py   # /baseline/<bucket>, POST /baseline
    ├── incident_routes.py   # /incidents, /incidents/<id>, /contain, /status, /timeline, /restore, /promote
    ├── restore_routes.py    # /restore/<job_id>
    ├── agent_routes.py      # /api/agent/status, /api/agent/ping, /api/agent/restart, /api/agent/register
    ├── simulation_routes.py # /api/simulate/attack, /api/simulate/canary, /api/simulate/reset, /api/simulate/tamper
    ├── compliance_routes.py # /api/compliance/summary, /api/compliance/frameworks (JSON:API v1.1)
    └── static_routes.py     # Frontend SPA dashboard və sayt fayllarının (/dashboard, /site, /css, /js) çatdırılması
```

---

## 2. Əsas Xüsusiyyətlər

1. **RFC 8032 Ed25519 Kriptoqrafik İmza**:
   * Asimmetrik açar cütü generasiyası (`cryptography` kitabxanası ilə).
   * Deterministik kanonik JSON (`canonical_json`) sıralaması ilə insident manifestlərinin rəqəmsal imzalanması və yoxlanılması.

2. **Dəyişdirilməz Həş Zənciri (Hash-Chained Audit Ledger)**:
   * Hər bir hadisə əvvəlki blokun həşinə bağlanır:
     $$\text{hash} = \text{SHA-256}(\text{index} \parallel \text{prevHash} \parallel \text{timestamp} \parallel \text{canonicalJson}(\text{data}))$$
   * `default_audit_log.verify_audit_chain()` ilə 100% zəncir bütövlüyü təmin edilir.

3. **Merkle Ağacı Beyzlaynı**:
   * Qorunan faylların SHA-256 həşlərindən ibarət ikili Merkle DAG kökünün O(1) hesablanması.

4. **Avtomatlaşdırılmış Ransomware Aşkarlama və Təcrid**:
   * Shannon entropiyası ($H(X) > 7.2$) və kütləvi fayl modifikasiya sürəti (>30%).
   * Kanareyka (canary trap sentinel) toxunulduqda dərhal avtomatlaşdırılmış təcrid.

---

## 3. İşə Salma Qaydaları

### A. Tətbiqi Başlatmaq:
```bash
# Birbaşa Python ilə:
python app.py

# Və ya layihə kökündən npm vasitəsilə:
npm start
```
Server standart olaraq `http://localhost:3000` ünvanında dinləyir.

### B. Testləri İcra Etmək:
```bash
python test_flask_backend.py
```
12 vahid və inteqrasiya testinin hamısı 0.3 saniyə ərzində uğurla keçir.
