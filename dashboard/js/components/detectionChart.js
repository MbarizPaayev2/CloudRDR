/**
 * @file dashboard/js/components/detectionChart.js
 *
 * Main Threat Activity Chart (Section 5)
 * Dual-series clean area chart with file modification events vs detected suspicious events.
 * Plotted with restrained teal (#2DD4BF) and threat red (#EF4444).
 */

/** @type {any} */
let _chart = null;

const COLOR_TEAL = '#2DD4BF';
const COLOR_RED = '#EF4444';
const COLOR_GRID = '#252D35';
const COLOR_TEXT = '#9CA3AF';

/**
 * Build Chart.js data structure from activity points or detection runs.
 * @param {Array} points
 */
function buildChartData(points) {
  const labels = [];
  const normalData = [];
  const suspiciousData = [];
  const pointStyles = [];
  const pointRadius = [];

  for (const pt of points) {
    const t = pt.timestamp
      ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : pt.timeLabel || '—';
    labels.push(t);
    normalData.push(pt.normalModifications ?? Math.round((pt.change_rate || 0) * 50));
    suspiciousData.push(pt.suspiciousModifications ?? (pt.verdict === 'ransomware' ? 22 : pt.verdict === 'suspicious' ? 7 : 0));

    const isIncident = Boolean(pt.incidentMarker || pt.canary_triggered || pt.verdict === 'ransomware');
    pointStyles.push(isIncident ? 'rectRot' : 'circle');
    pointRadius.push(isIncident ? 6 : 3);
  }

  return { labels, normalData, suspiciousData, pointStyles, pointRadius };
}

/**
 * Initialise (or re-init) the Threat Activity Chart.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} points
 */
export function initDetectionChart(canvas, points = []) {
  if (!canvas) return;

  const Chart = window.Chart;
  if (!Chart) {
    console.warn('[detectionChart] Chart.js not loaded on window');
    return;
  }

  if (_chart) {
    _chart.destroy();
    _chart = null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Gradients for area fills
  const tealGrad = ctx.createLinearGradient(0, 0, 0, 240);
  tealGrad.addColorStop(0, 'rgba(45, 212, 191, 0.22)');
  tealGrad.addColorStop(1, 'rgba(45, 212, 191, 0.01)');

  const redGrad = ctx.createLinearGradient(0, 0, 0, 240);
  redGrad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
  redGrad.addColorStop(1, 'rgba(239, 68, 68, 0.01)');

  const { labels, normalData, suspiciousData, pointStyles, pointRadius } = buildChartData(points);

  _chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Normal Modifications',
          data: normalData,
          borderColor: COLOR_TEAL,
          backgroundColor: tealGrad,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: COLOR_TEAL,
          pointBorderColor: '#0B0E11',
          pointBorderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Suspicious Detections',
          data: suspiciousData,
          borderColor: COLOR_RED,
          backgroundColor: redGrad,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: COLOR_RED,
          pointBorderColor: '#0B0E11',
          pointBorderWidth: 1.5,
          pointStyle: pointStyles,
          pointRadius: pointRadius,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            color: COLOR_TEXT,
            font: { family: 'ui-monospace, monospace', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#151B21',
          titleColor: '#F3F4F6',
          bodyColor: '#9CA3AF',
          borderColor: '#252D35',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: 'ui-monospace, monospace', size: 12, weight: 'bold' },
          bodyFont: { family: 'ui-monospace, monospace', size: 11 },
          callbacks: {
            label(context) {
              const val = context.parsed.y;
              return ` ${context.dataset.label}: ${val} events`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: COLOR_GRID,
            tickColor: 'transparent',
          },
          ticks: {
            color: COLOR_TEXT,
            font: { family: 'ui-monospace, monospace', size: 10 },
            maxRotation: 0,
            maxTicksLimit: 8,
          },
          border: { color: COLOR_GRID },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: COLOR_GRID,
          },
          ticks: {
            color: COLOR_TEXT,
            font: { family: 'ui-monospace, monospace', size: 10 },
            stepSize: 5,
          },
          border: { color: COLOR_GRID },
        },
      },
    },
  });
}

/**
 * Update chart data on telemetry refresh or time range toggle.
 * @param {Array} points
 */
export function updateDetectionChart(points = []) {
  if (!_chart) return;
  const { labels, normalData, suspiciousData, pointStyles, pointRadius } = buildChartData(points);
  _chart.data.labels = labels;
  _chart.data.datasets[0].data = normalData;
  _chart.data.datasets[1].data = suspiciousData;
  _chart.data.datasets[1].pointStyle = pointStyles;
  _chart.data.datasets[1].pointRadius = pointRadius;
  _chart.update('none'); // Update without full layout reflow
}

export function destroyChart() {
  if (_chart) {
    _chart.destroy();
    _chart = null;
  }
}
