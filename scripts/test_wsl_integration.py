#!/usr/bin/env python3
"""
CloudRDR C Agent Live WSL Integration Verification Test:
1. Spawns an in-process mock HTTP Manager on 127.0.0.1:4455
2. Executes /usr/local/bin/cloudrdr-agent connecting to the mock manager
3. Verifies agent registration payload, headers, and HTTP socket communication
4. Verifies Merkle tree indexing of 33 files
5. Tests tripwire sentinel canary and entropy analysis
"""

import http.server
import threading
import time
import subprocess
import sys
import os

received_payloads = []

class MockManager(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        len_h = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(len_h).decode() if len_h else ""
        received_payloads.append((self.path, body))
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true,"verdict":"normal","action":"CONTINUE"}')

    def log_message(self, format, *args):
        pass

# 1. Start HTTP listener
srv = http.server.HTTPServer(("127.0.0.1", 4455), MockManager)
t = threading.Thread(target=srv.serve_forever, daemon=True)
t.start()
print("[WSL TEST] Mock SOC Manager started on port 4455")
time.sleep(0.3)

# 2. Run C Agent in WSL
agent_bin = "/usr/local/bin/cloudrdr-agent"
if not os.path.exists(agent_bin):
    agent_bin = os.path.join(os.path.dirname(__file__), "bin/cloudrdr-agent")

watch_dir = "/mnt/d/Users/007/Desktop/CloudRDR/data/local-storage/protected"

print(f"[WSL TEST] Executing {agent_bin} with live socket link...")
proc = subprocess.run([
    agent_bin,
    "--manager", "http://127.0.0.1:4455",
    "--dir", watch_dir,
    "--agent-id", "agt-wsl-kali-01",
    "--once"
], capture_output=True, text=True)

print("\n--- AGENT STDOUT ---")
print(proc.stdout)
if proc.stderr:
    print("--- AGENT STDERR ---")
    print(proc.stderr)

# 3. Assertions
assert proc.returncode == 0, f"Expected returncode 0, got {proc.returncode}"
assert "Objects Indexed: 33" in proc.stdout, "Failed to index 33 files"
assert "4c4dbee23eb22ae684d736ba11842217356cc8a69e8336de7246b4e44d965639" in proc.stdout, "Merkle root mismatch"
assert "Verdict:         [normal]" in proc.stdout, "Verdict was not normal"
assert len(received_payloads) >= 1, "Agent failed to transmit registration payload to Manager"

path, body = received_payloads[0]
print("[WSL TEST] Received API endpoint:", path)
print("[WSL TEST] Received payload:", body)
assert path == "/api/agent/register", f"Unexpected endpoint: {path}"
assert "agt-wsl-kali-01" in body, "Agent ID missing from registration payload"
assert "linux" in body, "Platform must be reported as linux"

# 4. Test Canary Sentinel & Tripwire Tampering Detection in Isolated Directory
print("\n[WSL TEST] Testing Canary Tripwire & Attack Simulation in isolated directory...")
import shutil
test_tmp = "/tmp/cloudrdr_canary_test"
if os.path.exists(test_tmp):
    shutil.rmtree(test_tmp)
os.makedirs(f"{test_tmp}/canary", exist_ok=True)
os.makedirs(f"{test_tmp}/corp", exist_ok=True)

# Write baseline files
with open(f"{test_tmp}/canary/tripwire_sentinel.docx", "wb") as f:
    f.write(b"CANARY_TRIPWIRE_SENTINEL_V1")
for i in range(5):
    with open(f"{test_tmp}/corp/doc_{i}.txt", "w") as f:
        f.write(f"Regular text document {i}")

# Cycle 1: Baseline
p1 = subprocess.run([agent_bin, "--dir", test_tmp, "--once"], capture_output=True, text=True)
assert "Objects Indexed: 6" in p1.stdout, "Expected 6 objects indexed"
assert "Verdict:         [normal]" in p1.stdout, "Expected verdict [normal]"
print("    Cycle 1 Baseline: 6 objects indexed, status [normal]")

# Tamper: Encrypt canary and 3 documents with high entropy bytes
with open(f"{test_tmp}/canary/tripwire_sentinel.docx", "wb") as f:
    f.write(os.urandom(4096))
for i in range(3):
    with open(f"{test_tmp}/corp/doc_{i}.txt", "wb") as f:
        f.write(os.urandom(4096))

# Verify entropy tool detects the modified canary
entropy_bin = "/usr/local/bin/cloudrdr-entropy"
if not os.path.exists(entropy_bin):
    entropy_bin = os.path.join(os.path.dirname(agent_bin), "cloudrdr-entropy")

canary_ent = subprocess.run([
    entropy_bin,
    f"{test_tmp}/canary/tripwire_sentinel.docx"
], capture_output=True, text=True)
assert canary_ent.returncode == 3, f"Expected threat exit code 3, got {canary_ent.returncode}"
assert "RANSOMWARE_ENCRYPTED_CIPHERTEXT" in canary_ent.stdout, "Failed to identify ciphertext"
print("    Canary Tamper Verified: cloudrdr-entropy detected RANSOMWARE_ENCRYPTED_CIPHERTEXT with exit code 3")

# Clean up
shutil.rmtree(test_tmp)

print("\n============================================================")
print("[OK] WSL Tool Functionality & Integration 100% Verified!")
print("============================================================")

