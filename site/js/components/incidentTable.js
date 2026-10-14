/**
 * @file site/js/components/incidentTable.js
 * Incidents Table Component.
 */

/**
 * Render the incidents table.
 * @param {HTMLElement} containerEl
 * @param {Array<any>} incidents
 * @param {(incidentId: string) => void} onSelectIncident
 */
export function renderIncidentTable(containerEl, incidents = [], onSelectIncident = () => {}) {
  if (!containerEl) return;

  if (incidents.length === 0) {
    containerEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛡️</div>
        <h3>No incidents recorded</h3>
        <p>Your cloud storage bucket has zero ransomware incidents. Play the story to simulate an attack.</p>
      </div>
    `;
    return;
  }

  const rows = incidents
    .map((inc) => {
      const statusClass =
        inc.status === 'resolved'
          ? 'valid'
          : inc.status === 'frozen'
          ? 'frozen'
          : 'modified';

      const detectedTime = new Date(inc.detected_at).toLocaleString();
      const filesCount = inc.affected_paths?.length || 0;

      return `
        <tr data-incident-id="${inc.id}" style="cursor:pointer;">
          <td><span class="status-chip ${statusClass}">${inc.status}</span></td>
          <td><code class="mono">${inc.id}</code></td>
          <td><span class="mono">${inc.account_id}</span></td>
          <td><time>${detectedTime}</time></td>
          <td><strong>${filesCount}</strong> files</td>
          <td><button class="btn btn-secondary btn-sm">Inspect</button></td>
        </tr>
      `;
    })
    .join('');

  containerEl.innerHTML = `
    <div class="table-wrap">
      <table class="data-table" aria-label="Security Incidents">
        <thead>
          <tr>
            <th>Status</th>
            <th>Case ID</th>
            <th>Account</th>
            <th>Detected At</th>
            <th>Impact</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  // Attach click events
  containerEl.querySelectorAll('tbody tr').forEach((tr) => {
    tr.addEventListener('click', () => {
      const id = tr.getAttribute('data-incident-id');
      if (id) onSelectIncident(id);
    });
  });
}
