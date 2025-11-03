/* global Plotly */
(function () {
  const $ = (id) => document.getElementById(id);

  const plotDiv = $("plot");
  const velocityInput = $("velocity");
  const velocitySlider = $("velocitySlider");
  const angleInput = $("angle"); // replaces anglesInput
  const gravityInput = $("gravity");
  const simulateBtn = $("simulateBtn");
  const resetBtn = $("resetBtn");
  const themeToggle = $("themeToggle");
  const simModeSelect = $("simMode");
  const plotContainer = $("plotContainer");
  const boyCanvas = $("boyCanvas");

  const statHeight = $("statHeight");
  const statTime = $("statTime");
  const statRange = $("statRange");

  const yearSpan = $("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const anglesBlock = $("anglesBlock");
  const angleBlock = $("angleBlock");
  const compareBlock = $("compareBlock");

  // Theme handling
  function setTheme(dark) {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    // Restyle Plotly background
    Plotly.relayout(plotDiv, {
      paper_bgcolor: getComputedStyle(document.body).backgroundColor,
      plot_bgcolor: getComputedStyle(document.body).backgroundColor,
      font: { color: getComputedStyle(document.body).color },
    }).catch(() => {});
  }

  themeToggle.addEventListener("click", () => {
    const dark = !document.documentElement.classList.contains("dark");
    setTheme(dark);
  });

  // Sync velocity numeric and slider
  velocityInput.addEventListener("input", () => {
    const v = Number(velocityInput.value) || 0;
    velocitySlider.value = String(Math.max(0, Math.min(100, v)));
  });
  velocitySlider.addEventListener("input", () => {
    velocityInput.value = velocitySlider.value;
  });

  // Plot state
  let animationId = null;
  let simData = null; // server response
  let colors = [
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#eab308",
    "#a855f7",
    "#06b6d4",
  ];

  let boyAnimFrame = null;
  let boyBallPath = null;
  let boyBallIndex = 0;

  function animateBoyThrow(xTraj, yTraj, pxScale) {
    const ctx = boyCanvas.getContext("2d");
    let groundY = boyCanvas.height - 40;
    let startX = 70;
    let startY = boyCanvas.height - 60;
    boyBallPath = { x: xTraj, y: yTraj };
    boyBallIndex = 0;
    function frame() {
      ctx.clearRect(0, 0, boyCanvas.width, boyCanvas.height);
      ctx.fillStyle = "#888";
      ctx.fillRect(0, groundY, boyCanvas.width, 40);
      drawBoy(ctx, startX, startY);
      // Draw trail (dashed or faded)
      if (boyBallIndex > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(59,130,246,0.6)";
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let t = 0; t < boyBallIndex; t++) {
          let bx = startX + boyBallPath.x[t] * pxScale;
          let by = groundY - boyBallPath.y[t] * pxScale;
          if (t === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      // Draw the ball at the current location
      let bx = startX + boyBallPath.x[boyBallIndex] * pxScale;
      let by = groundY - boyBallPath.y[boyBallIndex] * pxScale;
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, 2 * Math.PI); ctx.fillStyle = "#f87171"; ctx.fill();
      boyBallIndex += 1;
      if (boyBallIndex < boyBallPath.x.length) {
        boyAnimFrame = requestAnimationFrame(frame);
      } else {
        boyAnimFrame = null;
      }
    }
    boyAnimFrame = requestAnimationFrame(frame);
  }

  function cancelBoyAnimation() {
    if (boyAnimFrame) {
      cancelAnimationFrame(boyAnimFrame);
      boyAnimFrame = null;
      boyBallPath = null;
      boyBallIndex = 0;
    }
  }

  function parseAngles(input) {
    return String(input)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
  }

  function meters(n, digits = 2) {
    return `${Number(n).toFixed(digits)} m`;
  }
  function seconds(n, digits = 2) {
    return `${Number(n).toFixed(digits)} s`;
  }

  function cancelAnimation() {
    if (animationId != null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function resetUI() {
    cancelAnimation();
    simData = null;
    statHeight.textContent = "–";
    statTime.textContent = "–";
    statRange.textContent = "–";
    Plotly.newPlot(
      plotDiv,
      [],
      {
        margin: { l: 40, r: 20, b: 40, t: 10 },
        xaxis: { title: "x (m)" },
        yaxis: { title: "y (m)", rangemode: "tozero" },
        showlegend: true,
        paper_bgcolor: getComputedStyle(document.body).backgroundColor,
        plot_bgcolor: getComputedStyle(document.body).backgroundColor,
        font: { color: getComputedStyle(document.body).color },
      },
      { responsive: true }
    );
  }

  async function simulate() {
    cancelAnimation();
    cancelBoyAnimation();
    const velocity = Number(velocityInput.value);
    const gravity = Number(gravityInput.value);
    const simMode = simModeSelect ? simModeSelect.value : "cartesian";
    if (simMode === "boy") {
      // Single angle only for boy mode
      const angle = Number(angleInput.value);
      if (!isFinite(angle)) {
        alert("Please enter a valid angle (degrees).");
        return;
      }
      const payload = { velocity, gravity, angles: [angle], dt: 0.02 };
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        try {
          const err = await res.json();
          alert(err.error || "Simulation failed");
        } catch (e) {
          alert("Simulation failed");
        }
        return;
      }
      simData = await res.json();
      showSimMode("boy");
      resetBoyCanvas();
      let maxX = Math.max(...simData.results[0].x);
      let maxY = Math.max(...simData.results[0].y);
      let pxScale = Math.min((boyCanvas.width-140) / maxX, (boyCanvas.height-80) / maxY) || 2.5;
      animateBoyThrow(simData.results[0].x, simData.results[0].y, pxScale);
      updateSummaryStats();
      return;
    } else {
      // Multi-angle for cartesian (with compare toggle)
      const anglesInput = $("angles");
      const angles = parseAngles(anglesInput.value);
      if (!angles.length) {
        alert("Please enter at least one valid angle.");
        return;
      }
      const payload = { velocity, gravity, angles, dt: 0.02 };
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        try {
          const err = await res.json();
          alert(err.error || "Simulation failed");
        } catch (e) {
          alert("Simulation failed");
        }
        return;
      }
      simData = await res.json();
      showSimMode("cartesian");
      // Build traces: each angle gets a line + a moving marker and a short direction segment
      const traces = [];
      const showAll = compareToggle.checked;
      simData.results.forEach((r, idx) => {
        const color = colors[idx % colors.length];
        // Full trajectory
        traces.push({
          x: r.x,
          y: r.y,
          mode: "lines",
          line: { color, width: 2 },
          name: `${r.angle}° path`,
          hovertemplate: "x=%{x:.2f} m<br>y=%{y:.2f} m<extra>" + `${r.angle}°</extra>`,
          visible: showAll ? true : idx === 0,
        });
        // Small forward direction segment (showing the next step as a line)
        traces.push({
          x: [r.x[0], r.x[1] ?? r.x[0]],
          y: [r.y[0], r.y[1] ?? r.y[0]],
          mode: "lines",
          line: { color, width: 4, dash: 'dot' },
          name: `${r.angle}° dir`,
          hoverinfo: "skip",
          showlegend: false,
          visible: showAll ? true : idx === 0,
        });
        // Moving point (start at first)
        traces.push({
          x: [r.x[0] ?? 0],
          y: [r.y[0] ?? 0],
          mode: "markers",
          marker: { color, size: 16, line: { width: 2, color: '#fff' } },
          name: `${r.angle}° ball`,
          showlegend: false,
          hovertemplate: "x=%{x:.2f} m<br>y=%{y:.2f} m<extra>" + `${r.angle}°</extra>`,
          visible: showAll ? true : idx === 0,
        });
      });
      const layout = {
        margin: { l: 40, r: 20, b: 40, t: 10 },
        xaxis: { title: "x (m)" },
        yaxis: { title: "y (m)", rangemode: "tozero" },
        showlegend: true,
        paper_bgcolor: getComputedStyle(document.body).backgroundColor,
        plot_bgcolor: getComputedStyle(document.body).backgroundColor,
        font: { color: getComputedStyle(document.body).color },
      };
      Plotly.newPlot(plotDiv, traces, layout, { responsive: true });
      updateSummaryStats();
      startAnimation();
    }
  }

  function updateSummaryStats(progressByAngle = null) {
    if (!simData) return;
    const results = simData.results;
    if (!results.length) return;
    // If in cartesian mode with multi-angles, show all
    if (simModeSelect && simModeSelect.value === "cartesian" && results.length > 1) {
      renderStatsMulti(results);
      return;
    }
    // Single: show as before (boy mode or single angle cartesian)
    const statHeight = $("statHeight");
    const statTime = $("statTime");
    const statRange = $("statRange");
    const r = results[0];
    statHeight.textContent = meters(r.stats.maxHeight);
    statTime.textContent = seconds(r.stats.timeOfFlight);
    statRange.textContent = meters(r.stats.range);
  }

  function startAnimation() {
    if (!simData) return;
    const dt = simData.dt || 0.02;
    const speedFactor = 1.0; // adjust to speed up/slow down
    // Each angle gets 3 traces: path (3*idx), dir seg (3*idx+1), marker (3*idx+2)
    const perAngleIndex = new Array(simData.results.length).fill(0);
    let lastTime = performance.now();

    function step(now) {
      const elapsed = (now - lastTime) / 1000; // seconds
      lastTime = now;
      const advance = Math.max(1, Math.floor((elapsed * speedFactor) / dt));

      const updates = { x: [], y: [], traces: [] };
      const updatesDir = { x: [], y: [], traces: [] };
      simData.results.forEach((r, idx) => {
        const i = Math.min(perAngleIndex[idx] + advance, r.x.length - 1);
        perAngleIndex[idx] = i;
        // Marker trace index (3*idx+2)
        const markerTraceIndex = 3 * idx + 2;
        updates.traces.push(markerTraceIndex);
        updates.x.push([r.x[i]]);
        updates.y.push([r.y[i]]);
        // Direction segment trace (short line: current to next)
        const dirTraceIndex = 3 * idx + 1;
        let xseg, yseg;
        if (i < r.x.length - 1) {
          xseg = [r.x[i], r.x[i + 1]];
          yseg = [r.y[i], r.y[i + 1]];
        } else {
          xseg = [r.x[i], r.x[i]];
          yseg = [r.y[i], r.y[i]];
        }
        updatesDir.traces.push(dirTraceIndex);
        updatesDir.x.push(xseg);
        updatesDir.y.push(yseg);
      });
      if (updates.traces.length) {
        Plotly.restyle(plotDiv, { x: updates.x, y: updates.y }, updates.traces);
      }
      if (updatesDir.traces.length) {
        Plotly.restyle(plotDiv, { x: updatesDir.x, y: updatesDir.y }, updatesDir.traces);
      }
      // Continue until all finished
      const allDone = simData.results.every((r, idx) => perAngleIndex[idx] >= r.x.length - 1);
      if (!allDone) {
        animationId = requestAnimationFrame(step);
      } else {
        animationId = null;
      }
    }
    animationId = requestAnimationFrame(step);
  }

  function reset() {
    resetUI();
  }

  simulateBtn.addEventListener("click", simulate);
  resetBtn.addEventListener("click", reset);
  // Remove compareToggle.addEventListener("change", ...)

  function showSimMode(mode) {
    if (mode === "cartesian") {
      $("plot").classList.remove("hidden");
      boyCanvas.classList.add("hidden");
    } else {
      $("plot").classList.add("hidden");
      boyCanvas.classList.remove("hidden");
      resetBoyCanvas();
    }
  }

  function updateInputVisibility(mode) {
    if (mode === "cartesian") {
      anglesBlock.classList.remove("hidden");
      compareBlock.classList.remove("hidden");
      angleBlock.classList.add("hidden");
    } else {
      anglesBlock.classList.add("hidden");
      compareBlock.classList.add("hidden");
      angleBlock.classList.remove("hidden");
    }
  }

  if (simModeSelect) {
    simModeSelect.addEventListener("change", (e) => {
      showSimMode(simModeSelect.value);
      updateInputVisibility(simModeSelect.value);
    });
    showSimMode(simModeSelect.value);
    updateInputVisibility(simModeSelect.value);
  }

  function resetBoyCanvas() {
    // Clear and draw initial boy/ground scene
    const ctx = boyCanvas.getContext("2d");
    boyCanvas.width = boyCanvas.offsetWidth;
    boyCanvas.height = boyCanvas.offsetHeight;
    ctx.clearRect(0, 0, boyCanvas.width, boyCanvas.height);
    // Draw ground
    ctx.fillStyle = "#888";
    ctx.fillRect(0, boyCanvas.height - 40, boyCanvas.width, 40);
    // Draw boy (side view, simple stick figure)
    drawBoy(ctx, 70, boyCanvas.height - 60);
    // Optionally, add label: "Ready to throw!"
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText("Ready to throw!", 120, boyCanvas.height - 65);
  }

  function drawBoy(ctx, x, y) {
    // Head
    ctx.beginPath(); ctx.arc(x, y - 25, 14, 0, 2 * Math.PI); ctx.fillStyle = "#fde68a"; ctx.fill();
    // Body
    ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 24); ctx.strokeStyle = "#333"; ctx.lineWidth = 4; ctx.stroke();
    // Arms (basic)
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y - 15); ctx.moveTo(x, y + 4); ctx.lineTo(x - 16, y + 12); ctx.strokeStyle = "#333"; ctx.lineWidth = 3; ctx.stroke();
    // Legs
    ctx.beginPath(); ctx.moveTo(x, y + 24); ctx.lineTo(x + 14, y + 50); ctx.moveTo(x, y + 25); ctx.lineTo(x - 13, y + 50); ctx.strokeStyle = "#333"; ctx.lineWidth = 4; ctx.stroke();
  }

  // Initialize
  resetUI();
})();


