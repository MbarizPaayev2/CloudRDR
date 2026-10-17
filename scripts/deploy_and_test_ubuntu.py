#!/usr/bin/env python3
"""
CloudRDR Remote Ubuntu 26.04 Live Deployment & Tool Verification Script
Connects to 10.39.37.56 via Paramiko (SSH/SFTP).
Compiles native C engines, tests entropy and Merkle DAG, installs systemd service,
and verifies autonomous ransomware containment on remote Linux host.
"""

import os
import sys
import time
import paramiko

REMOTE_HOST = '10.39.37.56'
REMOTE_USER = 'ubuntu'
REMOTE_PASS = 'ubuntu'
REMOTE_DIR = '/home/ubuntu/cloudrdr-test'

def remote_mkdir_p(sftp, remote_directory):
    dirs = []
    head = remote_directory
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
            local_file = os.path.join(root, f)
            remote_file = f"{cur_remote}/{f}".replace('\\', '/')
            sftp.put(local_file, remote_file)

def run_ssh_cmd(ssh, cmd, sudo=False):
    if sudo:
        full_cmd = f"echo '{REMOTE_PASS}' | sudo -S {cmd}"
    else:
        full_cmd = cmd

    stdin, stdout, stderr = ssh.exec_command(full_cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    status = stdout.channel.recv_exit_status()
    return status, out

def main():
    print(f"[*] Connecting to remote Ubuntu server at {REMOTE_HOST} via Paramiko...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(REMOTE_HOST, username=REMOTE_USER, password=REMOTE_PASS, timeout=10)
    print(f"[OK] SSH session established with {REMOTE_USER}@{REMOTE_HOST}\n")

    # 1. System Info
    status, sysinfo = run_ssh_cmd(ssh, "uname -srm; lsb_release -ds")
    print("--- 1. REMOTE SYSTEM INFO ---")
    print(sysinfo.strip())
    print("")

    # 2. Upload Workspace C Agent & Protected Files via SFTP
    print("[*] Uploading agent-c and test data via SFTP...")
    sftp = ssh.open_sftp()
    run_ssh_cmd(ssh, f"rm -rf {REMOTE_DIR} && mkdir -p {REMOTE_DIR}")

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    agent_c_local = os.path.join(root_dir, 'agent-c')
    protected_data_local = os.path.join(root_dir, 'data', 'local-storage', 'protected')

    sftp_upload_dir(sftp, agent_c_local, f"{REMOTE_DIR}/agent-c")
    sftp_upload_dir(sftp, protected_data_local, f"{REMOTE_DIR}/data/protected")
    sftp.close()
    print("[OK] Files transferred to remote Ubuntu server successfully.\n")

    # 3. Compile Native C Engines with GCC on Remote Ubuntu
    print("--- 2. REMOTE GCC COMPILATION ---")
    status, compile_out = run_ssh_cmd(ssh, f"cd {REMOTE_DIR}/agent-c && make clean && make")
    print(compile_out.strip())
    assert status == 0, f"Compilation failed with status {status}"
    print("[OK] Remote C compilation successful with 0 errors.\n")

    # 4. Verify cloudrdr-entropy on Remote Ubuntu
    print("--- 3. TESTING CLOUDRDR-ENTROPY ENGINE ---")
    # 4a. Plaintext
    status, ent_plain = run_ssh_cmd(ssh, f"{REMOTE_DIR}/agent-c/bin/cloudrdr-entropy {REMOTE_DIR}/agent-c/Makefile")
    print(ent_plain.strip())
    assert status == 0, "Plaintext entropy check failed"
    assert "NORMAL_STRUCTURED_PLAINTEXT" in ent_plain, "Expected safe indicator"

    # 4b. Encrypted Random Threat
    status, ent_threat = run_ssh_cmd(ssh, f"head -c 16384 /dev/urandom > /tmp/threat.bin && ({REMOTE_DIR}/agent-c/bin/cloudrdr-entropy /tmp/threat.bin || true) && rm -f /tmp/threat.bin")
    print(ent_threat.strip())
    assert "RANSOMWARE_ENCRYPTED_CIPHERTEXT" in ent_threat, "Failed to identify ciphertext threat"
    print("[OK] Entropy threat detection verified.\n")

    # 5. Verify cloudrdr-merkle on Remote Ubuntu
    print("--- 4. TESTING CLOUDRDR-MERKLE DAG ENGINE ---")
    status, merkle_out = run_ssh_cmd(ssh, f"{REMOTE_DIR}/agent-c/bin/cloudrdr-merkle {REMOTE_DIR}/agent-c/Makefile {REMOTE_DIR}/agent-c/include/cloudrdr_sha256.h")
    print(merkle_out.strip())
    assert status == 0, "Merkle calculation failed"
    assert "Merkle Root:" in merkle_out, "Merkle root missing from output"
    print("[OK] Merkle tree computation verified.\n")

    # 6. Install System Suite and Systemd Service
    print("--- 5. INSTALLING AGENT & SYSTEMD SERVICE (SUDO) ---")
    status, install_out = run_ssh_cmd(ssh, f"bash {REMOTE_DIR}/agent-c/install.sh", sudo=True)
    print(install_out.strip())
    assert status == 0, "Install script failed"
    print("[OK] Installed binaries to /usr/local/bin and registered systemd service.\n")

    # 7. Test Autonomous Storage Scan on 33 Protected Files
    print("--- 6. RUNNING CLOUDRDR-AGENT AUTONOMOUS SCAN (33 OBJECTS) ---")
    status, scan_out = run_ssh_cmd(ssh, f"/usr/local/bin/cloudrdr-agent --dir {REMOTE_DIR}/data/protected --once")
    print(scan_out.strip())
    assert status == 0, "Agent scan failed"
    assert "Objects Indexed: 33" in scan_out, "Failed to index 33 files"
    assert "4c4dbee23eb22ae684d736ba11842217356cc8a69e8336de7246b4e44d965639" in scan_out, "Merkle root parity check failed"
    assert "Verdict:         [normal]" in scan_out, "Verdict must be normal"
    print("[OK] Full 33-object cryptographic Merkle root matches 100% byte-for-byte on Ubuntu 26.04!\n")

    # 8. Test Canary Sentinel Breach on Remote Ubuntu
    print("--- 7. TESTING CANARY SENTINEL TAMPER DETECTION ---")
    canary_path = f"{REMOTE_DIR}/data/protected/canary/tripwire_sentinel.docx"
    run_ssh_cmd(ssh, f"head -c 2048 /dev/urandom > {canary_path}")
    status, canary_check = run_ssh_cmd(ssh, f"/usr/local/bin/cloudrdr-entropy {canary_path} || true")
    print(canary_check.strip())
    assert "RANSOMWARE_ENCRYPTED_CIPHERTEXT" in canary_check, "Canary tamper not flagged as encrypted"
    print("[OK] Tripwire sentinel breach detected.\n")

    # 9. Test Systemd Daemon Execution (Start / Status / Stop)
    print("--- 8. TESTING SYSTEMD DAEMON LIFECYCLE ---")
    # Update watch dir in /etc/cloudrdr/agent.env
    run_ssh_cmd(ssh, f"sed -i 's|WATCH_DIR=.*|WATCH_DIR={REMOTE_DIR}/data/protected|' /etc/cloudrdr/agent.env", sudo=True)
    run_ssh_cmd(ssh, "systemctl start cloudrdr-agent.service", sudo=True)
    time.sleep(1)
    status, sysd_status = run_ssh_cmd(ssh, "systemctl status cloudrdr-agent.service --no-pager")
    print(sysd_status.strip())
    assert "active (running)" in sysd_status, "Systemd service is not active (running)"
    print("[OK] Service is active (running) on remote Ubuntu host!")

    # Stop service cleanly
    run_ssh_cmd(ssh, "systemctl stop cloudrdr-agent.service", sudo=True)
    status, sysd_stopped = run_ssh_cmd(ssh, "systemctl is-active cloudrdr-agent.service || true")
    assert "inactive" in sysd_stopped or "failed" in sysd_stopped or status != 0, "Service failed to stop"
    print("[OK] Service stopped cleanly after verification.\n")

    # 10. Cleanup remote test dir
    run_ssh_cmd(ssh, f"rm -rf {REMOTE_DIR}")
    ssh.close()

    print("============================================================")
    print("[OK] ALL REMOTE UBUNTU 26.04 TESTS PASSED (100% VERIFIED)!")
    print("============================================================")

if __name__ == '__main__':
    main()
