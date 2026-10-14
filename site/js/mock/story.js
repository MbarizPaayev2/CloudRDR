/**
 * @file site/js/mock/story.js
 * CloudRDR Interactive Story Choreographer.
 * Runs the complete attack-to-recovery narrative with the Merkle tree as the star.
 */

import { getState, setState } from '../state.js';
import { _addMockIncident, _addMockAuditBlock } from './mockApi.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the full simulated ransomware attack, containment, and verified recovery narrative.
 * @param {(statusText: string) => void} [onProgress]
 */
export async function playStory(onProgress = () => {}) {
  const state = getState();
  if (state.isStoryPlaying) return;

  setState({ isStoryPlaying: true });
  document.body.classList.remove('attack-active');

  try {
    // ── STAGE 1: Calm Baseline ─────────────────────────────────────────────
    onProgress('Stage 1/6: Storage bucket baseline verified. All 16 leaves intact.');
    setState({
      verdict: 'normal',
      changeRate: 0.02,
      canaryTriggered: false,
      accountFrozen: false,
      corruptedLeaves: new Set(),
      restoredLeaves: new Set(),
      currentRootHash: state.baseline.merkle_root,
      storyStep: 'Baseline verified',
    });
    await sleep(2200);

    // ── STAGE 2: Attack Velocity Surge ─────────────────────────────────────
    onProgress('Stage 2/6: Velocity spike! Rapid file modification rate exceeds 30% threshold.');
    setState({
      verdict: 'suspicious',
      changeRate: 0.22,
      storyStep: 'Rapid modifications detected',
    });
    await sleep(1800);

    // ── STAGE 3: Canary Decoy Touched & Ransomware Alert ──────────────────
    onProgress('Stage 3/6: TRIPWIRE TRIGGERED! Attacker encrypted canary decoy file.');
    document.body.classList.add('attack-active');
    setState({
      verdict: 'ransomware',
      changeRate: 0.48,
      canaryTriggered: true,
      canaryTriggeredAt: new Date().toISOString(),
      storyStep: 'Canary tripped — Ransomware confirmed',
    });
    await sleep(1500);

    // ── STAGE 4: Corruption Climbs the Merkle Tree ─────────────────────────
    onProgress('Stage 4/6: Leaves corrupting. Hash mismatch climbing the Merkle DAG.');
    const attackLeaves = [0, 1, 4, 7, 8, 11, 14];
    const corruptedSet = new Set();

    for (const leafIndex of attackLeaves) {
      corruptedSet.add(leafIndex);
      setState({
        corruptedLeaves: new Set(corruptedSet),
        currentRootHash: '00000000_TAMPERED_ROOT_HASH_' + Math.random().toString(16).slice(2, 10),
      });
      await sleep(350);
    }
    await sleep(1200);

    // ── STAGE 5: Sub-10s Cryo-Lock & Incident Signed ───────────────────────
    onProgress('Stage 5/6: Automated IAM freeze attached. Compromised account locked.');
    const incidentId = `inc-${Date.now().toString(16).slice(-6)}`;
    const newIncident = {
      id: incidentId,
      detection_run_id: `run-${Date.now().toString(16).slice(-4)}`,
      account_id: 'acc-cloudrdr-prod',
      status: 'frozen',
      affected_paths: [
        'canary/tripwire_sentinel.docx',
        'finance/q4_forecast.xlsx',
        'engineering/core_daemon.tar.gz',
        'legal/patents/merkle_scheme.pdf',
      ],
      detected_at: new Date().toISOString(),
      frozen_at: new Date().toISOString(),
      resolved_at: null,
      record_signature: '91f8a70c2e4b5d6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
      signing_key_id: 'ed25519-hsm-slot-0',
    };

    _addMockIncident(newIncident);
    setState({
      accountFrozen: true,
      frozenAt: new Date().toISOString(),
      activeIncident: newIncident,
      incidents: [newIncident, ...state.incidents],
      storyStep: 'Account frozen — Incident signed with Ed25519',
    });
    await sleep(2400);

    // ── STAGE 6: Cryptographic Recovery Verification ───────────────────────
    onProgress('Stage 6/6: Starting AEAD verified recovery. Re-hashing every leaf against baseline.');
    setState({
      verdict: 'suspicious',
      storyStep: 'Verifying decrypted backup blobs',
    });

    const restoredSet = new Set();
    for (const leafIndex of attackLeaves) {
      restoredSet.add(leafIndex);
      corruptedSet.delete(leafIndex);
      setState({
        corruptedLeaves: new Set(corruptedSet),
        restoredLeaves: new Set(restoredSet),
      });
      await sleep(380);
    }

    // ── CONCLUSION: 100% Verified & Incident Closed ────────────────────────
    newIncident.status = 'resolved';
    newIncident.resolved_at = new Date().toISOString();

    const auditBlock = {
      index: state.auditLog.length,
      prev_hash: state.auditLog[state.auditLog.length - 1]?.hash || '0000000000000000000000000000000000000000000000000000000000000000',
      hash: 'fa9021bc87123de458129034feab0912cb84ef92a17013c72b892a0149e01fbc',
      action: 'INCIDENT_RESOLVED_100_VERIFIED',
      timestamp: new Date().toISOString(),
      data: { incident_id: newIncident.id, verified_files: 16, root_restored: true },
    };
    _addMockAuditBlock(auditBlock);

    document.body.classList.remove('attack-active');
    setState({
      verdict: 'normal',
      changeRate: 0.01,
      canaryTriggered: false,
      accountFrozen: false,
      corruptedLeaves: new Set(),
      restoredLeaves: new Set(),
      currentRootHash: state.baseline.merkle_root,
      auditLog: [...state.auditLog, auditBlock],
      storyStep: 'Recovery 100% complete — Merkle Root matches baseline',
      isStoryPlaying: false,
    });

    onProgress('Story completed: 100% verified recovery. Cryptographic proof confirmed.');
  } catch (err) {
    console.error('Story playback error:', err);
    setState({ isStoryPlaying: false });
    document.body.classList.remove('attack-active');
    onProgress(`Error: ${err.message}`);
  }
}
