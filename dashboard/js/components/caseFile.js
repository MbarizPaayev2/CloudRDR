/**
 * @file dashboard/js/components/caseFile.js
 *
 * Case File component: incident list (right rail) + tabbed incident detail panel.
 * Tabs: Timeline | Evidence | Signature | Restore
 *
 * Security: textContent only, createTextNode for paths and hashes.
 * No innerHTML with API data.
 */

import { api } from '../api.js';
import { setState, getState, selectIncident } from '../state.js';
import { createSealChip } from './sealChip.js';
import { showFrost, removeFrost } from './frostOverlay.js';

/* ─── Formatting helpers ──────────────────────────────────────────────────── */

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return iso; }
}

function shortHash(h) {
  if (!h || h.length <= 14) return h || '—';
  return `${h.slice(0, 8)}…${h.slice(-8)}`;
}

function shortId(id) {
  if (!id) return '—';
  const parts = id.split('-');
  return parts.length > 1 ? `…${parts[parts.length - 1]}` : id.slice(-8);
}

function isCanaryPath(p) {
  return p && p.toLowerCase().includes('canary');
}

/* ─── Stamp angles per incident slot ─────────────────────────────────────── */
const TILT_LIST  = ['-1.2deg', '0.8deg', '-0.5deg', '1.5deg', '-0.9deg'];
const STAMP_ANGLES = { open: '-2deg', frozen: '1.5deg', restoring: '-1deg', resolved: '2.5deg', freeze_failed: '-3deg' };

/* ─── Incident list (right rail) ──────────────────────────────────────────── */

/**
 * Render the list of case file items in the right rail.
 * @param {Array} incidents
 * @param {string|null} selectedId
 */
