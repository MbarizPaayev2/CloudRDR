/**
 * @file test/unit/complianceFrameworks.test.js
 *
 * Unit tests for CloudRDR Compliance Engine & JSON:API Endpoints.
 * Validates compliance mapping against CIS AWS v3.0, NIST CSF v2.0, ISO 27001, and HIPAA.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCompliance, COMPLIANCE_FRAMEWORKS } from '../../backend/src/compliance/frameworks.js';
import { ATTACK_PATHS, getAttackPathsCypher } from '../../backend/src/contracts/attackPaths.js';
import { buildServer } from '../../backend/src/api/server.js';

describe('Compliance Frameworks & Attack Paths (Prowler Skills)', () => {
  it('evaluates all 4 frameworks with 100% score under fully nominal posture', () => {
    const nominalState = {
      versioningEnabled: true,
      encryptionEnabled: true,
      immutableRetentionEnabled: true,
      automatedFreezeReady: true,
      hasActiveBaseline: true,
      engineStatus: 'active',
      canariesArmed: true,
      restoreHealthy: true,
      auditChainValid: true,
    };

    const res = evaluateCompliance(nominalState);
    assert.equal(res.overallScore, 100);
    assert.equal(res.totalPassing, res.totalControls);
    assert.ok(res.totalControls >= 15);

    assert.equal(res.frameworks.cis_aws_v30.status, 'COMPLIANT');
    assert.equal(res.frameworks.nist_csf_v20.status, 'COMPLIANT');
    assert.equal(res.frameworks.iso_27001_2022.status, 'COMPLIANT');
    assert.equal(res.frameworks.hipaa_164_312.status, 'COMPLIANT');
  });

  it('detects missing baseline and flags NIST and HIPAA controls as FAIL', () => {
    const degradedState = {
      versioningEnabled: true,
      encryptionEnabled: true,
      immutableRetentionEnabled: true,
      automatedFreezeReady: true,
      hasActiveBaseline: false, // Baseline missing!
      engineStatus: 'active',
      canariesArmed: false,    // Canaries disarmed!
      restoreHealthy: true,
      auditChainValid: true,
    };

    const res = evaluateCompliance(degradedState);
    assert.ok(res.overallScore < 100);

    const nist = res.frameworks.nist_csf_v20;
    assert.ok(nist.score < 100);
    const merkleCtrl = nist.controls.find((c) => c.checkKey === 'merkle_baseline');
    assert.equal(merkleCtrl.status, 'FAIL');
  });

  it('provides valid openCypher attack path queries and mitigations', () => {
    const cypher = getAttackPathsCypher();
    assert.ok(cypher.includes('MATCH (attacker:ThreatActor)'));
    assert.ok(cypher.includes('ImmutableVault'));

    assert.ok(Array.isArray(ATTACK_PATHS));
    assert.equal(ATTACK_PATHS.length, 3);
    assert.equal(ATTACK_PATHS[0].id, 'path-s3-mass-encrypt');
    assert.equal(ATTACK_PATHS[1].id, 'path-canary-tamper');
  });

  it('serves JSON:API v1.1 compliance routes on Fastify server', async () => {
    const app = await buildServer({ enableLogger: false });

    // 1. GET /api/compliance/summary
    const summaryRes = await app.inject({
      method: 'GET',
      url: '/api/compliance/summary',
      headers: { 'x-api-key': 'cloudrdr-default-key-2026' },
    });

    assert.equal(summaryRes.statusCode, 200);
    const summaryBody = JSON.parse(summaryRes.body);
    assert.equal(summaryBody.jsonapi?.version, '1.1');
    assert.equal(summaryBody.data?.type, 'compliance-summary');
    assert.ok(summaryBody.data?.attributes?.frameworkScores?.length >= 4);

    // 2. GET /api/compliance/frameworks
    const fwRes = await app.inject({
      method: 'GET',
      url: '/api/compliance/frameworks',
      headers: { 'x-api-key': 'cloudrdr-default-key-2026' },
    });

    assert.equal(fwRes.statusCode, 200);
    const fwBody = JSON.parse(fwRes.body);
    assert.equal(fwBody.jsonapi?.version, '1.1');
    assert.ok(Array.isArray(fwBody.data));
    assert.equal(fwBody.data.length, 4);

    await app.close();
  });
});
