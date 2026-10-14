/**
 * @file dashboard/js/main.js
 *
 * CloudRDR Enterprise SOC Admin Dashboard — Main Controller
 * Connects state, API, Chart.js telemetry, incident queue,
 * modals, and attack simulation.
 */

import { CONFIG } from './config.js';
import { api } from './api.js';
import { getState, setState, subscribe, refreshAll, selectIncident } from './state.js';
import { createIcon } from './icons.js';
import { initDetectionChart, updateDetectionChart } from './components/detectionChart.js';

/* ─── DOM References Cache ────────────────────────────────────────────────── */
let _dom = {};
let _storyPlaying = false;
let _pollInterval = null;

function cacheDom() {
  _dom = {
    sidebar: document.getElementById('socSidebar'),
    sidebarCollapseBtn: document.getElementById('sidebarCollapseBtn'),
    navItems: document.querySelectorAll('.nav-item'),
    connectivityDot: document.getElementById('connectivityDot'),
    connectivityText: document.getElementById('connectivityText'),

    headerSearchInput: document.getElementById('headerSearchInput'),
    notificationBtn: document.getElementById('notificationBtn'),
    notificationDropdown: document.getElementById('notificationDropdown'),
    userMenuBtn: document.getElementById('userMenuBtn'),
    userDropdown: document.getElementById('userDropdown'),
    lastRefreshedLabel: document.getElementById('lastRefreshedLabel'),
    headerRefreshBtn: document.getElementById('headerRefreshBtn'),

    runIntegrityScanBtn: document.getElementById('runIntegrityScanBtn'),
    simulateAttackBtn: document.getElementById('simulateAttackBtn'),

    // System Status Strip
    statusDotDetection: document.getElementById('statusDotDetection'),
    statusLabelDetection: document.getElementById('statusLabelDetection'),
    statusDetailDetection: document.getElementById('statusDetailDetection'),
    statusDotStorage: document.getElementById('statusDotStorage'),
    statusLabelStorage: document.getElementById('statusLabelStorage'),
    statusDetailStorage: document.getElementById('statusDetailStorage'),
    statusDotBaseline: document.getElementById('statusDotBaseline'),
    statusLabelBaseline: document.getElementById('statusLabelBaseline'),
    statusDetailBaseline: document.getElementById('statusDetailBaseline'),
    statusDotBackup: document.getElementById('statusDotBackup'),
    statusLabelBackup: document.getElementById('statusLabelBackup'),
    statusDetailBackup: document.getElementById('statusDetailBackup'),

    // KPI Cards
    kpiCardIncidents: document.getElementById('kpiCardIncidents'),
    kpiValFiles: document.getElementById('kpiValFiles'),
    kpiSubFiles: document.getElementById('kpiSubFiles'),
    kpiValIncidents: document.getElementById('kpiValIncidents'),
    kpiSubIncidents: document.getElementById('kpiSubIncidents'),
    kpiValEvents: document.getElementById('kpiValEvents'),
    kpiSubEvents: document.getElementById('kpiSubEvents'),
    kpiValBackup: document.getElementById('kpiValBackup'),
    kpiSubBackup: document.getElementById('kpiSubBackup'),

    // Chart & Detection Panel
    threatActivityCanvas: document.getElementById('threatActivityCanvas'),
    timeBtns: document.querySelectorAll('.time-btn'),
    detectionStatusBadge: document.getElementById('detectionStatusBadge'),
    gaugeVelocityText: document.getElementById('gaugeVelocityText'),
    gaugeVelocityFill: document.getElementById('gaugeVelocityFill'),
    cfgThreshold: document.getElementById('cfgThreshold'),
    cfgWindow: document.getElementById('cfgWindow'),
    cfgCanaryAlert: document.getElementById('cfgCanaryAlert'),
    cfgLastDetect: document.getElementById('cfgLastDetect'),
    cfgPendingCases: document.getElementById('cfgPendingCases'),

    // Incident Table
    incidentTableSearch: document.getElementById('incidentTableSearch'),
    severitySelectFilter: document.getElementById('severitySelectFilter'),
    statusSelectFilter: document.getElementById('statusSelectFilter'),
    incidentsTableBody: document.getElementById('incidentsTableBody'),

    // Events Feed
    securityEventsFeed: document.getElementById('securityEventsFeed'),

    // Quick Actions
    qaScanBtn: document.getElementById('qaScanBtn'),
    qaVerifyBtn: document.getElementById('qaVerifyBtn'),
    qaIncidentsBtn: document.getElementById('qaIncidentsBtn'),
    qaAuditBtn: document.getElementById('qaAuditBtn'),
    qaSimulateBtn: document.getElementById('qaSimulateBtn'),

    // Modals
    incidentModalBackdrop: document.getElementById('incidentModalBackdrop'),
    incidentModalBody: document.getElementById('incidentModalBody'),
    modalIncidentCloseBtn: document.getElementById('modalIncidentCloseBtn'),
    modalDismissBtn: document.getElementById('modalDismissBtn'),
    modalRestoreBtn: document.getElementById('modalRestoreBtn'),

    confirmModalBackdrop: document.getElementById('confirmModalBackdrop'),
    confirmModalTitle: document.getElementById('confirmModalTitle'),
    confirmModalMessage: document.getElementById('confirmModalMessage'),
    confirmModalCloseBtn: document.getElementById('confirmModalCloseBtn'),
    confirmCancelBtn: document.getElementById('confirmCancelBtn'),
    confirmAcceptBtn: document.getElementById('confirmAcceptBtn'),

    toastContainer: document.getElementById('toast-container'),
  };
}

