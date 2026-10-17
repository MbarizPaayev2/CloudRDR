#!/usr/bin/env python3
"""
Deploy and configure CloudRDR C Native Agent on remote Ubuntu host (10.39.37.56)
Connecting to Manager: https://midproject-beta.vercel.app
"""

import os
import sys
import time
import paramiko

REMOTE_HOST = '10.39.37.56'
REMOTE_USER = 'ubuntu'
REMOTE_PASS = 'ubuntu'
REMOTE_DIR = '/home/ubuntu/cloudrdr-agent-live'
MANAGER_URL = 'https://midproject-beta.vercel.app'

import posixpath

def sftp_upload_dir(ssh, sftp, local_dir, remote_dir):
    run_ssh_cmd(ssh, f"mkdir -p '{remote_dir}'")
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir).replace('\\', '/')
        cur_remote = remote_dir if rel_path == '.' else f"{remote_dir}/{rel_path}"
        run_ssh_cmd(ssh, f"mkdir -p '{cur_remote}'")
        for f in files:
            local_file = os.path.join(root, f)
            remote_file = f"{cur_remote}/{f}"
            sftp.put(local_file, remote_file)

def run_ssh_cmd(ssh, cmd, sudo=False):
    if sudo:
        full_cmd = f"echo '{REMOTE_PASS}' | sudo -S bash -c {repr(cmd)}"
    else:
        full_cmd = cmd
    stdin, stdout, stderr = ssh.exec_command(full_cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    status = stdout.channel.recv_exit_status()
    return status, out

def main():
    print(f"[*] Connecting to {REMOTE_USER}@{REMOTE_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(REMOTE_HOST, username=REMOTE_USER, password=REMOTE_PASS, timeout=10)
    print(f"[+] SSH connection established.")

    # 1. Upload updated agent-c
    print("[*] Uploading latest agent-c codebase via SFTP...")
    run_ssh_cmd(ssh, "mkdir -p /data/local-storage/protected && chown -R ubuntu:ubuntu /data", sudo=True)
    sftp = ssh.open_sftp()
    run_ssh_cmd(ssh, f"mkdir -p {REMOTE_DIR}")
    
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    agent_c_local = os.path.join(root_dir, 'agent-c')
    protected_data_local = os.path.join(root_dir, 'data', 'local-storage', 'protected')
    
    sftp_upload_dir(ssh, sftp, agent_c_local, f"{REMOTE_DIR}/agent-c")
    sftp_upload_dir(ssh, sftp, protected_data_local, "/data/local-storage/protected")
    sftp.close()
    print("[+] Files uploaded successfully.")

    # 2. Recompile on remote Ubuntu
    print("[*] Compiling native C engines on remote Ubuntu...")
    status, out = run_ssh_cmd(ssh, f"cd {REMOTE_DIR}/agent-c && make clean && make")
    print(out.strip())
    if status != 0:
        print("[-] Compilation failed!")
        sys.exit(1)

    # 3. Install binaries into system path
    print("[*] Installing binaries to /usr/local/bin...")
    status, out = run_ssh_cmd(ssh, f"cp {REMOTE_DIR}/agent-c/bin/* /usr/local/bin/ && chmod +x /usr/local/bin/cloudrdr-*", sudo=True)
    print(out.strip())

    # 4. Create and configure /etc/cloudrdr/agent.env via SFTP
    print("[*] Configuring /etc/cloudrdr/agent.env with live Manager URL...")
    sftp = ssh.open_sftp()
    env_content = f"""# CloudRDR Enterprise Monitoring Agent Configuration
MANAGER_URL={MANAGER_URL}
AGENT_ID=agt-c-native-01
BUCKET=protected
WATCH_DIR=/data/local-storage/protected
INTERVAL_SEC=10
VERBOSE=1
"""
    with sftp.file('/tmp/agent.env', 'w') as f:
        f.write(env_content)
    sftp.close()

    run_ssh_cmd(ssh, "mkdir -p /etc/cloudrdr && mv /tmp/agent.env /etc/cloudrdr/agent.env && chmod 600 /etc/cloudrdr/agent.env", sudo=True)

    # Verify agent.env
    status, out = run_ssh_cmd(ssh, "cat /etc/cloudrdr/agent.env", sudo=True)
    print("--- /etc/cloudrdr/agent.env ---")
    print(out.strip())

    # 5. Verify systemd unit configuration
    print("[*] Updating /etc/systemd/system/cloudrdr-agent.service...")
    unit_content = """[Unit]
Description=CloudRDR Storage Monitor Daemon (Native C Engine)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
EnvironmentFile=/etc/cloudrdr/agent.env
ExecStart=/usr/local/bin/cloudrdr-agent
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    sftp = ssh.open_sftp()
    with sftp.file('/tmp/cloudrdr-agent.service', 'w') as f:
        f.write(unit_content)
    sftp.close()
    run_ssh_cmd(ssh, "mv /tmp/cloudrdr-agent.service /etc/systemd/system/cloudrdr-agent.service", sudo=True)
    run_ssh_cmd(ssh, "systemctl daemon-reload", sudo=True)
    run_ssh_cmd(ssh, "systemctl enable cloudrdr-agent.service", sudo=True)

    # 6. Test one-shot scan with HTTPS bridge directly
    print("\n[*] Executing one-shot test scan with live manager connection...")
    status, out = run_ssh_cmd(ssh, f"/usr/local/bin/cloudrdr-agent --manager {MANAGER_URL} --dir /data/local-storage/protected --once -v")
    print(out.strip())

    # 7. Restart the systemd service for 24/7 autonomous monitoring
    print("\n[*] Restarting cloudrdr-agent systemd service...")
    run_ssh_cmd(ssh, "systemctl restart cloudrdr-agent.service", sudo=True)
    time.sleep(3)

    # 8. Check service status and logs
    print("\n--- SYSTEMD SERVICE STATUS ---")
    status, out = run_ssh_cmd(ssh, "systemctl status cloudrdr-agent.service --no-pager")
    print(out.strip())

    print("\n--- JOURNALCTL LOGS (LAST 25 LINES) ---")
    status, out = run_ssh_cmd(ssh, "journalctl -u cloudrdr-agent.service -n 25 --no-pager")
    print(out.strip())

    # 9. Test Manager response from Ubuntu host
    print("\n--- QUERY MANAGER AGENT STATUS FROM UBUNTU ---")
    status, out = run_ssh_cmd(ssh, f"curl -s {MANAGER_URL}/api/agent/status")
    print(out.strip())

    ssh.close()
    print("\n[+] Ubuntu C Native Agent live configuration complete!")

if __name__ == '__main__':
    main()
