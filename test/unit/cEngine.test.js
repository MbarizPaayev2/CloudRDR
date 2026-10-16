/**
 * @file test/unit/cEngine.test.js
 *
 * Automated verification of CloudRDR C Native Engine & Agent:
 * - Shannon Byte Entropy calculation
 * - Binary Pairwise Merkle DAG computation
 * - Standalone CLI execution
 * - Manager download route (/api/agent/download/c)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { merkleRoot } from '../../backend/src/crypto/index.js';
import { buildServer } from '../../backend/src/api/server.js';

describe('CloudRDR C Native Low-Level Engine Suite', () => {
  const isWindows = process.platform === 'win32';
  const binExt = isWindows ? '.exe' : '';
  const agentBin = path.resolve(`agent-c/bin/cloudrdr-agent${binExt}`);
  const entropyBin = path.resolve(`agent-c/bin/cloudrdr-entropy${binExt}`);
  const merkleBin = path.resolve(`agent-c/bin/cloudrdr-merkle${binExt}`);

  it('compiles and outputs binary executables in agent-c/bin/', () => {
    assert.ok(fs.existsSync(entropyBin), 'cloudrdr-entropy binary exists');
    assert.ok(fs.existsSync(merkleBin), 'cloudrdr-merkle binary exists');
    assert.ok(fs.existsSync(agentBin), 'cloudrdr-agent binary exists');
  });

  it('cloudrdr-entropy correctly analyzes byte entropy of structured text vs random bytes', () => {
    // 1. Plain text file (package.json)
    const textOut = execFileSync(entropyBin, ['package.json'], { encoding: 'utf8' });
    assert.ok(textOut.includes('Global Entropy:'), 'calculates global entropy');
    assert.ok(textOut.includes('NORMAL_STRUCTURED_PLAINTEXT'), 'identifies safe plaintext');

    // 2. High-entropy synthetic ransomware payload
    const tmpFile = path.resolve('data/test-entropy-high.tmp');
    const randomBytes = Buffer.alloc(8192);
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    fs.writeFileSync(tmpFile, randomBytes);

    try {
      execFileSync(entropyBin, [tmpFile], { encoding: 'utf8' });
      assert.fail('Expected non-zero exit code for ransomware encrypted threat');
    } catch (err) {
      assert.equal(err.status, 3, 'Exits with code 3 on likely encrypted threat');
      assert.ok(err.stdout.includes('RANSOMWARE_ENCRYPTED_CIPHERTEXT'), 'detects critical encryption threat');
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('cloudrdr-merkle matches JavaScript crypto.merkleRoot with identical SHA-256 output', () => {
    const testFiles = ['package.json', 'Dockerfile', 'README.md'];
    const cOut = execFileSync(merkleBin, testFiles, { encoding: 'utf8' });

    // Extract Merkle Root line: "Merkle Root:  <hash>"
    const match = cOut.match(/Merkle Root:\s+([a-f0-9]{64})/i);
    assert.ok(match, 'Merkle root regex matched in C output');
    const cRoot = match[1].toLowerCase();

    // Calculate identical root with Node.js crypto engine
    const nodeHashes = testFiles.map((f) => {
      const content = fs.readFileSync(path.resolve(f));
      return crypto.createHash('sha256').update(content).digest('hex');
    });

    const expectedNodeRoot = merkleRoot(nodeHashes);
    assert.equal(cRoot, expectedNodeRoot, 'C Merkle root matches JavaScript Merkle root exactly');
  });

  it('cloudrdr-agent executes single autonomous cycle with --once flag', () => {
    const agentOut = execFileSync(
      agentBin,
      ['--watch', './data/local-storage', '--once'],
      { encoding: 'utf8' }
    );
    assert.ok(agentOut.includes('CloudRDR High-Performance C Autonomous Monitoring Agent'), 'banner printed');
    assert.ok(agentOut.includes('Verdict:'), 'evaluates security verdict');
    assert.ok(agentOut.includes('CloudRDR C Agent cycle finished'), 'clean termination');
  });

  it('Fastify manager serves C agent source, systemd unit, and Linux installer', async () => {
    const app = await buildServer({ enableLogger: false });
    try {
      const resC = await app.inject({ method: 'GET', url: '/api/agent/download/c' });
      assert.equal(resC.statusCode, 200);
      assert.ok(resC.body.includes('CloudRDR Autonomous Storage Monitoring Agent Daemon in C'));
      assert.ok(resC.headers['content-disposition'].includes('cloudrdr-agent.c'));

      const resSysd = await app.inject({ method: 'GET', url: '/api/agent/systemd.service' });
      assert.equal(resSysd.statusCode, 200);
      assert.ok(resSysd.body.includes('ExecStart=/usr/local/bin/cloudrdr-agent'));
      assert.ok(resSysd.body.includes('WantedBy=multi-user.target'));

      const resInst = await app.inject({ method: 'GET', url: '/api/agent/install-c.sh' });
      assert.equal(resInst.statusCode, 200);
      assert.ok(resInst.body.includes('cloudrdr-agent'));
      assert.ok(resInst.body.includes('systemctl daemon-reload'));
    } finally {
      await app.close();
    }
  });
});
