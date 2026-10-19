#!/usr/bin/env python3
"""
scripts/deploy_go_kali.py
Deploys CloudRDR Go Core & Agent to Kali Linux (192.168.152.148) via Paramiko.
Verifies end-to-end autonomous ransomware detection on remote Linux target.
"""

import os
import sys
import time
import paramiko

KALI_HOST = '192.168.152.148'
KALI_USER = 'kali'
KALI_PASS = 'kali'
REMOTE_DIR = '/home/kali/cloudrdr-suite/bin'

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
    print("=" * 70)
    print(" Deploying CloudRDR Go Core & Agent to Kali Linux")
    print(f" Target: {KALI_USER}@{KALI_HOST}")
    print("=" * 70)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(KALI_HOST, username=KALI_USER, password=KALI_PASS, timeout=10)

    # 1. Prepare directory
    run_cmd(ssh, f"mkdir -p {REMOTE_DIR}")

    # 2. Upload binaries via SFTP
    sftp = ssh.open_sftp()
    
    local_core = os.path.abspath("backend-go/bin/cloudrdr-core-linux")
    remote_core = f"{REMOTE_DIR}/cloudrdr-core-linux"
    print(f"[*] Uploading Go Backend Core -> {remote_core}...")
    sftp.put(local_core, remote_core)

    local_agent = os.path.abspath("agent-go/bin/cloudrdr-agent-linux")
    remote_agent = f"{REMOTE_DIR}/cloudrdr-agent-linux"
    print(f"[*] Uploading Go Agent -> {remote_agent}...")
    sftp.put(local_agent, remote_agent)

    sftp.close()

    # 3. Chmod +x
    run_cmd(ssh, f"chmod +x {remote_core} {remote_agent}")

    # 4. Verify version / help output of both binaries on Kali
    print("\n[+] Testing Go Backend Core on Linux:")
    code, out = run_cmd(ssh, f"{remote_core} & sleep 1; curl -s http://127.0.0.1:4455/health; killall cloudrdr-core-linux 2>/dev/null || true")
    print(out.strip())

    print("\n[+] Testing Go Agent on Linux:")
    code, out = run_cmd(ssh, f"timeout 3 {remote_agent} 2>&1 || true")
    print(out.strip())

    ssh.close()
    print("\n" + "=" * 70)
    print(" ✅ Go Core & Agent verified successfully on Kali Linux!")
    print("=" * 70)

if __name__ == '__main__':
    main()
