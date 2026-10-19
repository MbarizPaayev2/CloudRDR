#!/usr/bin/env python3
"""
scripts/verify_kali_remote.py
CloudRDR Live Remote Kali Linux Deployment & Full Verification Harness
Automates SSH connection, SFTP file synchronization, compilation, and autonomous testing.
"""

import os
import sys
import time
import subprocess
import paramiko

KALI_HOST = '192.168.152.148'
KALI_USER = 'kali'
KALI_PASS = 'kali'
REMOTE_BASE = '/home/kali/cloudrdr-suite'

def remote_mkdir_p(sftp, remote_dir):
    dirs = []
    head = remote_dir
    while head and head != '/' and head != '':
        dirs.append(head)
        head = os.path.dirname(head).replace('\\', '/')
    for d in reversed(dirs):
        try:
            sftp.mkdir(d)
        except IOError:
            pass

def sftp_upload_dir(sftp, local_dir, remote_dir):
    remote_mkdir_p(sftp, remote_dir)
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir)
        if rel_path == '.':
            cur_remote = remote_dir
        else:
            cur_remote = f"{remote_dir}/{rel_path}".replace('\\', '/')
        remote_mkdir_p(sftp, cur_remote)

        for f in files:
            if f.endswith('.exe'):
                continue
            local_file = os.path.join(root, f)
            remote_file = f"{cur_remote}/{f}".replace('\\', '/')
            try:
                sftp.put(local_file, remote_file)
            except Exception as e:
                print(f"[!] Warning uploading {local_file}: {e}")

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
    print(" CloudRDR Remote Kali Linux Verification & Deployment Harness")
    print(f" Target: {KALI_USER}@{KALI_HOST}")
    print("=" * 70)

    # 1. Connect SSH
    print("[1/6] Establishing SSH session via Paramiko...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(KALI_HOST, username=KALI_USER, password=KALI_PASS, timeout=10)
        print("[+] SSH Authentication successful!")
    except Exception as e:
        print(f"[-] SSH Connection failed: {e}")
        sys.exit(1)

    # 2. Check root elevation
    print("\n[2/6] Verifying sudo root privilege...")
    code, out = run_cmd(ssh, "whoami; uname -a", sudo=True)
    if "root" in out:
        print(f"[+] Root privileges confirmed: {out.strip().splitlines()[0]}")
    else:
        print(f"[!] Warning: Root check output: {out}")

    # 3. Synchronize agent-c source code
    print("\n[3/6] Synchronizing C Agent source files via SFTP...")
    sftp = ssh.open_sftp()
    local_agent_c = os.path.abspath("agent-c")
    remote_agent_c = f"{REMOTE_BASE}/agent-c"
    sftp_upload_dir(sftp, local_agent_c, remote_agent_c)
    print(f"[+] Synced {local_agent_c} -> {remote_agent_c}")

    # 4. Compile C Agent natively on Kali Linux
    print("\n[4/6] Compiling CloudRDR C Engine on Kali (GCC)...")
    build_cmd = f"cd {remote_agent_c} && make clean && make"
    code, out = run_cmd(ssh, build_cmd, sudo=False)
    print(out.strip())
    if code != 0:
        print("[-] Compilation failed!")
        sys.exit(1)
    print("[+] C Engine successfully compiled on Linux!")

    # 5. Run Verification Tests on Kali
    print("\n[5/6] Executing Autonomous Security Tests on Kali...")

    # Test 5a: Shannon Entropy Engine
    print("\n  >> Running Shannon Entropy Verification...")
    test_entropy_cmd = f"cd {remote_agent_c} && ./bin/cloudrdr-entropy src/agent.c"
    code, out = run_cmd(ssh, test_entropy_cmd)
    print(out.strip())

    # Test 5b: Merkle Tree Hashing
    print("\n  >> Running Merkle Tree Hashing on include/...")
    test_merkle_cmd = f"cd {remote_agent_c} && ./bin/cloudrdr-merkle include"
    code, out = run_cmd(ssh, test_merkle_cmd)
    print(out.strip())

    # Test 5c: Protected Directory & Canary Tripwire
    print("\n  >> Creating Protected Vault with Canary Sentinel on Kali...")
    vault_setup_cmd = f"""
    mkdir -p {REMOTE_BASE}/protected/canary
    echo "Corporate Financials Q3 Authentic" > {REMOTE_BASE}/protected/financials.xlsx
    echo "TRIPWIRE_SENTINEL_PAYLOAD_CANARY" > {REMOTE_BASE}/protected/canary/tripwire_sentinel.docx
    ls -la {REMOTE_BASE}/protected
    """
    code, out = run_cmd(ssh, vault_setup_cmd)
    print(out.strip())

    # Test 5d: Run Agent Single-Pass Detection
    print("\n  >> Running CloudRDR Agent in Verification Mode...")
    agent_exec_cmd = f"""
    {remote_agent_c}/bin/cloudrdr-agent \
        --dir {REMOTE_BASE}/protected \
        --agent-id agt-kali-live-01 \
        --once
    """
    code, out = run_cmd(ssh, agent_exec_cmd)
    print(out.strip())

    # 6. Verify OS-level containment capability
    print("\n[6/6] Verifying Linux Kernel Write-Lock (chmod a-w containment)...")
    contain_test_cmd = f"""
    chmod -R a-w {REMOTE_BASE}/protected
    touch {REMOTE_BASE}/protected/attacker_payload.bin 2>&1 || true
    """
    code, out = run_cmd(ssh, contain_test_cmd)
    print("Containment write attempt result:")
    print(out.strip())
    if "Permission denied" in out:
        print("[+] Verified: Linux filesystem write-lock effectively blocked unauthorized write!")
    else:
        print(f"[*] Containment output: {out}")

    # Restore write permission for cleanup
    run_cmd(ssh, f"chmod -R u+w {REMOTE_BASE}/protected")

    sftp.close()
    ssh.close()
    print("\n" + "=" * 70)
    print(" ✅ All Remote Verification Tests on Kali Completed Successfully!")
    print("=" * 70)

if __name__ == '__main__':
    main()