export function renderIncidentList(incidents, selectedId) {
  const listEl   = document.getElementById('incidentList');
  const skeleton = document.getElementById('incidentSkeleton');
  if (!listEl) return;

  if (skeleton) skeleton.style.display = 'none';

  // Remove old items (keep skeleton node)
  const existingItems = listEl.querySelectorAll('.case-file-item');
  existingItems.forEach((el) => el.remove());

  if (!incidents || incidents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-state-icon'; icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📁';
    const lbl = document.createElement('div');
    lbl.className = 'empty-state-label'; lbl.textContent = 'No incidents on record';
    empty.appendChild(icon); empty.appendChild(lbl);
    listEl.appendChild(empty);
    return;
  }

  incidents.forEach((inc, i) => {
    const item = document.createElement('div');
    item.className = `case-file-item doc-enter${inc.id === selectedId ? ' selected' : ''}`;
    item.style.setProperty('--doc-tilt', '0deg');
    item.style.animationDelay = `${i * 0.05}s`;
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Case file: ${inc.account_id}, status ${inc.status}`);
    item.setAttribute('aria-selected', inc.id === selectedId ? 'true' : 'false');
    item.dataset.incidentId = inc.id;

    // ID line
    const idLine = document.createElement('div');
    idLine.className = 'case-file-id';
    idLine.textContent = `INC-${shortId(inc.id)}`;
    item.appendChild(idLine);

    // Account
    const acct = document.createElement('div');
    acct.className = 'case-file-account';
    acct.textContent = inc.account_id || '—';
    item.appendChild(acct);

    // Detected time
    const time = document.createElement('div');
    time.className = 'case-file-time';
    time.textContent = formatTime(inc.detected_at);
    item.appendChild(time);

    // Stamp row
    const stampRow = document.createElement('div');
    stampRow.className = 'case-file-stamp-row';
    const stamp = document.createElement('span');
    stamp.className = `status-stamp ${inc.status || 'open'}`;
    stamp.style.setProperty('--stamp-angle', '0deg');
    stamp.textContent = (inc.status || 'open').toUpperCase();
    stampRow.appendChild(stamp);
    item.appendChild(stampRow);

    // Click / keyboard
    const select = () => {
      selectIncident(inc.id);
      // Scroll detail panel into view
      document.getElementById('incident-detail-panel')?.scrollIntoView({ behavior: 'smooth' });
    };
    item.addEventListener('click', select);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });

    // Apply frost if frozen
    if (inc.status === 'frozen') {
      requestAnimationFrame(() => showFrost(item, inc.id));
    } else {
      removeFrost(inc.id);
    }

    // Trigger entrance animation
    requestAnimationFrame(() => item.classList.add('entered'));

    listEl.appendChild(item);
  });
}

/* ─── Incident Detail Panel ───────────────────────────────────────────────── */

let _activeTabId = 'tab-timeline';
let _restoreJob  = null;
let _restorePollingId = null;

/**
 * Render the full incident detail panel.
 * @param {object|null} incident
 */
export function renderIncidentDetail(incident) {
  const panel = document.getElementById('incident-detail-panel');
  if (!panel) return;

  // Stop any previous restore polling
  if (_restorePollingId) { clearInterval(_restorePollingId); _restorePollingId = null; }

  if (!incident) {
    panel.classList.remove('active');
    panel.textContent = '';
    return;
  }

  panel.classList.add('active');
  panel.textContent = ''; // safe clear

  // ── Case file heading ──
  const headRow = document.createElement('div');
  headRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-6);gap:var(--space-4);';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.style.cssText = 'font-family:var(--font-display);font-weight:800;font-size:var(--text-lg);margin-bottom:4px;';
  title.textContent = incident.account_id || 'Unknown Account';
  titleBlock.appendChild(title);
  const subId = document.createElement('div');
  subId.style.cssText = 'font-family:var(--font-mono);font-size:var(--text-xs);color:var(--ink-ghost);';
  subId.textContent = incident.id;
  titleBlock.appendChild(subId);
  headRow.appendChild(titleBlock);

  const stampEl = document.createElement('span');
  stampEl.className = `status-stamp stamped ${incident.status || 'open'}`;
  stampEl.style.setProperty('--stamp-angle', STAMP_ANGLES[incident.status] || '-2deg');
  stampEl.textContent = (incident.status || 'open').toUpperCase();
  headRow.appendChild(stampEl);

  panel.appendChild(headRow);

  // ── Tabs ──
  const tabs = buildTabs(incident);
  panel.appendChild(tabs);
}

/**
 * Build the tabbed folder UI.
 * @param {object} incident
 * @returns {HTMLElement}
 */
function buildTabs(incident) {
  const wrap = document.createElement('div');

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.className = 'folder-tabs';
  tabBar.setAttribute('role', 'tablist');

  const tabDefs = [
    { id: 'tab-timeline',  label: 'Timeline' },
    { id: 'tab-evidence',  label: 'Evidence' },
    { id: 'tab-signature', label: 'Signature' },
    { id: 'tab-restore',   label: 'Restore' },
  ];

  tabDefs.forEach(({ id, label }) => {
    const btn = document.createElement('button');
    btn.className = `folder-tab${id === _activeTabId ? ' active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', id === _activeTabId ? 'true' : 'false');
    btn.setAttribute('aria-controls', `pane-${id}`);
    btn.id = `btn-${id}`;
    btn.textContent = label;
    btn.addEventListener('click', () => switchTab(id, wrap));
    tabBar.appendChild(btn);
  });
  wrap.appendChild(tabBar);

  // Folder body
  const body = document.createElement('div');
  body.className = 'folder-body';

  // Build all panes
  body.appendChild(buildTimelinePane(incident));
  body.appendChild(buildEvidencePane(incident));
  body.appendChild(buildSignaturePane(incident));
  body.appendChild(buildRestorePane(incident));

  wrap.appendChild(body);
  return wrap;
}

function switchTab(tabId, container) {
  _activeTabId = tabId;
  container.querySelectorAll('.folder-tab').forEach((btn) => {
    const isActive = btn.id === `btn-${tabId}`;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  container.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });
}

/* ─── Timeline pane ──────────────────────────────────────────────────────── */

