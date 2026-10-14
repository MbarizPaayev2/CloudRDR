/**
 * @file dashboard/js/main.js
 *
 * CloudRDR Dashboard — The Notary's Archive
 * Main entry point: wires all components together, manages polling,
 * page-load entrance, demo toggle, and the "Play Story" narrative.
 *
 * Security: no API data via innerHTML. All component APIs use textContent.
 */

import { CONFIG, updateConfig } from './config.js';
import { api } from './api.js';
import { getState, setState, subscribe, refreshAll } from './state.js';
import { mockApi } from './mock/mockApi.js';

import { initMerkleTree, setLeafState, animateCorruption, animateRestore, setRootHash, getLeafCount } from './components/merkleTree.js';
import { updateVerdictStamp } from './components/verdictStamp.js';
import { renderBaseline, initBaselineLedger } from './components/baselineLedger.js';
import { initDetectionChart, updateDetectionChart } from './components/detectionChart.js';
import { updateCanaryCage } from './components/canaryCage.js';
import { renderCaseFile } from './components/caseFile.js';
import { renderHashChain } from './components/hashChain.js';
import { setButtonContent } from './icons.js';
import { showToast } from './components/toast.js';

/* ─── State ─────────────────────────────────────────────────────────────── */
let _pollTimer    = null;
let _storyPlaying = false;

/* ─── Merkle tree sizing ─────────────────────────────────────────────────── */
let _treeInited = false;
const LEAF_COUNT = 20; // illustrative

function ensureMerkleTree(fileCount) {
  const svg = document.getElementById('merkle-svg');
  if (!svg) return;
  if (!_treeInited) {
    initMerkleTree(svg, Math.min(fileCount || LEAF_COUNT, 32));
    _treeInited = true;
  }
}