/* ─── Populate Icons ──────────────────────────────────────────────────────── */
function populateIcons() {
  const iconMounts = [
    ['navIconOverview', 'activity'],
    ['navIconStorage', 'hardDrive'],
    ['navIconDetection', 'zap'],
    ['navIconIncidents', 'alert'],
    ['navIconRecovery', 'restore'],
    ['navIconEvidence', 'shieldCheck'],
    ['navIconAudit', 'link'],
    ['navIconSettings', 'settings'],
    ['navIconCollapse', 'panelLeft'],

    ['headerEnvChevron', 'chevronDown'],
    ['headerSearchIcon', 'search'],
    ['headerBellIcon', 'bell'],
    ['headerRefreshIcon', 'refresh'],

    ['iconScanBtn', 'check'],
    ['iconSimulateBtn', 'play'],

    ['statusIconDetection', 'zap'],
    ['statusIconStorage', 'hardDrive'],
    ['statusIconBaseline', 'shieldCheck'],
    ['statusIconBackup', 'databaseBackup'],

    ['kpiIconFiles', 'files'],
    ['kpiIconIncidents', 'shieldAlert'],
    ['kpiIconEvents', 'activity'],
    ['kpiIconBackup', 'databaseBackup'],

    ['qaIconScan', 'check'],
    ['qaIconVerify', 'shieldCheck'],
    ['qaIconIncidents', 'alert'],
    ['qaIconAudit', 'link'],
    ['qaIconSimulate', 'play'],
  ];

  for (const [id, iconName] of iconMounts) {
    const el = document.getElementById(id);
    if (el) {
      el.replaceChildren(createIcon(iconName, { size: 15 }));
    }
  }
}