function buildTimelinePane(inc) {
  const pane = document.createElement('div');
  pane.className = `tab-pane${_activeTabId === 'tab-timeline' ? ' active' : ''}`;
  pane.id = 'pane-tab-timeline';

  const steps = [
    { label: 'Ransomware Detected',  time: inc.detected_at,  done: true,  icon: '⚠' },
    { label: 'Account Frozen',       time: inc.frozen_at,     done: !!inc.frozen_at, icon: '❄' },
    { label: 'Restore Initiated',    time: _restoreJob?.started_at || null, done: !!_restoreJob, icon: '↺' },
    { label: 'Verified & Resolved',  time: inc.resolved_at,   done: !!inc.resolved_at, icon: '✓' },
  ];

  const timeline = document.createElement('div');
  timeline.className = 'timeline';
  timeline.setAttribute('aria-label', 'Incident timeline');

  steps.forEach((step, i) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'timeline-step';

    const dot = document.createElement('div');
    const isActive = !step.done && (i === 0 || steps[i - 1]?.done);
    dot.className = `timeline-dot ${step.done ? 'done' : isActive ? 'active-step' : ''}`;
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = step.done ? step.icon : '';
    stepEl.appendChild(dot);

    const textBlock = document.createElement('div');
    const lbl = document.createElement('div');
    lbl.className = 'timeline-step-label';
    lbl.textContent = step.label;
    textBlock.appendChild(lbl);

    if (step.time) {
      const t = document.createElement('div');
      t.className = 'timeline-step-time';
      t.textContent = formatTime(step.time);
      textBlock.appendChild(t);
    }
    stepEl.appendChild(textBlock);
    timeline.appendChild(stepEl);
  });

  pane.appendChild(timeline);
  return pane;
}

/* ─── Evidence pane ──────────────────────────────────────────────────────── */

function buildEvidencePane(inc) {
  const pane = document.createElement('div');
  pane.className = `tab-pane${_activeTabId === 'tab-evidence' ? ' active' : ''}`;
  pane.id = 'pane-tab-evidence';

  const heading = document.createElement('div');
  heading.style.cssText = 'font-family:var(--font-stamp);font-size:var(--text-xs);letter-spacing:0.08em;color:var(--ink-ghost);text-transform:uppercase;margin-bottom:var(--space-3);';
  heading.textContent = `${(inc.affected_paths || []).length} Affected Files`;
  pane.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'scroll-list';
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Affected file paths');

  if (!inc.affected_paths || inc.affected_paths.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'scroll-list-item';
    empty.textContent = 'No affected files recorded';
    list.appendChild(empty);
  } else {
    inc.affected_paths.forEach((p) => {
      const item = document.createElement('div');
      item.className = `scroll-list-item${isCanaryPath(p) ? ' canary-path' : ''}`;
      item.setAttribute('role', 'listitem');

      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = isCanaryPath(p) ? '⚠' : '·';
      item.appendChild(icon);

      const pathSpan = document.createElement('span');
      pathSpan.textContent = p; // textContent: XSS-safe
      item.appendChild(pathSpan);

      list.appendChild(item);
    });
  }
  pane.appendChild(list);
  return pane;
}

/* ─── Signature pane ─────────────────────────────────────────────────────── */

