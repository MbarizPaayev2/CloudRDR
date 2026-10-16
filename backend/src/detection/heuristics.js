/**
 * @file src/detection/heuristics.js
 *
 * Advanced Heuristics for CloudRDR Detection Engine 2.0.
 * Includes:
 *   1. Ransomware Extension Anomaly Detection (.locked, .crypto, .enc, etc.)
 *   2. Ransom Note Indicator of Compromise (IoC) Scanner (README_RESTORE.txt, etc.)
 *   3. Magic Byte Header Integrity Check (detecting scrambled file headers)
 *   4. Cumulative Drift Tracking (detecting slow-burn / trickle encryption)
 */

// Known malicious ransomware extension signatures (including 2024-2026 strains)
export const RANSOMWARE_EXTENSION_REGEX =
  /\.(locked|crypto|crypt|enc|crypted|lockbit|blackcat|wncry|mallox|phobos|stop|djvu|r5a|akira|rhysida|medusa|bianlian|play|cactus|clop|blacksuit|inc|hunters|qilin|babuk|conti|hive|revil)$/i;

// Known ransom note naming patterns dropped by attackers
export const RANSOM_NOTE_REGEX =
  /(how_to_decrypt|readme_to_decrypt|restore_files|decrypt_files|read_me|recover_files|recovery_instructions|instructions|!readme|help_decrypt)\.(txt|html|hta|rtf)$/i;

// Known magic byte signatures for common high-value business formats
export const MAGIC_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4e, 0x47], // \x89PNG
  jpeg: [0xff, 0xd8, 0xff], // \xFF\xD8\xFF
  zipOrOffice: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04 (zip, docx, xlsx, pptx)
};

/**
 * Scan event list for ransomware extension anomalies, ransom note drops,
 * and optional magic byte header corruption.
 *
 * @param {Array<{ path: string, event_type?: string, header?: Buffer|Uint8Array }>} events
 * @returns {{
 *   ransomwareExtensionsFound: string[],
 *   ransomNotesFound: string[],
 *   magicByteCorruptionsFound: string[],
 *   heuristicTriggered: boolean
 * }}
 */
export function scanHeuristicSignatures(events = []) {
  const ransomwareExtensionsFound = [];
  const ransomNotesFound = [];
  const magicByteCorruptionsFound = [];

  for (const evt of events) {
    if (!evt.path) continue;
    const lowerPath = evt.path.toLowerCase();

    // Check for dropped ransom note
    if (RANSOM_NOTE_REGEX.test(lowerPath)) {
      ransomNotesFound.push(evt.path);
    }

    // Check for suspicious ransomware file extensions
    if (RANSOMWARE_EXTENSION_REGEX.test(lowerPath)) {
      ransomwareExtensionsFound.push(evt.path);
    }

    // Check header magic bytes if provided on event
    const headerBytes = evt.header || evt.header_bytes || evt.headerBytes;
    if (headerBytes) {
      const isValid = verifyMagicBytes(evt.path, headerBytes);
      if (!isValid) {
        magicByteCorruptionsFound.push(evt.path);
      }
    }
  }

  const heuristicTriggered =
    ransomNotesFound.length > 0 ||
    ransomwareExtensionsFound.length > 0 ||
    magicByteCorruptionsFound.length > 0;

  return {
    ransomwareExtensionsFound,
    ransomNotesFound,
    magicByteCorruptionsFound,
    heuristicTriggered,
  };
}

/**
 * Verify if raw header bytes match the declared file extension.
 * Returns false if header is corrupted or replaced with pseudo-random bytes.
 *
 * @param {string} path File path
 * @param {Uint8Array|Buffer} headerBytes First 4-16 bytes of the file
 * @returns {boolean} true if valid or unknown format, false if corrupted
 */
export function verifyMagicBytes(path, headerBytes) {
  if (!headerBytes || headerBytes.length < 4) return true;
  const lower = path.toLowerCase();

  let expected = null;
  if (lower.endsWith('.pdf')) {
    expected = MAGIC_SIGNATURES.pdf;
  } else if (lower.endsWith('.png')) {
    expected = MAGIC_SIGNATURES.png;
  } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    expected = MAGIC_SIGNATURES.jpeg;
  } else if (
    lower.endsWith('.docx') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.zip')
  ) {
    expected = MAGIC_SIGNATURES.zipOrOffice;
  }

  if (!expected) return true; // Format not strictly checked

  for (let i = 0; i < expected.length; i++) {
    if (headerBytes[i] !== expected[i]) {
      return false; // Header mismatch — file corrupted or encrypted
    }
  }

  return true;
}

/**
 * Compute cumulative drift across all protected files relative to baseline.
 * Catches slow-burn (trickle) attacks that evade short sliding windows.
 *
 * @param {number} totalProtectedFiles Total protected files cataloged in baseline
 * @param {number} totalModifiedOrMissing Cumulative files deviating from baseline
 * @param {number} [driftThreshold=0.15] Cumulative drift ratio threshold (default 15%)
 * @returns {{ driftRatio: number, driftExceeded: boolean }}
 */
export function computeCumulativeDrift(
  totalProtectedFiles,
  totalModifiedOrMissing,
  driftThreshold = 0.15
) {
  if (totalProtectedFiles <= 0) {
    return { driftRatio: 0, driftExceeded: false };
  }

  const driftRatio = Number((totalModifiedOrMissing / totalProtectedFiles).toFixed(4));
  return {
    driftRatio,
    driftExceeded: driftRatio >= driftThreshold,
  };
}
