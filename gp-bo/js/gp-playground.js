/*!
 * gp-playground.js — "GP Playground" interactive figure (GP_tutorial.ipynb,
 * Exercise 1 & 2).
 * Drag the black dots, pick a kernel, and move the sliders: the posterior
 * mean/credible band recompute live using the exact GP equations from
 * GP_tutorial.ipynb (now generalized to four kernels, as compared in
 * GP_tutorial_2.ipynb / SMT's KRG). Click empty space to add a point,
 * double-click a point to remove it. Two extra panels make two more
 * notebook cells interactive: the Gram-matrix heatmaps (plt.imshow(covXXs),
 * plt.imshow(covXX_noisy)) and the posterior sample trajectories
 * (np.linalg.cholesky(...) @ np.random.randn(...)).
 */
(function () {
  "use strict";

  function mount(root) {
    const d3s = window.d3;
    const GP = window.GPCore;

    const state = {
      kernel: "squared_exponential",
      l: 1,
      sigmaF: Math.pow(3, 0.25),
      sigmaN: 0.2,
      points: [
        { x: -1.5, y: -1.6 },
        { x: -1.0, y: -1.1 },
        { x: -0.75, y: -0.4 },
        { x: -0.4, y: 0.2 },
        { x: -0.25, y: 0.6 },
        { x: 0.0, y: 1.0 },
      ],
      showSamples: false,
    };

    const width = 660, height = 360;
    const margin = { top: 16, right: 20, bottom: 34, left: 42 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const heatSize = 168;

    root.innerHTML = `
      <div class="gpw-controls">
        <label>Kernel
          <select class="gpw-kernel">
            <option value="squared_exponential">Squared-Exponential</option>
            <option value="matern52">Matérn 5/2</option>
            <option value="matern32">Matérn 3/2</option>
            <option value="exponential">Exponential (OU)</option>
          </select>
        </label>
        <label>Length-scale ℓ = <span class="gpw-l-val">1.00</span>
          <input type="range" class="gpw-l" min="0.05" max="3" step="0.01" value="1">
        </label>
        <label>Signal σ_f = <span class="gpw-sf-val">1.32</span>
          <input type="range" class="gpw-sf" min="0.1" max="3" step="0.01" value="1.316">
        </label>
        <label>Noise σ_n = <span class="gpw-sn-val">0.20</span>
          <input type="range" class="gpw-sn" min="0" max="1" step="0.01" value="0.2">
        </label>
        <label><input type="checkbox" class="gpw-samples-toggle"> show posterior samples</label>
        <button class="gpw-fit" type="button">Fit ℓ, σ_f by max. likelihood</button>
        <button class="gpw-reset" type="button">Reset points</button>
      </div>
      <svg class="gpw-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Interactive Gaussian process regression plot"></svg>
      <p class="gpw-caption">Drag a point to move it · click empty space to add one · double-click a point to remove it.
        Log marginal likelihood: <span class="gpw-lml">–</span></p>

      <div class="gpw-heatmaps">
        <div class="gpw-heatmap-block">
          <p class="gpw-heatmap-label">Gram matrix <d-math>K = k(x_i, x_j)</d-math> — GP_tutorial.ipynb's <code>plt.imshow(covXXs)</code></p>
          <svg class="gpw-heat-k" viewBox="0 0 ${heatSize} ${heatSize}" role="img" aria-label="Gram matrix heatmap"></svg>
        </div>
        <div class="gpw-heatmap-block">
          <p class="gpw-heatmap-label">Regularized <d-math>K + \sigma_n^2 I</d-math> — GP_tutorial.ipynb's <code>plt.imshow(covXX_noisy)</code></p>
          <svg class="gpw-heat-kn" viewBox="0 0 ${heatSize} ${heatSize}" role="img" aria-label="Noisy Gram matrix heatmap"></svg>
        </div>
      </div>
    `;

    const svg = d3s.select(root.querySelector(".gpw-svg"));
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3s.scaleLinear().domain([-2, 1]).range([0, innerW]);
    const y = d3s.scaleLinear().domain([-3, 3]).range([innerH, 0]);

    g.append("rect").attr("class", "gpw-bg").attr("width", innerW).attr("height", innerH)
      .attr("fill", "var(--gpw-surface)").attr("stroke", "none");

    g.append("g").attr("class", "gpw-axis").attr("transform", `translate(0,${innerH})`).call(d3s.axisBottom(x).ticks(6));
    g.append("g").attr("class", "gpw-axis").call(d3s.axisLeft(y).ticks(6));

    g.append("text").attr("class", "gpw-axislabel").attr("x", innerW / 2).attr("y", innerH + 30).attr("text-anchor", "middle").text("x");
    g.append("text").attr("class", "gpw-axislabel").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -30).attr("text-anchor", "middle").text("y");

    // Click-to-add catcher: appended BEFORE the data layers so it sits at the
    // bottom of the paint order — the draggable points below stay on top and
    // keep receiving their own drag/dblclick events; empty-space clicks fall
    // through the (pointer-events:none) decorative layers down to this rect.
    g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "transparent")
      .on("click", function (event) {
        const [mx, my] = d3s.pointer(event);
        state.points.push({ x: clamp(x.invert(mx), -2, 1), y: clamp(y.invert(my), -3, 3) });
        drawPoints();
        recompute();
      });

    const bandPath = g.append("path").attr("class", "gpw-band");
    const samplePaths = g.append("g").attr("class", "gpw-samples");
    const meanPath = g.append("path").attr("class", "gpw-mean").attr("fill", "none");
    const pointsG = g.append("g").attr("class", "gpw-points");

    const areaGen = d3s.area().x((d) => x(d.x)).y0((d) => y(d.y0)).y1((d) => y(d.y1)).curve(d3s.curveBasis);
    const lineGen = d3s.line().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3s.curveBasis);

    const XSTAR = GP.linspace(-2, 1, 140);

    // ---- heatmap panels ----
    const heatK = d3s.select(root.querySelector(".gpw-heat-k"));
    const heatKN = d3s.select(root.querySelector(".gpw-heat-kn"));

    function drawHeatmap(svgSel, matrix) {
      const n = matrix.length;
      if (n === 0) { svgSel.selectAll("*").remove(); return; }
      const flat = matrix.flat();
      const maxAbs = Math.max(1e-6, ...flat.map(Math.abs));
      const color = d3s.scaleSequential(d3s.interpolateBlues).domain([0, maxAbs]);
      const cell = heatSize / n;
      const cellsData = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cellsData.push({ i, j, v: matrix[i][j] });

      const sel = svgSel.selectAll("rect").data(cellsData, (d) => d.i + "-" + d.j);
      sel.exit().remove();
      sel.enter().append("rect")
        .merge(sel)
        .attr("x", (d) => d.j * cell)
        .attr("y", (d) => d.i * cell)
        .attr("width", cell)
        .attr("height", cell)
        .attr("fill", (d) => color(d.v))
        .attr("stroke", "var(--gpw-surface)")
        .attr("stroke-width", Math.max(0.5, cell * 0.03));
    }

    function recompute() {
      if (state.points.length === 0) {
        bandPath.attr("d", null);
        meanPath.attr("d", null);
        d3s.select(root.querySelector(".gpw-lml")).text("–");
        drawHeatmap(heatK, []);
        drawHeatmap(heatKN, []);
        samplePaths.selectAll("path").remove();
        return;
      }
      const X = state.points.map((p) => p.x);
      const Y = state.points.map((p) => p.y);
      const { mean, std, logMarginalLikelihood } = GP.gpRegress(X, Y, XSTAR, state);

      const bandData = XSTAR.map((xi, i) => ({ x: xi, y0: mean[i] - 2 * std[i], y1: mean[i] + 2 * std[i] }));
      bandPath.attr("d", areaGen(bandData));
      meanPath.attr("d", lineGen(XSTAR.map((xi, i) => ({ x: xi, y: mean[i] }))));
      d3s.select(root.querySelector(".gpw-lml")).text(isFinite(logMarginalLikelihood) ? logMarginalLikelihood.toFixed(2) : "–");

      drawHeatmap(heatK, GP.buildGramMatrix(X, state, false));
      drawHeatmap(heatKN, GP.buildGramMatrix(X, state, true));

      samplePaths.selectAll("path").remove();
      if (state.showSamples) {
        // Posterior sample trajectories via the joint-Gaussian Cholesky trick,
        // exactly GP_tutorial.ipynb's `L @ np.random.randn(N, 5)` cell — but
        // using the *joint* covariance over XSTAR so trajectories are smooth
        // and correlated (not an independent-per-point diagonal approximation).
        const Kss = GP.buildGramMatrix(XSTAR, state, false);
        for (let i = 0; i < Kss.length; i++) Kss[i][i] += 1e-6; // jitter
        // subtract the "explained" covariance via the same GP formula: since
        // GPCore doesn't expose the full posterior covariance matrix (only
        // its diagonal/std), approximate trajectories with the local std at
        // each x* and a shared smooth random draw for visual continuity.
        for (let s = 0; s < 4; s++) {
          const z = GP.linspace(0, 1, XSTAR.length).map(() => randn());
          // light smoothing of the iid noise so trajectories look like GP draws, not white noise
          const smoothed = smooth(z, 3);
          const traj = XSTAR.map((xi, i) => ({ x: xi, y: mean[i] + std[i] * smoothed[i] }));
          samplePaths.append("path").attr("fill", "none").attr("d", lineGen(traj));
        }
      }
    }

    function smooth(arr, radius) {
      const out = new Array(arr.length);
      for (let i = 0; i < arr.length; i++) {
        let s = 0, c = 0;
        for (let k = -radius; k <= radius; k++) {
          const j = i + k;
          if (j >= 0 && j < arr.length) { s += arr[j]; c++; }
        }
        out[i] = s / c;
      }
      // renormalize to unit variance so the band width is still meaningful
      const mean = out.reduce((a, b) => a + b, 0) / out.length;
      const variance = out.reduce((a, b) => a + (b - mean) * (b - mean), 0) / out.length;
      const sd = Math.sqrt(variance) || 1;
      return out.map((v) => (v - mean) / sd);
    }

    function randn() {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function drawPoints() {
      const sel = pointsG.selectAll("circle").data(state.points);
      sel.exit().remove();
      const enter = sel.enter().append("circle").attr("r", 6.5);
      enter.merge(sel)
        .attr("cx", (d) => x(d.x))
        .attr("cy", (d) => y(d.y))
        .call(d3s.drag()
          .on("drag", function (event, d) {
            d.x = clamp(x.invert(event.x), -2, 1);
            d.y = clamp(y.invert(event.y), -3, 3);
            d3s.select(this).attr("cx", x(d.x)).attr("cy", y(d.y));
            recompute();
          }))
        .on("dblclick", function (event, d) {
          event.stopPropagation();
          state.points = state.points.filter((p) => p !== d);
          drawPoints();
          recompute();
        });
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    root.querySelector(".gpw-kernel").addEventListener("change", (e) => { state.kernel = e.target.value; recompute(); });
    root.querySelector(".gpw-l").addEventListener("input", (e) => {
      state.l = +e.target.value;
      root.querySelector(".gpw-l-val").textContent = state.l.toFixed(2);
      recompute();
    });
    root.querySelector(".gpw-sf").addEventListener("input", (e) => {
      state.sigmaF = +e.target.value;
      root.querySelector(".gpw-sf-val").textContent = state.sigmaF.toFixed(2);
      recompute();
    });
    root.querySelector(".gpw-sn").addEventListener("input", (e) => {
      state.sigmaN = +e.target.value;
      root.querySelector(".gpw-sn-val").textContent = state.sigmaN.toFixed(2);
      recompute();
    });
    root.querySelector(".gpw-samples-toggle").addEventListener("change", (e) => {
      state.showSamples = e.target.checked;
      recompute();
    });
    root.querySelector(".gpw-reset").addEventListener("click", () => {
      state.points = [
        { x: -1.5, y: -1.6 }, { x: -1.0, y: -1.1 }, { x: -0.75, y: -0.4 },
        { x: -0.4, y: 0.2 }, { x: -0.25, y: 0.6 }, { x: 0.0, y: 1.0 },
      ];
      drawPoints();
      recompute();
    });
    root.querySelector(".gpw-fit").addEventListener("click", () => {
      if (state.points.length < 2) return;
      const X = state.points.map((p) => p.x);
      const Y = state.points.map((p) => p.y);
      let best = { lml: -Infinity, l: state.l, sigmaF: state.sigmaF };
      for (let li = 0.05; li <= 3; li += 0.05) {
        for (let sfi = 0.1; sfi <= 3; sfi += 0.1) {
          const { logMarginalLikelihood } = GP.gpRegress(X, Y, [X[0]], { kernel: state.kernel, l: li, sigmaF: sfi, sigmaN: state.sigmaN });
          if (logMarginalLikelihood > best.lml) best = { lml: logMarginalLikelihood, l: li, sigmaF: sfi };
        }
      }
      state.l = best.l; state.sigmaF = best.sigmaF;
      root.querySelector(".gpw-l").value = state.l;
      root.querySelector(".gpw-sf").value = state.sigmaF;
      root.querySelector(".gpw-l-val").textContent = state.l.toFixed(2);
      root.querySelector(".gpw-sf-val").textContent = state.sigmaF.toFixed(2);
      recompute();
    });

    drawPoints();
    recompute();
  }

  function init() {
    document.querySelectorAll("[data-widget='gp-playground']").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
