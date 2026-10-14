/**
 * @file dashboard/js/components/detectionChart.js
 *
 * Sliding-Window Detection Telemetry Chart for CloudRDR.
 * Renders a high-contrast time-series chart via Chart.js:
 *   - Observed Change Rate (%)
 *   - Configured Ransomware Threshold (30% horizontal guide)
 *   - Suspicious Warning Threshold (10% horizontal guide)
 *   - Prominent red alert markers for canary-triggered evaluation runs
 */

let chartInstance = null;

/**
 * Format ISO timestamp to HH:MM:SS for the chart X-axis.
 * @param {string} isoString
 * @returns {string}
 */
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (_e) {
    return '';
  }
}

/**
 * Initialize or update the Chart.js instance.
 * @param {Array<any>} detectionRuns
 */
export function updateDetectionChart(detectionRuns = []) {
  const canvas = document.getElementById('detectionChartCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  const runs = [...detectionRuns];
  const labels = runs.map((r) => formatTime(r.created_at));
  const changeRates = runs.map((r) => Number(r.change_rate || 0));
  const ransomwareThresholds = runs.map(() => 0.3);
  const suspiciousThresholds = runs.map(() => 0.1);

  // Dynamic point colors and sizes to highlight canary triggers
  const pointBackgroundColors = runs.map((r) => (r.canary_triggered ? '#ef4444' : '#6366f1'));
  const pointBorderColors = runs.map((r) => (r.canary_triggered ? '#ffffff' : '#4f46e5'));
  const pointRadii = runs.map((r) => (r.canary_triggered ? 7 : 4));
  const pointHoverRadii = runs.map((r) => (r.canary_triggered ? 9 : 6));

  if (!chartInstance) {
    const ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Observed Change Rate',
            data: changeRates,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            borderWidth: 2.5,
            tension: 0.25,
            fill: true,
            pointBackgroundColor: pointBackgroundColors,
            pointBorderColor: pointBorderColors,
            pointBorderWidth: 2,
            pointRadius: pointRadii,
            pointHoverRadius: pointHoverRadii,
          },
          {
            label: 'Ransomware Threshold (30%)',
            data: ransomwareThresholds,
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Suspicious Threshold (10%)',
            data: suspiciousThresholds,
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1.0,
            ticks: {
              callback: (val) => `${(val * 100).toFixed(0)}%`,
              color: '#94a3b8',
              font: { family: 'ui-monospace, SFMono-Regular, monospace', size: 10 },
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.12)',
            },
          },
          x: {
            ticks: {
              color: '#94a3b8',
              font: { family: 'ui-monospace, SFMono-Regular, monospace', size: 10 },
              maxRotation: 0,
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            callbacks: {
              label(context) {
                const run = runs[context.dataIndex];
                if (context.datasetIndex === 0) {
                  const pct = `${(context.parsed.y * 100).toFixed(1)}%`;
                  const canaryTxt = run?.canary_triggered ? ' [CANARY TRIPPED]' : '';
                  return ` Rate: ${pct} (${run?.verdict?.toUpperCase() || 'NORMAL'})${canaryTxt}`;
                }
                return ` ${context.dataset.label}`;
              },
              afterBody(contexts) {
                const run = runs[contexts[0].dataIndex];
                if (!run) return [];
                return [
                  `Account: ${run.account_id || 'unknown'}`,
                  `Files: ${run.changed_files || 0} / ${run.total_files || 0}`,
                  `Window: ${run.window_seconds || 60}s`,
                ];
              },
            },
          },
        },
      },
    });
  } else {
    // Update data without rebuilding instance
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = changeRates;
    chartInstance.data.datasets[0].pointBackgroundColor = pointBackgroundColors;
    chartInstance.data.datasets[0].pointBorderColor = pointBorderColors;
    chartInstance.data.datasets[0].pointRadius = pointRadii;
    chartInstance.data.datasets[0].pointHoverRadius = pointHoverRadii;
    chartInstance.data.datasets[1].data = ransomwareThresholds;
    chartInstance.data.datasets[2].data = suspiciousThresholds;
    chartInstance.update();
  }
}