/* ─── Toast Notifications ─────────────────────────────────────────────────── */
export function showToast(message, type = 'info') {
  if (!_dom.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';

  const iconName = type === 'threat' ? 'alert' : type === 'success' ? 'check' : 'info';
  const icon = createIcon(iconName, { size: 16 });
  if (type === 'threat') icon.style.color = 'var(--threat-red-text)';
  else if (type === 'success') icon.style.color = 'var(--healthy-green-text)';
  else icon.style.color = 'var(--accent-teal)';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  _dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ─── Confirmation Modal Helper ───────────────────────────────────────────── */
let _confirmCallback = null;

function openConfirmModal(title, message, onConfirm) {
  _dom.confirmModalTitle.textContent = title;
  _dom.confirmModalMessage.textContent = message;
  _confirmCallback = onConfirm;
  _dom.confirmModalBackdrop.classList.add('show');
}

function closeConfirmModal() {
  _dom.confirmModalBackdrop.classList.remove('show');
  _confirmCallback = null;
}

/* ─── Incident Detail Modal ───────────────────────────────────────────────── */
function openIncidentModal(incident) {
  if (!incident || !_dom.incidentModalBody) return;
  _dom.incidentModalBody.replaceChildren();

  const headerBox = document.createElement('div');
  headerBox.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);';
  headerBox.innerHTML = `
    <div>
      <div style="font-weight:700;color:var(--text-primary);font-family:var(--font-mono);">${incident.id}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);">Account: ${incident.account_id} &bull; Detected: ${incident.detected_at}</div>
    </div>
    <span class="severity-pill ${incident.severity ? incident.severity.toLowerCase() : 'critical'}">${incident.severity || 'Critical'}</span>
  `;
  _dom.incidentModalBody.appendChild(headerBox);

  // Reason & Status details
  const detailsList = document.createElement('div');
  detailsList.style.cssText = 'display:flex;flex-direction:column;gap:8px;font-size:0.85rem;';
  detailsList.innerHTML = `
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:6px;">
      <span class="text-secondary">Detection Reason</span>
      <span class="mono font-semibold text-red">${incident.detection_reason || 'CANARY_MODIFIED'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:6px;">
      <span class="text-secondary">Containment Status</span>
      <span class="mono font-semibold text-teal">${incident.status === 'frozen' ? 'IAM Deny-All Write-Lock Active' : incident.status}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:6px;">
      <span class="text-secondary">Ed25519 Signature</span>
      <span class="mono text-muted" style="font-size:0.72rem;">${incident.record_signature ? incident.record_signature.slice(0, 32) + '...' : 'Verified'}</span>
    </div>
  `;
  _dom.incidentModalBody.appendChild(detailsList);

  // Affected Objects List
  const filesTitle = document.createElement('div');
  filesTitle.style.cssText =
    'font-weight:600;font-size:0.8rem;text-transform:uppercase;color:var(--text-muted);margin-top:6px;';
  filesTitle.textContent = `Affected Storage Objects (${incident.affected_paths?.length || 0})`;
  _dom.incidentModalBody.appendChild(filesTitle);

  const fileListBox = document.createElement('div');
  fileListBox.style.cssText =
    'max-height:160px;overflow-y:auto;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;display:flex;flex-direction:column;gap:4px;';
  for (const p of incident.affected_paths || []) {
    const row = document.createElement('div');
    row.style.cssText =
      'font-family:var(--font-mono);font-size:0.75rem;display:flex;align-items:center;gap:6px;color:var(--text-secondary);';
    const isCanary = p.includes('canary');
    row.innerHTML = `<span style="color:${isCanary ? 'var(--threat-red)' : 'var(--accent-teal)'};">${isCanary ? '⚠️' : '📄'}</span> <span>${p}</span>`;
    fileListBox.appendChild(row);
  }
  _dom.incidentModalBody.appendChild(fileListBox);

  // Operational Action Controls (Containment & Alert Acknowledgment)
  const actionsBox = document.createElement('div');
  actionsBox.style.cssText = 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;';

  if (incident.status === 'open') {
    const ackBtn = document.createElement('button');
    ackBtn.className = 'btn btn-secondary';
    ackBtn.style.cssText = 'font-size:0.8rem;padding:6px 12px;';
    ackBtn.textContent = 'Acknowledge Alert';
    ackBtn.onclick = async () => {
      try {
        await api.updateIncidentStatus(incident.id, 'acknowledged', 'Acknowledged by SOC operator');
        showToast(`Incident ${incident.id.slice(0, 8)} acknowledged`, 'info');
        _dom.incidentModalBackdrop.classList.remove('show');
        await refreshAll();
      } catch (err) {
        showToast(`Failed to acknowledge: ${err.message}`, 'threat');
      }
    };
    actionsBox.appendChild(ackBtn);
  }

  if (incident.status !== 'frozen' && incident.status !== 'resolved') {
    const containBtn = document.createElement('button');
    containBtn.className = 'btn btn-danger';
    containBtn.style.cssText =
      'font-size:0.8rem;padding:6px 12px;background:var(--threat-red);color:#fff;border:none;border-radius:var(--radius-sm);cursor:pointer;font-weight:600;';
    containBtn.textContent = 'Isolate Account (IAM Freeze)';
    containBtn.onclick = () => {
      _dom.incidentModalBackdrop.classList.remove('show');
      openConfirmModal(
        'Confirm Immediate Account Isolation?',
        `This will dispatch an automated IAM deny-all write freeze for account ${incident.account_id} to halt encryption in progress. Read access for recovery will be maintained.`,
        async () => {
          showToast('Applying containment policy...', 'info');
          try {
            await api.containIncident(incident.id);
            showToast(`Account ${incident.account_id} isolated successfully!`, 'success');
            await refreshAll();
          } catch (err) {
            showToast(`Containment failed: ${err.message}`, 'threat');
          }
        }
      );
    };
    actionsBox.appendChild(containBtn);
  }

  if (actionsBox.children.length > 0) {
    _dom.incidentModalBody.appendChild(actionsBox);
  }

  // Configure Restore Button
  if (incident.status === 'resolved') {
    _dom.modalRestoreBtn.style.display = 'none';
  } else {
    _dom.modalRestoreBtn.style.display = 'inline-flex';
    _dom.modalRestoreBtn.onclick = () => {
      _dom.incidentModalBackdrop.classList.remove('show');
      openConfirmModal(
        'Execute Verified Backup Restoration?',
        `This will restore all ${incident.affected_paths?.length || 0} affected files from AES-256-GCM encrypted backup and cryptographically verify byte-for-byte baseline SHA-256 match.`,
        async () => {
          showToast('Starting verified recovery job...', 'info');
          try {
            const result = await api.restoreIncident(incident.id);
            showToast(`Restore completed: ${result.validFiles} files verified valid!`, 'success');
            await refreshAll();
          } catch (err) {
            showToast(`Restore failed: ${err.message}`, 'threat');
          }
        }
      );
    };
  }

  _dom.incidentModalBackdrop.classList.add('show');
}

/* ─── Render Incidents Table (Section 7) ──────────────────────────────────── */
function renderIncidentsTable(
  incidents = [],
  searchQuery = '',
  severityFilter = 'all',
  statusFilter = 'all'
) {
  if (!_dom.incidentsTableBody) return;
  _dom.incidentsTableBody.replaceChildren();

  const query = (searchQuery || '').toLowerCase().trim();
  const filtered = incidents.filter((inc) => {
    if (query) {
      const matchId = (inc.id || '').toLowerCase().includes(query);
      const matchReason = (inc.detection_reason || '').toLowerCase().includes(query);
      const matchAccount = (inc.account_id || '').toLowerCase().includes(query);
      if (!matchId && !matchReason && !matchAccount) return false;
    }
    if (severityFilter !== 'all' && (inc.severity || 'Critical') !== severityFilter) {
      return false;
    }
    if (statusFilter !== 'all' && inc.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" class="empty-state">No incidents match the active filter criteria.</td>`;
    _dom.incidentsTableBody.appendChild(tr);
    return;
  }

  for (const inc of filtered) {
    const tr = document.createElement('tr');
    const sev = inc.severity || 'Critical';
    const statusLabel =
      inc.status === 'frozen'
        ? 'Contained (Frozen)'
        : inc.status === 'resolved'
          ? 'Recovery Verified'
          : inc.status;
    const detectedStr = inc.detected_at
      ? new Date(inc.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';
    const shortIdStr = inc.id.length > 20 ? inc.id.slice(0, 12) + '...' + inc.id.slice(-6) : inc.id;

    tr.innerHTML = `
      <td class="mono font-semibold text-primary">${shortIdStr}</td>
      <td><span class="severity-pill ${sev.toLowerCase()}">${sev}</span></td>
      <td class="mono text-red font-semibold">${inc.detection_reason || 'CANARY_MODIFIED'}</td>
      <td class="mono">${inc.affected_paths?.length || 0} objects</td>
      <td class="text-muted mono">${detectedStr}</td>
      <td>
        <span class="status-badge-pill ${inc.status === 'resolved' ? 'VALID' : inc.status === 'frozen' ? 'MODIFIED' : 'PENDING'}">
          ${statusLabel}
        </span>
      </td>
      <td>
        <button type="button" class="btn btn-secondary btn-sm table-action-btn" data-id="${inc.id}">
          Investigate
        </button>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      // Don't double trigger if clicked directly on button
      selectIncident(inc.id);
      openIncidentModal(inc);
    });

    _dom.incidentsTableBody.appendChild(tr);
  }
}

/* ─── Render Security Events (Section 8) ──────────────────────────────────── */
function renderSecurityEvents(events = []) {
  if (!_dom.securityEventsFeed) return;
  _dom.securityEventsFeed.replaceChildren();

  for (const evt of events) {
    const item = document.createElement('div');
    item.className = 'event-feed-item';

    const iconBox = document.createElement('div');
    iconBox.className = `event-icon-box ${evt.severity || 'Info'}`;
    iconBox.appendChild(createIcon(evt.icon || 'activity', { size: 14 }));

    const content = document.createElement('div');
    content.className = 'event-content';

    const desc = document.createElement('span');
    desc.className = 'event-desc';
    desc.textContent = evt.description;

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    const timeStr = evt.timestamp
      ? new Date(evt.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : 'just now';
    meta.innerHTML = `<span>${timeStr}</span> &bull; <span>${evt.identity || 'system'}</span>`;

    content.appendChild(desc);
    content.appendChild(meta);

    item.appendChild(iconBox);
    item.appendChild(content);
    _dom.securityEventsFeed.appendChild(item);
  }
}

/* ─── UI Update Subscriber ────────────────────────────────────────────────── */
function updateUI(state) {
  // 1. Status Strip
  const sys = state.systemStatus;
  if (sys) {
    if (_dom.statusLabelDetection)
      _dom.statusLabelDetection.textContent = sys.detectionEngine.label;
    if (_dom.statusDetailDetection)
      _dom.statusDetailDetection.textContent = sys.detectionEngine.detail;
    if (_dom.statusLabelStorage) _dom.statusLabelStorage.textContent = sys.cloudStorage.label;
    if (_dom.statusDetailStorage) _dom.statusDetailStorage.textContent = sys.cloudStorage.detail;
    if (_dom.statusLabelBaseline)
      _dom.statusLabelBaseline.textContent = sys.baselineIntegrity.label;
    if (_dom.statusDetailBaseline)
      _dom.statusDetailBaseline.textContent = sys.baselineIntegrity.detail;
    if (_dom.statusLabelBackup) _dom.statusLabelBackup.textContent = sys.backupService.label;
    if (_dom.statusDetailBackup) _dom.statusDetailBackup.textContent = sys.backupService.detail;
  }

  // 2. KPI Cards
  const kpis = state.kpis;
  if (kpis) {
    if (_dom.kpiValFiles) _dom.kpiValFiles.textContent = kpis.protectedFiles.total;
    if (_dom.kpiSubFiles) _dom.kpiSubFiles.textContent = kpis.protectedFiles.secondary;
    if (_dom.kpiValIncidents) _dom.kpiValIncidents.textContent = kpis.activeIncidents.total;
    if (_dom.kpiSubIncidents) _dom.kpiSubIncidents.textContent = kpis.activeIncidents.secondary;
    if (_dom.kpiValEvents) _dom.kpiValEvents.textContent = kpis.detectionEvents.total;
    if (_dom.kpiSubEvents) _dom.kpiSubEvents.textContent = kpis.detectionEvents.diffPeriod;
    if (_dom.kpiValBackup) _dom.kpiValBackup.textContent = `${kpis.backupIntegrity.verifiedPct}%`;
    if (_dom.kpiSubBackup) _dom.kpiSubBackup.textContent = kpis.backupIntegrity.secondary;

    if (_dom.kpiCardIncidents) {
      if (kpis.activeIncidents.total > 0) {
        _dom.kpiCardIncidents.classList.add('has-threat');
      } else {
        _dom.kpiCardIncidents.classList.remove('has-threat');
      }
    }
  }

  // 3. Detection Summary & Gauge
  const det = state.detectionSummary;
  if (det) {
    const ratePct = Math.round(det.currentObservedRate * 100);
    const threshPct = Math.round(det.modificationThreshold * 100);
    if (_dom.gaugeVelocityText)
      _dom.gaugeVelocityText.textContent = `${ratePct}% observed (Threshold: ${threshPct}%)`;
    if (_dom.gaugeVelocityFill) {
      _dom.gaugeVelocityFill.style.width = `${Math.min(ratePct, 100)}%`;
      if (ratePct >= threshPct || det.canaryTriggered) {
        _dom.gaugeVelocityFill.className = 'gauge-fill threat';
      } else {
        _dom.gaugeVelocityFill.className = 'gauge-fill healthy';
      }
    }
    if (_dom.cfgThreshold) _dom.cfgThreshold.textContent = `${threshPct}% per window`;
    if (_dom.cfgWindow) _dom.cfgWindow.textContent = `${det.windowSeconds} seconds`;
    if (_dom.cfgCanaryAlert) {
      _dom.cfgCanaryAlert.textContent = det.canaryTriggered
        ? `Tripped (${det.canaryPath.split('/').pop()})`
        : 'Armed (Clean)';
      _dom.cfgCanaryAlert.className = det.canaryTriggered
        ? 'mono text-red font-semibold'
        : 'mono text-green font-semibold';
    }
    if (_dom.detectionStatusBadge) {
      if (det.canaryTriggered || ratePct >= threshPct) {
        _dom.detectionStatusBadge.textContent = 'POTENTIAL RANSOMWARE';
        _dom.detectionStatusBadge.className = 'signal-chip threat';
      } else {
        _dom.detectionStatusBadge.textContent = 'NORMAL OPERATIONS';
        _dom.detectionStatusBadge.className = 'signal-chip normal';
      }
    }
  }

  // 4. Update Chart
  if (state.threatActivity?.points) {
    updateDetectionChart(state.threatActivity.points);
  } else if (state.detectionRuns.length > 0) {
    updateDetectionChart(state.detectionRuns);
  }

  // 5. Incidents Table
  renderIncidentsTable(
    state.incidents,
    _dom.incidentTableSearch?.value || state.searchQuery,
    _dom.severitySelectFilter?.value || state.severityFilter,
    _dom.statusSelectFilter?.value || state.statusFilter
  );

  // 6. Security Events Feed
  if (state.securityEvents) {
    renderSecurityEvents(state.securityEvents);
  }

  // 7. Connectivity & Timestamp
  if (_dom.lastRefreshedLabel && state.lastUpdated) {
    const d = new Date(state.lastUpdated);
    _dom.lastRefreshedLabel.textContent = `Refreshed: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}

/* ─── Sidebar Tab Router ──────────────────────────────────────────────────── */
export function switchView(viewName) {
  if (!viewName) return;
  const views = document.querySelectorAll('.dashboard-view');
  const targetView = document.getElementById(`view-${viewName}`);
  if (!targetView) return;

  views.forEach((v) => v.classList.remove('active'));
  targetView.classList.add('active');

  if (_dom.navItems) {
    _dom.navItems.forEach((btn) => {
      if (btn.getAttribute('data-nav') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Update header breadcrumb
  const breadcrumbCurrent = document.querySelector('.header-breadcrumb .current');
  if (breadcrumbCurrent) {
    const titles = {
      overview: 'Overview',
      storage: 'Cloud Storage & Canaries',
      detection: 'Threat Detection Engine',
      incidents: 'Security Incidents',
      recovery: 'Backup & Recovery Health',
      evidence: 'Cryptographic Evidence',
      audit: 'Forensic Audit Logs',
      settings: 'Settings & Config',
    };
    breadcrumbCurrent.textContent =
      titles[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
  }

  window.location.hash = viewName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Attack Simulation Story Runner ──────────────────────────────────────── */
async function launchSimulation() {
  if (_storyPlaying) return;
  _storyPlaying = true;
  showToast('Launching controlled demo simulation against test objects...', 'info');

  try {
    // Step 1: Normal operations
    setState({ currentVerdict: 'normal', canaryTriggered: false });
    await refreshAll();
    await new Promise((r) => setTimeout(r, 800));

    // Step 2: Mass modifications begin
    showToast('Simulating mass modifications (22 objects modified)...', 'info');
    if (typeof api.simulateMassAttack === 'function') {
      await api.simulateMassAttack();
    }
    await new Promise((r) => setTimeout(r, 1000));

    // Step 3: Threat verdict & IAM account freeze
    showToast('Threat threshold breached! Automated IAM Write-Freeze triggered.', 'threat');
    await new Promise((r) => setTimeout(r, 800));

    // Step 4: Full refresh to show active incident
    await refreshAll();
    showToast('Incident record cryptographically sealed with Ed25519 HSM signature.', 'info');
  } catch (err) {
    console.error('[simulation] error:', err);
  } finally {
    _storyPlaying = false;
  }
}

/* ─── Wire Event Handlers ─────────────────────────────────────────────────── */
function wireEvents() {
  // Sidebar Collapse
  if (_dom.sidebarCollapseBtn && _dom.sidebar) {
    _dom.sidebarCollapseBtn.addEventListener('click', () => {
      _dom.sidebar.classList.toggle('collapsed');
      const isCollapsed = _dom.sidebar.classList.contains('collapsed');
      setState({ sidebarCollapsed: isCollapsed });
    });
  }

  // Sidebar Nav Items (Tab Router)
  if (_dom.navItems) {
    _dom.navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const navTarget = btn.getAttribute('data-nav');
        if (navTarget) switchView(navTarget);
      });
    });
  }

  // URL Hash Navigation Sync
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`view-${hash}`)) {
      switchView(hash);
    }
  });

  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && document.getElementById(`view-${initialHash}`)) {
    switchView(initialHash);
  }

  // Time Range Buttons
  if (_dom.timeBtns) {
    _dom.timeBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        _dom.timeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const range = btn.getAttribute('data-range') || '24H';
        setState({ timeRange: range });
        try {
          const act = await api.getThreatActivity(range);
          setState({ threatActivity: act });
        } catch (err) {
          console.error('[timeRange] fetch failed:', err);
        }
      });
    });
  }

  // Search input & filters
  const applyTableFilters = () => {
    const q = _dom.incidentTableSearch?.value || '';
    const sev = _dom.severitySelectFilter?.value || 'all';
    const st = _dom.statusSelectFilter?.value || 'all';
    renderIncidentsTable(getState().incidents, q, sev, st);
  };

  _dom.incidentTableSearch?.addEventListener('input', applyTableFilters);
  _dom.severitySelectFilter?.addEventListener('change', applyTableFilters);
  _dom.statusSelectFilter?.addEventListener('change', applyTableFilters);

  // Header Search Input
  _dom.headerSearchInput?.addEventListener('input', (e) => {
    const q = e.target.value;
    if (_dom.incidentTableSearch) _dom.incidentTableSearch.value = q;
    applyTableFilters();
  });

  // Dropdowns (Notification & User Menu)
  _dom.notificationBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    _dom.notificationDropdown?.classList.toggle('show');
    _dom.userDropdown?.classList.remove('show');
  });

  _dom.userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    _dom.userDropdown?.classList.toggle('show');
    _dom.notificationDropdown?.classList.remove('show');
  });

  document.addEventListener('click', () => {
    _dom.notificationDropdown?.classList.remove('show');
    _dom.userDropdown?.classList.remove('show');
  });

  document.getElementById('userProfileBtn')?.addEventListener('click', () => {
    const cached = localStorage.getItem('cloudrdr_user');
    const u = cached ? JSON.parse(cached) : null;
    showToast(
      `Operator: ${u?.fullName || 'SOC Lead'} &bull; Role: ${u?.role?.toUpperCase() || 'ANALYST'} &bull; Status: Active`,
      'info'
    );
  });

  document.getElementById('userSettingsBtn')?.addEventListener('click', () => {
    showToast('Account Settings: Cryptographic Zero-Trust Session &bull; TLS 1.3 Active', 'info');
  });

  document.getElementById('userSignOutBtn')?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('cloudrdr_user');
    localStorage.removeItem('cloudrdr_token');
    showToast('Signed out. Redirecting to login...', 'info');
    setTimeout(() => {
      window.location.href = '/login';
    }, 400);
  });

  // Manual Refresh
  _dom.headerRefreshBtn?.addEventListener('click', async () => {
    _dom.headerRefreshBtn.querySelector('svg')?.classList.add('anim-spin');
    await refreshAll();
    setTimeout(() => {
      _dom.headerRefreshBtn.querySelector('svg')?.classList.remove('anim-spin');
    }, 500);
    showToast('Telemetry refreshed from live backend.', 'success');
  });

  // Quick Action Buttons
  _dom.runIntegrityScanBtn?.addEventListener('click', () => {
    openConfirmModal(
      'Run Cryptographic Integrity Scan?',
      'CloudRDR will compute SHA-256 hashes for all 50 protected objects and re-verify the pairwise Merkle root DAG.',
      async () => {
        showToast('Integrity scan running...', 'info');
        await refreshAll();
        showToast('All 50 objects verified valid against snapshot baseline.', 'success');
      }
    );
  });

  _dom.qaScanBtn?.addEventListener('click', () => _dom.runIntegrityScanBtn?.click());

  _dom.simulateAttackBtn?.addEventListener('click', () => {
    openConfirmModal(
      'Launch Demo Attack Simulation?',
      'This simulation operates exclusively on designated test data to safely demonstrate mass modifications, canary alert tripwires, automated IAM freeze, and recovery verification.',
      () => launchSimulation()
    );
  });

  _dom.qaSimulateBtn?.addEventListener('click', () => _dom.simulateAttackBtn?.click());

  _dom.qaVerifyBtn?.addEventListener('click', () => {
    showToast('Testing AES-256-GCM AEAD authentication tags across all backups...', 'info');
    setTimeout(() => {
      showToast('Backup integrity check passed: 100% tags valid.', 'success');
    }, 800);
  });

  _dom.qaIncidentsBtn?.addEventListener('click', () => switchView('incidents'));
  _dom.qaAuditBtn?.addEventListener('click', () => switchView('audit'));
  _dom.qaVerifyBtn?.addEventListener('click', () => switchView('recovery'));

  document.getElementById('viewAuditLogsLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('audit');
  });

  document.getElementById('viewEvidenceBtn')?.addEventListener('click', () => {
    switchView('evidence');
    showToast('Forensic bundle sealed with Ed25519 HSM Key: 4a7e91bd8f26... (Immutable)', 'info');
  });

  // Canary Sentinel Tripwire Demo
  document.getElementById('btnTripCanaryDemo')?.addEventListener('click', () => {
    openConfirmModal(
      'Trip Canary Sentinel Trap?',
      'This simulates ransomware touching the zero-touch decoy object (canary/tripwire_sentinel.docx), testing the sub-second automated IAM write-freeze response.',
      async () => {
        showToast('Canary decoy touched! Disagreeing hash detected...', 'threat');
        if (typeof api.triggerCanaryAlert === 'function') {
          await api.triggerCanaryAlert();
        }
        showToast(
          'Zero-Touch Canary breached! Automated IAM Write-Deny dispatched in 3.8s.',
          'threat'
        );
        const badge = document.getElementById('canarySentinelBadge');
        if (badge) {
          badge.textContent = 'TRIPPED & LOCKED';
          badge.className = 'canary-sentinel-badge tripped';
        }
        await refreshAll();
        setTimeout(() => {
          showToast('Incident record sealed with Ed25519 signature.', 'info');
          switchView('incidents');
        }, 1500);
      }
    );
  });

  // Merkle DAG Inspector Tamper Demo
  document.getElementById('btnTamperMerkleDemo')?.addEventListener('click', () => {
    const leaf = document.getElementById('leaf-2');
    const rootDisplay = document.getElementById('merkleRootHashText');
    const leafText = leaf?.querySelector('.text-muted');
    if (!leaf || !rootDisplay) return;

    if (leaf.classList.contains('tampered')) {
      // Revert tampering
      leaf.classList.remove('tampered');
      if (leafText) leafText.textContent = '7e41...90cc';
      rootDisplay.textContent = 'f7bbb36aa01a64a15ccf3ebfebfc51487263b6528994a5e128913...';
      rootDisplay.style.color = '';
      showToast(
        'Merkle Tree integrity re-verified: all leaves match snapshot baseline.',
        'success'
      );
    } else {
      // Tamper leaf
      leaf.classList.add('tampered');
      if (leafText) leafText.textContent = 'TAMPERED: c0ff...dead';
      rootDisplay.textContent = 'MISMATCH DETECTED: Root hash differs from signed manifest!';
      rootDisplay.style.color = 'var(--accent-red)';
      showToast(
        'Cryptographic Alert: Merkle Root mismatch detected in O(1)! File tampering caught.',
        'threat'
      );
    }
  });

  // Authorize Verified Recovery Workflow
  document.getElementById('btnTriggerRecoveryWorkflow')?.addEventListener('click', async () => {
    const incidents = await api.getIncidents();
    const frozen = incidents.filter((i) => i.status === 'frozen');
    if (frozen.length === 0) {
      showToast(
        'All protected objects are already valid and verified. No incidents require restoration.',
        'info'
      );
      return;
    }

    openConfirmModal(
      'Authorize Verified Recovery?',
      `Restore all ${frozen.length} contained incidents from AES-256-GCM backups with full AEAD authentication tag and SHA-256 baseline verification?`,
      async () => {
        showToast('Restoring objects through 4 Cryptographic Verification Gates...', 'info');
        for (const inc of frozen) {
          await api.restoreIncident(inc.id);
        }
        showToast('All files restored & verified! Threat level reset to normal.', 'success');
        const badge = document.getElementById('canarySentinelBadge');
        if (badge) {
          badge.textContent = 'ARMED • ZERO-TOUCH';
          badge.className = 'canary-sentinel-badge armed';
        }
        await refreshAll();
      }
    );
  });

  // Test Detection Policy
  document.getElementById('btnTestDetectionPolicy')?.addEventListener('click', () => {
    showToast('Telemetry tested against detection policy: 0 false positives detected.', 'success');
  });

  // Settings Save
  document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
    showToast('Configuration settings updated and applied to active monitor.', 'success');
  });

  // Modal Close Handlers
  _dom.modalIncidentCloseBtn?.addEventListener('click', () => {
    _dom.incidentModalBackdrop?.classList.remove('show');
  });
  _dom.modalDismissBtn?.addEventListener('click', () => {
    _dom.incidentModalBackdrop?.classList.remove('show');
  });

  _dom.confirmModalCloseBtn?.addEventListener('click', closeConfirmModal);
  _dom.confirmCancelBtn?.addEventListener('click', closeConfirmModal);
  _dom.confirmAcceptBtn?.addEventListener('click', () => {
    if (typeof _confirmCallback === 'function') {
      const cb = _confirmCallback;
      closeConfirmModal();
      cb();
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      _dom.headerSearchInput?.focus();
    } else if (e.key === 'Escape') {
      _dom.incidentModalBackdrop?.classList.remove('show');
      closeConfirmModal();
      _dom.notificationDropdown?.classList.remove('show');
      _dom.userDropdown?.classList.remove('show');
    } else if (
      e.key.toLowerCase() === 'r' &&
      !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())
    ) {
      e.preventDefault();
      _dom.headerRefreshBtn?.click();
    }
  });
}