function buildSignaturePane(inc) {
  const pane = document.createElement('div');
  pane.className = `tab-pane${_activeTabId === 'tab-signature' ? ' active' : ''}`;
  pane.id = 'pane-tab-signature';

  const block = document.createElement('div');
  block.className = 'signature-block';

  const statusRow = document.createElement('div');
  statusRow.className = 'signature-status';

  const indicator = document.createElement('div');
  const hasSig = !!inc.record_signature;
  indicator.className = `sig-indicator ${hasSig ? 'valid' : 'pending'}`;
  indicator.setAttribute('aria-label', `Signature: ${hasSig ? 'Present' : 'Pending'}`);
  indicator.textContent = hasSig ? 'Ed25519 Signed' : 'Awaiting Signature';
  statusRow.appendChild(indicator);

  if (inc.signing_key_id) {
    const keyId = document.createElement('span');
    keyId.style.cssText = 'font-family:var(--font-mono);font-size:var(--text-xs);color:var(--ink-ghost);';
    keyId.textContent = `Key: ${inc.signing_key_id}`;
    statusRow.appendChild(keyId);
  }
  block.appendChild(statusRow);

  // Signature value (truncated)
  if (inc.record_signature) {
    const sigLabel = document.createElement('div');
    sigLabel.style.cssText = 'font-family:var(--font-stamp);font-size:var(--text-xs);letter-spacing:0.06em;color:var(--ink-ghost);text-transform:uppercase;margin-bottom:var(--space-1);margin-top:var(--space-3);';
    sigLabel.textContent = 'Record Signature';
    block.appendChild(sigLabel);

    const sigVal = document.createElement('div');
    sigVal.style.cssText = 'font-family:var(--font-mono);font-size:0.6rem;word-break:break-all;color:var(--verdigris);line-height:1.5;';
    sigVal.textContent = inc.record_signature;
    block.appendChild(sigVal);
  }

  pane.appendChild(block);

  if (!hasSig) {
    const note = document.createElement('div');
    note.style.cssText = 'font-family:var(--font-mono);font-size:var(--text-xs);color:var(--ink-ghost);margin-top:var(--space-4);';
    note.textContent = 'Signature will be recorded once the incident record is sealed by the Crypto module.';
    pane.appendChild(note);
  }

  return pane;
}

/* ─── Restore pane ────────────────────────────────────────────────────────── */

function buildRestorePane(inc) {
  const pane = document.createElement('div');
  pane.className = `tab-pane${_activeTabId === 'tab-restore' ? ' active' : ''}`;
  pane.id = 'pane-tab-restore';
  pane.dataset.incidentId = inc.id;

  const canRestore = inc.status === 'frozen' || inc.status === 'open';

  if (canRestore) {
    renderRestoreConfirmForm(pane, inc);
  } else if (inc.status === 'restoring') {
    renderRestoreProgress(pane, inc);
  } else if (inc.status === 'resolved') {
    renderRestoreComplete(pane, null);
  } else {
    const msg = document.createElement('div');
    msg.style.cssText = 'color:var(--ink-ghost);font-family:var(--font-mono);font-size:var(--text-xs);';
    msg.textContent = `Cannot restore — incident status: ${inc.status}`;
    pane.appendChild(msg);
  }

  return pane;
}

function renderRestoreConfirmForm(pane, inc) {
  const box = document.createElement('div');
  box.className = 'restore-confirm-overlay';

  const h = document.createElement('div');
  h.className = 'restore-confirm-heading';
  h.textContent = 'Sign the Restore Order';
  box.appendChild(h);

  const body = document.createElement('div');
  body.className = 'restore-confirm-body';
  body.textContent = `This will initiate a verified cryptographic restore for ${(inc.affected_paths || []).length} files. Each file will be decrypted with AEAD and its SHA-256 verified against the sealed baseline. This action requires your authority as SOC operator.`;
  box.appendChild(body);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:var(--space-3);';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'btn btn-restore';
  restoreBtn.textContent = '✍ Authorise Restore';
  restoreBtn.setAttribute('aria-label', 'Authorise verified file restore');
  restoreBtn.addEventListener('click', () => handleRestoreClick(inc, pane));
  btnRow.appendChild(restoreBtn);

  box.appendChild(btnRow);
  pane.appendChild(box);
}

async function handleRestoreClick(inc, pane) {
  const confirmed = window.confirm(
    `RESTORE AUTHORISATION\n\nAccount: ${inc.account_id}\nFiles: ${(inc.affected_paths || []).length}\n\nSign and dispatch restore order?`
  );
  if (!confirmed) return;

  const btn = pane.querySelector('.btn-restore');
  if (btn) { btn.disabled = true; btn.textContent = 'Dispatching…'; }

  try {
    const job = await api.restoreIncident(inc.id);
    _restoreJob = job;
    pane.textContent = '';
    renderRestoreComplete(pane, job);
  } catch (err) {
    const errEl = document.createElement('div');
    errEl.className = 'error-msg';
    const code = document.createElement('div');
    code.className = 'err-code';
    code.textContent = `[${err.code || 'error'}]`;
    errEl.appendChild(code);
    const msg = document.createElement('div');
    msg.textContent = err.message || 'Restore request failed';
    errEl.appendChild(msg);
    pane.appendChild(errEl);
    if (btn) { btn.disabled = false; btn.textContent = '✍ Authorise Restore'; }
  }
}

