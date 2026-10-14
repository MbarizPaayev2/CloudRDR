import { CONFIG, updateConfig } from './config.js';
import { refreshAll, subscribe } from './state.js';
import { updateStatusBar } from './components/statusBar.js';
import { initBaselinePanel, updateBaselinePanel } from './components/baselinePanel.js';
import { updateDetectionChart } from './components/detectionChart.js';
import { updateIncidentList } from './components/incidentList.js';
import { updateIncidentDetail } from './components/incidentDetail.js';
import { updateRestorePanel } from './components/restorePanel.js';
import { updateAuditLog } from './components/auditLog.js';

// ── Theme Manager ────────────────────────────────────────────────────────────

function initTheme() {
  const html = document.documentElement;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeToggleIcon = document.getElementById('themeToggleIcon');

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    updateConfig('THEME', theme);
    if (themeToggleIcon) {
      themeToggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute(
        'title',
        `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`
      );
    }
  }

  // Apply stored or default theme
  applyTheme(CONFIG.THEME || 'dark');

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }
}

// ── Demo Mode Toggle & Manual Refresh ────────────────────────────────────────

function initDemoMode() {
  const toggle = document.getElementById('demoModeToggle');
  if (toggle) {
    toggle.checked = CONFIG.USE_MOCK;
    toggle.addEventListener('change', (e) => {
      updateConfig('USE_MOCK', e.target.checked);
      const label = e.target.nextElementSibling;
      if (label) {
        label.textContent = e.target.checked ? 'Demo Mock' : 'Live API';
      }
      console.info(`[CloudRDR] Mode switched to: ${e.target.checked ? 'MOCK DATA' : 'LIVE API'}`);
      refreshAll();
    });
  }

  const manualRefreshBtn = document.getElementById('manualRefreshBtn');
  if (manualRefreshBtn) {
    manualRefreshBtn.addEventListener('click', async () => {
      manualRefreshBtn.disabled = true;
      const originalText = manualRefreshBtn.textContent;
      manualRefreshBtn.textContent = '⏳ Refreshing...';
      try {
        await refreshAll();
      } finally {
        manualRefreshBtn.disabled = false;
        manualRefreshBtn.textContent = originalText;
      }
    });
  }
}

// ── System Error Banner ──────────────────────────────────────────────────────

function initErrorBanner() {
  const banner = document.getElementById('systemErrorBanner');
  const codeEl = document.getElementById('errorBannerCode');
  const messageEl = document.getElementById('errorBannerMessage');
  const dismissBtn = document.getElementById('errorBannerDismissBtn');

  if (dismissBtn && banner) {
    dismissBtn.addEventListener('click', () => {
      banner.style.display = 'none';
    });
  }

  // Reactive subscription for error handling
  subscribe((state) => {
    if (!banner || !codeEl || !messageEl) return;

    if (state.error) {
      codeEl.textContent = state.error.code || 'ERROR';
      messageEl.textContent = state.error.message || 'Operation failed';
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  });
}

// ── Background Polling with Tab Visibility Lifecycle ─────────────────────────

let pollTimer = null;

function startPolling() {
  stopPolling();
  const interval = CONFIG.POLL_INTERVAL_MS || 5000;
  pollTimer = setInterval(() => {
    // Only poll when browser tab is actively visible to conserve client/server resources
    if (document.visibilityState !== 'hidden') {
      refreshAll({ background: true });
    }
  }, interval);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function initPolling() {
  startPolling();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.info('[CloudRDR] Tab visible — polling resumed');
      refreshAll();
      startPolling();
    } else {
      console.info('[CloudRDR] Tab hidden — polling paused');
      stopPolling();
    }
  });
}

// ── Copy Button Helper ───────────────────────────────────────────────────────

function initCopyButtons() {
  const copyMerkleBtn = document.getElementById('copyMerkleBtn');
  const merkleText = document.getElementById('baselineMerkleRoot');

  if (copyMerkleBtn && merkleText) {
    copyMerkleBtn.addEventListener('click', async () => {
      const fullText = merkleText.getAttribute('title') || merkleText.textContent;
      if (!fullText || fullText === '—') return;
      try {
        await navigator.clipboard.writeText(fullText);
        const originalText = copyMerkleBtn.textContent;
        copyMerkleBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyMerkleBtn.textContent = originalText;
        }, 1500);
      } catch (_err) {
        console.warn('Clipboard write failed');
      }
    });
  }
}

// ── Initial Skeleton Placeholders ────────────────────────────────────────────

function renderInitialSkeletons() {
  // Incident Table Placeholder
  const incidentsTbody = document.getElementById('incidentsTableBody');
  if (incidentsTbody) {
    incidentsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          No security incidents recorded. System in normal operational state.
        </td>
      </tr>
    `;
  }

  // Incident Detail Placeholder
  const detailBody = document.getElementById('incidentDetailBody');
  if (detailBody) {
    detailBody.innerHTML = `
      <div class="empty-state">
        Select an incident from the security incidents list to inspect forensic timeline, affected paths, and signature verification.
      </div>
    `;
  }

  // Restore Panel Placeholder
  const restoreBody = document.getElementById('restorePanelBody');
  if (restoreBody) {
    restoreBody.innerHTML = `
      <div class="empty-state">
        Restore pipeline is on standby. Automated verified recovery activates when an incident is selected for remediation.
      </div>
    `;
  }

  // Audit Log Table Placeholder
  const auditTbody = document.getElementById('auditLogTableBody');
  if (auditTbody) {
    auditTbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          Awaiting cryptographic ledger synchronization...
        </td>
      </tr>
    `;
  }
}

// ── Main Initialization ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDemoMode();
  initErrorBanner();
  initCopyButtons();
  initBaselinePanel();
  renderInitialSkeletons();
  initPolling();

  // Subscribe components to state store
  subscribe((state) => {
    updateStatusBar(state);
    updateBaselinePanel(state);
    updateDetectionChart(state.detectionRuns);
    updateIncidentList(state);
    updateIncidentDetail(state);
    updateRestorePanel(state);
    updateAuditLog(state);
  });

  refreshAll();
  console.info(
    '[CloudRDR] Security Operations Dashboard initialised (Step 8 Polling & Error Lifecycle Active).'
  );
});
