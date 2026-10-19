/**
 * @file dashboard/js/components/prowlerSimulator.js
 *
 * Prowler-Grade Interactive Attack Simulation & Defense Controller.
 * Simulates a high-entropy LockBit ransomware spike, triggers sub-second
 * dual-layer containment, drops posture score, and opens the forensic drawer
 * with verified 1-click restore capability.
 */

import { getState, setState } from '../state.js';
import { renderProwlerPostureHero } from './prowlerPosture.js';
import { renderProwlerFindingsTable, getFindingsList } from './prowlerFindings.js';
import { openProwlerDrawer } from './prowlerDrawer.js';
import { showToast } from './toast.js';

/**
 * Trigger simulated ransomware attack.
 */
export async function triggerProwlerAttackSimulation() {
  const state = getState();

  // Create or activate ransomware incident
  const activeIncident = {
    id: `inc-lockbit-${Date.now().toString(36)}`,
    detection_run_id: 'run-sim-live',
    account_id: '192.168.152.148 (kali-linux)',
    severity: 'Critical',
    detection_reason: 'CANARY_MODIFIED',
    canary_triggered: true,
    status: 'frozen',
    status_label: 'Contained (Frozen)',
    created_at: new Date().toISOString(),
    affected_paths: [
      'corporate/payroll_q3.xlsx',
      'corporate/executive_memo.docx',
      'financials/gl_ledger_2026.dat',
      'financials/q2_audit_report.pdf',
      'canary/tripwire_sentinel.docx',
      'legal/nda_templates.docx',
      'hr/employee_roster.csv',
      'operations/vendor_invoices.pdf',
    ],
    record_signature: '3d8a9f4c01b2e8a719c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a63d8a9f4c01b2e8a719c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
  };

  const incidents = [activeIncident, ...(state.incidents || [])];

  setState({
    incidents,
    selectedIncidentId: activeIncident.id,
    selectedIncident: activeIncident,
    currentVerdict: 'ransomware',
    activeIncidentsCount: 1,
  });

  // Display Alarm Siren Banner
  const alarmBanner = document.getElementById('prowlerAlarmBanner');
  if (alarmBanner) {
    alarmBanner.style.display = 'flex';
    alarmBanner.innerHTML = `
      <div class="alarm-banner-content">
        <span class="alarm-siren-dot"></span>
        <span class="alarm-title">CRITICAL THREAT ACTIVE:</span>
        <span class="alarm-msg">Ransomware Mass Encryption detected on Linux Node <strong>kali@192.168.152.148</strong>. Automated Dual-Layer Containment (chmod 000 + icacls /deny) engaged.</span>
      </div>
      <button type="button" class="btn btn-xs btn-primary alarm-action-btn" id="btnAlarmInspect">
        Inspect &amp; Restore &rarr;
      </button>
    `;

    alarmBanner.querySelector('#btnAlarmInspect')?.addEventListener('click', () => {
      const findings = getFindingsList(getState());
      const critFinding = findings.find((f) => f.severity === 'Critical');
      if (critFinding) {
        openProwlerDrawer(critFinding, getState(), 'restore');
      }
    });
  }

  // Update Posture Hero
  const postureHero = document.getElementById('prowlerPostureHero');
  if (postureHero) {
    renderProwlerPostureHero(postureHero, getState());
  }

  // Update Findings Table
  const findingsTable = document.getElementById('prowlerFindingsContainer');
  if (findingsTable) {
    renderProwlerFindingsTable(findingsTable, getState());
  }

  showToast('Critical Alert: Ransomware mass modification detected. Automated freeze engaged in 14ms.', 'warning');

  // Automatically open the Forensic Drawer to the Restore tab
  setTimeout(() => {
    const findings = getFindingsList(getState());
    const critFinding = findings.find((f) => f.severity === 'Critical');
    if (critFinding) {
      openProwlerDrawer(critFinding, getState(), 'restore');
    }
  }, 400);
}