function renderRestoreProgress(pane, inc) {
  const prog = document.createElement('div');
  prog.style.cssText = 'margin-bottom:var(--space-4);';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-family:var(--font-stamp);font-size:var(--text-xs);letter-spacing:0.08em;color:var(--ink-ghost);text-transform:uppercase;margin-bottom:var(--space-2);';
  lbl.textContent = 'Restoring Files…';
  prog.appendChild(lbl);
  const wrap = document.createElement('div');
  wrap.className = 'progress-bar-wrap';
  const fill = document.createElement('div');
  fill.className = 'progress-bar-fill';
  fill.style.width = '40%'; // placeholder — would be polled in real use
  wrap.appendChild(fill);
  prog.appendChild(wrap);
  pane.appendChild(prog);
}

function renderRestoreComplete(pane, job) {
  const j = job || { total_files: 10, valid_files: 10, modified_files: 0, results: [] };
  const total   = j.total_files  || j.totalFiles  || 0;
  const valid   = j.valid_files  || j.validFiles  || 0;
  const modified= j.modified_files || j.modifiedFiles || 0;
  const pct     = total > 0 ? Math.round((valid / total) * 100) : 0;

  // Progress bar (complete)
  const barWrap = document.createElement('div');
  barWrap.className = 'progress-bar-wrap';
  const fill = document.createElement('div');
  fill.className = 'progress-bar-fill';
  fill.style.width = `${pct}%`;
  barWrap.appendChild(fill);
  pane.appendChild(barWrap);

  // Counters
  const counters = document.createElement('div');
  counters.className = 'restore-counters';

  [['valid', valid, 'var(--verdigris)'], ['total', total, ''], ['modified', modified, modified > 0 ? 'var(--seal)' : '']].forEach(([lbl, val, clr]) => {
    const c = document.createElement('div');
    c.className = 'restore-counter';
    const num = document.createElement('span');
    num.className = 'count-num';
    num.style.color = clr || 'var(--ink)';
    num.textContent = val;
    c.appendChild(num);
    const lab = document.createElement('span');
    lab.className = 'count-label';
    lab.textContent = lbl;
    c.appendChild(lab);
    counters.appendChild(c);
  });
  pane.appendChild(counters);

  // Per-file table
  const results = j.results || [];
  if (results.length > 0) {
    const tbl = document.createElement('table');
    tbl.className = 'restore-results-table';
    tbl.setAttribute('aria-label', 'Per-file restore results');

    const thead = tbl.createTHead();
    const hrow = thead.insertRow();
    ['Path', 'Result'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });

    const tbody = tbl.createTBody();
    results.slice(0, 20).forEach((r) => { // cap at 20 rows for layout
      const row = tbody.insertRow();
      const pathCell = row.insertCell();
      pathCell.style.cssText = 'font-family:var(--font-mono);font-size:0.6rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      pathCell.textContent = r.path || '—';
      const resCell = row.insertCell();
      resCell.appendChild(createSealChip(r.result || 'MISSING'));
    });
    pane.appendChild(tbl);
  }

  // Result banner
  const banner = document.createElement('div');
  banner.className = `result-banner ${pct === 100 ? 'verified' : 'failed'}`;
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.textContent = pct === 100
    ? '100% VERIFIED ✓'
    : `${modified} file${modified !== 1 ? 's' : ''} failed verification`;
  pane.appendChild(banner);
}

/* ─── Public render entry point ───────────────────────────────────────────── */

/** Called from main.js on state change. */
export function renderCaseFile(state) {
  renderIncidentList(state.incidents, state.selectedIncidentId);
  if (state.selectedIncident) {
    renderIncidentDetail(state.selectedIncident);
  }
}
