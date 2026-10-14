/**
 * @file dashboard/js/components/auditLog.js
 *
 * Hash-Chained Audit Ledger Component.
 * Visualizes cryptographic tamper-evident event blocks.
 * Computes and displays chain integrity status (VALID vs BROKEN)
 * and highlights the first broken or tampered link in red.
 *
 * Security: Strict textContent usage to eliminate XSS risks.
 */

/**
 * Shorten a 64-character SHA-256 hash for human readability.
 * @param {string} hash
 * @param {number} chars
 * @returns {string}
 */
function shortenHash(hash, chars = 8) {
  if (!hash) return '—';
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * Format timestamp into clean ISO UTC string.
 * @param {string|number|null} timestamp
 * @returns {string}
 */
function formatTime(timestamp) {
  if (!timestamp) return '—';
  try {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? String(timestamp) : d.toLocaleString();
  } catch {
    return String(timestamp);
  }
}

/**
 * Render the Hash-Chained Audit Log and verify cryptographic continuity.
 * @param {object} state - Global state store snapshot.
 */
export function updateAuditLog(state) {
  const tbody = document.getElementById('auditLogTableBody');
  const chainChip = document.getElementById('auditChainStatusChip');

  if (!tbody) return;

  const logs = state.auditLog || [];

  // Clear existing content safely
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  // Handle empty state
  if (logs.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'empty-state';
    td.textContent = 'No audit log entries recorded in ledger.';
    tr.appendChild(td);
    tbody.appendChild(tr);

    if (chainChip) {
      chainChip.textContent = 'Empty Ledger';
      chainChip.className = 'chip chip-missing';
    }
    return;
  }

  // Verify chain continuity
  // Index 0 (Genesis): prevHash is expected to be all zeros (or null/empty)
  // Index i > 0: prevHash must equal logs[i - 1].hash
  let isChainValid = true;
  let firstBrokenIndex = -1;

  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];
    if (i === 0) {
      // Genesis block verification
      const isGenesisValid =
        current.valid !== false &&
        (!current.prevHash || current.prevHash === '0'.repeat(64) || /^0+$/.test(current.prevHash));
      if (!isGenesisValid) {
        isChainValid = false;
        firstBrokenIndex = 0;
        break;
      }
    } else {
      const prev = logs[i - 1];
      const linkMatches = current.prevHash === prev.hash;
      const isValid = current.valid !== false && linkMatches;

      if (!isValid) {
        isChainValid = false;
        firstBrokenIndex = i;
        break;
      }
    }
  }

  // Update summary badge
  if (chainChip) {
    if (isChainValid) {
      chainChip.textContent = `✓ Chain Valid (${logs.length} Blocks)`;
      chainChip.className = 'chip chip-valid';
      chainChip.title = 'All block hashes link continuously to the Genesis block';
    } else {
      chainChip.textContent = `⚠️ Chain Broken at Block #${firstBrokenIndex}`;
      chainChip.className = 'chip chip-modified';
      chainChip.title = `Cryptographic continuity failed between block #${firstBrokenIndex - 1} and #${firstBrokenIndex}`;
    }
  }

  // Render each block row
  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    const isFirstBroken = !isChainValid && i === firstBrokenIndex;
    const isSubsequentBroken = !isChainValid && i > firstBrokenIndex;

    const row = document.createElement('tr');
    if (isFirstBroken) {
      row.className = 'row-broken';
    } else if (isSubsequentBroken) {
      row.className = 'row-untrusted';
    }

    // 1. Index
    const tdIndex = document.createElement('td');
    tdIndex.className = 'font-mono';
    tdIndex.style.fontWeight = '700';

    const indexBadge = document.createElement('span');
    indexBadge.textContent = `#${entry.index ?? i}`;
    tdIndex.appendChild(indexBadge);

    if (i === 0) {
      const genesisBadge = document.createElement('span');
      genesisBadge.className = 'brand-badge';
      genesisBadge.style.fontSize = '0.62rem';
      genesisBadge.style.marginLeft = '0.35rem';
      genesisBadge.textContent = 'GENESIS';
      tdIndex.appendChild(genesisBadge);
    }
    row.appendChild(tdIndex);

    // 2. Block Hash + Event Type Note
    const tdHash = document.createElement('td');
    tdHash.className = 'font-mono';

    const hashWrap = document.createElement('div');
    hashWrap.style.display = 'flex';
    hashWrap.style.flexDirection = 'column';
    hashWrap.style.gap = '0.15rem';

    const hashText = document.createElement('span');
    hashText.textContent = shortenHash(entry.hash, 10);
    hashText.title = entry.hash || '';
    hashWrap.appendChild(hashText);

    // If payload contains an event name, show subtitle
    if (entry.data && (entry.data.event || entry.data.action)) {
      const eventName = entry.data.event || entry.data.action;
      const eventSubtitle = document.createElement('span');
      eventSubtitle.style.fontSize = '0.68rem';
      eventSubtitle.style.color = isFirstBroken ? 'var(--color-danger)' : 'var(--text-muted)';
      eventSubtitle.textContent = String(eventName);
      hashWrap.appendChild(eventSubtitle);
    }

    tdHash.appendChild(hashWrap);
    row.appendChild(tdHash);

    // 3. Previous Hash
    const tdPrev = document.createElement('td');
    tdPrev.className = 'font-mono';
    const prevText = shortenHash(entry.prevHash, 10);
    tdPrev.textContent = prevText;
    tdPrev.title = entry.prevHash || '';
    row.appendChild(tdPrev);

    // 4. Timestamp
    const tdTime = document.createElement('td');
    tdTime.style.whiteSpace = 'nowrap';
    tdTime.style.fontSize = '0.72rem';
    tdTime.textContent = formatTime(entry.timestamp);
    row.appendChild(tdTime);

    // 5. Integrity Status Chip
    const tdStatus = document.createElement('td');
    tdStatus.style.textAlign = 'right';

    const statusChip = document.createElement('span');
    if (isFirstBroken) {
      statusChip.className = 'chip chip-modified';
      statusChip.textContent = '❌ BROKEN LINK';
      statusChip.title = 'Hash mismatch! Block prevHash does not match preceding block hash.';
    } else if (isSubsequentBroken) {
      statusChip.className = 'chip chip-missing';
      statusChip.textContent = 'UNTRUSTED';
      statusChip.title = 'Preceding link is compromised; block state cannot be trusted.';
    } else {
      statusChip.className = 'chip chip-valid';
      statusChip.textContent = '✓ VALID';
      statusChip.title = 'Verified cryptographic chain integrity';
    }

    tdStatus.appendChild(statusChip);
    row.appendChild(tdStatus);

    tbody.appendChild(row);
  }
}
