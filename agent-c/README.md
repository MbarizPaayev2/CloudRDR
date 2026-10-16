# CloudRDR Autonomous Storage Monitoring Agent (C Engine)

High-performance, cross-platform C autonomous storage monitoring daemon with zero external runtime dependencies. Designed for enterprise production Linux (ELF binary + systemd service) and Windows hosts.

## Core Engines

- `include/cloudrdr_sha256.h`: Zero-dependency RFC 6234 / FIPS 180-4 streaming SHA-256 implementation.
- `include/cloudrdr_entropy.h`: Shannon byte entropy engine with 4KB sliding-window density analysis.
- `include/cloudrdr_merkle.h`: Pairwise binary Merkle DAG tree builder.
- `include/cloudrdr_canary.h`: Tripwire canary file modification and tamper detection.
- `include/cloudrdr_detector.h`: Velocity and threat heuristic classifier for ransomware detection.

## Building and Compiling

### Linux (Native ELF 64-bit)

```bash
cd agent-c
make clean && make
```

Outputs:
- `bin/cloudrdr-agent` (Monitoring daemon)
- `bin/cloudrdr-entropy` (CLI entropy tool)
- `bin/cloudrdr-merkle` (CLI Merkle DAG builder)

### Windows (PE 64-bit)

```powershell
./agent-c/build.ps1
```

Outputs:
- `bin/cloudrdr-agent.exe`
- `bin/cloudrdr-entropy.exe`
- `bin/cloudrdr-merkle.exe`

## Production Linux Systemd Deployment

To install the agent as a native systemd daemon on Linux:

```bash
sudo bash agent-c/install.sh
```

This performs:
1. Native ELF compilation with GCC (`-O3 -Wall -Wextra`).
2. Deployment of binary to `/usr/local/bin/cloudrdr-agent`.
3. Installation of system configuration to `/etc/cloudrdr/agent.env`.
4. Installation of systemd unit `/etc/systemd/system/cloudrdr-agent.service`.
5. Automatic enablement via `systemctl enable cloudrdr-agent`.

### Daemon Management Commands

```bash
sudo systemctl start cloudrdr-agent
sudo systemctl status cloudrdr-agent
sudo journalctl -u cloudrdr-agent -f
sudo systemctl stop cloudrdr-agent
```

## Performance Metrics

- Memory Footprint: ~304 KB Resident Set Size (RSS)
- Startup Latency: < 2 ms
- SHA-256 Parity: 100% byte-for-byte identical with Node.js crypto engine.
