/*!
 * w-pod.js — "POD explorer" widget (Part 5).
 * Two one-parameter families of 1-D fields: a pulse spreading by diffusion
 * (parameter: time t) and a narrow bump moving along the domain (parameter:
 * position c). Snapshots at training parameters -> POD by the method of
 * snapshots -> best K-mode approximation of an unseen field.
 * Notebook twin: Part 5 of on_surrogate_modeling.ipynb.
 */
(function () {
  "use strict";
  const SM = window.SM, UI = window.SMUI, d3 = window.d3;
  const M = 120, NTERMS = 300, KMAX = 20;
  const xf = SM.linspace(0, 1, M);

  // diffusion of a square pulse on [0.3, 0.6], zero at both ends (sine series)
  const bk = Array.from({ length: NTERMS }, (_, j) => {
    const k = j + 1;
    return (2 / (k * Math.PI)) * (Math.cos(k * Math.PI * 0.3) - Math.cos(k * Math.PI * 0.6));
  });
  const sinTab = xf.map((x) => Float64Array.from({ length: NTERMS }, (_, j) => Math.sin((j + 1) * Math.PI * x)));
  function diffusion(t) {
    const w = bk.map((b, j) => b * Math.exp(-(((j + 1) * Math.PI) ** 2) * t));
    return xf.map((_, i) => { let s = 0; const row = sinTab[i]; for (let j = 0; j < NTERMS; j++) s += w[j] * row[j]; return s; });
  }
  const transport = (c) => xf.map((x) => Math.exp(-((x - c) ** 2) / (2 * 0.03 * 0.03)));

  const FAMILIES = {
    diffusion: {
      label: "diffusion", f: diffusion, param: "time t",
      // log-spaced training times; the slider runs on log10(t)
      train: (n) => SM.linspace(Math.log10(1e-3), Math.log10(3e-2), n).map((v) => 10 ** v),
      slider: { min: -3, max: Math.log10(3e-2), step: 0.01, value: -2.2, toParam: (v) => 10 ** v, fmt: (v) => (10 ** v).toExponential(1) },
    },
    transport: {
      label: "transport", f: transport, param: "position c",
      train: (n) => SM.linspace(0.15, 0.85, n),
      slider: { min: 0.15, max: 0.85, step: 0.001, value: 0.433, toParam: (v) => v, fmt: (v) => v.toFixed(3) },
    },
  };

  UI.mountAll("pod-explorer", function (root) {
    root.classList.add("sm-widget");
    root.innerHTML = `
      <div class="sm-title">Interactive · compressing fields with POD</div>
      <div class="sm-controls">
        <span class="sm-radio">Family
          <label><input type="radio" name="pod-fam-${Math.random().toString(36).slice(2)}" value="diffusion" checked> diffusion</label>
          <label><input type="radio" name="pod-fam" value="transport"> transport</label></span>
        <label>Modes K <input type="range" class="pod-k" min="1" max="${KMAX}" step="1" value="3"><output></output></label>
        <label>Snapshots <input type="range" class="pod-n" min="8" max="60" step="1" value="40"><output></output></label>
        <label><span class="pod-plabel">unseen t</span> <input type="range" class="pod-mu"><output></output></label>
      </div>
      <div class="sm-row">
        <div class="sm-grow"><svg class="sm-svg pod-field"></svg></div>
        <div class="sm-grow"><svg class="sm-svg pod-energy"></svg></div>
      </div>
      <div class="sm-row">
        <div class="sm-grow"><svg class="sm-svg pod-modes"></svg></div>
        <div class="sm-grow">
          <table class="sm-stats">
            <tr><td>energy kept by K modes</td><td class="num pod-e"></td></tr>
            <tr><td>modes needed for 99 %</td><td class="num pod-k99"></td></tr>
            <tr><td>error on the unseen field (relative L₂)</td><td class="num pod-err"></td></tr>
            <tr><td>error of the mean field alone</td><td class="num pod-err0"></td></tr>
          </table>
        </div>
      </div>
      <div class="sm-legend">
        <span><i class="sm-key muted"></i>unseen field (not in the snapshots)</span>
        <span><i class="sm-key blue"></i>best approximation with K modes</span>
        <span><i class="sm-key yellow"></i>mean of the snapshots</span>
      </div>`;
    // give both radios the same (unique) group name
    const radios = root.querySelectorAll("input[type=radio]");
    radios.forEach((r) => (r.name = radios[0].name));

    const state = { fam: "diffusion", K: 3, n: 40 };
    let pod = null, snaps = null, muSlider = null;

    function rebuild() {
      const F = FAMILIES[state.fam];
      snaps = F.train(state.n).map(F.f);
      pod = SM.pod(snaps);
      const sl = root.querySelector(".pod-mu");
      Object.assign(sl, { min: F.slider.min, max: F.slider.max, step: F.slider.step });
      sl.value = F.slider.value;
      root.querySelector(".pod-plabel").textContent = "unseen " + (state.fam === "diffusion" ? "t" : "c");
      muSlider.set(+sl.value);
      update();
    }

    function update() {
      const F = FAMILIES[state.fam];
      const mu = F.slider.toParam(+root.querySelector(".pod-mu").value);
      const u = F.f(mu);
      const K = Math.min(state.K, pod.modes.length);
      const c = u.map((v, i) => v - pod.mean[i]);
      const approx = Float64Array.from(pod.mean);
      for (let k = 0; k < K; k++) {
        let a = 0; for (let i = 0; i < M; i++) a += pod.modes[k][i] * c[i];
        for (let i = 0; i < M; i++) approx[i] += a * pod.modes[k][i];
      }
      const norm = Math.sqrt(u.reduce((s, v) => s + v * v, 0));
      const err = Math.sqrt(u.reduce((s, v, i) => s + (v - approx[i]) ** 2, 0)) / norm;
      const err0 = Math.sqrt(u.reduce((s, v, i) => s + (v - pod.mean[i]) ** 2, 0)) / norm;

      // ---- field panel
      const f = UI.frame(root.querySelector(".pod-field"), {
        width: 400, height: 250, xDomain: [0, 1], yDomain: [-0.25, 1.15], xLabel: "x", yLabel: "u(x)",
        title: `${F.label}: unseen ${state.fam === "diffusion" ? "t" : "c"} = ${F.slider.fmt(+root.querySelector(".pod-mu").value)}`,
        margin: { top: 20, right: 10, bottom: 38, left: 40 },
      });
      const deco = f.body.append("g").attr("pointer-events", "none");
      snaps.forEach((s, j) => { if (j % Math.ceil(snaps.length / 8) === 0) deco.append("path").attr("d", UI.linePath(xf, s, f)).attr("fill", "none").attr("stroke", "#c3c2b7").attr("stroke-width", 0.8); });
      deco.append("path").attr("class", "sm-line yellow thin").attr("d", UI.linePath(xf, Array.from(pod.mean), f));
      deco.append("path").attr("class", "sm-truth").attr("d", UI.linePath(xf, u, f));
      deco.append("path").attr("class", "sm-line blue").attr("d", UI.linePath(xf, Array.from(approx), f));

      // ---- energy panel: normalized singular values, kept modes highlighted
      const sv = pod.sing.slice(0, KMAX).map((s) => SM.clamp(s / pod.sing[0], 1e-8, 1));
      const g = UI.frame(root.querySelector(".pod-energy"), {
        width: 400, height: 250, xDomain: [0.3, KMAX + 0.7], yDomain: [Math.max(1e-8, d3.min(sv) * 0.5), 1.5], yLog: true,
        yFormat: d3.min(sv) < 1e-3 ? ".0e" : "~g",
        xLabel: "mode k", yLabel: "σₖ / σ₁", title: "singular values (energy per mode)",
        xTickValues: [1, 5, 10, 15, 20], margin: { top: 20, right: 10, bottom: 38, left: 50 },
      });
      const bw = Math.max(2, (g.x(2) - g.x(1)) * 0.7);
      g.body.append("g").attr("pointer-events", "none").selectAll("rect").data(sv).join("rect")
        .attr("class", (_, i) => (i < K ? "sm-bar" : "sm-bar off"))
        .attr("x", (_, i) => g.x(i + 1) - bw / 2).attr("width", bw)
        .attr("y", (v) => g.y(v)).attr("height", (v) => g.ih - g.y(v));

      // ---- modes panel
      const h = UI.frame(root.querySelector(".pod-modes"), {
        width: 400, height: 220, xDomain: [0, 1], yDomain: [-0.3, 0.3], xLabel: "x", yLabel: "φₖ(x)",
        title: "the first three modes φ₁, φ₂, φ₃", margin: { top: 20, right: 10, bottom: 38, left: 46 }, yTicks: 3,
      });
      const cls = ["sm-line blue thin", "sm-line orange thin", "sm-line aqua thin"];
      pod.modes.slice(0, 3).forEach((m, k) => {
        h.body.append("path").attr("class", cls[k]).attr("pointer-events", "none")
          .attr("d", UI.linePath(xf, Array.from(m), h));
      });

      const energy = pod.sing.map((s) => s * s);
      const tot = energy.reduce((a, b) => a + b, 0);
      let acc = 0, k99 = energy.length;
      for (let k = 0; k < energy.length; k++) { acc += energy[k]; if (acc / tot >= 0.99) { k99 = k + 1; break; } }
      const kept = energy.slice(0, K).reduce((a, b) => a + b, 0) / tot;
      root.querySelector(".pod-e").textContent = (100 * kept).toFixed(kept > 0.9999 ? 4 : 2) + " %";
      root.querySelector(".pod-k99").textContent = k99;
      root.querySelector(".pod-err").textContent = (100 * err).toFixed(err < 0.001 ? 4 : 2) + " %";
      root.querySelector(".pod-err0").textContent = (100 * err0).toFixed(1) + " %";
    }

    UI.slider(root, ".pod-k", (v) => { state.K = v; update(); });
    UI.slider(root, ".pod-n", (v) => { state.n = v; rebuild(); });
    muSlider = UI.slider(root, ".pod-mu", () => update(), (v) => FAMILIES[state.fam].slider.fmt(v));
    radios.forEach((r) => r.addEventListener("change", (e) => { state.fam = e.target.value; rebuild(); }));
    rebuild();
  });
})();
