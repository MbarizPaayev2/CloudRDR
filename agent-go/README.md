# CloudRDR Enterprise Go Agent

Yüksək performanslı, yüngül (ultra-lightweight, <20MB RAM) və Wazuh arxitekturası əsasında qurulmuş **CloudRDR Go Agent**. 

Bulud mühitlərində (AWS EC2, Google Cloud Compute, Azure VMs, Kubernetes DaemonSet və ya on-premise serverlər) real-vaxtda fayl bütövlüyünü (FIM), şifrələnmə anomaliyalarını (Shannon Entropy) və tələ (canary) faylları izləyərək CloudRDR Manager-ə telemetriya ötürür.

---

## Əsas Xüsusiyyətlər (Core Features)

1. **Wazuh-style Enrollment & Heartbeat**:
   - Manager serverinə avtomatik qeydiyyat (`POST /api/agent/register`).
   - Hər 10 saniyədən bir sağlamlıq siqnalı və performans telemetriyası (`POST /api/agent/heartbeat`).
2. **Shannon Entropy Analizi**:
   - Dəyişdirilən faylların entropiyasını riyazi olaraq hesablayır ($H(X) > 7.2$). Ransomware tərəfindən şifrələnmiş fayllar dərhal aşkar edilir.
3. **Canary Trap Sentinel**:
   - Tələ fayllara toxunulduqda dərhal kritik siqnal generasiya edir.
4. **Offline Resilience (Disk Spooling)**:
   - Şəbəkə kəsildikdə hadisələr yerli diskdə (`/opt/cloudrdr/spool`) növbəyə alınır və əlaqə bərpa olunduqda ardıcıllıqla Manager-ə çatdırılır.
5. **Active Response (Write-Freeze)**:
   - Manager ransomware təhlükəsi təsdiqlədikdə Agent dərhal `FREEZE` əmrini qəbul edir və qorunma tədbirlərini aktivləşdirir.

---

## Konfiqurasiya (Environment Variables)

| Dəyişən | Susmaya görə | Təsvir |
| :--- | :--- | :--- |
| `CLOUDRDR_MANAGER_URL` | `http://localhost:3000` | CloudRDR Manager API ünvanı |
| `CLOUDRDR_AGENT_KEY` | `<YOUR_AGENT_API_KEY>` | Agent autentifikasiya açarı |
| `CLOUDRDR_WATCH_DIR` | `./data/protected` | İzlənən qovluq yolu |
| `CLOUDRDR_BUCKET` | `protected` | Qorunan bulud bucket adı |
| `CLOUDRDR_ACCOUNT_ID` | `default-account` | Hesab identifikatoru |
| `CLOUDRDR_ENTROPY_THRESHOLD` | `7.2` | Ransomware şifrələmə həddi (0.0 - 8.0) |
| `CLOUDRDR_HEARTBEAT_SEC` | `10` | Heartbeat göndərmə intervalı (saniyə) |
| `CLOUDRDR_POLL_INTERVAL_SEC` | `3` | Fayl sistemi yoxlama tezliyi (saniyə) |
| `CLOUDRDR_SPOOL_DIR` | `./data/spool` | Oflayn keş qovluğu |

---

## Kompilyasiya və İcra (Build & Run)

### 1. Yerli Kompilyasiya
```bash
cd agent-go
go build -ldflags="-s -w" -o cloudrdr-agent .
./cloudrdr-agent -manager="http://your-manager-ip:3000" -watch="/var/www/html"
```

### 2. Linux Serverlər üçün Cross-Compile (Windows/Mac üzərindən)
```bash
# Makefile ilə:
make build-linux

# və ya birbaşa Go ilə:
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/cloudrdr-agent-linux-amd64 .
```

### 3. Docker ilə Çalışdırmaq (< 15MB İmic)
```bash
docker build -t cloudrdr-agent:latest .
docker run -d \
  --name cloudrdr-agent \
  -e CLOUDRDR_MANAGER_URL="http://manager-host:3000" \
  -v /var/data:/data/protected:ro \
  cloudrdr-agent:latest
```

---

## Linux `systemd` Servisi Kimi Quraşdırmaq

`/etc/systemd/system/cloudrdr-agent.service`:

```ini
[Unit]
Description=CloudRDR Security & Ransomware Detection Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/cloudrdr
ExecStart=/usr/local/bin/cloudrdr-agent -manager="http://10.0.0.5:3000" -watch="/var/data"
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Aktivləşdirmək üçün:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudrdr-agent
sudo systemctl status cloudrdr-agent
```