/* ─── UI update (called on every state change) ──────────────────────────── */
function updateUI(state) {
  // 1. Verdict stamp + body class
  updateVerdictStamp(state.currentVerdict, state.canaryTriggered);

  // 2. Health indicator + footer telemetry status.
  // Rule (ui-ux-pro-max, Real-Time pattern): only label telemetry "live" when a
  // real source backs it; demo data is labelled as simulated.
  const dot  = document.getElementById('healthDot');
  const text = document.getElementById('healthText');
  const footerStatus = document.getElementById('footerStatus');
  const h = state.health;
  let statusWord = 'OFFLINE';
  let statusClass = 'offline';
  if (h?.status === 'ok') {
    statusWord = CONFIG.USE_MOCK ? 'SIMULATED' : 'LIVE';
    statusClass = CONFIG.USE_MOCK ? 'simulated' : 'online';
  } else if (h?.status === 'loading') {
    statusWord = 'CONNECTING';
    statusClass = 'loading';
  }
  if (dot && text) {
    dot.className = `health-dot ${statusClass === 'simulated' ? 'online' : statusClass}`;
    text.textContent = h?.status === 'ok'
      ? `${CONFIG.USE_MOCK ? 'Simulated' : 'Online'}${h.uptime ? ` · ${Math.round(h.uptime)}s` : ''}`
      : h?.status === 'loading' ? 'Connecting…' : 'Offline';
  }
  if (footerStatus) {
    footerStatus.textContent = statusWord;
    footerStatus.className = `telemetry-status ${statusClass}`;
  }

  // 3. Baseline ledger
  renderBaseline(state);

  // 4. Canary cage
  updateCanaryCage(state.canaryTriggered, state.currentVerdict);

  // 5. Merkle tree: init on first baseline, then update leaf states
  if (state.baseline) {
    ensureMerkleTree(state.baseline.file_count || LEAF_COUNT);

    // Update root hash display
    const hashState = state.currentVerdict === 'ransomware'
      ? 'compromised'
      : state.currentVerdict === 'normal'
        ? 'normal'
        : 'normal';
    setRootHash(state.baseline.merkle_root, hashState);

    // Update tree leaf/corrupt counters
    const leafCountEl   = document.getElementById('treeLeafCount');
    const corruptCountEl = document.getElementById('treeCorruptCount');
    if (leafCountEl) leafCountEl.textContent = state.baseline.file_count || LEAF_COUNT;

    const affectedCount = state.selectedIncident?.affected_paths?.length || 0;
    if (corruptCountEl) {
      corruptCountEl.textContent = `${affectedCount} corrupt`;
      corruptCountEl.style.display = affectedCount > 0 ? '' : 'none';
    }

    // Update merkle root also in sidebar ledger
    const merkleRootDisplay = document.getElementById('merkleRootDisplay');
    if (merkleRootDisplay && state.baseline.merkle_root) {
      const h = state.baseline.merkle_root;
      merkleRootDisplay.textContent = `${h.slice(0, 8)}…${h.slice(-8)}`;
    }
  }

  // 6. Detection chart
  const canvas   = document.getElementById('detectionChartCanvas');
  const skeleton = document.getElementById('chartSkeleton');
  if (canvas && state.detectionRuns?.length) {
    if (skeleton) skeleton.style.display = 'none';
    canvas.style.display = 'block';
    updateDetectionChart(state.detectionRuns);
  }

  // 7. Case files (right rail + detail panel)
  renderCaseFile(state);

  // 8. Hash chain
  if (state.auditLog?.length) {
    renderHashChain(state.auditLog);
  }

  // 9. Header timestamps + bucket
  const updated = document.getElementById('headerUpdated');
  if (updated && state.lastUpdated) {
    const t = new Date(state.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updated.textContent = t;
    updated.setAttribute('datetime', state.lastUpdated);
  }
  const footerUpdated = document.getElementById('footerUpdated');
  if (footerUpdated && state.lastUpdated) {
    footerUpdated.textContent = new Date(state.lastUpdated).toLocaleString();
    footerUpdated.setAttribute('datetime', state.lastUpdated);
  }

  // 10. Global error banner
  const banner  = document.getElementById('global-error-banner');
  const errText = document.getElementById('global-error-text');
  if (banner && errText) {
    if (state.error) {
      errText.textContent = `[${state.error.code}] ${state.error.message}`;
      banner.classList.add('visible');
    } else {
      banner.classList.remove('visible');
    }
  }
}

/* ─── Polling ────────────────────────────────────────────────────────────── */
function startPolling() {
  stopPolling();
  _pollTimer = setInterval(async () => {
    if (document.hidden) return; // pause when tab hidden
    await refreshAll({ background: true });
  }, CONFIG.POLL_INTERVAL_MS);
}

function stopPolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

// Pause/resume on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling(); else startPolling();
});

/* ─── Demo mode toggle ──────────────────────────────────────────────────── */
function initDemoToggle() {
  const toggle    = document.getElementById('demoModeToggle');
  const modeLabel = document.getElementById('demoModeLabel');
  const footerMode = document.getElementById('footerMode');

  const applyMode = (useMock) => {
    updateConfig('USE_MOCK', useMock);
    if (modeLabel) modeLabel.textContent = useMock ? 'Demo' : 'Live API';
    if (footerMode) footerMode.textContent = useMock ? 'Demo mode (mock data)' : 'Live API mode';
    // Reset tree on mode switch
    _treeInited = false;
    refreshAll();
  };

  if (toggle) {
    toggle.checked = CONFIG.USE_MOCK;
    toggle.addEventListener('change', (e) => applyMode(e.target.checked));
  }

  applyMode(CONFIG.USE_MOCK); // set initial label
}

/* ─── Manual refresh button ─────────────────────────────────────────────── */
function initManualRefresh() {
  const btn = document.getElementById('manualRefreshBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    setButtonContent(btn, 'Refreshing…', 'loader', { spin: true, leading: true });
    await refreshAll();
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    setButtonContent(btn, 'Refresh', 'refresh', { leading: true });
    showToast('Telemetry refreshed from server', 'info', 2000);
  });
}

/* ─── Global error banner dismiss ─────────────────────────────────────────── */
function initErrorBanner() {
  const btn = document.getElementById('global-error-dismiss');
  if (btn) {
    btn.addEventListener('click', () => {
      setState({ error: null });
    });
  }
}

