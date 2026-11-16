/*!
 * w-nn.js — "Tiny neural-network trainer" widget (Part 6).
 * A tanh MLP trained in the browser (full-batch, hand-written backprop in
 * sm-core.js) with Adam or plain gradient descent, on raw ("physical") or
 * standardized data. A quarter of the points are held out for validation.
 * Notebook twin: Part 6 of on_surrogate_modeling.ipynb.
 */
(function () {
  "use strict";
  const SM = window.SM, UI = window.SMUI, d3 = window.d3;
  const MAXSTEPS = 30000;

  const TARGETS = {
    forrester: { label: "Forrester", f: SM.forrester, y: [-12, 20] },
    wave: { label: "two waves", f: (x) => Math.sin(4 * Math.PI * x) + 0.5 * x, y: [-1.8, 2.2] },
    step: { label: "smoothed step", f: (x) => Math.tanh(40 * (x - 0.55)), y: [-1.8, 1.8] },
  };

  UI.mountAll("nn-trainer", function (root) {
    root.classList.add("sm-widget");
    root.innerHTML = `
      <div class="sm-title">Interactive · training a tiny neural network</div>
      <div class="sm-controls">
        <label>Target <select class="nn-target">
          <option value="forrester">Forrester</option><option value="wave">two waves</option><option value="step">smoothed step</option></select></label>
        <label>Hidden layers <select class="nn-depth"><option value="1">1</option><option value="2" selected>2</option></select></label>
        <label>Width <input type="range" class="nn-width" min="2" max="48" step="1" value="16"><output></output></label>
        <label>Points <input type="range" class="nn-n" min="6" max="40" step="1" value="16"><output></output></label>
        <label>Noise <input type="range" class="nn-noise" min="0" max="0.3" step="0.01" value="0.05"><output></output></label>
      </div>
      <div class="sm-controls">
        <label>Optimizer <select class="nn-opt"><option value="adam">Adam</option><option value="gd">plain gradient descent</option></select></label>
        <label>Learning rate <input type="range" class="nn-lr" min="-4" max="-0.5" step="0.1" value="-2"><output></output></label>
        <label><input type="checkbox" class="nn-norm" checked> standardize x and y</label>
        <button class="nn-go">Train</button>
        <button class="nn-reset">Reset weights</button>
      </div>
      <div class="sm-row">
        <div class="sm-grow"><svg class="sm-svg nn-fit"></svg></div>
        <div class="sm-grow"><svg class="sm-svg nn-loss"></svg></div>
      </div>
      <div class="sm-legend">
        <span><i class="sm-key muted"></i>truth</span>
        <span><i class="sm-key dot"></i>training points</span>
        <span><i class="sm-key dot hollow"></i>validation points</span>
        <span><i class="sm-key blue"></i>network / validation loss</span>
        <span><i class="sm-key"></i>training loss</span>
      </div>
      <p class="sm-caption nn-msg"></p>`;

    const state = { target: "forrester", depth: 2, width: 16, n: 16, noise: 0.05, opt: "adam", lr: 0.01, norm: true, seed: 1 };
    let data, net, hist, running = false, best, visible = true, fitP = null, lossP = null;
    const xs = SM.linspace(0, 1, 240);

    function makeData() {
      const T = TARGETS[state.target], r = SM.rng(state.seed * 31 + state.n);
      const span = T.y[1] - T.y[0];
      const X = SM.doeLHS(state.n, 1, r).map((p) => p[0]);
      const Y = X.map((x) => T.f(x) + state.noise * span * 0.25 * SM.randn(r));
      const idx = SM.shuffle(X.map((_, i) => i), r);
      const nVal = Math.max(2, Math.round(state.n / 4));
      data = { X, Y, val: idx.slice(0, nVal), tr: idx.slice(nVal) };
      const xt = data.tr.map((i) => X[i]), yt = data.tr.map((i) => Y[i]);
      const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
      const sd = (a) => Math.sqrt(mean(a.map((v) => (v - mean(a)) ** 2))) || 1;
      data.xm = mean(xt); data.xsd = sd(xt); data.ym = mean(yt); data.ysd = sd(yt);
    }
    // raw mode: x in "physical units" (percent of span, 0..100), y as is
    const encX = (x) => (state.norm ? (x - data.xm) / data.xsd : 100 * x);
    const encY = (y) => (state.norm ? (y - data.ym) / data.ysd : y);
    const decY = (z) => (state.norm ? z * data.ysd + data.ym : z);

    function resetNet() {
      const sizes = state.depth === 2 ? [1, state.width, state.width, 1] : [1, state.width, 1];
      net = SM.mlp(sizes, SM.rng(state.seed + 1000 * state.width + state.depth));
      hist = []; best = { val: Infinity, step: 0 };
      drawFit(); drawLoss(); message();
    }
    const mse = (idx) => idx.reduce((s, i) => s + (decY(net.forward([encX(data.X[i])])) - data.Y[i]) ** 2, 0) / idx.length;

    function steps(k) {
      const Xe = data.X.map((x) => [encX(x)]), Ye = data.Y.map(encY);
      for (let s = 0; s < k; s++) {
        net.trainBatch(Xe, Ye, data.tr, state.lr, state.opt);
        const st = net.steps();
        if (st % 10 === 0 || st < 50) {
          const tr = mse(data.tr), va = mse(data.val);
          if (!Number.isFinite(tr)) { running = false; break; }
          hist.push([st, tr, va]);
          if (va < best.val) best = { val: va, step: st };
        }
      }
    }

    function drawFit() {
      const T = TARGETS[state.target];
      if (!fitP || fitP.target !== state.target) {
        const f = UI.frame(root.querySelector(".nn-fit"), {
          width: 400, height: 270, xDomain: [0, 1], yDomain: T.y, xLabel: state.norm ? "x" : "x  (fed to the net as 100·x when not standardized)", yLabel: "y",
          margin: { top: 20, right: 10, bottom: 38, left: 40 },
        });
        fitP = { f, target: state.target, deco: f.body.append("g").attr("pointer-events", "none") };
        fitP.deco.append("path").attr("class", "sm-truth").attr("d", UI.linePath(xs, xs.map(T.f), f));
        fitP.pred = fitP.deco.append("path").attr("class", "sm-line blue");
        fitP.pts = fitP.deco.append("g");
        fitP.title = f.g.append("text").attr("class", "sm-plot-title").attr("x", 0).attr("y", -6);
      }
      const f = fitP.f;
      fitP.pred.attr("d", UI.linePath(xs, xs.map((x) => SM.clamp(decY(net.forward([encX(x)])), T.y[0] - 50, T.y[1] + 50)), f));
      const valSet = new Set(data.val);
      fitP.pts.selectAll("circle").data(data.X.map((x, i) => [x, data.Y[i], valSet.has(i)])).join("circle")
        .attr("class", (d) => (d[2] ? "sm-pt hollow" : "sm-pt")).attr("r", 4.5)
        .attr("cx", (d) => f.x(d[0])).attr("cy", (d) => f.y(d[1]));
      fitP.title.text(`${net.nParams} weights, ${data.tr.length} training points`);
    }

    function drawLoss() {
      const finite = hist.flatMap((h) => [h[1], h[2]]).filter((v) => Number.isFinite(v) && v > 0);
      const lo = finite.length ? Math.max(1e-7, d3.min(finite) * 0.5) : 1e-3;
      const hi = finite.length ? d3.max(finite) * 2 : 10;
      const last = hist.length ? hist[hist.length - 1][0] : 100;
      const g = UI.frame(root.querySelector(".nn-loss"), {
        width: 400, height: 270, xDomain: [1, Math.max(100, last)], xLog: true, yDomain: [lo, Math.max(hi, lo * 10)], yLog: true,
        xLabel: "training step", yLabel: "mean squared error", title: "learning curves",
        margin: { top: 20, right: 10, bottom: 38, left: 50 },
      });
      if (!hist.length) return;
      const line = (k) => d3.line().defined((h) => Number.isFinite(h[k]) && h[k] > 0).x((h) => g.x(Math.max(1, h[0]))).y((h) => g.y(h[k]))(hist);
      g.body.append("path").attr("class", "sm-line thin").attr("stroke", "#0b0b0b").attr("d", line(1));
      g.body.append("path").attr("class", "sm-line blue").attr("d", line(2));
      if (best.step > 0) g.body.append("line").attr("class", "sm-query").attr("x1", g.x(best.step)).attr("x2", g.x(best.step)).attr("y1", 0).attr("y2", g.ih);
    }

    function message() {
      const h = hist[hist.length - 1];
      let m = h ? `Step ${h[0]}: training MSE <b>${UI.fmt(h[1])}</b>, validation MSE <b>${UI.fmt(h[2])}</b>; ` +
        `lowest validation error at step ${best.step} (dashed line) — that is where early stopping would keep the weights.` : "Press Train.";
      if (!state.norm && state.opt === "gd" && h && h[0] > 1500) m += " Raw inputs with plain gradient descent: most tanh units are saturated and learning stalls — tick “standardize”.";
      if (h && !Number.isFinite(h[1])) m = "The loss diverged: lower the learning rate and reset.";
      root.querySelector(".nn-msg").innerHTML = m;
    }

    function loop() {
      if (!running) return;
      if (visible) {
        steps(state.opt === "gd" ? 60 : 25);
        drawFit(); drawLoss(); message();
        if (net.steps() >= MAXSTEPS) setRunning(false);
      }
      requestAnimationFrame(loop);
    }
    function setRunning(on) {
      running = on;
      root.querySelector(".nn-go").textContent = on ? "Pause" : "Train";
      if (on) requestAnimationFrame(loop);
    }

    const restart = (newData) => { if (newData) makeData(); fitP = null; resetNet(); };
    root.querySelector(".nn-target").addEventListener("change", (e) => { state.target = e.target.value; restart(true); });
    root.querySelector(".nn-depth").addEventListener("change", (e) => { state.depth = +e.target.value; restart(false); });
    root.querySelector(".nn-opt").addEventListener("change", (e) => {
      state.opt = e.target.value; lrSlider.set(state.opt === "gd" ? -2 : -2); state.lr = 0.01; restart(false);
    });
    root.querySelector(".nn-norm").addEventListener("change", (e) => { state.norm = e.target.checked; restart(false); });
    UI.slider(root, ".nn-width", (v) => { state.width = v; restart(false); });
    UI.slider(root, ".nn-n", (v) => { state.n = v; restart(true); });
    UI.slider(root, ".nn-noise", (v) => { state.noise = v; restart(true); }, (v) => v.toFixed(2));
    const lrSlider = UI.slider(root, ".nn-lr", (v) => { state.lr = 10 ** v; }, (v) => (10 ** v).toExponential(0));
    root.querySelector(".nn-go").addEventListener("click", () => setRunning(!running));
    root.querySelector(".nn-reset").addEventListener("click", () => { state.seed++; restart(false); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(root);
    }
    makeData(); resetNet();
  });
})();
