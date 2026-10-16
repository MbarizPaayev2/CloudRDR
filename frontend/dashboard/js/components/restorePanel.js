/**
 * @file dashboard/js/components/restorePanel.js
 *
 * Cryptographic Verified Restore Pipeline Component for CloudRDR Dashboard.
 * Displays:
 *   - Overall progress bar and job status
 *   - Counters for Total, VALID, MODIFIED, and MISSING files
 *   - Final certification banner ("100% VERIFIED" or failure alert)
 *   - Per-file cryptographic audit table proving restored bytes match baseline
 *
 * Security:
 *   - All text rendered via textContent (Zero XSS risks)
 */

/**
 * Shorten hash for clean table display.
 * @param {string} hash
 * @returns {string}
 */
function shortenHash(hash) {
  if (!hash || hash.length < 16) return hash || '—';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

/**
 * Update the restore panel based on current state.
 * @param {import('../state.js').getState()} state
 */
export function updateRestorePanel(state) {
  const container = document.getElementById('restorePanelBody');
  const statusBadge = document.getElementById('restoreStatusBadge');
  if (!container) return;

  const job = state.restoreJob;

  // Clear container
  container.textContent = '';

  if (!job) {
    if (statusBadge) {
      statusBadge.textContent = 'Standby';
      statusBadge.className = 'brand-badge';
    }
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent =
      'Restore pipeline is on standby. Automated verified recovery activates when an incident is selected for remediation.';
    container.appendChild(empty);
    return;
  }

  // 1. Status Badge
  const st = (job.status || 'running').toUpperCase();
  if (statusBadge) {
    statusBadge.textContent = st;
    statusBadge.className = `chip ${job.isFullyRestored || st === 'VERIFIED' ? 'chip-valid' : 'chip-modified'}`;
  }

  // 2. Metrics Counters Grid
  const total = job.totalFiles ?? job.total_files ?? 0;
  const valid = job.validFiles ?? job.valid_files ?? 0;
  const modified = job.modifiedFiles ?? job.modified_files ?? 0;
  const missing = job.missingFiles ?? job.missing_files ?? 0;

  const counterGrid = document.createElement('div');
  counterGrid.className = 'metric-row';
  counterGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';

  const counters = [
    { label: 'Total Files', value: total, color: 'var(--text-primary)' },
    { label: 'VALID Restored', value: valid, color: 'var(--color-success)' },
    { label: 'MODIFIED / Tampered', value: modified, color: 'var(--color-danger)' },
    { label: 'MISSING Backups', value: missing, color: 'var(--color-warning)' },
  ];

  for (const c of counters) {
    const item = document.createElement('div');
    item.className = 'metric-item';

    const lbl = document.createElement('div');
    lbl.className = 'metric-label';
    lbl.textContent = c.label;

    const val = document.createElement('div');
    val.className = 'metric-value font-mono';
    val.style.color = c.color;
    val.textContent = String(c.value);

    item.appendChild(lbl);
    item.appendChild(val);
    counterGrid.appendChild(item);
  }
  container.appendChild(counterGrid);

  // 3. Progress Bar
  const pct = total > 0 ? Math.round((valid / total) * 100) : 0;
  const progressWrap = document.createElement('div');
  progressWrap.style.display = 'flex';
  progressWrap.style.flexDirection = 'column';
  progressWrap.style.gap = '0.35rem';

  const progressHeader = document.createElement('div');
  progressHeader.style.display = 'flex';
  progressHeader.style.justifyContent = 'space-between';
  progressHeader.style.fontSize = '0.72rem';
  progressHeader.style.fontWeight = '700';
  progressHeader.style.color = 'var(--text-muted)';

  const progressTitle = document.createElement('span');
  progressTitle.textContent = `Restoration Verification Progress (${valid}/${total} files)`;

  const progressPct = document.createElement('span');
  progressPct.className = 'font-mono';
  progressPct.textContent = `${pct}%`;

  progressHeader.appendChild(progressTitle);
  progressHeader.appendChild(progressPct);

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-container';

  const progressFill = document.createElement('div');
  progressFill.className = 'progress-bar-fill';
  progressFill.style.width = `${pct}%`;
  if (modified > 0 || missing > 0) {
    progressFill.style.background =
      'linear-gradient(90deg, var(--color-warning), var(--color-danger))';
  }

  progressBar.appendChild(progressFill);
  progressWrap.appendChild(progressHeader);
  progressWrap.appendChild(progressBar);
  container.appendChild(progressWrap);

  // 4. Certification Banner
  const banner = document.createElement('div');
  const isAllValid =
    Boolean(job.isFullyRestored) ||
    (total > 0 && valid === total && modified === 0 && missing === 0);

  if (isAllValid) {
    banner.className = 'result-banner success';
    const text = document.createElement('span');
    text.textContent =
      '100% VERIFIED: All restored files match pre-attack cryptographic baseline SHA-256 and valid AEAD tags.';
    banner.appendChild(text);
  } else {
    banner.className = 'result-banner failure';
    const text = document.createElement('span');
    text.textContent = `INTEGRITY ALERT: ${modified + missing} files failed verification or were modified/missing. Plaintext write-back blocked.`;
    banner.appendChild(text);
  }
  container.appendChild(banner);

  // 5. Per-File Cryptographic Verification Table
  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';

  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');

  const headers = ['Object Path', 'Expected Baseline SHA-256', 'Restored Backup SHA-256', 'Result'];
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const fileResults = job.results || [];

  if (fileResults.length === 0) {
    const trEmpty = document.createElement('tr');
    const tdEmpty = document.createElement('td');
    tdEmpty.colSpan = 4;
    tdEmpty.className = 'empty-state';
    tdEmpty.textContent = 'No file verification records available.';
    trEmpty.appendChild(tdEmpty);
    tbody.appendChild(trEmpty);
  } else {
    for (const r of fileResults) {
      const row = document.createElement('tr');

      // 1. Path
      const tdPath = document.createElement('td');
      tdPath.className = 'font-mono';
      tdPath.textContent = r.path || '—';
      row.appendChild(tdPath);

      // 2. Expected SHA-256
      const tdExpected = document.createElement('td');
      tdExpected.className = 'font-mono';
      const expHash = r.expected_sha256 || r.expectedSha256 || '';
      tdExpected.textContent = shortenHash(expHash);
      tdExpected.title = expHash;
      row.appendChild(tdExpected);

      // 3. Restored SHA-256
      const tdRestored = document.createElement('td');
      tdRestored.className = 'font-mono';
      const resHash = r.restored_sha256 || r.restoredSha256 || '';
      tdRestored.textContent = shortenHash(resHash);
      tdRestored.title = resHash;
      row.appendChild(tdRestored);

      // 4. Result Chip
      const tdRes = document.createElement('td');
      const chip = document.createElement('span');
      const resText = (r.result || 'VALID').toUpperCase();

      chip.className = `chip ${
        resText === 'VALID'
          ? 'chip-valid'
          : resText === 'MODIFIED'
            ? 'chip-modified'
            : 'chip-missing'
      }`;
      chip.textContent = resText;
      tdRes.appendChild(chip);
      row.appendChild(tdRes);

      tbody.appendChild(row);
    }
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
}
