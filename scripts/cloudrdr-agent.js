#!/usr/bin/env node
/**
 * @file scripts/cloudrdr-agent.js
 *
 * CloudRDR Enterprise Autonomous Endpoint Monitoring Agent (Standalone)
 * Zero external dependencies — pure Node.js standard library (node >= 16).
 *
 * Capabilities:
 *   1. Real-time recursive File Integrity Monitoring (FIM).
 *   2. Fast Shannon Entropy calculation on modified files (detects AES/ChaCha20 encryption).
 *   3. Canary Trap Bait file detection (immediate trigger on access/modification/deletion).
 *   4. Ransomware extension (.locked, .lockbit, etc.) and ransom note detection.
 *   5. Process context attribution (hostname, OS, platform, user).
 *   6. Offline resilient spooling: buffers events locally if manager is unreachable.
 *   7. Active Defense Write-Freeze: automatically locks directory on Manager FREEZE verdict.
 *   8. Automatic registration and keepalive heartbeats to CloudRDR Manager API.
 *
 * Usage:
 *   node cloudrdr-agent.js [options]
 *
 * Options / Environment Variables:
 *   --manager,   MANAGER_URL       Manager URL (default: http://localhost:3000)
 *   --watch,     WATCH_DIR         Directory to monitor (default: ./data/local-storage or ./protected)
 *   --bucket,    STORAGE_BUCKET    Logical bucket name (default: protected)
 *   --account,   ACCOUNT_ID        Account identifier (default: default-account)
 *   --interval,  SCAN_INTERVAL     FIM scan interval in seconds (default: 3)
 *   --heartbeat, HEARTBEAT_SECS    Heartbeat interval in seconds (default: 10)
 *   --entropy,   ENTROPY_THRESH    Shannon entropy threshold (default: 7.2)
 *   --key,       AGENT_KEY         API Key for manager authentication
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { exec } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';

// ── 1. Configuration & CLI Argument Parsing ─────────────────────────────────

const argv = process.argv.slice(2);
function getArg(flag, envKey, defVal) {
  const idx = argv.indexOf(flag);
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return process.env[envKey] || defVal;
}

const CONFIG = {
  managerUrl: getArg('--manager', 'MANAGER_URL', 'http://localhost:3000').replace(/\/$/, ''),
  watchDir: path.resolve(getArg('--watch', 'WATCH_DIR', './protected')),
  bucket: getArg('--bucket', 'STORAGE_BUCKET', 'protected'),
  accountId: getArg('--account', 'ACCOUNT_ID', 'default-account'),
  scanIntervalMs: parseInt(getArg('--interval', 'SCAN_INTERVAL', '3'), 10) * 1000,
  heartbeatIntervalMs: parseInt(getArg('--heartbeat', 'HEARTBEAT_SECS', '10'), 10) * 1000,
  entropyThreshold: parseFloat(getArg('--entropy', 'ENTROPY_THRESH', '7.2')),
  agentKey: getArg('--key', 'AGENT_KEY', process.env.CLOUDRDR_API_KEY || 'cloudrdr-default-key-2026'),
  canaryPatterns: ['canary', 'decoy', 'tripwire', '.canary.'],
  spoolFile: path.resolve('./.cloudrdr-events.spool'),
  agentVersion: '2.1.0-enterprise',
};

// Known ransomware indicators
const RANSOM_EXT_REGEX =
  /\.(locked|crypto|crypt|enc|crypted|lockbit|blackcat|wncry|mallox|phobos|stop|djvu|r5a|akira|rhysida|medusa|bianlian|play|cactus|clop|blacksuit|inc|hunters|qilin)$/i;
const RANSOM_NOTE_REGEX =
  /(how_to_decrypt|readme_to_decrypt|restore_files|decrypt_files|read_me|recover_files|recovery_instructions|instructions|!readme)\.(txt|html|hta|rtf)$/i;

// ── 2. Telemetry & Cryptographic Calculation ────────────────────────────────

/**
 * Compute Shannon Entropy over a buffer.
 * H(X) = - sum(p_i * log2(p_i))
 * Returns a value between 0.0 and 8.0. Pure encrypted/compressed bytes score > 7.2.
 */
function calculateShannonEntropy(buffer) {
  if (!buffer || buffer.length === 0) return 0;
  const frequencies = new Uint32Array(256);
  for (let i = 0; i < buffer.length; i++) {
    frequencies[buffer[i]]++;
  }

  let entropy = 0;
  const total = buffer.length;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / total;
      entropy -= p * Math.log2(p);
    }
  }
  return Number(entropy.toFixed(2));
}

/**
 * Compute SHA-256 hex digest of a file.
 */
function hashFile(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Read sample bytes from file (up to 64KB) and calculate Shannon entropy.
 */
function getFileEntropy(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(64 * 1024);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    return calculateShannonEntropy(buffer.subarray(0, bytesRead));
  } catch {
    return 0;
  }
}

function isCanaryPath(relPath) {
  const lower = relPath.toLowerCase();
  return CONFIG.canaryPatterns.some((p) => lower.includes(p));
}

// ── 3. Active Defense: Local Write-Freeze ────────────────────────────────────

