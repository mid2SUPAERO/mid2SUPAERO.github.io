/*!
 * w-overfit.js — "Overfitting and cross-validation" widget (Part 3).
 * Least-squares polynomial (Legendre basis) fitted to noisy samples of the
 * Forrester function. Right panel: training, 5-fold cross-validation and true
 * test RMSE against the polynomial degree. Points can be dragged vertically.
 * Notebook twin: Part 3 of on_surrogate_modeling.ipynb.
 */
(function () {
  "use strict";
  const SM = window.SM, UI = window.SMUI, d3 = window.d3;
  const MAXDEG = 12;

  UI.mountAll("overfit-cv", function (root) {
    root.classList.add("sm-widget");
    root.innerHTML = `
      <div class="sm-title">Interactive · overfitting and cross-validation</div>
      <div class="sm-controls">
        <label>Degree <input type="range" class="ov-deg" min="0" max="${MAXDEG}" step="1" value="4"><output></output></label>
        <label>Training points <input type="range" class="ov-n" min="6" max="40" step="1" value="15"><output></output></label>
        <label>Noise σ <input type="range" class="ov-noise" min="0" max="3" step="0.1" value="1"><output></output></label>
        <button class="ov-resample">New sample</button>
        <button class="ov-best">Use the CV choice</button>
      </div>
      <div class="sm-row">
        <div class="sm-grow"><svg class="sm-svg ov-fit"></svg></div>
        <div class="sm-grow"><svg class="sm-svg ov-err"></svg></div>
      </div>
      <div class="sm-legend">
        <span><i class="sm-key muted"></i>truth</span>
        <span><i class="sm-key dot"></i>noisy data (drag up/down)</span>
        <span><i class="sm-key blue"></i>fit / 5-fold CV error</span>
        <span><i class="sm-key"></i>training error</span>
        <span><i class="sm-key orange"></i>test error (1 000 unseen points)</span>
      </div>
      <p class="sm-caption ov-msg"></p>`;

    const state = { deg: 4, n: 15, noise: 1, seed: 3 };
    let X = [], Y = [], eps = [], left = null;
    const xt = SM.linspace(0, 1, 1000), yt = xt.map(SM.forrester);
    const xs = SM.linspace(0, 1, 300);

    function sample() {
      const r = SM.rng(state.seed * 104729 + state.n);
      X = SM.doeLHS(state.n, 1, r).map((p) => p[0]).sort((a, b) => a - b);
      eps = X.map(() => SM.randn(r));
      Y = X.map((x, i) => SM.forrester(x) + state.noise * eps[i]);
      update();
    }
    const rmse = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);

    function errorCurves() {
      const folds = SM.kfold(X.length, 5, SM.rng(state.seed + 17));
      const out = [];
      for (let d = 0; d <= MAXDEG; d++) {
        const fit = SM.polyFit1D(X, Y, d);
        const train = X.length > d ? rmse(fit.predict(X), Y) : NaN;
        const test = rmse(fit.predict(xt), yt);
        let se = 0, cnt = 0, ok = true;
        for (const f of folds) {
          const inF = new Set(f);
          const Xa = X.filter((_, i) => !inF.has(i)), Ya = Y.filter((_, i) => !inF.has(i));
          if (Xa.length <= d) { ok = false; break; }
          const g = SM.polyFit1D(Xa, Ya, d);
          const p = g.predict(f.map((i) => X[i]));
          f.forEach((i, k) => { se += (p[k] - Y[i]) ** 2; cnt++; });
        }
        out.push({ d, train, test, cv: ok ? Math.sqrt(se / cnt) : NaN });
      }
      return out;
    }

    function update() {
      const errs = errorCurves();
      const valid = errs.filter((e) => Number.isFinite(e.cv));
      const best = valid.reduce((a, b) => (b.cv < a.cv ? b : a), valid[0]);
      state.bestDeg = best.d;
      const fit = SM.polyFit1D(X, Y, state.deg);

      // ---- left: data and fit (frame built once; only marks move, so drags survive)
      if (!left) {
        const f = UI.frame(root.querySelector(".ov-fit"), {
          width: 400, height: 280, xDomain: [0, 1], yDomain: [-12, 22], xLabel: "x", yLabel: "y",
          margin: { top: 20, right: 10, bottom: 38, left: 40 },
        });
        const deco = f.body.append("g").attr("pointer-events", "none");
        deco.append("path").attr("class", "sm-truth").attr("d", UI.linePath(xs, xs.map(SM.forrester), f));
        left = { f, fitPath: deco.append("path").attr("class", "sm-line blue"), pts: f.body.append("g"),
                 title: f.g.append("text").attr("class", "sm-plot-title").attr("x", 0).attr("y", -6) };
      }
      const f = left.f;
      left.title.text(`degree ${state.deg} polynomial, ${state.deg + 1} coefficients`);
      left.fitPath.attr("d", UI.linePath(xs, fit.predict(xs), f));
      left.pts.selectAll("circle").data(X).join("circle")
        .attr("class", "sm-pt drag").attr("r", 5.5)
        .attr("cx", (x) => f.x(x)).attr("cy", (x, i) => f.y(Y[i]))
        .call(d3.drag().on("drag", function (event, x) {
          const i = X.indexOf(x);
          Y[i] = SM.clamp(f.y.invert(event.y), -12, 22);
          eps[i] = state.noise > 0 ? (Y[i] - SM.forrester(x)) / state.noise : 0;
          update();
        }));

      // ---- right: error vs degree
      const finite = errs.flatMap((e) => [e.train, e.cv, e.test]).filter((v) => Number.isFinite(v) && v > 0);
      const lo = Math.max(1e-3, d3.min(finite) * 0.6), hi = Math.min(1e4, d3.max(finite) * 1.6);
      const g = UI.frame(root.querySelector(".ov-err"), {
        width: 400, height: 280, xDomain: [-0.3, MAXDEG + 0.3], yDomain: [lo, hi], yLog: true,
        xLabel: "polynomial degree", yLabel: "RMSE", title: "error against degree",
        xTickValues: d3.range(0, MAXDEG + 1, 2), margin: { top: 20, right: 10, bottom: 38, left: 46 },
      });
      const gd = g.body.append("g").attr("pointer-events", "none");
      gd.append("line").attr("class", "sm-query").attr("x1", g.x(state.deg)).attr("x2", g.x(state.deg)).attr("y1", 0).attr("y2", g.ih);
      const series = [["train", "sm-line thin", "#0b0b0b"], ["cv", "sm-line blue", "#2a78d6"], ["test", "sm-line orange", "#eb6834"]];
      for (const [key, cls, col] of series) {
        const ok = errs.filter((e) => Number.isFinite(e[key]) && e[key] > 0);
        gd.append("path").attr("class", cls).attr("stroke", col).attr("d", d3.line().x((e) => g.x(e.d)).y((e) => g.y(SM.clamp(e[key], lo, hi)))(ok));
        gd.selectAll(null).data(ok).join("circle").attr("r", 2.6).attr("fill", col)
          .attr("cx", (e) => g.x(e.d)).attr("cy", (e) => g.y(SM.clamp(e[key], lo, hi)));
      }
      gd.append("circle").attr("r", 7).attr("fill", "none").attr("stroke", "#2a78d6").attr("stroke-width", 1.6)
        .attr("cx", g.x(best.d)).attr("cy", g.y(best.cv));
      // click anywhere in the error plot to pick a degree
      g.body.append("rect").attr("width", g.iw).attr("height", g.ih).attr("fill", "transparent").style("cursor", "pointer")
        .lower().on("click", (event) => {
          const [mx] = d3.pointer(event);
          setDeg(Math.round(SM.clamp(g.x.invert(mx), 0, MAXDEG)));
        });

      const cur = errs[state.deg];
      const fmt = (v) => (Number.isFinite(v) ? UI.fmt(v, 2) : "n/a");
      root.querySelector(".ov-msg").innerHTML =
        `Degree ${state.deg}: training RMSE <b>${fmt(cur.train)}</b>, 5-fold CV RMSE <b>${fmt(cur.cv)}</b>, ` +
        `test RMSE <b>${fmt(cur.test)}</b>. Cross-validation picks degree <b>${best.d}</b> (circled) ` +
        `using only the ${X.length} training points; the orange curve is what it is trying to estimate.` +
        (state.deg + 1 > X.length ? " <b>More coefficients than points:</b> the fit is not unique." : "");
    }

    let degSlider;
    function setDeg(d) { state.deg = d; degSlider.set(d); update(); }
    degSlider = UI.slider(root, ".ov-deg", (v) => { state.deg = v; update(); });
    UI.slider(root, ".ov-n", (v) => { state.n = v; sample(); });
    UI.slider(root, ".ov-noise", (v) => {
      state.noise = v; Y = X.map((x, i) => SM.forrester(x) + v * eps[i]); update();
    }, (v) => v.toFixed(1));
    root.querySelector(".ov-resample").addEventListener("click", () => { state.seed++; sample(); });
    root.querySelector(".ov-best").addEventListener("click", () => setDeg(state.bestDeg));
    sample();
  });
})();
