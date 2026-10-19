/**
 * @file test/unit/prowlerComponents.test.js
 * Unit tests for Prowler-style Posture Score and Findings Data Layer.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePostureMetrics } from '../../frontend/dashboard/js/components/prowlerPosture.js';
import { getFindingsList } from '../../frontend/dashboard/js/components/prowlerFindings.js';

describe('Prowler-Style UI Components & Posture Calculations', () => {
  it('calculates optimal posture score when no active incidents exist', () => {
    const cleanState = {
      incidents: [
        { id: 'inc-old', severity: 'Critical', status: 'resolved' },
      ],
    };

    const metrics = calculatePostureMetrics(cleanState);
    assert.equal(metrics.score, 96);
    assert.equal(metrics.grade, 'A+');
    assert.equal(metrics.statusTone, 'healthy');
    assert.equal(metrics.severities.critical, 0);
    assert.equal(metrics.severities.passed, 46);
    assert.equal(metrics.fleet.length, 3);
  });

  it('drops posture score and signals critical alert when active ransomware exists', () => {
    const threatState = {
      incidents: [
        {
          id: 'inc-active-01',
          severity: 'Critical',
          status: 'frozen',
          account_id: '192.168.152.148',
        },
      ],
    };

    const metrics = calculatePostureMetrics(threatState);
    assert.ok(metrics.score < 70, 'Score should drop significantly under ransomware');
    assert.equal(metrics.grade, 'F');
    assert.equal(metrics.statusTone, 'critical');
    assert.equal(metrics.severities.critical, 1);
    assert.equal(metrics.fleet[2].ok, false);
  });

  it('generates comprehensive findings list matching Prowler standards', () => {
    const state = {
      incidents: [
        {
          id: 'inc-test-99',
          severity: 'Critical',
          status: 'frozen',
          detection_reason: 'CANARY_MODIFIED',
          canary_triggered: true,
          affected_paths: ['canary/tripwire_sentinel.docx'],
          record_signature: 'sig-test-1234567890',
        },
      ],
    };

    const findings = getFindingsList(state);
    assert.ok(findings.length >= 7, 'Must include incident findings plus standard checks');

    const entropyCheck = findings.find((f) => f.checkId === 'CLOUDRDR-DET-001');
    assert.ok(entropyCheck);
    assert.equal(entropyCheck.status, 'FAIL');
    assert.equal(entropyCheck.severity, 'Critical');

    const canaryCheck = findings.find((f) => f.checkId === 'CLOUDRDR-CAN-002');
    assert.ok(canaryCheck);
    assert.equal(canaryCheck.status, 'FAIL');

    const merkleCheck = findings.find((f) => f.checkId === 'CLOUDRDR-INT-003');
    assert.ok(merkleCheck);
    assert.equal(merkleCheck.status, 'PASS');
  });
});