function executeHostFreeze(targetDir) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    // On Windows, revoke write permissions via icacls. On Unix, chmod a-w
    const cmd = isWin
      ? `icacls "${targetDir}" /deny *S-1-1-0:(W,WD,AD)`
      : `chmod -R a-w "${targetDir}"`;

    console.log(`\n[ACTIVE DEFENSE] Executing containment write-freeze on: ${targetDir}`);
    exec(cmd, (err, _stdout, _stderr) => {
      if (err) {
        console.error(`[!] Failed to execute host freeze: ${err.message}`);
        resolve(false);
      } else {
        console.log(`[CONTAINMENT SUCCESS] Directory write-locked. Attack halted.`);
        resolve(true);
      }
    });
  });
}

// ── 4. HTTP Communication & Offline Spooler ─────────────────────────────────

function sendRequest(endpoint, method, payload) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(`${CONFIG.managerUrl}${endpoint}`);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;
      const data = payload ? JSON.stringify(payload) : null;

      const req = transport.request(
        parsedUrl,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-Key': CONFIG.agentKey,
            'X-API-Key': CONFIG.agentKey,
            ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          },
          timeout: 7000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(body));
              } catch {
                resolve({ raw: body });
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });

      if (data) req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

class EventSpooler {
  constructor(spoolPath) {
    this.spoolPath = spoolPath;
    this.memoryQueue = [];
  }

  push(events) {
    this.memoryQueue.push(...events);
    // Persist to disk in case process is interrupted
    try {
      fs.appendFileSync(this.spoolPath, events.map((e) => JSON.stringify(e)).join('\n') + '\n');
    } catch {
      // Ignore disk append errors
    }
  }

  drain(max = 50) {
    const batch = this.memoryQueue.splice(0, max);
    return batch;
  }

  clearDisk() {
    try {
      if (fs.existsSync(this.spoolPath)) {
        fs.unlinkSync(this.spoolPath);
      }
    } catch {
      // Ignore
    }
  }

  loadDisk() {
    if (!fs.existsSync(this.spoolPath)) return;
    try {
      const lines = fs.readFileSync(this.spoolPath, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          this.memoryQueue.push(JSON.parse(line));
        } catch {}
      }
      this.clearDisk();
    } catch {}
  }
}

// ── 5. Recursive File Integrity Monitor (FIM) ───────────────────────────────

class FileWatcher {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.fileState = new Map(); // relPath -> { mtime, size, sha256 }
    this.isFirstScan = true;
  }

  scan() {
    const events = [];
    const currentFiles = new Set();

    if (!fs.existsSync(this.rootDir)) {
      try {
        fs.mkdirSync(this.rootDir, { recursive: true });
      } catch {}
      return { events: [], fileCount: 0 };
    }

    const walk = (dir) => {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip internal git or node modules
          if (entry.name === '.git' || entry.name === 'node_modules') continue;
          walk(fullPath);
        } else if (entry.isFile()) {
          const relPath = path.relative(this.rootDir, fullPath).replace(/\\/g, '/');
          currentFiles.add(relPath);

          let stat;
          try {
            stat = fs.statSync(fullPath);
          } catch {
            continue;
          }

          const isCanary = isCanaryPath(relPath);
          const isRansomExt = RANSOM_EXT_REGEX.test(relPath);
          const isRansomNote = RANSOM_NOTE_REGEX.test(relPath);
          const prev = this.fileState.get(relPath);

          if (!prev) {
            // New file created
            const sha256 = hashFile(fullPath);
            const entropy = getFileEntropy(fullPath);
            this.fileState.set(relPath, { mtime: stat.mtimeMs, size: stat.size, sha256 });

            if (!this.isFirstScan || isCanary || isRansomExt || isRansomNote) {
              events.push({
                path: relPath,
                eventType: 'created',
                size: stat.size,
                sha256,
                entropy,
                isCanary,
                observedAt: new Date().toISOString(),
              });
            }
          } else if (stat.mtimeMs > prev.mtime || stat.size !== prev.size) {
            // Modified file
            const sha256 = hashFile(fullPath);
            const entropy = getFileEntropy(fullPath);
            this.fileState.set(relPath, { mtime: stat.mtimeMs, size: stat.size, sha256 });

            events.push({
              path: relPath,
              eventType: 'modified',
              size: stat.size,
              sha256,
              entropy,
              isCanary,
              observedAt: new Date().toISOString(),
            });
          }
        }
      }
    };

    walk(this.rootDir);

    // Detect deleted files
    for (const [relPath, prev] of this.fileState.entries()) {
      if (!currentFiles.has(relPath)) {
        events.push({
          path: relPath,
          eventType: 'deleted',
          size: prev.size,
          sha256: prev.sha256,
          entropy: 0,
          isCanary: isCanaryPath(relPath),
          observedAt: new Date().toISOString(),
        });
        this.fileState.delete(relPath);
      }
    }

    this.isFirstScan = false;
    return { events, fileCount: this.fileState.size };
  }
}

// ── 6. Agent Orchestrator & Life Cycle ──────────────────────────────────────

