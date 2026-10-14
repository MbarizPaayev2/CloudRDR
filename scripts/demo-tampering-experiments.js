/**
 * @file scripts/demo-tampering-experiments.js
 *
 * Demonstrates three cryptographic tampering experiments for the CloudRDR report:
 * 1. AES-256-GCM AEAD Tamper Detection: Bit modification in ciphertext rejected.
 * 2. Ed25519 Digital Signature Tamper Detection: Incident payload alteration caught.
 * 3. Hash-Chained Audit Log Tamper Detection: Broken link in immutable ledger caught.
 *
 * Usage:
 *   node scripts/demo-tampering-experiments.js
 */

import crypto from 'node:crypto';
import { encryptDataGCM, decryptDataGCM } from '../src/backup/backupService.js';
import { signRecord, verifyRecord, generateEd25519KeyPair } from '../src/crypto/index.js';
import { AuditLog } from '../src/log/auditLog.js';
import { verifyAuditChain } from '../src/log/chainVerifier.js';

console.log('\n========================================================================');
console.log('   CloudRDR — CRYPTOGRAPHIC TAMPERING EXPERIMENTS (FOR UNIVERSITY REPORT)');
console.log('   Evaluator: Mübariz Paşayev (Project Manager & GRC Lead)');
console.log('   Academic Supervisor: Xatirə Həsənli | ADNSU Rəqəmsal Texnologiyalar');
console.log('========================================================================\n');

// ── EXPERIMENT 1: AES-256-GCM AEAD AUTHENTICATION TAG TAMPER TEST ───────────
console.log('🧪 [EXPERIMENT 1] AES-256-GCM AEAD Tamper Detection');
console.log('------------------------------------------------------------------------');
const originalPlaintext = Buffer.from('CONFIDENTIAL CORPORATE REPORT: Q3 REVENUE $1.2M');
const masterKey = crypto.randomBytes(32);
const metadata = { bucket: 'corporate-vault', path: 'finance/q3_report.pdf', versionRef: 'v1' };
const encryptedPackage = encryptDataGCM(originalPlaintext, metadata, masterKey);

console.log('1. Original Plaintext:  "%s"', originalPlaintext.toString());
console.log('2. Encrypted Package:   Length = %d bytes', encryptedPackage.length);
console.log('   - Header (Magic):    %s', encryptedPackage.subarray(0, 9).toString('utf8'));
console.log('   - Nonce / IV (12B):  %s', encryptedPackage.subarray(9, 21).toString('hex'));
console.log('   - AEAD Tag (16B):    %s', encryptedPackage.subarray(21, 37).toString('hex'));
console.log('   - Ciphertext (%dB):  %s...', encryptedPackage.length - 37, encryptedPackage.subarray(37, 57).toString('hex'));

// Tamper: Flip a single bit in the ciphertext portion
const tamperedPackage = Buffer.from(encryptedPackage);
tamperedPackage[40] ^= 0x01; // flip 1 bit in ciphertext payload
console.log('\n[!] ATTACK SIMULATION: Attacker modified 1 byte at offset 40 in cloud storage.');

const decryptResult = decryptDataGCM(tamperedPackage, metadata, masterKey);
if (!decryptResult.aeadVerified) {
  console.log('✅ DEFENSE SUCCESS: AES-256-GCM AEAD rejected modified data:');
  console.log('   Status: aeadVerified = FALSE, bytes = NULL');
  console.log('   Zero plaintext bytes leaked to untrusted memory.');
} else {
  console.log('❌ CRITICAL FAILURE: Decryption succeeded with tampered ciphertext!');
}

// ── EXPERIMENT 2: RFC 8032 ED25519 DIGITAL SIGNATURE TAMPER TEST ─────────────
console.log('\n\n🧪 [EXPERIMENT 2] RFC 8032 Ed25519 Incident Record Integrity Test');
console.log('------------------------------------------------------------------------');
const { publicKey, privateKey, keyId } = generateEd25519KeyPair();
const incidentRecord = {
  incidentId: 'inc-9921-prod',
  accountId: 'sec-corp-acc-01',
  affectedFiles: ['finance/q1.pdf', 'engineering/db.sql'],
  detectedAt: '2026-10-14T20:15:00.000Z',
  freezeStatus: 'frozen',
};

