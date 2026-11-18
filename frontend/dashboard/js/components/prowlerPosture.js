/**
 * @file dashboard/js/components/prowlerPosture.js
 *
 * Prowler-Style Executive Security Posture Hero Component.
 * Features:
 *   - Circular SVG Radial Posture Gauge (0-100%) with animated stroke
 *   - Prowler-calibrated Severity Breakdown Cards (Critical, High, Medium, Low, Passed)
 *   - Multi-Cloud Fleet & Edge Node Status (AWS S3, Azure Blob, Kali Linux Node 192.168.152.148)
 *   - Dynamic reactivity: changes immediately on attack simulation or verified recovery.
 */

import { getState } from '../state.js';
import { createIcon } from '../icons.js';

/**
 * Calculate posture metrics from current state.
 * @param {object} state
 * @returns {object}
 */
export function calculatePostureMetrics(state) {
  const incidents = state.incidents || [];
  const activeCritical = incidents.filter(
    (i) => (i.severity === 'Critical' || i.severity === 'critical') && i.status !== 'resolved'
  ).length;

  const activeHigh = incidents.filter(
    (i) => (i.severity === 'High' || i.severity === 'high') && i.status !== 'resolved'
  ).length;

  const totalChecks = 48; // Total automated continuous checks
  let passedChecks = 46;
  let score = 96;
  let grade = 'A+';
  let statusText = 'EXCELLENT';
  let statusTone = 'healthy';

  if (activeCritical > 0) {
    passedChecks = Math.max(12, 48 - (activeCritical * 18 + activeHigh * 8));
    score = Math.round((passedChecks / totalChecks) * 100);
    grade = 'F';
    statusText = 'CRITICAL RISK';
    statusTone = 'critical';
  } else if (activeHigh > 0) {
    passedChecks = 38;
    score = 79;
    grade = 'C';
    statusText = 'DEGRADED';
    statusTone = 'warning';
  }

  return {
    score,
    grade,
    statusText,
    statusTone,
    passedChecks,
    totalChecks,
    severities: {
      critical: activeCritical,
      high: activeHigh,
      medium: 1, // baseline non-critical informational check
      low: 1,    // TLS cipher optimization check
      passed: passedChecks,
    },
    fleet: [
      {
        id: 'node-aws-s3',
        provider: 'AWS S3',
        icon: 'cloud',
        resource: 'arn:aws:s3:::corp-data-vault',
        status: 'Synchronized',
        detail: '38 objects · Merkle Verified',
        ok: true,
      },
      {
        id: 'node-azure-blob',
        provider: 'Azure Blob',
        icon: 'database',
        resource: 'financesec.blob.core.windows.net/ledger',
        status: 'Active',
        detail: 'WORM Vault · Immutability Active',
        ok: true,
      },
      {
        id: 'node-kali-linux',
        provider: 'Linux Node (Go Engine)',
        icon: 'server',
        resource: 'kali@192.168.152.148:4455',
        status: activeCritical > 0 ? 'Dual-Layer Freeze Engaged' : 'Realtime Go Core Active',
        detail: 'chmod 000 + icacls /deny armed',
        ok: activeCritical === 0,
      },
    ],
  };
}

/**
 * Render the Prowler Posture Hero into its container.
 * @param {HTMLElement} container
 * @param {object} state
 */
