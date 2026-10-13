/**
 * @file scripts/dev-simulate-attack.js
 *
 * Ransomware Attack Simulator & Verification Harness.
 * Executes the entire lifecycle end-to-end:
 *   1. Seeds clean protected files & establishes baseline.
 *   2. Simulates a mass-encryption ransomware attack (40% modification).
 *   3. Monitor agent detects the spike exceeding threshold.
 *   4. Detection engine issues ransomware verdict.
 *   5. Response service freezes the cloud account & signs incident record.
 *   6. Verified restore recovers files & verifies against baseline hashes.
 *   7. Validates restored files are 100% VALID.
 *
 * Usage:
 *   npm run simulate
 */

import { getStorageAdapter } from '../src/adapters/storage/index.js';
import { createBaseline } from '../src/baseline/baselineService.js';
import { MonitorAgent } from '../src/monitor/monitorAgent.js';
import { startRestore } from '../src/restore/restoreService.js';
import { listIncidents } from '../src/response/incidentService.js';
import { sleep } from '../src/utils/time.js';

async function main() {
  const bucket = 'simulation-bucket';
  const accountId = 'simulated-victim-acc';
  const storage = await getStorageAdapter();

  console.log('\n===============================================================');
  console.log('   CloudRDR  –  End-to-End Ransomware Attack & Recovery Test');
  console.log('===============================================================\n');

  // STEP 1: Seed Clean Files
  console.log('📦 Step 1: Seeding 20 protected files in bucket...');
  const totalFiles = 20;
  for (let i = 1; i <= totalFiles; i++) {
    await storage.write(
      bucket,
      `corporate/doc_${i}.txt`,
      `Original Confidential Document #${i} — Confidentiality Level: HIGH`
    );
  }
  console.log(`   ✓ Created ${totalFiles} clean files in storage`);

  // STEP 2: Baseline Capture
  console.log('\n🔒 Step 2: Capturing cryptographic SHA-256 baseline & Merkle root...');
  const baseline = await createBaseline(bucket);
  console.log(`   ✓ Baseline version: v${baseline.version}`);
  console.log(`   ✓ Files baselined:  ${baseline.fileCount}`);
  console.log(`   ✓ Merkle Root:      ${baseline.merkleRoot}`);

  // STEP 3: Initialise Monitor Agent
  console.log('\n📡 Step 3: Starting Monitor Agent cycle to calibrate initial state...');
  const monitor = new MonitorAgent({ bucket, accountId, intervalSeconds: 60 });
  await monitor.runCycle();
  console.log('   ✓ Monitor agent calibrated against baseline');

  // STEP 4: Simulate Ransomware Attack
  console.log('\n💀 Step 4: [ATTACK IN PROGRESS] Simulating ransomware payload...');
  const attackCount = 10; // 10 / 20 = 50% > 30% threshold
  for (let i = 1; i <= attackCount; i++) {
    await storage.write(
      bucket,
      `corporate/doc_${i}.txt`,
      `[LOCKED BY RANSOMWARE] All files encrypted with AES-256! Pay 2.5 BTC to restore.`
    );
  }
  console.log(
    `   ⚠️ Attacker modified ${attackCount} files (${(attackCount / totalFiles) * 100}% of protected data)`
  );

  // STEP 5: Monitor & Detection Cycle
  console.log('\n🔍 Step 5: Monitor agent polling storage for changes...');
  const changeEvents = await monitor.runCycle();
  console.log(`   ✓ Monitor detected ${changeEvents.length} modified files`);

  // Allow async response handler queue to process
  await sleep(150);

  // STEP 6: Verify Incident & Freeze
  console.log('\n🚨 Step 6: Verifying automated response actions...');
  const incidents = await listIncidents({ accountId });
  if (incidents.length === 0) {
    throw new Error('FAILED: No incident was generated!');
  }
  const incident = incidents[0];
  console.log(`   ✓ Incident ID:     ${incident.id}`);
  console.log(`   ✓ Account Status:  ${incident.status.toUpperCase()} (IAM write freeze active)`);
  console.log(`   ✓ Digital Sign:    ${incident.record_signature?.slice(0, 32)}...`);
  console.log(`   ✓ Signing Key ID:  ${incident.signing_key_id}`);
  console.log(`   ✓ Affected Files:  ${incident.affected_paths.length}`);

  // STEP 7: Verified Restore
  console.log('\n🛡️ Step 7: Initiating verified restore from encrypted backup...');
  const restoreReport = await startRestore(incident.id);

  console.log('\n===============================================================');
  console.log('   RESTORE EXECUTION REPORT');
  console.log('===============================================================');
  console.log(`Restore Job ID:   ${restoreReport.jobId}`);
  console.log(`Total Files:      ${restoreReport.totalFiles}`);
  console.log(`VALID Restores:   ${restoreReport.validFiles}`);
  console.log(`MODIFIED/Tampered:${restoreReport.modifiedFiles}`);
  console.log(`MISSING Backups:  ${restoreReport.missingFiles}`);
  console.log(`Job Status:       ${restoreReport.status.toUpperCase()}`);
  console.log(`Full Recovery:    ${restoreReport.isFullyRestored ? 'YES (100% VALID)' : 'NO'}`);
  console.log('---------------------------------------------------------------');

  // Verify on-disk file content
  const restoredFile = (await storage.read(bucket, 'corporate/doc_1.txt')).toString();
  const fileRestoredProperly = restoredFile.startsWith('Original Confidential Document #1');

  if (restoreReport.isFullyRestored && fileRestoredProperly) {
    console.log('🎉 SUCCESS: Entire CloudRDR lifecycle passed perfectly!');
    console.log('   All files restored and proven identical to pre-attack baseline.');
    console.log('===============================================================\n');
  } else {
    console.error('❌ FAILURE: Restored file verification failed!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nSimulation error:', err);
  process.exit(1);
});