/* ─── Global Keyboard Shortcuts (Space, R, Alt+D, Escape) ───────────────── */
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const target = e.target;
    const isEditing = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
    if (isEditing) return;

    // Space or Alt+S: Play Attack Simulation
    if (e.code === 'Space' || (e.altKey && (e.key === 's' || e.key === 'S'))) {
      const playBtn = document.getElementById('playStoryBtn');
      if (playBtn && !playBtn.disabled && !_storyPlaying) {
        e.preventDefault();
        playBtn.click();
      }
    }
    // R or Alt+R: Manual Telemetry Refresh
    else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
      const refreshBtn = document.getElementById('manualRefreshBtn');
      if (refreshBtn && !refreshBtn.disabled) {
        e.preventDefault();
        refreshBtn.click();
      }
    }
    // Alt+D: Demo Mode Toggle
    else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      const toggle = document.getElementById('demoModeToggle');
      if (toggle) {
        e.preventDefault();
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event('change'));
        showToast(toggle.checked ? 'Demo mode enabled (synthetic attack data)' : 'Live API mode enabled (Fastify backend)', 'info', 2500);
      }
    }
    // Escape: Dismiss error banner
    else if (e.key === 'Escape') {
      const banner = document.getElementById('global-error-banner');
      if (banner && banner.classList.contains('visible')) {
        e.preventDefault();
        setState({ error: null });
        showToast('Notice dismissed', 'info', 1500);
      }
    }
  });
}

/* ─── Page-load entrance animations ────────────────────────────────────────── */
function runEntranceAnimations() {
  const docs = document.querySelectorAll('.doc-enter');
  docs.forEach((el, i) => {
    el.style.animationDelay = `${i * 0.08}s`;
    requestAnimationFrame(() => el.classList.add('entered'));
  });
}

/* ─── Chart initialisation (needs DOM + Chart.js loaded) ──────────────────── */
function initChart(runs) {
  const canvas   = document.getElementById('detectionChartCanvas');
  const skeleton = document.getElementById('chartSkeleton');
  if (!canvas) return;

  if (!runs || runs.length === 0) {
    if (skeleton) skeleton.style.display = 'block';
    canvas.style.display = 'none';
    return;
  }

  if (skeleton) skeleton.style.display = 'none';
  canvas.style.display = 'block';

  // Dynamic import of chart component (Chart.js must be loaded as global)
  if (typeof Chart === 'undefined') {
    console.warn('[main] Chart.js not yet loaded, retrying in 500ms');
    setTimeout(() => initChart(runs), 500);
    return;
  }

  const { initDetectionChart: init } = { initDetectionChart };
  initDetectionChart(canvas, runs);
}