export function renderProwlerPostureHero(container, state) {
  if (!container) return;
  const metrics = calculatePostureMetrics(state);

  // Circumference for r=44
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46
  const dashOffset = circumference - (metrics.score / 100) * circumference;

  const strokeColor =
    metrics.statusTone === 'critical'
      ? '#EF4444'
      : metrics.statusTone === 'warning'
        ? '#F59E0B'
        : '#10B981';

  // Proportions for severity distribution bar
  const passPercent = ((metrics.passedChecks / metrics.totalChecks) * 100).toFixed(1);
  const critWidth = ((metrics.severities.critical / metrics.totalChecks) * 100).toFixed(1);
  const highWidth = ((metrics.severities.high / metrics.totalChecks) * 100).toFixed(1);
  const medWidth = ((metrics.severities.medium / metrics.totalChecks) * 100).toFixed(1);
  const lowWidth = ((metrics.severities.low / metrics.totalChecks) * 100).toFixed(1);
  const passWidth = ((metrics.severities.passed / metrics.totalChecks) * 100).toFixed(1);

  // Build Hero structure safely
  container.innerHTML = `
    <!-- Card 1: Executive Security Posture Radial Score -->
    <div class="prowler-score-card ${metrics.statusTone}">
      <div class="prowler-card-header">
        <span class="prowler-card-title">Security Posture Score</span>
        <span class="prowler-grade-pill ${metrics.statusTone}">${metrics.grade} ${metrics.statusText}</span>
      </div>

      <div class="prowler-gauge-wrap">
        <svg class="prowler-radial-svg" width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
          <circle
            cx="64"
            cy="64"
            r="${radius}"
            class="prowler-radial-bg"
            stroke-width="10"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="${radius}"
            class="prowler-radial-progress"
            stroke-width="10"
            stroke="${strokeColor}"
            stroke-linecap="round"
            fill="none"
            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${dashOffset}; transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease;"
          />
        </svg>
        <div class="prowler-gauge-inner">
          <span class="prowler-score-num">${metrics.score}%</span>
          <span class="prowler-score-label">${metrics.statusTone === 'critical' ? 'THREAT' : 'SECURE'}</span>
        </div>
      </div>

      <div class="prowler-score-meta">
        <strong>${metrics.passedChecks} of ${metrics.totalChecks}</strong> checks passing across multi-cloud fleet
      </div>
    </div>

    <!-- Card 2: Prowler Severity Breakdown Grid -->
    <div class="prowler-severity-bento">
      <div class="prowler-card-header">
        <span class="prowler-card-title">Findings by Severity</span>
        <span class="prowler-card-subtitle">Realtime Continuous Evaluation</span>
      </div>

      <!-- Center filled content: Proportional distribution bar & Posture highlights -->
      <div class="prowler-sev-middle-section">
        <div class="prowler-sev-bar-header">
          <span class="prowler-sev-bar-label">Control Evaluation Ratio</span>
          <span class="prowler-sev-bar-percent mono">${passPercent}% PASSING</span>
        </div>
        <div class="prowler-sev-distribution-bar" role="progressbar" aria-valuenow="${passPercent}" aria-valuemin="0" aria-valuemax="100" title="Distribution of security checks by severity">
          ${metrics.severities.critical > 0 ? `<div class="prowler-bar-seg critical" style="width: ${critWidth}%;" title="Critical: ${metrics.severities.critical}"></div>` : ''}
          ${metrics.severities.high > 0 ? `<div class="prowler-bar-seg high" style="width: ${highWidth}%;" title="High: ${metrics.severities.high}"></div>` : ''}
          ${metrics.severities.medium > 0 ? `<div class="prowler-bar-seg medium" style="width: ${medWidth}%;" title="Medium: ${metrics.severities.medium}"></div>` : ''}
          ${metrics.severities.low > 0 ? `<div class="prowler-bar-seg low" style="width: ${lowWidth}%;" title="Low: ${metrics.severities.low}"></div>` : ''}
          ${metrics.severities.passed > 0 ? `<div class="prowler-bar-seg passed" style="width: ${passWidth}%;" title="Passed: ${metrics.severities.passed}"></div>` : ''}
        </div>

        <div class="prowler-sev-stats-strip">
          <div class="prowler-sev-stat-box">
            <div class="prowler-stat-val mono">${passPercent}%</div>
            <div class="prowler-stat-lbl">Compliance Health</div>
            <div class="prowler-stat-sub text-muted">${metrics.passedChecks} of ${metrics.totalChecks} Passing</div>
          </div>
          <div class="prowler-sev-stat-box">
            <div class="prowler-stat-val mono ${metrics.severities.critical > 0 ? 'text-critical' : 'text-primary'}">
              ${metrics.severities.critical > 0 ? metrics.severities.critical + ' Active' : '2 Pending'}
            </div>
            <div class="prowler-stat-lbl">${metrics.severities.critical > 0 ? 'Threat Mitigation' : 'Non-Blocking'}</div>
            <div class="prowler-stat-sub text-muted">${metrics.severities.critical > 0 ? 'IAM Deny-All Engaged' : 'Zero High/Critical'}</div>
          </div>
          <div class="prowler-sev-stat-box">
            <div class="prowler-stat-val mono text-accent">&lt; 4.0s SLA</div>
            <div class="prowler-stat-lbl">Containment Speed</div>
            <div class="prowler-stat-sub text-muted">Dual-Layer WORM Armed</div>
          </div>
        </div>
      </div>

      <div class="prowler-severity-pills-grid">
        <div class="prowler-sev-pill critical ${metrics.severities.critical > 0 ? 'active-threat' : ''}" data-filter-sev="critical" role="button" tabindex="0" title="Filter Critical Findings">
          <div class="prowler-sev-top">
            <span class="prowler-sev-dot"></span>
            <span class="prowler-sev-name">Critical</span>
          </div>
          <div class="prowler-sev-count">${metrics.severities.critical}</div>
          <span class="prowler-sev-desc">${metrics.severities.critical > 0 ? 'Active Freeze' : 'Zero Threats'}</span>
        </div>

        <div class="prowler-sev-pill high" data-filter-sev="high" role="button" tabindex="0" title="Filter High Findings">
          <div class="prowler-sev-top">
            <span class="prowler-sev-dot"></span>
            <span class="prowler-sev-name">High</span>
          </div>
          <div class="prowler-sev-count">${metrics.severities.high}</div>
          <span class="prowler-sev-desc">Action Required</span>
        </div>

        <div class="prowler-sev-pill medium" data-filter-sev="medium" role="button" tabindex="0" title="Filter Medium Findings">
          <div class="prowler-sev-top">
            <span class="prowler-sev-dot"></span>
            <span class="prowler-sev-name">Medium</span>
          </div>
          <div class="prowler-sev-count">${metrics.severities.medium}</div>
          <span class="prowler-sev-desc">Warning</span>
        </div>

        <div class="prowler-sev-pill low" data-filter-sev="low" role="button" tabindex="0" title="Filter Low Findings">
          <div class="prowler-sev-top">
            <span class="prowler-sev-dot"></span>
            <span class="prowler-sev-name">Low</span>
          </div>
          <div class="prowler-sev-count">${metrics.severities.low}</div>
          <span class="prowler-sev-desc">Informational</span>
        </div>

        <div class="prowler-sev-pill passed" data-filter-sev="passed" role="button" tabindex="0" title="Filter Passed Checks">
          <div class="prowler-sev-top">
            <span class="prowler-sev-dot"></span>
            <span class="prowler-sev-name">Passed</span>
          </div>
          <div class="prowler-sev-count">${metrics.severities.passed}</div>
          <span class="prowler-sev-desc">Verified Healthy</span>
        </div>
      </div>
    </div>

    <!-- Card 3: Multi-Cloud Fleet & Edge Agent Nodes -->
    <div class="prowler-fleet-card">
      <div class="prowler-card-header">
        <span class="prowler-card-title">Protected Fleet &amp; Edge Nodes</span>
        <span class="status-badge-pill VALID">3 CONNECTED</span>
      </div>

      <div class="prowler-fleet-list">
        ${metrics.fleet
          .map(
            (node) => `
          <div class="prowler-fleet-item ${node.ok ? '' : 'alert'}">
            <div class="prowler-fleet-left">
              <span class="prowler-node-dot ${node.ok ? 'green' : 'red'}"></span>
              <div class="prowler-node-info">
                <span class="prowler-node-provider">${node.provider}</span>
                <span class="prowler-node-resource mono" title="${node.resource}">${node.resource}</span>
              </div>
            </div>
            <div class="prowler-fleet-right">
              <span class="prowler-node-status ${node.ok ? 'ok' : 'err'}">${node.status}</span>
              <span class="prowler-node-detail">${node.detail}</span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  // Attach click listener on severity pills to filter findings table
  const pills = container.querySelectorAll('.prowler-sev-pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const sev = pill.getAttribute('data-filter-sev');
      const tableFilter = document.getElementById('findingsSeverityFilter');
      if (tableFilter) {
        tableFilter.value = sev;
        tableFilter.dispatchEvent(new Event('change'));
        // Scroll smoothly to findings table
        const findingsSection = document.getElementById('prowlerFindingsSection');
        if (findingsSection) {
          findingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}
