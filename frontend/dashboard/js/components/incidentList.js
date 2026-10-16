/**
 * @file dashboard/js/components/incidentList.js
 *
 * Security Incident List Component for CloudRDR Dashboard.
 * Displays a real-time table of detected incidents with status chips.
 * Clicking a row selects the incident for deep forensic inspection.
 *
 * Security:
 *   - Strictly uses DOM textContent to prevent XSS.
 */

import { selectIncident } from '../state.js';

/**
 * Format date string for display.
 * @param {string} isoString
 * @returns {string}
 */
function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (_e) {
    return '—';
  }
}

/**
 * Shorten an incident ID for table display.
 * @param {string} id
 * @returns {string}
 */
function shortenId(id) {
  if (!id) return '—';
  return id.length > 14 ? `${id.slice(0, 10)}...` : id;
}

/**
 * Update the incident list table from current state.
 * @param {import('../state.js').getState()} state
 */
export function updateIncidentList(state) {
  const tbody = document.getElementById('incidentsTableBody');
  const countBadge = document.getElementById('incidentCountBadge');
  if (!tbody) return;

  const incidents = state.incidents || [];

  if (countBadge) {
    countBadge.textContent = `${incidents.length} Recorded`;
  }

  // Clear existing rows safely
  tbody.textContent = '';

  if (incidents.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 4;
    emptyCell.className = 'empty-state';
    emptyCell.textContent = 'No security incidents recorded. System in normal operational state.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  for (const inc of incidents) {
    const row = document.createElement('tr');
    if (inc.id === state.selectedIncidentId) {
      row.className = 'selected';
    }

    // Accessible row selection
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Select incident ${inc.id}`);

    // Click & Enter key listener
    const onSelect = () => selectIncident(inc.id);
    row.addEventListener('click', onSelect);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    });

    // 1. Status Column
    const tdStatus = document.createElement('td');
    const chip = document.createElement('span');
    const st = inc.status || 'open';

    chip.className = `chip ${
      st === 'resolved'
        ? 'chip-valid'
        : st === 'frozen'
          ? 'chip-modified'
          : st === 'restoring'
            ? 'chip'
            : 'chip-missing'
    }`;
    if (st === 'restoring') {
      chip.style.backgroundColor = 'var(--color-primary-subtle)';
      chip.style.color = 'var(--color-primary)';
      chip.style.border = '1px solid var(--color-primary)';
    }
    chip.textContent = st;
    tdStatus.appendChild(chip);
    row.appendChild(tdStatus);

    // 2. Incident ID Column
    const tdId = document.createElement('td');
    tdId.className = 'font-mono';
    tdId.textContent = shortenId(inc.id);
    tdId.title = inc.id;
    row.appendChild(tdId);

    // 3. Victim Account Column
    const tdAccount = document.createElement('td');
    tdAccount.className = 'font-mono';
    tdAccount.textContent = inc.account_id || 'unknown';
    row.appendChild(tdAccount);

    // 4. Detected Time Column
    const tdTime = document.createElement('td');
    tdTime.textContent = formatTime(inc.detected_at);
    row.appendChild(tdTime);

    tbody.appendChild(row);
  }
}