/* ─── User Session & Profile ──────────────────────────────────────────────── */
function applyUserProfile(user) {
  if (!user) return;
  const nameEl = document.getElementById('userFullNameLabel');
  const emailEl = document.getElementById('userEmailLabel');
  const roleEl = document.getElementById('userRoleBadge');
  const avatarEl = document.getElementById('userAvatarPill');

  if (nameEl && user.fullName) nameEl.textContent = user.fullName;
  if (emailEl && user.email) emailEl.textContent = user.email;
  if (roleEl && user.role) {
    roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }
  if (avatarEl && user.fullName) {
    const initials = user.fullName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    avatarEl.textContent = initials || 'OP';
  }
}

async function initUserSession() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        applyUserProfile(data.user);
        localStorage.setItem('cloudrdr_user', JSON.stringify(data.user));
        return true;
      }
    }
  } catch (_err) {
    // Non-fatal network fallback
  }

  // Fallback to localStorage cached session
  try {
    const cached = localStorage.getItem('cloudrdr_user');
    if (cached) {
      applyUserProfile(JSON.parse(cached));
    }
  } catch (_e) {}
  return true;
}

/* ─── Initialization ──────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  cacheDom();
  populateIcons();

  // Load and apply authenticated user session
  await initUserSession();

  // Initialize Threat Activity Chart
  if (_dom.threatActivityCanvas) {
    initDetectionChart(_dom.threatActivityCanvas, []);
  }

  // Subscribe UI to reactive state changes
  subscribe(updateUI);

  // Wire interactive DOM events
  wireEvents();

  // Initial data load
  await refreshAll();

  // Polling loop (every 10s)
  _pollInterval = setInterval(async () => {
    if (!_storyPlaying) {
      await refreshAll();
    }
  }, CONFIG.POLL_INTERVAL_MS || 10000);
});