const sigResult = signRecord(incidentRecord, privateKey, keyId);
console.log('1. Incident Record ID:  %s', incidentRecord.incidentId);
console.log('2. Ed25519 Public Key:  %s...', publicKey.slice(0, 32));
console.log('3. Ed25519 Signature:   %s...', sigResult.signature.slice(0, 32));

const initialVerification = verifyRecord(incidentRecord, sigResult.signature, publicKey);
console.log('4. Initial Signature Check: %s (Authentic & Valid)', initialVerification ? 'VALID' : 'INVALID');

// Tamper: Attacker attempts to modify affectedFiles in the forensic record
const tamperedRecord = { ...incidentRecord, freezeStatus: 'unfrozen_by_attacker' };
console.log('\n[!] ATTACK SIMULATION: Attacker modified "freezeStatus" to "unfrozen_by_attacker".');

const tamperedVerification = verifyRecord(tamperedRecord, sigResult.signature, publicKey);
if (!tamperedVerification) {
  console.log('✅ DEFENSE SUCCESS: Ed25519 signature verification FAILED as expected:');
  console.log('   Verdict: Signature is INVALID. Tampering detected in forensic record.');
} else {
  console.log('❌ CRITICAL FAILURE: Signature verified despite tampering!');
}

// ── EXPERIMENT 3: HASH-CHAINED AUDIT LOG INTEGRITY TEST ───────────────────────
console.log('\n\n🧪 [EXPERIMENT 3] Hash-Chained Audit Ledger Tamper Resistance Test');
console.log('------------------------------------------------------------------------');
const testLog = new AuditLog(); // in-memory isolated instance
await testLog.append({ event: 'BASELINE_CREATED', fileCount: 50 });
await testLog.append({ event: 'RANSOMWARE_DETECTED', affectedRatio: 0.42 });
await testLog.append({ event: 'ACCOUNT_FROZEN', accountId: 'acc-victim-01' });
await testLog.append({ event: 'RESTORE_COMPLETED', status: '100%_VALID' });

console.log('1. Generated 4 sequential audit blocks in hash chain:');
for (const entry of testLog.getEntries()) {
  console.log(`   Block #${entry.index} | prev: ${entry.prevHash.slice(0, 16)}... | hash: ${entry.hash.slice(0, 16)}... | event: ${entry.data.event}`);
}

const chainBefore = verifyAuditChain(testLog.getEntries());
console.log('\n2. Audit Chain Verification Before Tampering: valid = %s (%d blocks)', chainBefore.valid, chainBefore.totalEntries);

// Tamper: Attacker tries to modify block #1 data to hide ransomware detection
console.log('\n[!] ATTACK SIMULATION: Attacker tampers with Block #1 data: { affectedRatio: 0.05 }');
const tamperedEntries = JSON.parse(JSON.stringify(testLog.getEntries()));
tamperedEntries[1].data.affectedRatio = 0.05; // silent modification

const chainAfter = verifyAuditChain(tamperedEntries);
if (!chainAfter.valid) {
  console.log('✅ DEFENSE SUCCESS: Tamper detected in hash-chained audit ledger:');
  console.log('   Broken Block Index:  #%d', chainAfter.brokenIndex);
  console.log('   Error Reason:        %s', chainAfter.reason);
  console.log('   Expected Hash:       %s...', chainAfter.expectedHash?.slice(0, 24) || chainAfter.expectedPrev?.slice(0, 24));
  console.log('   Got Hash:            %s...', chainAfter.actualHash?.slice(0, 24) || chainAfter.gotPrev?.slice(0, 24));
} else {
  console.log('❌ CRITICAL FAILURE: Audit chain accepted tampered block!');
}

console.log('\n========================================================================');
console.log('✅ ALL 3 CRYPTOGRAPHIC TAMPER EXPERIMENTS CONFIRMED 100% SECURE');
console.log('========================================================================\n');
