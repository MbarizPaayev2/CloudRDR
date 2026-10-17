#!/usr/bin/env bash
# CloudRDR C Agent Production Linux Deployment Script
# Installs native ELF binary and configures systemd daemon
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_SRC="${SCRIPT_DIR}/bin/cloudrdr-agent"
DEST_BIN="/usr/local/bin/cloudrdr-agent"
SERVICE_SRC="${SCRIPT_DIR}/systemd/cloudrdr-agent.service"
SERVICE_DEST="/etc/systemd/system/cloudrdr-agent.service"
ENV_SRC="${SCRIPT_DIR}/systemd/agent.env"
ENV_DEST="/etc/cloudrdr/agent.env"

echo "[*] Initializing CloudRDR Linux Daemon Deployment..."

# 1. Build binary if missing
if [[ ! -f "${BIN_SRC}" ]]; then
    echo "[*] Native binary not found. Building with GCC..."
    (cd "${SCRIPT_DIR}" && make)
fi

# 2. Check root permissions for installation
if [[ $EUID -ne 0 ]]; then
    echo "[-] Error: This installation script must be run as root (use sudo)."
    exit 1
fi

# 3. Create required directories
echo "[*] Creating runtime directories..."
mkdir -p /var/lib/cloudrdr
mkdir -p /etc/cloudrdr
mkdir -p /data/local-storage/protected

# 4. Install native ELF binaries
echo "[*] Installing binaries to /usr/local/bin/..."
cp -f "${SCRIPT_DIR}/bin/cloudrdr-agent" /usr/local/bin/cloudrdr-agent
cp -f "${SCRIPT_DIR}/bin/cloudrdr-entropy" /usr/local/bin/cloudrdr-entropy
cp -f "${SCRIPT_DIR}/bin/cloudrdr-merkle" /usr/local/bin/cloudrdr-merkle
chmod 0755 /usr/local/bin/cloudrdr-agent /usr/local/bin/cloudrdr-entropy /usr/local/bin/cloudrdr-merkle

# 5. Install environment config
if [[ ! -f "${ENV_DEST}" ]]; then
    echo "[*] Installing default configuration to ${ENV_DEST}..."
    cp -f "${ENV_SRC}" "${ENV_DEST}"
    chmod 0640 "${ENV_DEST}"
else
    echo "[*] Existing configuration retained at ${ENV_DEST}."
fi

# 6. Install and enable systemd unit
if command -v systemctl >/dev/null 2>&1; then
    echo "[*] Installing systemd service unit to ${SERVICE_DEST}..."
    cp -f "${SERVICE_SRC}" "${SERVICE_DEST}"
    chmod 0644 "${SERVICE_DEST}"

    echo "[*] Reloading systemd and enabling service..."
    systemctl daemon-reload
    systemctl enable cloudrdr-agent.service
    echo "[OK] CloudRDR Linux daemon installed and enabled via systemd."
    echo "[*] Start with: sudo systemctl start cloudrdr-agent"
    echo "[*] Logs with:  journalctl -u cloudrdr-agent -f"
else
    echo "[!] systemctl not found (container or non-systemd environment)."
    echo "[*] You can run directly: ${DEST_BIN} --manager http://127.0.0.1:4000 --bucket protected --dir /data/local-storage/protected"
fi

echo "[OK] Deployment complete."
