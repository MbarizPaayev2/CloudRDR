/**
 * @file test/unit/heuristics.test.js
 * Unit tests for Engine 2.0 advanced heuristics:
 *   - Ransomware extension anomaly detection
 *   - Ransom note IoC scanning
 *   - Magic byte header corruption verification
 *   - Cumulative baseline drift tracking
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanHeuristicSignatures,
  verifyMagicBytes,
  computeCumulativeDrift,
} from '../../backend/src/detection/heuristics.js';
import { evaluateSynthetic } from '../../backend/src/detection/detectionEngine.js';

describe('Detection Engine 2.0 — Advanced Heuristics', () => {
  it('detects known malicious ransomware extensions (.locked, .enc, .lockbit)', () => {
    const events = [
      { path: 'finance/q4_report.pdf.locked' },
      { path: 'blueprints/schematic.dwg.enc' },
      { path: 'users/database.sqlite.lockbit' },
      { path: 'normal/readme.md' },
    ];

    const result = scanHeuristicSignatures(events);
    assert.equal(result.heuristicTriggered, true);
    assert.equal(result.ransomwareExtensionsFound.length, 3);
    assert.ok(result.ransomwareExtensionsFound.includes('finance/q4_report.pdf.locked'));
  });

  it('detects dropped ransom note IoCs (README_RESTORE.txt, DECRYPT_FILES.html)', () => {
    const events = [
      { path: 'finance/how_to_decrypt.txt' },
      { path: 'documents/restore_files.html' },
      { path: 'assets/logo.png' },
    ];

    const result = scanHeuristicSignatures(events);
    assert.equal(result.heuristicTriggered, true);
    assert.equal(result.ransomNotesFound.length, 2);
  });

  it('triggers ransomware verdict when ransom note is present even if change rate is low', () => {
    const events = [
      {
        path: 'contracts/HOW_TO_DECRYPT.txt',
        event_type: 'created',
        observed_at: new Date().toISOString(),
      },
    ];

    // Total files 100, only 1 file changed (1% change rate, well below 30% threshold)
    const evaluation = evaluateSynthetic({
      events,
      totalProtectedFiles: 100,
    });

    assert.equal(evaluation.verdict, 'ransomware');
    assert.equal(evaluation.heuristicTriggered, true);
    assert.equal(evaluation.ransomNotesFound.length, 1);
  });

  it('verifies valid magic bytes and rejects corrupted/encrypted file headers', () => {
    // Valid PDF header: %PDF
    const validPdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    assert.equal(verifyMagicBytes('contracts/nda.pdf', validPdfHeader), true);

    // Encrypted/Scrambled header (AES-256 ciphertext bytes replacing magic number)
    const scrambledHeader = Buffer.from([0x8a, 0x1f, 0xc3, 0x9b, 0x42, 0x77, 0x01, 0xee]);
    assert.equal(verifyMagicBytes('contracts/nda.pdf', scrambledHeader), false);

    // Valid PNG header: \x89PNG
    const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(verifyMagicBytes('images/logo.png', validPngHeader), true);
    assert.equal(verifyMagicBytes('images/logo.png', scrambledHeader), false);
  });

  it('computes cumulative baseline drift to catch slow-burn (trickle) encryption', () => {
    // 100 total files, 18 files drifted (18% cumulative drift > 15% threshold)
    const drift = computeCumulativeDrift(100, 18, 0.15);
    assert.equal(drift.driftRatio, 0.18);
    assert.equal(drift.driftExceeded, true);

    // Normal drift (5%)
    const normalDrift = computeCumulativeDrift(100, 5, 0.15);
    assert.equal(normalDrift.driftRatio, 0.05);
    assert.equal(normalDrift.driftExceeded, false);
  });
});
