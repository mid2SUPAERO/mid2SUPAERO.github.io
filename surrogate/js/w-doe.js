/*!
 * w-doe.js — "Design of experiments" widget (Part 2).
 * Compare grid, random, Latin hypercube, maximin LHS and Halton designs in
 * [0,1]^2: the points, their projections on each axis (rugs), the largest
 * empty circle, and three space-filling scores.
 * Notebook twin: Part 2 of on_surrogate_modeling.ipynb.
 */
(function () {
  "use strict";
  const SM = window.SM, UI = window.SMUI, d3 = window.d3;

  UI.mountAll("doe-sampler", function (root) {
    root.classList.add("sm-widget");
    root.innerHTML = `
      <div class="sm-title">Interactive · sampling the design space</div>
      <div class="sm-controls">
        <label>Design
          <select class="doe-method">
            <option value="grid">Grid (full factorial)</option>
            <option value="random">Random</option>
            <option value="lhs">Latin hypercube</option>
            <option value="maximin" selected>Maximin Latin hypercube</option>
            <option value="halton">Halton sequence</option>
          </select></label>
        <label>Points <input type="range" class="doe-n" min="4" max="64" step="1" value="16"><output></output></label>
        <label><input type="checkbox" class="doe-strata" checked> LHS strata</label>
        <label><input type="checkbox" class="doe-hole" checked> largest gap</label>
        <button class="doe-resample">Resample</button>
      </div>
      <div class="sm-row">
        <div class="sm-grow" style="max-width:420px"><svg class="sm-svg doe-svg"></svg></div>
        <div class="sm-side">
          <table class="sm-stats">
            <tr><th>score</th><th class="num">value</th></tr>
            <tr><td>points actually used</td><td class="num doe-used"></td></tr>
            <tr><td>min. distance between points <span class="sm-note-inline">(higher is better)</span></td><td class="num doe-dmin"></td></tr>
            <tr><td>largest gap radius <span class="sm-note-inline">(lower is better)</span></td><td class="num doe-fill"></td></tr>
            <tr><td>distinct values of x₁</td><td class="num doe-lx"></td></tr>
            <tr><td>distinct values of x₂</td><td class="num doe-ly"></td></tr>
          </table>
          <p class="sm-caption doe-msg"></p>
        </div>
      </div>
      <p class="sm-caption">Ticks on the bottom and left edges are the projections of the design on each input:
        if one input turns out not to matter, that is all the information you are left with.
        A grid wastes runs by repeating the same values; a Latin hypercube never does.</p>`;

    const W = 400, H = 400;
    const state = { method: "maximin", n: 16, seed: 1 };
    let P = [];

    function build() {
      const r = SM.rng(state.seed * 7919 + state.n);
      if (state.method === "grid") P = SM.doeGrid(state.n, 2);
      else if (state.method === "random") P = SM.doeRandom(state.n, 2, r);
      else if (state.method === "lhs") P = SM.doeLHS(state.n, 2, r);
      else if (state.method === "maximin") P = SM.doeLHSMaximin(state.n, 2, r, 300);
      else P = SM.doeHalton(state.n, 2, r);
      draw();
    }

    function distinct(vals) {
      return new Set(vals.map((v) => v.toFixed(9))).size;
    }

    function draw() {
      const f = UI.frame(root.querySelector(".doe-svg"), {
        width: W, height: H, xDomain: [0, 1], yDomain: [0, 1], xLabel: "x₁", yLabel: "x₂",
        margin: { top: 10, right: 10, bottom: 38, left: 42 }, xTicks: 5, yTicks: 5,
      });
      const deco = f.body.append("g").attr("pointer-events", "none");
      const n = P.length;
      if (root.querySelector(".doe-strata").checked) {
        for (let k = 1; k < n; k++) {
          deco.append("line").attr("class", "sm-snap").attr("x1", f.x(k / n)).attr("x2", f.x(k / n)).attr("y1", 0).attr("y2", f.ih);
          deco.append("line").attr("class", "sm-snap").attr("y1", f.y(k / n)).attr("y2", f.y(k / n)).attr("x1", 0).attr("x2", f.iw);
        }
      }
      const fill = SM.fillDistance2D(P, 61);
      if (root.querySelector(".doe-hole").checked) {
        deco.append("circle").attr("class", "sm-hole")
          .attr("cx", f.x(fill.at[0])).attr("cy", f.y(fill.at[1]))
          .attr("r", Math.abs(f.x(fill.radius) - f.x(0)));
      }
      // projections (rugs)
      deco.selectAll(".rx").data(P).join("line").attr("class", "sm-rug")
        .attr("x1", (p) => f.x(p[0])).attr("x2", (p) => f.x(p[0])).attr("y1", f.ih).attr("y2", f.ih - 9);
      deco.selectAll(".ry").data(P).join("line").attr("class", "sm-rug")
        .attr("y1", (p) => f.y(p[1])).attr("y2", (p) => f.y(p[1])).attr("x1", 0).attr("x2", 9);
      f.body.append("g").selectAll("circle").data(P).join("circle").attr("class", "sm-pt")
        .attr("r", n > 40 ? 3.5 : 5).attr("cx", (p) => f.x(p[0])).attr("cy", (p) => f.y(p[1]));

      const dmin = SM.minDist(P);
      root.querySelector(".doe-used").textContent = n;
      root.querySelector(".doe-dmin").textContent = dmin.toFixed(3);
      root.querySelector(".doe-fill").textContent = fill.radius.toFixed(3);
      root.querySelector(".doe-lx").textContent = distinct(P.map((p) => p[0]));
      root.querySelector(".doe-ly").textContent = distinct(P.map((p) => p[1]));
      const msg = {
        grid: n < state.n
          ? `A 2-D grid needs a perfect square: only ${n} of the ${state.n} requested runs fit. In d dimensions a k-level grid costs kᵈ runs.`
          : "Evenly spread, but only √n distinct values per input.",
        random: "Random points cluster and leave holes — press Resample a few times and watch the gap and the minimum distance jump around.",
        lhs: "Exactly one point per row and per column of strata: every input gets n distinct values. The pairing is random, so points can still be close.",
        maximin: "Among 300 random Latin hypercubes, the one whose closest pair is farthest apart: stratified and well spread.",
        halton: "A low-discrepancy sequence: deterministic (here randomly shifted), and you can add points without redesigning.",
      }[state.method];
      root.querySelector(".doe-msg").textContent = msg;
    }

    root.querySelector(".doe-method").addEventListener("change", (e) => { state.method = e.target.value; build(); });
    UI.slider(root, ".doe-n", (v) => { state.n = v; build(); });
    root.querySelector(".doe-strata").addEventListener("change", draw);
    root.querySelector(".doe-hole").addEventListener("change", draw);
    root.querySelector(".doe-resample").addEventListener("click", () => { state.seed++; build(); });
    build();
  });
})();
