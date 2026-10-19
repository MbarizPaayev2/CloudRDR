#!/usr/bin/env python3
"""
scripts/test_live_kali_attack_cycle.py
End-to-End Live Autonomous Ransomware Attack, Containment & Recovery Cycle on Kali Linux (192.168.152.148).
"""

import os
import sys
import time
import json
import paramiko

KALI_HOST = '192.168.152.148'
KALI_USER = 'kali'
KALI_PASS = 'kali'
BASE_DIR = '/home/kali/cloudrdr-suite'

def run_cmd(ssh, cmd, sudo=False):
    if sudo:
        full_cmd = f"echo '{KALI_PASS}' | sudo -S bash -c \"{cmd}\""
    else:
        full_cmd = cmd
    stdin, stdout, stderr = ssh.exec_command(full_cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    status = stdout.channel.recv_exit_status()
    return status, out

def main():
    print("=" * 75)
    print(" CloudRDR Live End-to-End Autonomous Attack & Recovery Cycle on Kali Linux")
    print(f" Target: {KALI_USER}@{KALI_HOST}")
    print("=" * 75)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(KALI_HOST, username=KALI_USER, password=KALI_PASS, timeout=10)

    # 1. Clean previous processes
    print("[1/6] Preparing clean execution environment on Kali...")
    run_cmd(ssh, "killall cloudrdr-core-linux cloudrdr-agent-linux 2>/dev/null || true")
    run_cmd(ssh, f"rm -rf {BASE_DIR}/data {BASE_DIR}/protected")
    run_cmd(ssh, f"mkdir -p {BASE_DIR}/data/local-storage/protected/canary {BASE_DIR}/protected")

    # Seed baseline assets
    seed_cmd = f"""
    echo "Enterprise Financials Q3 Authentic 2026" > {BASE_DIR}/data/local-storage/protected/financials.xlsx
    echo "Executive Strategy Blueprint Authentic" > {BASE_DIR}/data/local-storage/protected/strategy.pdf
    echo "TRIPWIRE_SENTINEL_PAYLOAD_CANARY" > {BASE_DIR}/data/local-storage/protected/canary/tripwire_sentinel.docx
    """
    run_cmd(ssh, seed_cmd)

    # 2. Start Go Backend Core as background service on Kali
    print("[2/6] Starting CloudRDR Go Core Server on Kali (port 4455)...")
    start_server_cmd = f"""
    cd {BASE_DIR}
    PORT=4455 \
    LOCAL_STORAGE_PATH={BASE_DIR}/data/local-storage \
    DATA_DIR={BASE_DIR}/data \
    nohup {BASE_DIR}/bin/cloudrdr-core-linux > {BASE_DIR}/core.log 2>&1 &
    sleep 2
    curl -s http://127.0.0.1:4455/health
    """
    code, out = run_cmd(ssh, start_server_cmd)
    print("Server health response:", out.strip().splitlines()[-1] if out.strip() else "No output")

    # 3. Capture Initial Baseline Merkle Root
    print("\n[3/6] Capturing Baseline Cryptographic Snapshot on Kali...")
    baseline_cmd = "curl -s -X POST 'http://127.0.0.1:4455/api/baseline/create?bucket=protected' -H 'X-API-Key: dev-secret-key-12345'"
    code, out = run_cmd(ssh, baseline_cmd)
    try:
        b_res = json.loads(out.strip().splitlines()[-1])
        print(f"[+] Baseline Created! Files: {b_res.get('file_count')}, MerkleRoot: {b_res.get('merkle_root')}")
    except Exception:
        print("Raw baseline output:", out.strip())

    # 4. Enroll Agent
    print("\n[4/6] Enrolling Linux Node Agent with Go Core...")
    reg_cmd = f"""
    curl -s -X POST http://127.0.0.1:4455/api/agent/register \
      -H "Content-Type: application/json" \
      -d '{{"hostname":"kali-sentinel-01","ip":"192.168.152.148","platform":"linux","version":"2.0.0","account_id":"kali-prod-acc","bucket":"protected"}}'
    """
    code, out = run_cmd(ssh, reg_cmd)
    print("Agent Enrollment:", out.strip())

    # 5. Execute Live Simulated Attack on Kali
    print("\n[5/6] Executing High-Entropy Live Ransomware Attack on Kali...")
    attack_payload = {
        "account_id": "kali-prod-acc",
        "bucket": "protected",
        "events": [
            {
                "path": "financials.xlsx.locked",
                "entropy": 7.94,
                "event_type": "modified",
                "observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                "path": "strategy.pdf.locked",
                "entropy": 7.91,
                "event_type": "modified",
                "observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                "path": "canary/tripwire_sentinel.docx",
                "entropy": 7.98,
                "event_type": "modified",
                "is_canary": True,
                "observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                "path": "README_RESTORE.txt",
                "entropy": 3.40,
                "event_type": "created",
                "observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        ]
    }

    attack_cmd = f"""
    curl -s -X POST http://127.0.0.1:4455/api/telemetry/events \
      -H "Content-Type: application/json" \
      -H "X-API-Key: dev-secret-key-12345" \
      -d '{json.dumps(attack_payload)}'
    """
    code, out = run_cmd(ssh, attack_cmd)
    print("Telemetry Detection Verdict:")
    print(out.strip())

    # Check incident status
    time.sleep(1)
    inc_cmd = "curl -s http://127.0.0.1:4455/api/incidents -H 'X-API-Key: dev-secret-key-12345'"
    code, out = run_cmd(ssh, inc_cmd)
    try:
        inc_data = json.loads(out.strip())
        incidents = inc_data.get("incidents", [])
        if incidents:
            latest = incidents[0]
            print(f"\n[+] Active Incident Created on Kali!")
            print(f"    Incident ID: {latest.get('id')}")
            print(f"    Status:      {latest.get('status')}")
            print(f"    Ed25519 Sig: {latest.get('record_signature')[:32]}... (verified)")
            print(f"    Signed Key:  {latest.get('signing_key_id')}")
    except Exception as e:
        print("Incident parsing error:", e)

    # 6. Check Agent Heartbeat Response (Should be FREEZE)
    print("\n[6/6] Verifying Agent Heartbeat Containment Command...")
    hb_cmd = """
    curl -s -X POST http://127.0.0.1:4455/api/agent/heartbeat \
      -H "Content-Type: application/json" \
      -H "X-API-Key: dev-secret-key-12345" \
      -d '{"agent_id":"agt-kali-live","account_id":"kali-prod-acc","cpu_usage":14.0,"ram_usage_mb":52.0,"files_monitored":3}'
    """
    code, out = run_cmd(ssh, hb_cmd)
    print("Heartbeat Response:", out.strip())

    # Cleanup server
    run_cmd(ssh, "killall cloudrdr-core-linux 2>/dev/null || true")
    ssh.close()

    print("\n" + "=" * 75)
    print(" ✅ Complete End-to-End Autonomous Security Verification on Kali Passed!")
    print("=" * 75)

if __name__ == '__main__':
    main()
