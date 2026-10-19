/**
 * @file src/contracts/attackPaths.js
 *
 * CloudRDR Attack Path Modeling Service.
 * Implements graph relationship queries inspired by Prowler Attack Paths.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Standard attack paths recognized by the CloudRDR threat engine.
 */
export const ATTACK_PATHS = [
  {
    id: 'path-s3-mass-encrypt',
    title: 'Compromised Cloud Identity to S3 Mass Ransomware Encryption',
    severity: 'CRITICAL',
    vector: 'Privilege Escalation & Mass Overwrite',
    stages: [
      { step: 1, name: 'Credential Access', entity: 'Compromised IAM Access Key / Token' },
      { step: 2, name: 'Privilege Escalation', entity: 'AssumeRole to Cloud Admin / DevOps Role' },
      { step: 3, name: 'Target Reconnaissance', entity: 's3:ListBucket on Protected Storage' },
      { step: 4, name: 'Destructive Action', entity: 'Rapid PutObject Overwrite with Encrypted Ciphertext' },
    ],
    mitigation: 'CloudRDR Sliding-Window Detection & Sub-60s Automated IAM Write Freeze',
    status: 'MITIGATED',
  },
  {
    id: 'path-canary-tamper',
    title: 'Zero-Tolerance Canary Decoy Sentinel Tripping',
    severity: 'HIGH',
    vector: 'Stealthy Reconnaissance / Canary Traversal',
    stages: [
      { step: 1, name: 'Storage Traversal', entity: 'Scripted Directory Crawl (*.dwg, *.xlsx)' },
      { step: 2, name: 'Canary Modification', entity: 'Modification of Canary Sentinel Object' },
      { step: 3, name: 'Deterministic Trigger', entity: 'CloudRDR Kernel Event Dispatch' },
      { step: 4, name: 'Immediate Lockdown', entity: 'Zero-Grace-Period IAM Quarantine Applied' },
    ],
    mitigation: 'Canary Sentinel Decoys Seeded in Storage Hierarchy',
    status: 'ACTIVE_DEFENSE',
  },
  {
    id: 'path-backup-purge-attempt',
    title: 'Adversary Attempt to Erase Backup Snapshots',
    severity: 'CRITICAL',
    vector: 'Lateral Movement to Backup Infrastructure',
    stages: [
      { step: 1, name: 'Access Backup Vault', entity: 'Unauthorized IAM Role Attempts DeleteObject' },
      { step: 2, name: 'Object Lock Check', entity: 'WORM Compliance Policy Evaluated' },
      { step: 3, name: 'Action Rejected', entity: 'AWS S3 Object Lock Denies Request with 403 AccessDenied' },
      { step: 4, name: 'Alert Generation', entity: 'CloudRDR Logs Malicious Deletion Attempt to Audit Ledger' },
    ],
    mitigation: 'Immutable S3 Object Lock & Offline Air-Gapped Key Encryption',
    status: 'ENFORCED',
  },
];

/**
 * Returns raw Cypher query content.
 * @returns {string}
 */
export function getAttackPathsCypher() {
  const filePath = path.join(__dirname, 'attack_paths.cypher');
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}
