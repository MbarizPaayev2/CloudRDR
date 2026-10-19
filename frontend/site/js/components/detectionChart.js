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
  if (!canvasEl) {
    return () => {};
  }

  let latestRuns = [];

  function render(runs = []) {
    latestRuns = runs;
    const rect = canvasEl.parentElement?.getBoundingClientRect() || { width: 680, height: 220 };
    const cssWidth = Math.max(rect.width || 680, 480);
    const cssHeight = Math.max(rect.height || 220, 200);
    const dpr = window.devicePixelRatio || 2;

    canvasEl.width = Math.floor(cssWidth * dpr);
    canvasEl.height = Math.floor(cssHeight * dpr);
    canvasEl.style.width = `${cssWidth}px`;
    canvasEl.style.height = `${cssHeight}px`;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const padLeft = 46;
    const padRight = 20;
    const padTop = 34;
    const padBottom = 28;
    const plotW = cssWidth - padLeft - padRight;
    const plotH = cssHeight - padTop - padBottom;
    const maxVal = 0.6; // 60% max scale

    const yForVal = (v) => padTop + plotH - (Math.min(Math.max(v, 0), maxVal) / maxVal) * plotH;

    // 1. Draw Legend at Top Right
    const legendItems = [
      { label: 'Change Velocity (60s)', color: '#38bdf8', dashed: false },
      { label: 'Suspicious (10%)', color: '#f59e0b', dashed: true },
      { label: 'Ransomware SLA (30%)', color: '#ef4444', dashed: true },
    ];
    ctx.font = '600 10px "JetBrains Mono", monospace';
    let lx = cssWidth - padRight;
    for (let i = legendItems.length - 1; i >= 0; i--) {
      const item = legendItems[i];
      const tw = ctx.measureText(item.label).width;
      lx -= tw;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, lx, 16);
      lx -= 22;
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      if (item.dashed) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(lx, 12);
      ctx.lineTo(lx + 16, 12);
      ctx.stroke();
      ctx.restore();
      lx -= 16;
    }

    // 2. Horizontal Grid Lines & Y-Axis Labels
    const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    yTicks.forEach((tick) => {
      const y = yForVal(tick);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(cssWidth - padRight, y);
      ctx.stroke();

      ctx.fillStyle = tick === 0.3 ? '#ef4444' : tick === 0.1 ? '#f59e0b' : '#64748b';
      ctx.fillText(`${Math.round(tick * 100)}%`, padLeft - 8, y + 3.5);
    });

    // 3. Draw 10% Suspicious & 30% Ransomware Threshold Lines
    const ySusp = yForVal(0.1);
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, ySusp);
    ctx.lineTo(cssWidth - padRight, ySusp);
    ctx.stroke();
    ctx.restore();

    const yRsom = yForVal(0.3);
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yRsom);
    ctx.lineTo(cssWidth - padRight, yRsom);
    ctx.stroke();
    ctx.restore();

    // 4. Prepare Data Slice
    const slice = (runs && runs.length > 0 ? runs : []).slice(-20);
    if (slice.length === 0) {
      ctx.restore();
      return;
    }

    const points = slice.map((r, idx) => {
      const x = padLeft + (slice.length === 1 ? plotW / 2 : (idx / (slice.length - 1)) * plotW);
      const val = Number(r.change_rate) || 0;
      const y = yForVal(val);
      const d = new Date(r.created_at || Date.now());
      const label = `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      return {
        x,
        y,
        val,
        label,
        canary: Boolean(r.canary_triggered),
        verdict: r.verdict || (val >= 0.3 ? 'ransomware' : val >= 0.1 ? 'suspicious' : 'normal'),
      };
    });

    const maxPointVal = Math.max(...points.map((p) => p.val));
    const isAlert = maxPointVal >= 0.3 || points.some((p) => p.canary);

    // 5. Area Fill Under Velocity Curve
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    if (isAlert) {
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.32)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
    } else {
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.01)');
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, padTop + plotH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 6. Main Velocity Line
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = isAlert ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 7. Data Points & X-Axis Labels
    ctx.textAlign = 'center';
    points.forEach((p, idx) => {
      // X-axis tick every 3rd point or last point
      if (idx % 3 === 0 || idx === points.length - 1) {
        ctx.fillStyle = '#64748b';
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText(p.label, p.x, cssHeight - 8);
      }

      const isSpike = p.val >= 0.3 || p.canary;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isSpike ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isSpike ? '#ef4444' : p.val >= 0.1 ? '#f59e0b' : '#38bdf8';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#090d16';
      ctx.stroke();

      // Callout badge on highest spike point
      if (isSpike && idx === points.length - 1) {
        const badgeText = p.canary && p.val < 0.3
          ? `CANARY TRIPWIRE (${(p.val * 100).toFixed(1)}%)`
          : `BURST ALERT: ${(p.val * 100).toFixed(1)}% (>30% SLA)`;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        const bw = ctx.measureText(badgeText).width + 14;
        const bx = Math.min(Math.max(p.x - bw - 8, padLeft + 6), cssWidth - padRight - bw);
        const by = Math.max(p.y - 26, padTop + 4);

        ctx.fillStyle = 'rgba(127, 29, 29, 0.92)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fecaca';
        ctx.textAlign = 'left';
        ctx.fillText(badgeText, bx + 7, by + 13.5);
      }
    });

    ctx.restore();
  }

  window.addEventListener('resize', () => {
    if (latestRuns.length > 0) render(latestRuns);
  });

  return render;
}

