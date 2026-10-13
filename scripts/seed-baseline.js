/**
 * @file scripts/seed-baseline.js
 *
 * Seed script for CloudRDR.
 * Writes sample files (including a canary trap) into storage,
 * then invokes baselineService.createBaseline().
 *
 * Usage:
 *   npm run seed
 */

import { getStorageAdapter } from '../src/adapters/storage/index.js';
import { createBaseline } from '../src/baseline/baselineService.js';
import cfg from '../src/config/index.js';
import logger from '../src/utils/logger.js';

async function main() {
  const bucket = cfg.storage.bucket;
  const storage = await getStorageAdapter();

  console.log(`\n🌱 Seeding protected storage bucket: "${bucket}"...`);

  // Write protected sample documents
  const sampleFiles = [
    { path: 'finance/q1_earnings.pdf', content: 'Q1 Financial Earnings: Revenue +15%' },
    { path: 'finance/q2_forecast.xlsx', content: 'Q2 Projected Revenue and Budgets' },
    { path: 'engineering/arch_spec.md', content: '# CloudRDR Architecture Blueprint' },
    {
      path: 'engineering/database_schema.sql',
      content: 'CREATE TABLE users (id UUID PRIMARY KEY);',
    },
    { path: 'hr/employee_directory.csv', content: 'id,name,role\n1,Alice,Security\n2,Bob,Crypto' },
    { path: 'legal/nda_templates.docx', content: 'Standard Mutual Non-Disclosure Agreement' },
    { path: 'canaries/sentinel.canary', content: 'TRAP FILE: DO NOT MODIFY OR DELETE' },
  ];

  for (const file of sampleFiles) {
    await storage.write(bucket, file.path, file.content);
    console.log(`  ✓ Written: ${file.path}`);
  }

  // Create baseline snapshot
  console.log('\n🔒 Creating cryptographic baseline snapshot...');
  const baseline = await createBaseline(bucket);

  console.log('\n======================================================');
  console.log('✅ BASELINE CREATION SUCCESSFUL');
  console.log('======================================================');
  console.log(`Bucket:      ${baseline.bucket}`);
  console.log(`Version:     v${baseline.version}`);
  console.log(`Files:       ${baseline.fileCount}`);
  console.log(`Merkle Root: ${baseline.merkleRoot}`);
  console.log('======================================================\n');
}

main().catch((err) => {
  logger.error({ err: err.message }, 'Seed baseline script failed');
  process.exit(1);
});