/* ─── "Play Story" — full narrative animation ──────────────────────────────── */
async function playStory() {
  if (_storyPlaying) return;
  _storyPlaying = true;

  const btn = document.getElementById('playStoryBtn');
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    setButtonContent(btn, 'Simulating…', 'loader', { spin: true });
  }

  stopPolling();

  const svg = document.getElementById('merkle-svg');
  const leafCount = 20;

  // ── Phase 1: Calm baseline ──────────────────────────────────────────
  showToast('Phase 1: Baseline established. All 20 storage leaves verified under Merkle root.', 'info', 3000);
  const baseline = await mockApi.getBaseline('protected');
  setState({
    baseline,
    currentVerdict: 'normal',
    canaryTriggered: false,
    detectionRuns: (await mockApi.getDetectionRuns(4)).slice(0, 4),
    auditLog: (await mockApi.getAuditLog()).slice(0, 2),
    selectedIncident: null,
    selectedIncidentId: null,
    incidents: [],
  });

  // Ensure tree is initialised
  if (!_treeInited) {
    initMerkleTree(svg, leafCount);
    _treeInited = true;
  }
  // All leaves healthy
  for (let i = 0; i < leafCount; i++) setLeafState(i, 'healthy');
  setRootHash(baseline.merkle_root, 'normal');
  updateVerdictStamp('normal', false);

  await sleep(2000);

  // ── Phase 2: Suspicious activity ───────────────────────────────────
  showToast('Phase 2: Suspicious file alteration spike (15% rate). Tripwire monitoring armed.', 'warning', 3000);
  const allRuns = await mockApi.getDetectionRuns(50);
  setState({ currentVerdict: 'suspicious', detectionRuns: allRuns.slice(0, 5) });
  updateVerdictStamp('suspicious', false);

  // Corrupt 3 leaves
  animateCorruption([2, 7, 15], 0);

  await sleep(2000);

  // ── Phase 3: Ransomware — corruption climbs the tree ───────────────
  showToast('Phase 3: RANSOMWARE DETECTED! Canary corrupted. Automated containment initiated.', 'threat', 3500);
  setState({ currentVerdict: 'ransomware', canaryTriggered: true, detectionRuns: allRuns });
  updateVerdictStamp('ransomware', true);
  updateCanaryCage(true, 'ransomware');
  setRootHash(baseline.merkle_root, 'compromised');

  // Corrupt many leaves — staggered
  const corruptIdx = [0,1,3,4,5,6,8,9,10,11,12,13,14,16,17,18];
  animateCorruption(corruptIdx, 0);

  await sleep(3000);

  // ── Phase 4: Incident created & frozen ─────────────────────────────
  showToast('Phase 4: Containment locked. Cloud account frozen via IAM write-deny policy.', 'warning', 3000);
  const incidents = await mockApi.getIncidents();
  const frozen = incidents.find((i) => i.status === 'frozen') || incidents[0];
  setState({
    incidents,
    selectedIncident: frozen,
    selectedIncidentId: frozen?.id,
    auditLog: await mockApi.getAuditLog(),
  });
  renderHashChain(getState().auditLog);

  await sleep(2000);

  // ── Phase 5: Restore — leaves re-seal one by one ───────────────────
  showToast('Phase 5: AEAD authenticated restore in progress. Re-sealing files from tamper-proof backup…', 'info', 3000);
  const restoreJob = await mockApi.restoreIncident(frozen?.id);
  setState({ currentVerdict: 'normal', canaryTriggered: false });
  updateVerdictStamp('normal', false);
  updateCanaryCage(false, 'normal');

  // Restore leaves
  const allLeaves = [...corruptIdx, 2, 7, 15];
  animateRestore(allLeaves, 0);
  setRootHash(baseline.merkle_root, 'restored');

  await sleep(allLeaves.length * 100 + 800);

  // Show resolved incident with restore results
  showToast('Recovery verified: 100% cryptographic hashes re-verified. Incident resolved.', 'success', 4000);
  const resolvedInc = { ...frozen, status: 'resolved', resolved_at: new Date().toISOString() };
  setState({
    incidents: incidents.map((i) => i.id === frozen?.id ? resolvedInc : i),
    selectedIncident: resolvedInc,
  });

  // Manually trigger restore pane render by switching to restore tab
  renderCaseFile({ ...getState(), selectedIncident: resolvedInc, selectedIncidentId: resolvedInc.id });

  await sleep(500);

  // ── Done ────────────────────────────────────────────────────────────
  if (btn) {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    setButtonContent(btn, 'Run Attack Simulation', 'play');
  }
  _storyPlaying = false;

  // Resume normal polling
  startPolling();
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ─── Bootstrap ─────────────────────────────────────────────────────────── */
async function boot() {
  // Wire up UI controls
  initDemoToggle();
  initManualRefresh();
  initKeyboardShortcuts();
  initErrorBanner();
  initBaselineLedger();

  // Subscribe to state changes for reactive UI
  subscribe(updateUI);

  // Initial data load
  await refreshAll();

  // Init chart (needs Chart.js from CDN to be loaded)
  setTimeout(() => {
    const state = getState();
    if (state.detectionRuns?.length) {
      initChart(state.detectionRuns);
    }
  }, 300);

  // Entrance animations after first paint
  requestAnimationFrame(runEntranceAnimations);

  // Start polling
  startPolling();

  // Play story button
  const storyBtn = document.getElementById('playStoryBtn');
  if (storyBtn) {
    storyBtn.addEventListener('click', playStory);
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
