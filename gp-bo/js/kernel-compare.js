/*!
 * kernel-compare.js — "Kernel Comparison Explorer" (GP_tutorial_2.ipynb).
 * The interactive twin of the four-kernel static figure: drag the same six
 * points, and all four correlation functions (Squared-Exponential,
 * Exponential/OU, Matérn 3/2, Matérn 5/2) refit live — each independently,
 * by maximizing its own log marginal likelihood, exactly like
 * `KRG(corr=k, theta0=[1e-2])` does per kernel in the notebook. Drag the
 * orange x* marker to explore how the four kernels disagree away from the
 * training range.
 */
(function () {
  "use strict";

  const KERNELS = ["squared_exponential", "exponential", "matern32", "matern52"];
  const COLORS = {
    squared_exponential: "#2a78d6",
    exponential: "#eb6834",
    matern32: "#1baf7a",
    matern52: "#eda100",
  };

  function mount(root) {
    const d3s = window.d3;
    const GP = window.GPCore;

    const state = {
      points: [
        { x: -1.5, y: -1.6 }, { x: -1.0, y: -1.1 }, { x: -0.75, y: -0.4 },
        { x: -0.4, y: 0.2 }, { x: -0.25, y: 0.6 }, { x: 0.0, y: 1.0 },
      ],
      xstar: 0.2,
      active: new Set(KERNELS),
      sigmaN: 0.05,
    };

    const width = 660, height = 340;
    const margin = { top: 16, right: 20, bottom: 34, left: 42 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const legendItems = KERNELS.map((k) => `
      <label class="kc-legend-item">
        <input type="checkbox" class="kc-toggle" data-kernel="${k}" checked>
        <span class="swatch" style="background:${COLORS[k]}"></span>${GP.KERNEL_LABELS[k]}
      </label>`).join("");

    root.innerHTML = `
      <div class="gpw-controls">
        <span>Kernels: </span>
        ${legendItems}
      </div>
      <svg class="kc-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Interactive kernel comparison plot"></svg>
      <p class="gpw-caption">Drag a black point to move it, or drag the orange <d-math>x_*</d-math> marker to explore
        extrapolation. Each kernel's ℓ and σ_f are independently re-fit by maximizing its own log marginal
        likelihood, just like <code>KRG(corr=...)</code> in <code>GP_tutorial_2.ipynb</code>.</p>
      <div class="kc-table-wrap"><table class="kc-table">
        <thead><tr><th>Kernel</th><th>ℓ*</th><th>mean at x*</th><th>95% CI at x*</th></tr></thead>
        <tbody class="kc-tbody"></tbody>
      </table></div>
    `;

    const svg = d3s.select(root.querySelector(".kc-svg"));
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3s.scaleLinear().domain([-2, 1.5]).range([0, innerW]);
    const y = d3s.scaleLinear().domain([-3, 3]).range([innerH, 0]);

    g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "var(--gpw-surface)");
    g.append("g").attr("class", "gpw-axis").attr("transform", `translate(0,${innerH})`).call(d3s.axisBottom(x).ticks(6));
    g.append("g").attr("class", "gpw-axis").call(d3s.axisLeft(y).ticks(6));
    g.append("text").attr("class", "gpw-axislabel").attr("x", innerW / 2).attr("y", innerH + 30).attr("text-anchor", "middle").text("x");
    g.append("text").attr("class", "gpw-axislabel").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -30).attr("text-anchor", "middle").text("y");

    // Click-to-add catcher: appended BEFORE the data layers (bands/points/
    // x* handle) so those stay on top and keep receiving their own
    // drag/dblclick events; the decorative bands/means are pointer-events:none
    // in CSS so empty-space clicks fall through to this rect.
    g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "transparent")
      .on("click", function (event) {
        const [mx, my] = d3s.pointer(event);
        state.points.push({ x: clamp(x.invert(mx), -2, 1.5), y: clamp(y.invert(my), -3, 3) });
        drawPoints();
        recompute();
      });

    const bandsG = g.append("g").attr("pointer-events", "none");
    const meansG = g.append("g").attr("pointer-events", "none");
    const pointsG = g.append("g").attr("class", "kc-points gpw-points");
    const xstarLine = g.append("line").attr("class", "kc-xstar-line").attr("y1", 0).attr("y2", innerH).attr("pointer-events", "none");
    const xstarHandle = g.append("circle").attr("class", "kc-xstar-handle").attr("r", 7).attr("cy", -2);

    const areaGen = d3s.area().x((d) => x(d.x)).y0((d) => y(d.y0)).y1((d) => y(d.y1)).curve(d3s.curveBasis);
    const lineGen = d3s.line().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3s.curveBasis);

    const XSTAR_GRID = GP.linspace(-2, 1.5, 160);

    function fitKernel(kernel, X, Y) {
      let best = { lml: -Infinity, l: 0.5, sigmaF: 1 };
      for (let li = 0.05; li <= 3; li += 0.05) {
        for (let sfi = 0.2; sfi <= 3; sfi += 0.2) {
          const opts = { kernel, l: li, sigmaF: sfi, sigmaN: state.sigmaN };
          const { logMarginalLikelihood } = GP.gpRegress(X, Y, [X[0]], opts);
          if (logMarginalLikelihood > best.lml) best = { lml: logMarginalLikelihood, l: li, sigmaF: sfi };
        }
      }
      return best;
    }

    function recompute() {
      if (state.points.length < 2) return;
      const X = state.points.map((p) => p.x);
      const Y = state.points.map((p) => p.y);

      const rows = [];
      const bandSel = bandsG.selectAll("path").data(KERNELS.filter((k) => state.active.has(k)), (d) => d);
      bandSel.exit().remove();
      const meanSel = meansG.selectAll("path").data(KERNELS.filter((k) => state.active.has(k)), (d) => d);
      meanSel.exit().remove();

      for (const kernel of KERNELS) {
        const fit = fitKernel(kernel, X, Y);
        const opts = { kernel, l: fit.l, sigmaF: fit.sigmaF, sigmaN: state.sigmaN };
        const { mean, std } = GP.gpRegress(X, Y, XSTAR_GRID, opts);
        const atStar = GP.gpRegress(X, Y, [state.xstar], opts);

        rows.push({
          kernel,
          l: fit.l,
          mean: atStar.mean[0],
          lo: atStar.mean[0] - 1.96 * atStar.std[0],
          hi: atStar.mean[0] + 1.96 * atStar.std[0],
        });

        if (!state.active.has(kernel)) continue;

        const bandData = XSTAR_GRID.map((xi, i) => ({ x: xi, y0: mean[i] - 1.96 * std[i], y1: mean[i] + 1.96 * std[i] }));
        const meanData = XSTAR_GRID.map((xi, i) => ({ x: xi, y: mean[i] }));

        bandsG.selectAll(`path[data-k='${kernel}']`).data([kernel]).join(
          (enter) => enter.append("path").attr("data-k", kernel),
          (update) => update
        ).attr("d", areaGen(bandData)).attr("fill", COLORS[kernel]).attr("opacity", 0.12).attr("stroke", "none");

        meansG.selectAll(`path[data-k='${kernel}']`).data([kernel]).join(
          (enter) => enter.append("path").attr("data-k", kernel).attr("fill", "none"),
          (update) => update
        ).attr("d", lineGen(meanData)).attr("stroke", COLORS[kernel]).attr("stroke-width", 2.2);
      }

      // remove bands/means for deactivated kernels
      for (const kernel of KERNELS) {
        if (!state.active.has(kernel)) {
          bandsG.selectAll(`path[data-k='${kernel}']`).remove();
          meansG.selectAll(`path[data-k='${kernel}']`).remove();
        }
      }

      xstarLine.attr("x1", x(state.xstar)).attr("x2", x(state.xstar));
      xstarHandle.attr("cx", x(state.xstar));

      const tbody = d3s.select(root.querySelector(".kc-tbody"));
      const trSel = tbody.selectAll("tr").data(rows, (d) => d.kernel);
      trSel.exit().remove();
      const trEnter = trSel.enter().append("tr");
      trEnter.append("td").attr("class", "kc-td-kernel");
      trEnter.append("td").attr("class", "kc-td-l");
      trEnter.append("td").attr("class", "kc-td-mean");
      trEnter.append("td").attr("class", "kc-td-ci");
      const trAll = trEnter.merge(trSel);
      trAll.select(".kc-td-kernel").html((d) => `<span class="swatch" style="background:${COLORS[d.kernel]}"></span>${GP.KERNEL_LABELS[d.kernel]}`);
      trAll.select(".kc-td-l").text((d) => d.l.toFixed(2));
      trAll.select(".kc-td-mean").text((d) => d.mean.toFixed(2));
      trAll.select(".kc-td-ci").text((d) => `[${d.lo.toFixed(2)}, ${d.hi.toFixed(2)}]`);
    }

    function drawPoints() {
      const sel = pointsG.selectAll("circle").data(state.points);
      sel.exit().remove();
      sel.enter().append("circle").attr("r", 6.5).merge(sel)
        .attr("cx", (d) => x(d.x)).attr("cy", (d) => y(d.y))
        .call(d3s.drag().on("drag", function (event, d) {
          d.x = clamp(x.invert(event.x), -2, 1.5);
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

    xstarHandle.call(d3s.drag().on("drag", (event) => {
      state.xstar = clamp(x.invert(event.x), -2, 1.5);
      recompute();
    }));

    root.querySelectorAll(".kc-toggle").forEach((el) => {
      el.addEventListener("change", (e) => {
        const k = e.target.getAttribute("data-kernel");
        if (e.target.checked) state.active.add(k); else state.active.delete(k);
        recompute();
      });
    });

    drawPoints();
    recompute();
  }

  function init() {
    document.querySelectorAll("[data-widget='kernel-compare']").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
