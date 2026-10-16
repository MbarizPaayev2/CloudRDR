/**
 * @file src/detection/scoring.js
 *
 * Multi-Vector Threat Scoring and MITRE ATT&CK Attribution Engine for CloudRDR.
 * Aggregates behavioral, heuristic, entropy, process, and rate vectors into:
 *   - Risk Score (0 - 100)
 *   - Threat Level: BENIGN, LOW, MEDIUM, HIGH, CRITICAL
 *   - Confidence Score (0.0 - 1.0)
 *   - MITRE ATT&CK Technique Mapping
 *   - Human-readable forensic indicators
 */

export const MITRE_TECHNIQUES = {
  DATA_ENCRYPTED: { id: 'T1486', name: 'Data Encrypted for Impact' },
  INHIBIT_RECOVERY: { id: 'T1490', name: 'Inhibit System Recovery' },
  DEFACEMENT_NOTE: { id: 'T1491.001', name: 'Internal Defacement: Ransom Note' },
  COMMAND_AND_SCRIPTING: { id: 'T1059', name: 'Command and Scripting Interpreter' },
  INDICATOR_REMOVAL: { id: 'T1070', name: 'Indicator Removal on Host' },
  OBFUSCATION_CORRUPTION: { id: 'T1027', name: 'Obfuscated/Corrupted Files' },
};

/**
 * Compute the comprehensive multi-vector threat risk score and MITRE attribution.
 *
 * @param {Object} factors
 * @param {boolean} [factors.canaryTriggered=false]
 * @param {number} [factors.ransomNotesCount=0]
 * @param {number} [factors.ransomwareExtensionsCount=0]
 * @param {boolean} [factors.entropyTriggered=false]
 * @param {number} [factors.highEntropyFilesCount=0]
 * @param {number} [factors.meanEntropy=0]
 * @param {boolean} [factors.shadowCopyTampering=false]
 * @param {boolean} [factors.suspiciousProcessTriggered=false]
 * @param {number} [factors.magicByteCorruptionsCount=0]
 * @param {boolean} [factors.driftExceeded=false]
 * @param {number} [factors.changeRate=0]
 * @param {number} [factors.ransomwareRate=0.3]
 * @param {number} [factors.suspiciousRate=0.1]
 * @param {boolean} [factors.isAllowlisted=false]
 * @returns {{
 *   riskScore: number,
 *   threatLevel: 'BENIGN'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL',
 *   confidence: number,
 *   mitreTechniques: Array<{ id: string, name: string }>,
 *   indicators: string[]
 * }}
 */
