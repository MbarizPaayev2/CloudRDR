import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('10.39.37.56', username='ubuntu', password='ubuntu')

def sudo_cmd(c):
    full = f"echo ubuntu | sudo -S bash -c {repr(c)}"
    stdin, stdout, stderr = ssh.exec_command(full)
    return stdout.read().decode()

print("[1] Stopping service and updating binary...")
out = sudo_cmd("systemctl stop cloudrdr-agent.service && cp -f /home/ubuntu/cloudrdr-agent-live/agent-c/bin/* /usr/local/bin/ && systemctl start cloudrdr-agent.service")
print(out)

time.sleep(3)

print("[2] Checking service status...")
status = sudo_cmd("systemctl status cloudrdr-agent.service --no-pager")
print(status)

print("[3] Checking journalctl logs...")
logs = sudo_cmd("journalctl -u cloudrdr-agent.service -n 30 --no-pager")
print(logs)

ssh.close()
