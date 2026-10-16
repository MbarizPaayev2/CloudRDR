/**
 * @file src/detection/processHeuristics.js
 *
 * Process and Command-Line Heuristic Analyzer for CloudRDR Detection Engine.
 * Detects precursor actions and malicious telemetry commonly associated with ransomware:
 *   - Volume Shadow Copy deletion (vssadmin, wmic, bcdedit, wbadmin)
 *   - Backup and recovery inhibition (T1490)
 *   - Event log clearing (wevtutil - T1070)
 *   - Execution from suspicious script hosts (powershell, wscript, cscript, mshta, certutil)
 */

// Regex patterns for system recovery / backup destruction commands
export const BACKUP_DESTRUCTION_PATTERNS = [
  /vssadmin(\.exe)?\s+(delete\s+shadows|resize\s+shadowstorage)/i,
  /wmic(\.exe)?\s+shadowcopy\s+delete/i,
  /wbadmin(\.exe)?\s+delete\s+(catalog|systemstatebackup)/i,
  /bcdedit(\.exe)?\s+.*recoveryenabled\s+no/i,
  /bcdedit(\.exe)?\s+.*bootstatuspolicy\s+ignoreallfailures/i,
  /wevtutil(\.exe)?\s+(cl|clear-log)/i,
  /cipher(\.exe)?\s+\/w:/i,
];

// Suspicious parent or executing binaries frequently abused by loaders & ransomware
export const SUSPICIOUS_PROCESS_NAMES = [
  'powershell.exe',
  'pwsh.exe',
  'wscript.exe',
  'cscript.exe',
  'mshta.exe',
  'certutil.exe',
  'rundll32.exe',
  'regsvr32.exe',
];

/**
 * Scan event list for suspicious process activity and recovery inhibition commands.
 *
 * @param {Array<Object>} events Events with optional process_name, cmdline, parent_process
 * @returns {{
 *   shadowCopyTampering: boolean,
 *   suspiciousProcessTriggered: boolean,
 *   detectedCommands: string[],
 *   suspiciousProcesses: string[],
 *   processAnomalies: string[]
 * }}
 */
export function scanProcessAnomalies(events = []) {
  const detectedCommands = [];
  const suspiciousProcesses = [];
  const processAnomalies = [];

  for (const evt of events) {
    const cmdline = evt.cmdline || evt.command_line || '';
    const proc = (evt.process_name || evt.process || '').toLowerCase();
    const parent = (evt.parent_process || '').toLowerCase();

    // 1. Check command line against backup destruction patterns
    if (cmdline) {
      for (const pattern of BACKUP_DESTRUCTION_PATTERNS) {
        if (pattern.test(cmdline)) {
          const matchMsg = `Recovery inhibition command detected: "${cmdline.trim()}"`;
          detectedCommands.push(cmdline.trim());
          processAnomalies.push(matchMsg);
          break;
        }
      }
    }

    // 2. Check for suspicious process binaries modifying files
    if (proc) {
      const isSuspicious = SUSPICIOUS_PROCESS_NAMES.some((s) => proc.endsWith(s));
      if (isSuspicious) {
        suspiciousProcesses.push(proc);
        processAnomalies.push(`Suspicious binary generating file events: ${proc}`);
      }
    }

    // 3. Check for suspicious parent process execution chain
    if (parent) {
      if (parent.includes('word') || parent.includes('excel') || parent.includes('outlook')) {
        processAnomalies.push(`Office parent process spawn: ${parent} -> ${proc}`);
      }
    }
  }

  const shadowCopyTampering = detectedCommands.length > 0;
  const suspiciousProcessTriggered =
    suspiciousProcesses.length > 0 || shadowCopyTampering;

  return {
    shadowCopyTampering,
    suspiciousProcessTriggered,
    detectedCommands: Array.from(new Set(detectedCommands)),
    suspiciousProcesses: Array.from(new Set(suspiciousProcesses)),
    processAnomalies: Array.from(new Set(processAnomalies)),
  };
}
