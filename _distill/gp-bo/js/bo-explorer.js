/*!
 * bo-explorer.js — "Bayesian Optimization / EGO Explorer" interactive figure.
 * Same test problem as the BO_MED26 slides (Part 1, Efficient Global
 * Optimization slide): minimize f(x) = (6x-2)^2 sin(12x-4) on [0,1] with a
 * tiny evaluation budget. Click to sample the "expensive simulation" by hand,
 * or let the widget propose the next point by maximizing an acquisition
 * function (Expected Improvement / Probability of Improvement) — this is
 * literally one iteration of the SEGOMOE / EGO loop from the talk.
 */
(function () {
  "use strict";

  function trueFn(x) {
    return Math.pow(6 * x - 2, 2) * Math.sin(12 * x - 4);
  }

  function mount(root) {
    const d3s = window.d3;
    const GP = window.GPCore;

    const state = {
      points: [],
      acquisition: "ei",
      showTruth: true,
      history: [], // best-so-far per iteration
      l: 0.15,
      sigmaF: 6,
      sigmaN: 1e-3,
    };

    const width = 660, topH = 260, botH = 130;
    const margin = { top: 14, right: 20, bottom: 28, left: 42 };
    const innerW = width - margin.left - margin.right;
    const innerTopH = topH - margin.top - margin.bottom;
    const innerBotH = botH - 18 - 22;

    root.innerHTML = `
      <div class="gpw-controls">
        <label>Acquisition
          <select class="boe-acq">
            <option value="ei">Expected Improvement</option>
            <option value="pi">Probability of Improvement</option>
          </select>
        </label>
        <label><input type="checkbox" class="boe-truth" checked> show true f(x)</label>
        <button class="boe-seed" type="button">Seed 3-point DOE</button>
        <button class="boe-suggest" type="button">Suggest next point (max acquisition)</button>
        <button class="boe-reset" type="button">Reset</button>
      </div>
      <svg class="boe-svg" viewBox="0 0 ${width} ${topH + botH + 12}" role="img" aria-label="Interactive Bayesian optimization / EGO plot"></svg>
      <p class="gpw-caption">Click the top panel to evaluate the "expensive" black-box at that x (a DOE point) ·
        the bottom panel is the acquisition function that EGO/SEGOMOE maximizes to pick the next point.
        Iterations: <span class="boe-iters">0</span> · best f(x) so far: <span class="boe-best">–</span></p>
    `;

    const svg = d3s.select(root.querySelector(".boe-svg"));
    const gTop = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const gBot = svg.append("g").attr("transform", `translate(${margin.left},${topH + 18})`);

    const x = d3s.scaleLinear().domain([0, 1]).range([0, innerW]);
    const yTop = d3s.scaleLinear().domain([-10, 20]).range([innerTopH, 0]);

    gTop.append("g").attr("class", "gpw-axis").attr("transform", `translate(0,${innerTopH})`).call(d3s.axisBottom(x).ticks(6));
    gTop.append("g").attr("class", "gpw-axis").call(d3s.axisLeft(yTop).ticks(5));
    gTop.append("text").attr("class", "gpw-axislabel").attr("x", innerW).attr("y", -2).attr("text-anchor", "end").text("f(x)  (top: objective + GP surrogate)");

    const gBotAxisY = d3s.scaleLinear().domain([0, 1]).range([innerBotH, 0]);
    gBot.append("g").attr("class", "gpw-axis").attr("transform", `translate(0,${innerBotH})`).call(d3s.axisBottom(x).ticks(6));
    gBot.append("text").attr("class", "gpw-axislabel").attr("x", innerW).attr("y", -2).attr("text-anchor", "end").text("acquisition (bottom, normalized)");

    const truthPath = gTop.append("path").attr("class", "boe-truth").attr("fill", "none");
    const bandPath = gTop.append("path").attr("class", "gpw-band");
    const meanPath = gTop.append("path").attr("class", "gpw-mean").attr("fill", "none");
    const pointsG = gTop.append("g");
    const nextMarker = gTop.append("line").attr("class", "boe-next").style("display", "none");

    const acqPath = gBot.append("path").attr("class", "boe-acq-path").attr("fill", "none");
    const acqFill = gBot.append("path").attr("class", "boe-acq-fill");

    const areaGen = d3s.area().x((d) => x(d.x)).y0((d) => yTop(d.y0)).y1((d) => yTop(d.y1)).curve(d3s.curveBasis);
    const lineGen = d3s.line().x((d) => x(d.x)).y((d) => yTop(d.y)).curve(d3s.curveBasis);
    const truthLineGen = d3s.line().x((d) => x(d.x)).y((d) => yTop(d.y)).curve(d3s.curveBasis);
    const acqLineGen = d3s.line().x((d) => x(d.x)).y((d) => gBotAxisY(d.y)).curve(d3s.curveBasis);
    const acqAreaGen = d3s.area().x((d) => x(d.x)).y0(innerBotH).y1((d) => gBotAxisY(d.y)).curve(d3s.curveBasis);

    const XSTAR = GP.linspace(0, 1, 200);
    truthPath.attr("d", truthLineGen(XSTAR.map((xi) => ({ x: xi, y: trueFn(xi) }))));

    function bestSoFar() {
      if (state.points.length === 0) return null;
      return Math.min(...state.points.map((p) => p.y));
    }

    function recompute() {
      truthPath.style("display", state.showTruth ? null : "none");

      if (state.points.length < 2) {
        bandPath.attr("d", null);
        meanPath.attr("d", null);
        acqPath.attr("d", null);
        acqFill.attr("d", null);
        nextMarker.style("display", "none");
        d3s.select(root.querySelector(".boe-best")).text(state.points.length ? state.points[0].y.toFixed(3) : "–");
        d3s.select(root.querySelector(".boe-iters")).text(Math.max(0, state.points.length));
        return;
      }

      const X = state.points.map((p) => p.x);
      const Y = state.points.map((p) => p.y);
      const { mean, std } = GP.gpRegress(X, Y, XSTAR, { kernel: "matern52", l: state.l, sigmaF: state.sigmaF, sigmaN: state.sigmaN });

      const bandData = XSTAR.map((xi, i) => ({ x: xi, y0: mean[i] - 2 * std[i], y1: mean[i] + 2 * std[i] }));
      bandPath.attr("d", areaGen(bandData));
      meanPath.attr("d", lineGen(XSTAR.map((xi, i) => ({ x: xi, y: mean[i] }))));

      const yMin = bestSoFar();
      const acq = state.acquisition === "ei"
        ? GP.expectedImprovement(mean, std, yMin, 0.01)
        : GP.probabilityOfImprovement(mean, std, yMin, 0.01);
      const maxAcq = Math.max(...acq, 1e-9);
      const acqNorm = acq.map((a) => a / maxAcq);
      const acqData = XSTAR.map((xi, i) => ({ x: xi, y: acqNorm[i] }));
      acqPath.attr("d", acqLineGen(acqData));
      acqFill.attr("d", acqAreaGen(acqData));

      const bestIdx = GP.argmax(acq);
      nextMarker
        .style("display", null)
        .attr("x1", x(XSTAR[bestIdx])).attr("x2", x(XSTAR[bestIdx]))
        .attr("y1", 0).attr("y2", innerTopH);

      d3s.select(root.querySelector(".boe-best")).text(yMin.toFixed(3));
      d3s.select(root.querySelector(".boe-iters")).text(state.points.length);
    }

    function drawPoints() {
      const sel = pointsG.selectAll("circle").data(state.points);
      sel.exit().remove();
      sel.enter().append("circle").attr("r", 5.5).merge(sel)
        .attr("cx", (d) => x(d.x)).attr("cy", (d) => clampY(yTop(d.y)));
    }
    function clampY(v) { return Math.max(0, Math.min(innerTopH, v)); }

    gTop.insert("rect", ":first-child").attr("width", innerW).attr("height", innerTopH).attr("fill", "transparent")
      .on("click", function (event) {
        const [mx] = d3s.pointer(event);
        const xi = Math.max(0, Math.min(1, x.invert(mx)));
        addSample(xi);
      });

    function addSample(xi) {
      state.points.push({ x: xi, y: trueFn(xi) });
      drawPoints();
      recompute();
    }

    root.querySelector(".boe-acq").addEventListener("change", (e) => { state.acquisition = e.target.value; recompute(); });
    root.querySelector(".boe-truth").addEventListener("change", (e) => { state.showTruth = e.target.checked; recompute(); });
    root.querySelector(".boe-seed").addEventListener("click", () => {
      state.points = [0.05, 0.5, 0.95].map((xi) => ({ x: xi, y: trueFn(xi) }));
      drawPoints();
      recompute();
    });
    root.querySelector(".boe-reset").addEventListener("click", () => {
      state.points = [];
      drawPoints();
      recompute();
    });
    root.querySelector(".boe-suggest").addEventListener("click", () => {
      if (state.points.length < 2) return;
      const X = state.points.map((p) => p.x);
      const Y = state.points.map((p) => p.y);
      const { mean, std } = GP.gpRegress(X, Y, XSTAR, { kernel: "matern52", l: state.l, sigmaF: state.sigmaF, sigmaN: state.sigmaN });
      const yMin = bestSoFar();
      const acq = state.acquisition === "ei"
        ? GP.expectedImprovement(mean, std, yMin, 0.01)
        : GP.probabilityOfImprovement(mean, std, yMin, 0.01);
      const bestIdx = GP.argmax(acq);
      addSample(XSTAR[bestIdx]);
    });

    drawPoints();
    recompute();
  }

  function init() {
    document.querySelectorAll("[data-widget='bo-explorer']").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
