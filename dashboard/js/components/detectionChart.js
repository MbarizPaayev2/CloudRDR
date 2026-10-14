/**
 * @file dashboard/js/components/detectionChart.js
 *
 * Detection chart: Chart.js line chart styled as an ink-pen trace on
 * ledger paper, with a horizontal wax-line threshold and canary markers.
 *
 * Style decisions:
 *   - Paper-toned background, thin ink-dark line for change_rate
 *   - Threshold shown as a dashed horizontal red wax line (annotation plugin
 *     not available → drawn as a second dataset with constant value)
 *   - Canary events: red diamond point markers via pointStyle array
 */

/** @type {import('Chart').Chart|null} */
let _chart = null;

/**
 * Map of verdict → line color for the trace segments.
 * We use a uniform ink-dark line for simplicity (verdict shown elsewhere).
 */
const TRACE_COLOR   = '#38BDF8';
const THRESHOLD_CLR = '#EF4444';
const CANARY_CLR    = '#EF4444';

/**
 * Build Chart.js data structure from detection runs.
 * @param {Array} runs
 */
function buildChartData(runs) {
  const labels        = [];
  const rateData      = [];
  const threshData    = [];
  const pointColors   = [];
  const pointRadius   = [];
  const pointStyles   = [];

  for (const run of runs) {
    const t = run.created_at
      ? new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—';
    labels.push(t);
    rateData.push(+(run.change_rate * 100).toFixed(1)); // percentage
    threshData.push(+(run.threshold * 100).toFixed(1));

    // Canary: red diamond, larger radius
    const isCanary = Boolean(run.canary_triggered);
    pointColors.push(isCanary ? CANARY_CLR : TRACE_COLOR);
    pointRadius.push(isCanary ? 7 : 3);
    pointStyles.push(isCanary ? 'rectRot' : 'circle'); // rectRot = diamond
  }

  return { labels, rateData, threshData, pointColors, pointRadius, pointStyles };
}

/**
 * Initialise (or re-init) the detection chart.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} runs
 */
export function initDetectionChart(canvas, runs) {
  if (_chart) { _chart.destroy(); _chart = null; }

  const { labels, rateData, threshData, pointColors, pointRadius, pointStyles } = buildChartData(runs);

  _chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          // Threshold — constant horizontal wax line
          label: 'Ransomware Threshold (30%)',
          data: threshData,
          borderColor: THRESHOLD_CLR,
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false,
          tension: 0,
          order: 1,
        },
        {
          // Change rate trace
          label: 'Sliding Change Rate %',
          data: rateData,
          borderColor: TRACE_COLOR,
          borderWidth: 2,
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: 'origin',
          tension: 0.35,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius,
          pointStyle: pointStyles,
          pointHoverRadius: 7,
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            font: { family: "'Inter', sans-serif", size: 10, weight: '500' },
            color: '#94A3B8',
            boxWidth: 16,
            padding: 10,
          },
        },
        tooltip: {
          backgroundColor: '#101726',
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          titleFont: { family: "'JetBrains Mono', monospace", size: 10 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 10 },
          padding: 8,
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 1) {
                const run = runs[ctx.dataIndex];
                const suffix = run?.canary_triggered ? ' ⚠ TRIPWIRE BREACH' : '';
                return ` Change rate: ${ctx.raw}%${suffix}`;
              }
              return ` Threshold: ${ctx.raw}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            lineWidth: 1,
          },
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 9 },
            color: '#64748B',
            maxRotation: 0,
            maxTicksLimit: 8,
          },
          border: { color: 'rgba(255, 255, 255, 0.08)' },
        },
        y: {
          beginAtZero: true,
          min: 0,
          suggestedMax: 60,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            lineWidth: 1,
          },
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 9 },
            color: '#64748B',
            callback: (v) => `${v}%`,
          },
          border: { color: 'rgba(255, 255, 255, 0.08)' },
        },
      },
    },
  });
}

/**
 * Update an existing chart with new runs data.
 * @param {Array} runs
 */
export function updateDetectionChart(runs) {
  if (!_chart) return;
  const { labels, rateData, threshData, pointColors, pointRadius, pointStyles } = buildChartData(runs);

  _chart.data.labels = labels;
  _chart.data.datasets[0].data = threshData;
  _chart.data.datasets[1].data = rateData;
  _chart.data.datasets[1].pointBackgroundColor = pointColors;
  _chart.data.datasets[1].pointBorderColor     = pointColors;
  _chart.data.datasets[1].pointRadius          = pointRadius;
  _chart.data.datasets[1].pointStyle           = pointStyles;
  _chart.update();

  // Update latest rate display
  const latestRateEl = document.getElementById('chartLatestRate');
  if (latestRateEl && rateData.length) {
    const last = rateData[rateData.length - 1];
    latestRateEl.textContent = `${last}%`;
  }
}

/** Return the chart instance (for story player). */
export function getChartInstance() { return _chart; }
