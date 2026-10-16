/**
 * @file test/unit/engineEnhancements.test.js
 * Comprehensive unit tests for Detection Engine 3.0:
 *   1. Multi-vector threat risk scoring (0-100) & MITRE ATT&CK mapping
 *   2. Process & command-line heuristics (vssadmin, shadow copy deletion, suspicious interpreters)
 *   3. Intelligent noise filtering for build/cache directories
 *   4. Slow-burn trickle detection integration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeThreatScore } from '../../backend/src/detection/scoring.js';
import { scanProcessAnomalies } from '../../backend/src/detection/processHeuristics.js';
import { filterNoiseEvents, isNoisePath } from '../../backend/src/detection/noiseFilter.js';
import { evaluateSynthetic } from '../../backend/src/detection/detectionEngine.js';

describe('Detection Engine 3.0 — Threat Scoring & MITRE Attribution', () => {
  it('computes low risk score for benign activity with no indicators', () => {
    const result = computeThreatScore({
      changeRate: 0.02,
      suspiciousRate: 0.1,
      ransomwareRate: 0.3,
    });

    assert.equal(result.riskScore, 0);
    assert.equal(result.threatLevel, 'BENIGN');
    assert.equal(result.mitreTechniques.length, 0);
  });

  it('assigns CRITICAL threat level and maps T1486 & T1491.001 when canary & ransom notes trigger', () => {
    const result = computeThreatScore({
      canaryTriggered: true,
      ransomNotesCount: 1,
      ransomwareExtensionsCount: 2,
      entropyTriggered: true,
      highEntropyFilesCount: 3,
      meanEntropy: 7.8,
    });

    assert.ok(result.riskScore >= 80, `Expected score >= 80, got ${result.riskScore}`);
    assert.equal(result.threatLevel, 'CRITICAL');
    assert.ok(result.confidence >= 0.9);

    const techniqueIds = result.mitreTechniques.map((t) => t.id);
    assert.ok(techniqueIds.includes('T1486'));
    assert.ok(techniqueIds.includes('T1491.001'));
  });

  it('exempts allowlisted accounts from threat score and techniques', () => {
    const result = computeThreatScore({
      canaryTriggered: true,
      ransomNotesCount: 5,
      isAllowlisted: true,
    });

    assert.equal(result.riskScore, 0);
    assert.equal(result.threatLevel, 'BENIGN');
    assert.equal(result.mitreTechniques.length, 0);
  });
});

describe('Detection Engine 3.0 — Process & Command-Line Heuristics', () => {
  it('detects volume shadow copy deletion commands (vssadmin, wmic, bcdedit)', () => {
    const events = [
      {
        path: 'data/file1.docx',
        cmdline: 'vssadmin.exe delete shadows /all /quiet',
        process_name: 'vssadmin.exe',
      },
      {
        path: 'data/file2.xlsx',
        cmdline: 'bcdedit.exe /set {default} recoveryenabled no',
        process_name: 'bcdedit.exe',
      },
    ];

    const result = scanProcessAnomalies(events);
    assert.equal(result.shadowCopyTampering, true);
    assert.equal(result.suspiciousProcessTriggered, true);
    assert.equal(result.detectedCommands.length, 2);
    assert.equal(result.processAnomalies.length, 2);
  });

  it('detects suspicious script host interpreters modifying protected files', () => {
    const events = [
      {
        path: 'contracts/document.pdf',
        process_name: 'powershell.exe',
        cmdline: 'powershell.exe -ExecutionPolicy Bypass -File encrypt.ps1',
      },
    ];

    const result = scanProcessAnomalies(events);
    assert.equal(result.suspiciousProcessTriggered, true);
    assert.ok(result.suspiciousProcesses.includes('powershell.exe'));
  });

  it('returns clean report for normal application file writes', () => {
    const events = [
      {
        path: 'reports/q3.xlsx',
        process_name: 'excel.exe',
        cmdline: 'excel.exe reports/q3.xlsx',
      },
    ];

    const result = scanProcessAnomalies(events);
    assert.equal(result.shadowCopyTampering, false);
    assert.equal(result.suspiciousProcessTriggered, false);
    assert.equal(result.detectedCommands.length, 0);
  });
});

describe('Detection Engine 3.0 — Intelligent Noise Filtering', () => {
  it('correctly identifies developer and build noise paths', () => {
    assert.equal(isNoisePath('project/node_modules/express/index.js'), true);
    assert.equal(isNoisePath('project/.git/objects/4b/825dc642cb6eb9a0'), true);
    assert.equal(isNoisePath('project/dist/bundle.js.tmp'), true);
    assert.equal(isNoisePath('project/build/app.cache'), true);

    // Business files must NOT be noise
    assert.equal(isNoisePath('finance/q4_earnings.xlsx'), false);
    assert.equal(isNoisePath('blueprints/building_plan.dwg'), false);
  });

  it('filters noise events but strictly preserves canary bait files', () => {
    const events = [
      { path: 'node_modules/lodash/package.json', event_type: 'modified' },
      { path: '.git/index', event_type: 'modified' },
      { path: 'target/classes/App.class.tmp', event_type: 'created' },
      { path: 'canary/financial_trap.xlsx', event_type: 'deleted', is_canary: true },
      { path: 'finance/budget_2026.xlsx', event_type: 'modified' },
    ];

    const { filteredEvents, noiseFilteredCount } = filterNoiseEvents(events, {
      canaryPaths: ['canary/financial_trap.xlsx'],
    });

    assert.equal(noiseFilteredCount, 3);
    assert.equal(filteredEvents.length, 2);
    assert.ok(filteredEvents.some((e) => e.path === 'canary/financial_trap.xlsx'));
    assert.ok(filteredEvents.some((e) => e.path === 'finance/budget_2026.xlsx'));
  });
});

describe('Detection Engine 3.0 — Synthetic Multi-Vector Evaluation', () => {
  it('evaluates ransomware burst with full risk score, confidence, and MITRE mapping', () => {
    const now = new Date();
    const events = [
      {
        path: 'shares/doc1.pdf.lockbit',
        observed_at: now.toISOString(),
        event_type: 'modified',
        entropy: 7.9,
      },
      {
        path: 'shares/doc2.xlsx.lockbit',
        observed_at: now.toISOString(),
        event_type: 'modified',
        entropy: 7.85,
      },
      {
        path: 'shares/HOW_TO_DECRYPT.txt',
        observed_at: now.toISOString(),
        event_type: 'created',
      },
      {
        path: 'shares/database.mdf',
        observed_at: now.toISOString(),
        cmdline: 'vssadmin delete shadows /all /quiet',
        process_name: 'vssadmin.exe',
      },
    ];

    const evaluation = evaluateSynthetic({
      events,
      totalProtectedFiles: 20,
      now,
    });

    assert.equal(evaluation.verdict, 'ransomware');
    assert.ok(evaluation.riskScore >= 75);
    assert.equal(evaluation.threatLevel, 'CRITICAL');
    assert.ok(evaluation.confidence >= 0.95);
    assert.equal(evaluation.shadowCopyTampering, true);
    assert.ok(evaluation.mitreTechniques.some((m) => m.id === 'T1486'));
    assert.ok(evaluation.mitreTechniques.some((m) => m.id === 'T1490'));
    assert.ok(evaluation.mitreTechniques.some((m) => m.id === 'T1491.001'));
  });
});