export function computeThreatScore(factors = {}) {
  const {
    canaryTriggered = false,
    ransomNotesCount = 0,
    ransomwareExtensionsCount = 0,
    entropyTriggered = false,
    highEntropyFilesCount = 0,
    meanEntropy = 0,
    shadowCopyTampering = false,
    suspiciousProcessTriggered = false,
    magicByteCorruptionsCount = 0,
    driftExceeded = false,
    changeRate = 0,
    ransomwareRate = 0.3,
    suspiciousRate = 0.1,
    isAllowlisted = false,
  } = factors;

  if (isAllowlisted) {
    return {
      riskScore: 0,
      threatLevel: 'BENIGN',
      confidence: 1.0,
      mitreTechniques: [],
      indicators: ['Account is explicitly allowlisted for bulk maintenance operations'],
    };
  }

  let rawScore = 0;
  const indicators = [];
  const mitreSet = new Map();

  // 1. Canary trap violation (near-definite malicious access)
  if (canaryTriggered) {
    rawScore += 50;
    mitreSet.set(MITRE_TECHNIQUES.DATA_ENCRYPTED.id, MITRE_TECHNIQUES.DATA_ENCRYPTED);
    indicators.push('Canary bait file modified or deleted');
  }

  // 2. Ransom note drop
  if (ransomNotesCount > 0) {
    rawScore += 45;
    mitreSet.set(MITRE_TECHNIQUES.DEFACEMENT_NOTE.id, MITRE_TECHNIQUES.DEFACEMENT_NOTE);
    indicators.push(`Ransom note pattern identified in ${ransomNotesCount} file(s)`);
  }

  // 3. Known ransomware file extensions
  if (ransomwareExtensionsCount > 0) {
    rawScore += 40;
    mitreSet.set(MITRE_TECHNIQUES.DATA_ENCRYPTED.id, MITRE_TECHNIQUES.DATA_ENCRYPTED);
    indicators.push(`Known ransomware extension appended to ${ransomwareExtensionsCount} file(s)`);
  }

  // 4. Volume shadow copy or recovery destruction commands
  if (shadowCopyTampering) {
    rawScore += 45;
    mitreSet.set(MITRE_TECHNIQUES.INHIBIT_RECOVERY.id, MITRE_TECHNIQUES.INHIBIT_RECOVERY);
    indicators.push('Command attempting to delete volume shadow copies or inhibit system recovery detected');
  }

  // 5. High Shannon Entropy (AES/ChaCha20 encryption signature)
  if (entropyTriggered || highEntropyFilesCount >= 2) {
    rawScore += 35;
    mitreSet.set(MITRE_TECHNIQUES.DATA_ENCRYPTED.id, MITRE_TECHNIQUES.DATA_ENCRYPTED);
    indicators.push(`${highEntropyFilesCount} file(s) exhibit cipher-level Shannon entropy (mean: ${meanEntropy})`);
  }

  // 6. Magic byte header corruption (intermittent encryption or scrambled headers)
  if (magicByteCorruptionsCount > 0) {
    rawScore += 30;
    mitreSet.set(MITRE_TECHNIQUES.OBFUSCATION_CORRUPTION.id, MITRE_TECHNIQUES.OBFUSCATION_CORRUPTION);
    indicators.push(`Header magic bytes corrupted/encrypted in ${magicByteCorruptionsCount} file(s)`);
  }

  // 7. Velocity / change rate spike
  if (changeRate >= ransomwareRate) {
    rawScore += 30;
    mitreSet.set(MITRE_TECHNIQUES.DATA_ENCRYPTED.id, MITRE_TECHNIQUES.DATA_ENCRYPTED);
    indicators.push(`Mass file modification rate (${(changeRate * 100).toFixed(1)}%) exceeds critical threshold`);
  } else if (changeRate >= suspiciousRate) {
    rawScore += 15;
    indicators.push(`Elevated file modification rate (${(changeRate * 100).toFixed(1)}%)`);
  }

  // 8. Cumulative baseline drift (slow-burn / trickle attack)
  if (driftExceeded) {
    rawScore += 25;
    mitreSet.set(MITRE_TECHNIQUES.DATA_ENCRYPTED.id, MITRE_TECHNIQUES.DATA_ENCRYPTED);
    indicators.push('Cumulative baseline drift exceeds tolerance threshold (trickle attack indicator)');
  }

  // 9. Suspicious executing process
  if (suspiciousProcessTriggered) {
    rawScore += 20;
    mitreSet.set(MITRE_TECHNIQUES.COMMAND_AND_SCRIPTING.id, MITRE_TECHNIQUES.COMMAND_AND_SCRIPTING);
    indicators.push('Script interpreter or suspicious binary involved in file operations');
  }

  // Normalize risk score to [0, 100]
  const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Threat level classification
  let threatLevel = 'BENIGN';
  if (riskScore >= 75) {
    threatLevel = 'CRITICAL';
  } else if (riskScore >= 55) {
    threatLevel = 'HIGH';
  } else if (riskScore >= 35) {
    threatLevel = 'MEDIUM';
  } else if (riskScore >= 15) {
    threatLevel = 'LOW';
  }

  // Confidence calculation based on indicator convergence
  let activeVectors = 0;
  if (canaryTriggered) activeVectors++;
  if (ransomNotesCount > 0) activeVectors++;
  if (ransomwareExtensionsCount > 0) activeVectors++;
  if (shadowCopyTampering) activeVectors++;
  if (entropyTriggered || highEntropyFilesCount >= 2) activeVectors++;
  if (magicByteCorruptionsCount > 0) activeVectors++;
  if (changeRate >= ransomwareRate) activeVectors++;
  if (driftExceeded) activeVectors++;

  let confidence = 0.5;
  if (activeVectors >= 3 || riskScore >= 75) {
    confidence = 0.98;
  } else if (activeVectors >= 2 || riskScore >= 55) {
    confidence = 0.90;
  } else if (activeVectors === 1) {
    confidence = 0.75;
  } else if (riskScore === 0) {
    confidence = 0.99;
  }

  return {
    riskScore,
    threatLevel,
    confidence: Number(confidence.toFixed(2)),
    mitreTechniques: Array.from(mitreSet.values()),
    indicators,
  };
}