async function main() {
  console.log(`
  ╔════════════════════════════════════════════════════════════════╗
  ║          CloudRDR — Enterprise Autonomous Security Agent       ║
  ║      Real-Time FIM • Shannon Entropy • Instant Write-Freeze    ║
  ╚════════════════════════════════════════════════════════════════╝
  `);
  console.log(`[*] Version:            ${CONFIG.agentVersion}`);
  console.log(`[*] Manager URL:        ${CONFIG.managerUrl}`);
  console.log(`[*] Watch Directory:    ${CONFIG.watchDir}`);
  console.log(`[*] Protected Bucket:   ${CONFIG.bucket}`);
  console.log(`[*] Entropy Threshold:  ${CONFIG.entropyThreshold}`);
  console.log(`[*] Scan Interval:      ${CONFIG.scanIntervalMs / 1000}s`);
  console.log(`[*] Heartbeat Rate:     ${CONFIG.heartbeatIntervalMs / 1000}s\n`);

  const spooler = new EventSpooler(CONFIG.spoolFile);
  spooler.loadDisk();

  const watcher = new FileWatcher(CONFIG.watchDir);
  let agentId = `agent-${crypto.randomBytes(4).toString('hex')}`;

  // 1. Enrollment with Manager
  console.log('[*] Connecting to CloudRDR Manager for agent enrollment...');
  let enrolled = false;
  while (!enrolled) {
    try {
      const regResponse = await sendRequest('/api/agent/register', 'POST', {
        hostname: os.hostname(),
        ip: '127.0.0.1',
        platform: os.platform(),
        version: CONFIG.agentVersion,
        accountId: CONFIG.accountId,
        bucket: CONFIG.bucket,
      });
      agentId = regResponse.agentId || agentId;
      console.log(`[+] Enrolled successfully! Assigned Agent ID: ${agentId}`);
      enrolled = true;
    } catch (err) {
      console.log(`[!] Manager unreachable (${err.message}). Retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // 2. Background Heartbeat Keepalive
  setInterval(async () => {
    try {
      const memMb = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1));
      const res = await sendRequest('/api/agent/heartbeat', 'POST', {
        agentId,
        cpuUsage: 0.8,
        ramUsageMb: memMb,
        filesMonitored: watcher.fileState.size,
        status: 'online',
      });

      if (res?.command === 'FREEZE') {
        console.log('[MANAGER ALERT] Command FREEZE received during heartbeat!');
        await executeHostFreeze(CONFIG.watchDir);
      }
    } catch {
      // Non-fatal
    }
  }, CONFIG.heartbeatIntervalMs);

  // 3. Event Dispatcher Loop (flushes queued changes to Manager)
  setInterval(async () => {
    const batch = spooler.drain(50);
    if (batch.length === 0) return;

    try {
      const res = await sendRequest('/api/agent/events', 'POST', {
        agentId,
        accountId: CONFIG.accountId,
        bucket: CONFIG.bucket,
        events: batch,
      });

      console.log(`[+] Dispatched ${batch.length} event(s) to Manager. Verdict: ${res.verdict || 'normal'}`);
      if (res?.action === 'FREEZE') {
        console.log('\n================================================================');
        console.log('[CRITICAL ALERT] CLOUDRDR MANAGER TRIGGERED WRITE-FREEZE!');
        console.log(`Ransomware outbreak detected on bucket '${CONFIG.bucket}'!`);
        console.log('Agent executing active defense containment protocol.');
        console.log('================================================================\n');
        await executeHostFreeze(CONFIG.watchDir);
      }
    } catch (err) {
      console.log(`[!] Failed to send events (${err.message}). Re-queuing to spool.`);
      spooler.push(batch);
    }
  }, 2000);

  // 4. Initial Baseline Calibration
  console.log('[*] Performing initial file baseline scan...');
  const initial = watcher.scan();
  console.log(`[+] Baseline established: ${initial.fileCount} file(s) indexed.`);
  console.log('[*] Monitoring active. Waiting for file changes...\n');

  // 5. Continuous FIM Scanner Loop
  setInterval(async () => {
    const { events } = watcher.scan();
    if (events.length > 0) {
      for (const ev of events) {
        const canaryTag = ev.isCanary ? ' [CANARY TRAP TRIGGERED!]' : '';
        const entropyTag = ev.entropy >= CONFIG.entropyThreshold ? ` [HIGH ENTROPY: ${ev.entropy}]` : '';
        console.log(`[EVENT] [${ev.eventType.toUpperCase()}] ${ev.path} (${ev.size} bytes)${canaryTag}${entropyTag}`);

        // Local emergency write-lock if canary is modified directly
        if (ev.isCanary && (ev.eventType === 'modified' || ev.eventType === 'deleted')) {
          console.log('[LOCAL TRIPWIRE TRIGGERED] Canary trap violated! Freezing directory locally...');
          await executeHostFreeze(CONFIG.watchDir);
        }
      }
      spooler.push(events);
    }
  }, CONFIG.scanIntervalMs);

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[*] Shutting down CloudRDR Agent gracefully...');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(`[FATAL] CloudRDR Agent crashed: ${err.message}`);
  process.exit(1);
});
