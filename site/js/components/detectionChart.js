/**
 * @file site/js/components/detectionChart.js
 * Sliding-Window Velocity Telemetry Chart with Chart.js.
 */

/**
 * Initialize the detection telemetry velocity chart.
 * @param {HTMLCanvasElement} canvasEl
 * @returns {(detectionRuns: Array<any>) => void}
 */
export function initDetectionChart(canvasEl) {
  if (!canvasEl || !window.Chart) {
    return () => {};
  }

  const ctx = canvasEl.getContext('2d');

  // Chart configuration with clean, modern styling
  const chart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Change Velocity (60s)',
          data: [],
          borderColor: '#2F4BFF',
          backgroundColor: 'rgba(47, 75, 255, 0.05)',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Suspicious Threshold (10%)',
          data: [],
          borderColor: '#E0A100',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Ransomware Threshold (30%)',
          data: [],
          borderColor: '#D93636',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: { family: 'JetBrains Mono', size: 10 },
            color: '#6A6F7A',
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#FFFFFF',
          titleColor: '#16181D',
          bodyColor: '#6A6F7A',
          borderColor: '#E4E4DF',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'Bricolage Grotesque', size: 12, weight: '600' },
          bodyFont: { family: 'JetBrains Mono', size: 11 },
          callbacks: {
            label: (item) => `${item.dataset.label}: ${(item.parsed.y * 100).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'JetBrains Mono', size: 9 },
            color: '#6A6F7A',
            maxTicksLimit: 6,
          },
        },
        y: {
          min: 0,
          max: 0.8,
          grid: { color: 'rgba(228, 228, 223, 0.4)' },
          ticks: {
            font: { family: 'JetBrains Mono', size: 9 },
            color: '#6A6F7A',
            callback: (val) => `${(val * 100).toFixed(0)}%`,
          },
        },
      },
    },
  });

  return function updateChart(runs = []) {
    if (!runs || runs.length === 0) return;

    const slice = runs.slice(-25); // Last 25 points
    const labels = slice.map((r) => {
      const d = new Date(r.created_at);
      return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    });

    const velocityData = slice.map((r) => Number(r.change_rate));
    const suspLine = slice.map(() => 0.10);
    const rsomLine = slice.map(() => 0.30);

    chart.data.labels = labels;
    chart.data.datasets[0].data = velocityData;
    chart.data.datasets[1].data = suspLine;
    chart.data.datasets[2].data = rsomLine;

    // Highlight points where canary was triggered
    const pointColors = slice.map((r) => (r.canary_triggered ? '#D93636' : '#2F4BFF'));
    const pointRadii = slice.map((r) => (r.canary_triggered ? 6 : 2));
    chart.data.datasets[0].pointBackgroundColor = pointColors;
    chart.data.datasets[0].pointRadius = pointRadii;

    chart.update('none');
  };
}
