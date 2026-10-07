/* Interactive figures for "Mapping the Ecolizer".
   Everything runs in the browser: the VAE decoders were trained in notebook/ecolizer_vae.ipynb and exported as plain weights. */
(function () {
  "use strict";
  const ECO = window.ECO, V = ECO.vae, XP = ECO.explorer;
  const FAMS = V.families, PAL = V.palette, MATS = V.materials;
  (function () { const m = {}; Object.keys(V.models).forEach((k) => { m[+k] = V.models[k]; }); V.models = m; })();   // JSON keys "1.0" -> numeric 1
  const FEAT = ["prod", "waste", "gain", "rho", "E"];
  const NAMES = ["Production", "Waste treatment", "Recycling gain", "Density", "Young's modulus"];
  const UNITS = ["mPt/kg", "mPt/kg", "", "kg/m³", "GPa"];
  const INK = "#1d2330", MUTED = "#6b7280";

  /* ---------------- formatting ---------------- */
  const f3 = d3.format(".3~g"), fi = d3.format(",.0f");
  const f3r = d3.format(".3~r");
  function num(v) {
    if (v == null || !isFinite(v)) return "n/a";
    const a = Math.abs(v);
    if (a >= 1e7) return d3.format(".2~s")(v).replace("M", " M").replace("G", " G");
    if (a >= 1000) return fi(v);
    if (a >= 0.001) return f3r(v);
    return d3.format(".2e")(v);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------------- tooltip ---------------- */
  const tip = document.createElement("div");
  tip.className = "eco-tip"; document.body.appendChild(tip);
  function showTip(html, ev) {
    tip.innerHTML = html; tip.style.display = "block";
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > window.innerHeight - 8) y = ev.clientY - h - 14;
    tip.style.left = x + window.scrollX + "px"; tip.style.top = y + window.scrollY + "px";
  }
  const hideTip = () => { tip.style.display = "none"; };
  function matTip(m) {
    return `<b>${esc(m.name)}</b><br><span class="dim">${esc(m.family)}</span><br>production ${num(m.prod)} mPt/kg` +
      (m.waste != null ? `<br>waste ${num(m.waste)} mPt/kg` : "") + (m.gain != null ? `<br>recycling gain ${(m.gain * 100).toFixed(0)} %` : "") +
      (m.rho != null ? `<br>ρ ≈ ${num(m.rho)} kg/m³ · E ≈ ${num(m.E)} GPa <span class="dim">(typical values)</span>` : "") +
      (m.conv ? `<br><span class="dim">per-m³ value converted: ${esc(m.conv)}</span>` : "");
  }

  /* ---------------- VAE decoder in JS ---------------- */
  function linear(layer, x) {
    const W = layer.W, b = layer.b, out = new Array(b.length);
    for (let i = 0; i < b.length; i++) { let s = b[i]; const row = W[i]; for (let j = 0; j < x.length; j++) s += row[j] * x[j]; out[i] = s; }
    return out;
  }
  function decode(beta, z) {            // -> natural log10 features [log prod, log waste, gain, log rho, log E]
    const d = V.models[beta].dec;
    let h = linear(d[0], z).map(Math.tanh); h = linear(d[1], h).map(Math.tanh);
    const o = linear(d[2], h);
    return o.map((v, i) => v * V.sd[i] + V.mu[i]);
  }
  const natural = (x) => ({ prod: 10 ** x[0], waste: 10 ** x[1], gain: Math.min(1, Math.max(0, x[2])), rho: 10 ** x[3], E: 10 ** x[4] });

  /* ---------------- fields over the latent map ---------------- */
  const FIELDS = {
    prod:  { label: "Production impact", unit: "mPt/kg", f: (x) => x[0], log: true, cmap: "seq" },
    waste: { label: "Waste treatment", unit: "mPt/kg", f: (x) => x[1], log: true, cmap: "seq" },
    gain:  { label: "Recycling gain", unit: "", f: (x) => x[2], log: false, cmap: "seq" },
    rho:   { label: "Density", unit: "kg/m³", f: (x) => x[3], log: true, cmap: "seq" },
    E:     { label: "Young's modulus", unit: "GPa", f: (x) => x[4], log: true, cmap: "seq" },
    tie:   { label: "Eco-index, tie  (prod·ρ/E)", unit: "", f: (x) => x[0] + x[3] - x[4], log: true, cmap: "idx", a: 1 },
    beam:  { label: "Eco-index, beam  (prod·ρ/√E)", unit: "", f: (x) => x[0] + x[3] - 0.5 * x[4], log: true, cmap: "idx", a: 0.5 },
    panel: { label: "Eco-index, panel  (prod·ρ/E^⅓)", unit: "", f: (x) => x[0] + x[3] - x[4] / 3, log: true, cmap: "idx", a: 1 / 3 },
  };
  const GN = 120, ZMAX = 3;
  const gridCache = {};
  function grid(beta) {
    if (gridCache[beta]) return gridCache[beta];
    const out = new Array(GN * GN);
    for (let r = 0; r < GN; r++) for (let c = 0; c < GN; c++) {
      const zx = -ZMAX + (2 * ZMAX * (c + 0.5)) / GN, zy = ZMAX - (2 * ZMAX * (r + 0.5)) / GN;   // row 0 = top
      out[r * GN + c] = decode(beta, [zx, zy]);
    }
    return (gridCache[beta] = out);
  }
  const fieldCache = {};
  function fieldValues(beta, key) {
    const k = beta + key; if (fieldCache[k]) return fieldCache[k];
    const g = grid(beta), F = FIELDS[key], v = new Float64Array(GN * GN);
    for (let i = 0; i < g.length; i++) v[i] = F.f(g[i]);
    const Z = V.models[beta].z, pv = [];
    MATS.forEach((m, i) => { if (m.trained) pv.push(F.f(decode(beta, Z[i]))); });
    pv.sort((a, b) => a - b);
    const lo = pv[Math.floor(0.03 * (pv.length - 1))], hi = pv[Math.floor(0.9 * (pv.length - 1))];
    return (fieldCache[k] = { v, lo, hi });
  }
  function colorFn(key) {
    return FIELDS[key].cmap === "idx" ? (t) => d3.interpolateRdYlGn(1 - t) : (t) => d3.interpolateViridis(t);
  }
  function fieldLabelValue(key, v) {
    const F = FIELDS[key]; return F.log ? num(10 ** v) : (v * 100).toFixed(0) + " %";
  }

  /* ---------------- nearest materials ---------------- */
  function nearest(beta, z, k, trainedOnly) {
    const Z = V.models[beta].z, out = [];
    for (let i = 0; i < MATS.length; i++) {
      if (trainedOnly && !MATS[i].trained) continue;
      out.push({ m: MATS[i], d: Math.hypot(Z[i][0] - z[0], Z[i][1] - z[1]), i });
    }
    out.sort((a, b) => a.d - b.d); return out.slice(0, k);
  }
  const nnMedian = {};
  function nnSpacing(beta) {
    if (nnMedian[beta]) return nnMedian[beta];
    const Z = V.models[beta].z, ds = [];
    MATS.forEach((m, i) => { if (!m.trained) return; let best = 1e9; MATS.forEach((n, j) => { if (j !== i && n.trained) best = Math.min(best, Math.hypot(Z[i][0] - Z[j][0], Z[i][1] - Z[j][1])); }); ds.push(best); });
    ds.sort((a, b) => a - b); return (nnMedian[beta] = ds[Math.floor(0.9 * (ds.length - 1))]);
  }
  const bestReal = {};
  function realIndex(m, a) { return m.prod * m.rho / Math.pow(m.E, a); }
  function bestRealFor(a) {
    if (bestReal[a]) return bestReal[a];
    let best = null; MATS.forEach((m) => { if (m.trained) { const v = realIndex(m, a); if (!best || v < best.v) best = { m, v }; } });
    return (bestReal[a] = best);
  }

  /* ---------------- UI helpers ---------------- */
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function betaButtons(container, cur, cb) {
    const wrap = el("div", "eco-seg"); wrap.appendChild(el("span", "lab", "β"));
    V.betas.forEach((b) => {
      const btn = el("button", b === cur ? "on" : "", String(b)); btn.type = "button";
      btn.onclick = () => { wrap.querySelectorAll("button").forEach((x) => x.classList.remove("on")); btn.classList.add("on"); cb(b); };
      wrap.appendChild(btn);
    });
    container.appendChild(wrap); return wrap;
  }
  function famChips(container, active, cb, hint) {
    const wrap = el("div", "eco-chips");
    FAMS.forEach((f) => {
      const c = el("button", "chip" + (active.has(f) ? " on" : ""), `<i style="background:${PAL[f]}"></i>${esc(f)}`); c.type = "button";
      c.onclick = () => { if (active.has(f)) active.delete(f); else active.add(f); c.classList.toggle("on", active.has(f)); cb(); };
      wrap.appendChild(c);
    });
    container.appendChild(wrap); return wrap;
  }
  function selectEl(options, cur, cb, cls) {
    const s = el("select", cls || "");
    options.forEach(([v, l]) => { const o = el("option", "", esc(l)); o.value = v; if (v === cur) o.selected = true; s.appendChild(o); });
    s.onchange = () => cb(s.value); return s;
  }

  /* =================================================================================================
     1. Ranking explorer
     ================================================================================================= */
  const RMETRICS = {
    prod:  { label: "Production (mPt/kg)", get: (m) => m.prod, log: true, low: true },
    waste: { label: "Waste treatment (mPt/kg)", get: (m) => m.waste, log: true, low: true },
    rec_proc: { label: "Recycling process (mPt/kg)", get: (m) => m.rec_proc, log: true, low: true },
    gain:  { label: "Recycling gain (share of production impact recovered)", get: (m) => m.gain, log: false, low: false },
    vol:   { label: "Eco-cost per volume, prod × ρ (mPt/m³)", get: (m) => (m.rho != null ? m.prod * m.rho : null), log: true, low: true, approx: true },
    tie:   { label: "Eco-index, tie  prod·ρ/E", get: (m) => (m.rho != null && m.E != null ? realIndex(m, 1) : null), log: true, low: true, approx: true },
    beam:  { label: "Eco-index, beam  prod·ρ/√E", get: (m) => (m.rho != null && m.E != null ? realIndex(m, 0.5) : null), log: true, low: true, approx: true },
    panel: { label: "Eco-index, panel  prod·ρ/E^⅓", get: (m) => (m.rho != null && m.E != null ? realIndex(m, 1 / 3) : null), log: true, low: true, approx: true },
  };
  function initRanking(root) {
    const S = { metric: "prod", fams: new Set(FAMS), q: "", n: 20, order: "best" };
    const ctl = el("div", "eco-controls"), chips = el("div"), out = el("div", "eco-rank"), note = el("div", "eco-note");
    const sel = selectEl(Object.entries(RMETRICS).map(([k, v]) => [k, v.label]), S.metric, (v) => { S.metric = v; draw(); }, "wide");
    const nsel = selectEl([["12", "show 12"], ["20", "show 20"], ["40", "show 40"], ["999", "show all"]], "20", (v) => { S.n = +v; draw(); });
    const osel = selectEl([["best", "best first"], ["worst", "worst first"]], "best", (v) => { S.order = v; draw(); });
    const q = el("input"); q.type = "search"; q.placeholder = "search a material…"; q.oninput = () => { S.q = q.value.toLowerCase(); draw(); };
    ctl.append(sel, osel, nsel, q);
    root.append(ctl); famChips(root, S.fams, draw); root.append(out, note);

    function draw() {
      const M = RMETRICS[S.metric];
      let rows = MATS.filter((m) => S.fams.has(m.family) && m.name.toLowerCase().includes(S.q)).map((m) => ({ m, v: M.get(m) })).filter((r) => r.v != null && r.v > 0);
      rows.sort((a, b) => (S.order === "best") === M.low ? a.v - b.v : b.v - a.v);
      const total = rows.length; rows = rows.slice(0, S.n);
      const rh = 22, W = 760, left = 250, right = 90, H = rows.length * rh + 44;
      out.innerHTML = "";
      const svg = d3.select(out).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("class", "eco-svg");
      if (!rows.length) { svg.append("text").attr("x", 10).attr("y", 30).attr("fill", MUTED).text("No material matches the filters."); return; }
      const all = MATS.filter((m) => M.get(m) > 0).map((m) => M.get(m));
      const x = M.log ? d3.scaleLog().domain([d3.min(all) / 2, d3.max(all) * 2]).range([left, W - right]) : d3.scaleLinear().domain([0, 1]).range([left, W - right]);
      const ax = d3.axisTop(x).ticks(M.log ? 8 : 5, M.log ? "~s" : "%").tickSizeOuter(0);
      svg.append("g").attr("class", "axis").attr("transform", "translate(0,22)").call(ax);
      const g = svg.append("g").attr("transform", "translate(0,30)");
      rows.forEach((r, i) => {
        const y = i * rh + 11, c = PAL[r.m.family];
        g.append("line").attr("x1", left).attr("x2", x(r.v)).attr("y1", y).attr("y2", y).attr("stroke", c).attr("stroke-width", 2).attr("opacity", 0.55);
        g.append("circle").attr("cx", x(r.v)).attr("cy", y).attr("r", 5.5).attr("fill", c).attr("stroke", "#fff").attr("stroke-width", 1)
          .on("mousemove", (ev) => showTip(matTip(r.m), ev)).on("mouseleave", hideTip);
        g.append("text").attr("x", left - 8).attr("y", y + 4).attr("text-anchor", "end").attr("class", "lab").text(r.m.name.length > 38 ? r.m.name.slice(0, 37) + "…" : r.m.name);
        g.append("text").attr("x", x(r.v) + 10).attr("y", y + 4).attr("class", "val").text(M.log ? num(r.v) : (r.v * 100).toFixed(0) + " %");
      });
      note.innerHTML = `${total} materials match. ` + (M.low ? "Lower is better." : "Higher is better.") +
        (M.approx ? " <b>Uses typical density / modulus values that are not part of the Ecolizer PDF.</b>" : "") +
        (M.log ? " Log axis: each gridline is a factor of ten." : "");
    }
    draw();
  }

  /* =================================================================================================
     2. Eco-Ashby scatter
     ================================================================================================= */
  function initAshby(root) {
    const S = { a: 0.5, fams: new Set(FAMS.filter((f) => f !== "Precious & critical metals")) };
    const ctl = el("div", "eco-controls"); const seg = el("div", "eco-seg"); seg.appendChild(el("span", "lab", "loading case"));
    [["tie", 1, "tie  (a = 1)"], ["beam", 0.5, "beam  (a = ½)"], ["panel", 1 / 3, "panel  (a = ⅓)"]].forEach(([k, a, l]) => {
      const b = el("button", a === S.a ? "on" : "", l); b.type = "button";
      b.onclick = () => { seg.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); S.a = a; draw(); }; seg.appendChild(b);
    });
    ctl.append(seg); root.append(ctl); famChips(root, S.fams, draw);
    const wrap = el("div", "eco-two"), plot = el("div", "eco-plot"), side = el("div", "eco-side"); wrap.append(plot, side); root.append(wrap);
    root.append(el("div", "eco-note", "Each dot is a material for which a typical density and modulus are available (118 of 193). The dashed line is the guideline of the chosen index through the best visible material; everything above it is worse."));
    const W = 640, H = 440, m = { l: 62, r: 14, t: 12, b: 46 };
    function draw() {
      const pts = MATS.filter((p) => p.trained && S.fams.has(p.family)).map((p) => ({ p, ev: p.prod * p.rho, I: realIndex(p, S.a) }));
      plot.innerHTML = ""; side.innerHTML = "";
      const svg = d3.select(plot).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("class", "eco-svg");
      if (!pts.length) return;
      const x = d3.scaleLog().domain([3e-4, 1e3]).range([m.l, W - m.r]);
      const yE = d3.extent(pts, (d) => d.ev), y = d3.scaleLog().domain([yE[0] / 2.5, yE[1] * 2.5]).range([H - m.b, m.t]);
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(7, "~s"));
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(7, "~s"));
      svg.append("text").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").attr("class", "axl").text("Young's modulus E (GPa), typical value");
      svg.append("text").attr("transform", `translate(14,${(m.t + H - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").attr("class", "axl").text("eco-cost per volume, prod × ρ (mPt/m³)");
      const best = pts.reduce((a, b) => (b.I < a.I ? b : a));
      const xs = [3e-4, 1e3], line = xs.map((e) => [x(e), y(best.ev * Math.pow(e / best.p.E, S.a))]);
      svg.append("clipPath").attr("id", "ac").append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b);
      svg.append("path").attr("d", d3.line()(line)).attr("clip-path", "url(#ac)").attr("fill", "none").attr("stroke", "#9A3A2F").attr("stroke-width", 1.8).attr("stroke-dasharray", "7 5");
      svg.append("g").attr("clip-path", "url(#ac)").selectAll("circle").data(pts).join("circle")
        .attr("cx", (d) => x(d.p.E)).attr("cy", (d) => y(d.ev)).attr("r", (d) => (d === best ? 8 : 5)).attr("fill", (d) => PAL[d.p.family]).attr("stroke", (d) => (d === best ? INK : "#fff")).attr("stroke-width", (d) => (d === best ? 2 : 0.8)).attr("opacity", 0.92)
        .on("mousemove", (ev, d) => showTip(matTip(d.p) + `<br>index ${num(d.I)}`, ev)).on("mouseleave", hideTip);
      const top = pts.slice().sort((a, b) => a.I - b.I).slice(0, 6);
      side.innerHTML = `<h5>Lowest index, ${S.a === 1 ? "tie" : S.a === 0.5 ? "beam" : "panel"}</h5><ol>` + top.map((d) => `<li><i style="background:${PAL[d.p.family]}"></i>${esc(d.p.name)}<span>${num(d.I)}</span></li>`).join("") + "</ol>" +
        `<p class="dim">index = prod·ρ / E<sup>${S.a === 1 ? "" : S.a === 0.5 ? "½" : "⅓"}</sup>, in mPt per unit of structural function (up to a geometry constant)</p>`;
    }
    draw();
  }

  /* =================================================================================================
     3. Energy & transport
     ================================================================================================= */
  function initEnergy(root) {
    const cats = [...new Set(XP.energy.map((r) => r.category))];
    const S = { cat: cats[0], qty: 375 };
    const ctl = el("div", "eco-controls");
    const sel = selectEl(cats.map((c) => [c, c]), S.cat, (v) => { S.cat = v; draw(); }, "wide"); ctl.append(sel);
    const lab = el("label", "inl", "quantity "); const qin = el("input"); qin.type = "number"; qin.min = 0; qin.value = S.qty; qin.step = "any"; qin.oninput = () => { S.qty = Math.max(0, +qin.value || 0); draw(); };
    const unit = el("span", "unit", ""); lab.append(qin, unit); ctl.append(lab); root.append(ctl);
    const out = el("div", "eco-rank"), eq = el("div", "eco-equiv"); root.append(out, eq);
    const ABS = 431, AL = 1045;
    function draw() {
      const rows = XP.energy.filter((r) => r.category === S.cat).sort((a, b) => a.mPt - b.mPt); const u = rows[0].per; unit.textContent = u;
      const left = 270, W = 760, rh = 24, H = rows.length * rh + 40;
      out.innerHTML = ""; const svg = d3.select(out).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("class", "eco-svg");
      const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.mPt) * 1.1]).range([left, W - 90]);
      svg.append("g").attr("class", "axis").attr("transform", "translate(0,24)").call(d3.axisTop(x).ticks(6).tickSizeOuter(0));
      const g = svg.append("g").attr("transform", "translate(0,32)");
      rows.forEach((r, i) => {
        const y = i * rh + 12;
        g.append("rect").attr("x", left).attr("y", y - 8).attr("width", x(r.mPt) - left).attr("height", 16).attr("rx", 2).attr("fill", "#2FA3AD").attr("opacity", 0.8);
        g.append("text").attr("x", left - 8).attr("y", y + 4).attr("text-anchor", "end").attr("class", "lab").text(r.item);
        g.append("text").attr("x", x(r.mPt) + 6).attr("y", y + 4).attr("class", "val").text(num(r.mPt));
      });
      const lo = rows[0], hi = rows[rows.length - 1];
      eq.innerHTML = `<b>mPt per ${u}.</b> Spread: ${esc(lo.item)} ${num(lo.mPt)} → ${esc(hi.item)} ${num(hi.mPt)} (factor ${num(hi.mPt / lo.mPt)}).<br>` +
        `For <b>${num(S.qty)} ${u}</b>: ${esc(lo.item)} = ${num(lo.mPt * S.qty)} mPt, ${esc(hi.item)} = ${num(hi.mPt * S.qty)} mPt, i.e. the cost of producing ` +
        `<b>${num(hi.mPt * S.qty / ABS)} kg of ABS</b> or <b>${num(hi.mPt * S.qty / AL)} kg of primary aluminium</b> in the worst case, ${num(lo.mPt * S.qty / ABS)} kg of ABS in the best.`;
    }
    draw();
  }

  /* =================================================================================================
     4. Latent map (shared by the explorer and the gradient search)
     ================================================================================================= */
  class LatentMap {
    constructor(root, opt) {
      this.root = root; this.opt = opt || {}; this.beta = V.default_beta; this.field = opt.field || "prod";
      this.showPts = true; this.showHollow = true; this.contours = true; this.fams = new Set(FAMS); this.size = 600;
      this.wrap = el("div", "lm-wrap"); this.canvas = el("canvas"); this.canvas.width = GN; this.canvas.height = GN;
      this.svg = d3.select(this.wrap).append("svg").attr("viewBox", `0 0 ${this.size} ${this.size}`).attr("class", "lm-svg");
      this.wrap.prepend(this.canvas); root.append(this.wrap);
      this.x = d3.scaleLinear().domain([-ZMAX, ZMAX]).range([0, this.size]); this.y = d3.scaleLinear().domain([-ZMAX, ZMAX]).range([this.size, 0]);
      this.gC = this.svg.append("g"); this.gAx = this.svg.append("g"); this.gP = this.svg.append("g"); this.gO = this.svg.append("g");
      this.svg.append("rect").attr("width", this.size).attr("height", this.size).attr("fill", "none").attr("pointer-events", "all").attr("class", "lm-hit")
        .on("click", (ev) => { const [px, py] = d3.pointer(ev); if (this.opt.onClick) this.opt.onClick([this.x.invert(px), this.y.invert(py)]); })
        .on("mousemove", (ev) => this.hover(ev)).on("mouseleave", hideTip);
      this.legend = el("div", "lm-legend"); root.append(this.legend);
      this.render();
    }
    z() { return V.models[this.beta].z; }
    setBeta(b) { this.beta = b; this.render(); if (this.opt.onChange) this.opt.onChange(); }
    setField(f) { this.field = f; this.render(); if (this.opt.onChange) this.opt.onChange(); }
    hover(ev) {
      const [px, py] = d3.pointer(ev), Z = this.z(); let best = null;
      MATS.forEach((m, i) => {
        if (!this.showPts || !this.fams.has(m.family) || (!m.trained && !this.showHollow)) return;
        const d = Math.hypot(this.x(Z[i][0]) - px, this.y(Z[i][1]) - py); if (d < 12 && (!best || d < best.d)) best = { m, d };
      });
      if (best) showTip(matTip(best.m) + (best.m.trained ? "" : '<br><span class="dim">not used for training; encoded from the available values</span>'), ev);
      else {
        const z = [this.x.invert(px), this.y.invert(py)], F = FIELDS[this.field], v = F.f(decode(this.beta, z));
        showTip(`<span class="dim">decoded here</span><br>${esc(F.label)}: <b>${fieldLabelValue(this.field, v)}</b> ${F.unit}`, ev);
      }
    }
    render() {
      const { v, lo, hi } = fieldValues(this.beta, this.field), F = FIELDS[this.field], col = colorFn(this.field);
      const ctx = this.canvas.getContext("2d"), img = ctx.createImageData(GN, GN);
      for (let i = 0; i < v.length; i++) {
        const t = Math.min(1, Math.max(0, (v[i] - lo) / (hi - lo))), c = d3.color(col(t));
        img.data[4 * i] = c.r; img.data[4 * i + 1] = c.g; img.data[4 * i + 2] = c.b; img.data[4 * i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      // contours
      this.gC.selectAll("*").remove();
      if (this.contours) {
        const th = d3.range(1, 14).map((i) => lo + ((hi - lo) * i) / 14), cs = d3.contours().size([GN, GN]).thresholds(th)(Array.from(v));
        const path = d3.geoPath(d3.geoIdentity().scale(this.size / GN));
        this.gC.selectAll("path").data(cs).join("path").attr("d", path).attr("fill", "none").attr("stroke", "#fff").attr("stroke-opacity", 0.55).attr("stroke-width", 0.8);
      }
      // axes
      this.gAx.selectAll("*").remove();
      [-2, 0, 2].forEach((t) => {
        this.gAx.append("text").attr("x", this.x(t)).attr("y", this.size - 6).attr("text-anchor", "middle").attr("class", "lm-tick").text(t);
        this.gAx.append("text").attr("x", 6).attr("y", this.y(t) + 4).attr("class", "lm-tick").text(t);
      });
      this.gAx.append("text").attr("x", this.size - 8).attr("y", this.size - 20).attr("text-anchor", "end").attr("class", "lm-axl").text("z₁");
      this.gAx.append("text").attr("x", 18).attr("y", 14).attr("class", "lm-axl").text("z₂");
      // points
      const Z = this.z(); this.gP.selectAll("*").remove();
      if (this.showPts) {
        const data = MATS.map((m, i) => ({ m, z: Z[i] })).filter((d) => this.fams.has(d.m.family) && (d.m.trained || this.showHollow));
        this.gP.selectAll("circle").data(data).join("circle").attr("cx", (d) => this.x(d.z[0])).attr("cy", (d) => this.y(d.z[1])).attr("r", (d) => (d.m.trained ? 4.6 : 4.2))
          .attr("fill", (d) => (d.m.trained ? PAL[d.m.family] : "rgba(255,255,255,.55)")).attr("stroke", (d) => (d.m.trained ? "#fff" : PAL[d.m.family])).attr("stroke-width", (d) => (d.m.trained ? 1 : 1.6)).attr("pointer-events", "none");
      }
      // legend bar
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ t, v: lo + t * (hi - lo) }));
      const grad = `linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map((t) => col(t)).join(",")})`;
      this.legend.innerHTML = `<div class="lm-title">${esc(F.label)} <span class="dim">${F.unit}${F.cmap === "idx" ? " · green = low impact" : ""}</span></div><div class="lm-bar" style="background:${grad}"></div><div class="lm-ticks">${ticks.map((k) => `<span>${fieldLabelValue(this.field, k.v)}</span>`).join("")}</div>`;
    }
  }
  const FIELD_OPTS = [["prod", "Production impact"], ["waste", "Waste treatment"], ["gain", "Recycling gain"], ["rho", "Density"], ["E", "Young's modulus"], ["beam", "Eco-index, beam"], ["tie", "Eco-index, tie"], ["panel", "Eco-index, panel"]];

  function decodedHTML(beta, z) {
    const x = decode(beta, z), n = natural(x), nn = nearest(beta, z, 3, false), sp = nnSpacing(beta);
    const inside = nn[0].d <= 1.5 * sp;
    return `<div class="dec-grid">` +
      [["Production", num(n.prod), "mPt/kg"], ["Waste treatment", num(n.waste), "mPt/kg"], ["Recycling gain", (n.gain * 100).toFixed(0), "%"], ["Density", num(n.rho), "kg/m³"], ["Young's modulus", num(n.E), "GPa"]]
        .map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b> ${r[2]}</div>`).join("") +
      `</div><div class="dec-idx">Eco-index tie <b>${num(10 ** FIELDS.tie.f(x))}</b> · beam <b>${num(10 ** FIELDS.beam.f(x))}</b> · panel <b>${num(10 ** FIELDS.panel.f(x))}</b></div>` +
      `<div class="dec-nn"><span class="badge ${inside ? "ok" : "warn"}">${inside ? "inside the data" : "extrapolating"}</span> nearest real entries: ` +
      nn.map((r) => `${esc(r.m.name)} <span class="dim">(${r.d.toFixed(2)})</span>`).join(", ") + `</div>`;
  }

  /* =================================================================================================
     5. VAE sliders
     ================================================================================================= */
  function initDemo(root) {
    const S = { beta: V.default_beta, z: [0.5, -0.5] };
    const ctl = el("div", "eco-controls"); const bseg = betaButtons(ctl, S.beta, (b) => { S.beta = b; upd(); });
    const preset = selectEl([["", "load a material's code…"]].concat(MATS.filter((m) => m.trained).map((m, i) => [m.name, m.name])), "", (name) => {
      if (!name) return; const i = MATS.findIndex((m) => m.name === name); S.z = V.models[S.beta].z[i].slice(); upd(true);
    }, "wide"); ctl.append(preset); root.append(ctl);
    const two = el("div", "eco-two demo-two"), left = el("div", "demo-left"), right = el("div", "demo-right"); two.append(left, right); root.append(two);
    const sl = [0, 1].map((k) => {
      const row = el("div", "slider"); const lab = el("label", "", `z<sub>${k + 1}</sub> <b></b>`); const r = el("input"); r.type = "range"; r.min = -3; r.max = 3; r.step = 0.01; r.value = S.z[k];
      r.oninput = () => { S.z[k] = +r.value; upd(); }; row.append(lab, r); left.append(row); return { r, b: lab.querySelector("b") };
    });
    const mini = el("div", "demo-mini"); left.append(mini);
    const msvg = d3.select(mini).append("svg").attr("viewBox", "0 0 300 300").attr("class", "eco-svg mini");
    const mx = d3.scaleLinear().domain([-3, 3]).range([6, 294]), my = d3.scaleLinear().domain([-3, 3]).range([294, 6]);
    msvg.append("rect").attr("x", 6).attr("y", 6).attr("width", 288).attr("height", 288).attr("fill", "#f5f6f8").attr("stroke", "#d9dce2");
    const gPts = msvg.append("g"), dot = msvg.append("circle").attr("r", 8).attr("fill", "none").attr("stroke", "#9A3A2F").attr("stroke-width", 2.5).style("cursor", "grab");
    msvg.call(d3.drag().on("start drag", (ev) => { S.z = [Math.max(-3, Math.min(3, mx.invert(ev.x))), Math.max(-3, Math.min(3, my.invert(ev.y)))]; upd(true); }));
    left.append(el("div", "eco-note", "Drag the red ring on the map, or move the sliders: the decoder turns the two numbers into a complete eco-profile."));
    right.innerHTML = '<div class="demo-bars"></div><div class="demo-readout"></div><div class="eco-note beta-note"></div>';
    const bars = right.querySelector(".demo-bars"), ro = right.querySelector(".demo-readout"), bn = right.querySelector(".beta-note");
    const rng = FEAT.map((f, j) => d3.extent(MATS.filter((m) => m.trained && m[f] != null), (m) => (j === 2 ? m[f] : Math.log10(m[f]))));
    function upd() {
      sl.forEach((s, k) => { s.r.value = S.z[k]; s.b.textContent = S.z[k].toFixed(2); });
      const Z = V.models[S.beta].z;
      gPts.selectAll("circle").data(MATS.map((m, i) => ({ m, z: Z[i] })).filter((d) => d.m.trained)).join("circle").attr("cx", (d) => mx(d.z[0])).attr("cy", (d) => my(d.z[1])).attr("r", 3).attr("fill", (d) => PAL[d.m.family]).attr("opacity", 0.8);
      dot.attr("cx", mx(S.z[0])).attr("cy", my(S.z[1]));
      const x = decode(S.beta, S.z), n = natural(x), vals = [n.prod, n.waste, n.gain, n.rho, n.E];
      bars.innerHTML = ""; const svg = d3.select(bars).append("svg").attr("viewBox", "0 0 460 238").attr("class", "eco-svg demo");
      FEAT.forEach((f, j) => {
        const y = 14 + j * 44, sc = d3.scaleLinear().domain(rng[j]).range([126, 330]), val = j === 2 ? x[2] : x[j];
        svg.append("text").attr("x", 0).attr("y", y + 13).attr("class", "lab").text(NAMES[j]);
        svg.append("rect").attr("x", 126).attr("y", y).attr("width", 204).attr("height", 18).attr("fill", "#eceef2").attr("rx", 3);
        svg.append("rect").attr("x", 126).attr("y", y).attr("width", Math.max(2, Math.min(204, sc(val) - 126))).attr("height", 18).attr("fill", j === 0 || j === 1 ? "#E2924A" : j === 2 ? "#97A02A" : "#2A6FB0").attr("rx", 3);
        svg.append("text").attr("x", 338).attr("y", y + 14).attr("class", "val").text(j === 2 ? (vals[j] * 100).toFixed(0) + " %" : num(vals[j]) + " " + UNITS[j]);
        svg.append("text").attr("x", 126).attr("y", y + 33).attr("class", "mini-l").text(j === 2 ? "0 %" : num(10 ** rng[j][0]));
        svg.append("text").attr("x", 330).attr("y", y + 33).attr("text-anchor", "end").attr("class", "mini-l").text(j === 2 ? "100 %" : num(10 ** rng[j][1]));
      });
      ro.innerHTML = decodedHTML(S.beta, S.z);
      const mm = V.models[S.beta]; bn.innerHTML = `β = ${S.beta}: training reconstruction error ${mm.final_rec.toFixed(2)} (in standardised units, per material), KL ${mm.final_kl.toFixed(2)} nats. Small β = sharp but memorising, large β = smooth but blurred.`;
    }
    upd();
  }

  /* =================================================================================================
     6. Latent-space explorer
     ================================================================================================= */
  function initMap(root) {
    const ctl = el("div", "eco-controls"); root.append(ctl);
    let map, pin = null;
    const info = el("div", "map-info", '<div class="dim">Click anywhere on the map to decode that point.</div>');
    function onClick(z) {
      pin = z; info.innerHTML = `<div class="dim">decoded at z = (${z[0].toFixed(2)}, ${z[1].toFixed(2)})</div>` + decodedHTML(map.beta, z); drawPin();
    }
    function drawPin() { map.gO.selectAll("*").remove(); if (pin) map.gO.append("circle").attr("cx", map.x(pin[0])).attr("cy", map.y(pin[1])).attr("r", 9).attr("fill", "none").attr("stroke", "#14181F").attr("stroke-width", 2.5); }
    const holder = el("div"); root.append(holder);
    map = new LatentMap(holder, { field: "prod", onClick, onChange: () => { if (pin) { info.innerHTML = `<div class="dim">decoded at z = (${pin[0].toFixed(2)}, ${pin[1].toFixed(2)})</div>` + decodedHTML(map.beta, pin); } drawPin(); } });
    betaButtons(ctl, V.default_beta, (b) => map.setBeta(b));
    ctl.append(selectEl(FIELD_OPTS, "prod", (f) => map.setField(f), "wide"));
    const tg = (txt, key, init) => { const l = el("label", "chk"); const c = el("input"); c.type = "checkbox"; c.checked = init; c.onchange = () => { map[key] = c.checked; map.render(); }; l.append(c, document.createTextNode(" " + txt)); ctl.append(l); };
    tg("contours", "contours", true); tg("materials", "showPts", true); tg("not-trained entries (hollow)", "showHollow", true);
    famChips(root, map.fams, () => map.render());
    root.append(info);
    onClick([0.55, -0.3]);
  }

  /* =================================================================================================
     7. Gradient search
     ================================================================================================= */
  function initSearch(root) {
    const S = { index: "beam", lam: 0.05, start: "Cast iron", beta: V.default_beta };
    const ctl = el("div", "eco-controls"), ctl2 = el("div", "eco-controls"); root.append(ctl, ctl2);
    const holder = el("div"); root.append(holder);
    let path = [], anim = null, ends = [];
    const map = new LatentMap(holder, { field: S.index, onClick: (z) => { stop(); S.start = null; sel.value = ""; startZ = z; path = [z.slice()]; ends = []; draw(); readout(); }, onChange: () => { stop(); path = [startZ.slice()]; ends = []; draw(); readout(); } });
    let startZ = V.models[S.beta].z[MATS.findIndex((m) => m.name === S.start)].slice();
    path = [startZ.slice()];
    betaButtons(ctl, S.beta, (b) => { S.beta = b; map.setBeta(b); if (S.start) startZ = V.models[b].z[MATS.findIndex((m) => m.name === S.start)].slice(); path = [startZ.slice()]; draw(); readout(); });
    const idxSel = selectEl([["beam", "minimise eco-index, beam"], ["tie", "minimise eco-index, tie"], ["panel", "minimise eco-index, panel"], ["prod", "minimise production impact"], ["waste", "minimise waste treatment"]], S.index, (v) => { S.index = v; stop(); map.setField(v); path = [startZ.slice()]; ends = []; draw(); readout(); }, "wide");
    const sel = selectEl([["", "start: (click the map)"]].concat(MATS.filter((m) => m.trained).map((m) => [m.name, "start: " + m.name])), S.start, (name) => {
      stop(); if (!name) return; S.start = name; startZ = V.models[S.beta].z[MATS.findIndex((m) => m.name === name)].slice(); path = [startZ.slice()]; ends = []; draw(); readout();
    }, "wide");
    ctl.append(idxSel, sel);
    const lamRow = el("label", "inl", "prior penalty λ "); const lam = el("input"); lam.type = "range"; lam.min = 0; lam.max = 0.3; lam.step = 0.005; lam.value = S.lam; const lamV = el("b", "", S.lam.toFixed(3));
    lam.oninput = () => { S.lam = +lam.value; lamV.textContent = S.lam.toFixed(3); }; lamRow.append(lam, lamV);
    const run = el("button", "act", "▶ run"), reset = el("button", "act sec", "reset"), multi = el("button", "act sec", "launch from 6 materials");
    run.type = reset.type = multi.type = "button";
    ctl2.append(lamRow, run, multi, reset);
    const ro = el("div", "map-info"); root.append(ro);

    function obj(z) { const x = decode(S.beta, z); return FIELDS[S.index].f(x) + S.lam * (z[0] * z[0] + z[1] * z[1]); }
    function grad(z) { const h = 1e-3; return [(obj([z[0] + h, z[1]]) - obj([z[0] - h, z[1]])) / (2 * h), (obj([z[0], z[1] + h]) - obj([z[0], z[1] - h])) / (2 * h)]; }
    function descend(z0, steps) {   // Adam
      let z = z0.slice(), m = [0, 0], v = [0, 0], out = [z.slice()];
      for (let t = 1; t <= steps; t++) { const g = grad(z); for (let k = 0; k < 2; k++) { m[k] = 0.9 * m[k] + 0.1 * g[k]; v[k] = 0.999 * v[k] + 0.001 * g[k] * g[k]; z[k] -= 0.05 * (m[k] / (1 - 0.9 ** t)) / (Math.sqrt(v[k] / (1 - 0.999 ** t)) + 1e-8); z[k] = Math.max(-ZMAX, Math.min(ZMAX, z[k])); } out.push(z.slice()); }
      return out;
    }
    function stop() { if (anim) { cancelAnimationFrame(anim); anim = null; } run.textContent = "▶ run"; }
    function draw() {
      const g = map.gO; g.selectAll("*").remove();
      const line = d3.line().x((p) => map.x(p[0])).y((p) => map.y(p[1]));
      const drawPath = (P, col) => { g.append("path").attr("d", line(P)).attr("fill", "none").attr("stroke", col).attr("stroke-width", 2.2).attr("stroke-linejoin", "round"); g.append("circle").attr("cx", map.x(P[0][0])).attr("cy", map.y(P[0][1])).attr("r", 5).attr("fill", col); };
      ends.forEach((P) => { drawPath(P, "#14181F"); const e = P[P.length - 1]; g.append("path").attr("transform", `translate(${map.x(e[0])},${map.y(e[1])})`).attr("d", d3.symbol(d3.symbolStar, 150)()).attr("fill", "#9A3A2F").attr("stroke", "#fff"); });
      if (path.length) { drawPath(path, "#14181F"); const e = path[path.length - 1]; g.append("path").attr("transform", `translate(${map.x(e[0])},${map.y(e[1])})`).attr("d", d3.symbol(d3.symbolStar, 170)()).attr("fill", "#9A3A2F").attr("stroke", "#fff"); }
    }
    function readout() {
      const e = path[path.length - 1], F = FIELDS[S.index], x = decode(S.beta, e), x0 = decode(S.beta, path[0]);
      const best = F.a != null ? bestRealFor(F.a) : null, nn = nearest(S.beta, e, 1, true)[0], sp = nnSpacing(S.beta), inside = nn.d <= 1.5 * sp;
      const val = (xx) => num(10 ** F.f(xx));
      ro.innerHTML = `<div class="ro-row"><span>start</span><b>${val(x0)}</b> ${F.unit || ""}<span class="arrow">→</span><span>now</span><b>${val(x)}</b> ${F.unit || ""} <span class="dim">after ${path.length - 1} steps</span></div>` +
        `<div class="dec-idx">decoded at the end point: production ${num(10 ** x[0])} mPt/kg · ρ ${num(10 ** x[3])} kg/m³ · E ${num(10 ** x[4])} GPa</div>` +
        `<div class="dec-nn"><span class="badge ${inside ? "ok" : "warn"}">${inside ? "inside the data" : "extrapolating: no real material here"}</span> nearest real material with known ρ, E: <b>${esc(nn.m.name)}</b> <span class="dim">(distance ${nn.d.toFixed(2)}; 90 % of the training materials have a neighbour within ${sp.toFixed(2)})</span>` +
        (best ? `<br>Best <i>real</i> material for this index: <b>${esc(best.m.name)}</b> (${num(best.v)}), using the typical ρ and E of the table.` : "") + `</div>`;
    }
    run.onclick = () => {
      if (anim) { stop(); return; }
      ends = []; run.textContent = "❚❚ pause"; let t = 0; const full = descend(path[path.length - 1], 260);
      const step = () => { t += 3; path = path.concat(full.slice(path.length, Math.min(full.length, path.length + 3))); draw(); readout(); if (path.length < full.length) anim = requestAnimationFrame(step); else stop(); };
      anim = requestAnimationFrame(step);
    };
    reset.onclick = () => { stop(); ends = []; path = [startZ.slice()]; draw(); readout(); };
    multi.onclick = () => {
      stop(); ends = []; const names = ["Cast iron", "Aluminium, primary", "ABS", "CFRP, epoxy", "Softwood, planed, air dried", "PET"];
      names.forEach((n) => { const i = MATS.findIndex((m) => m.name === n); if (i >= 0) ends.push(descend(V.models[S.beta].z[i].slice(), 260)); });
      path = ends[0]; draw(); const e = ends.map((P) => P[P.length - 1]);
      const spread = d3.max(e, (p) => Math.hypot(p[0] - e[0][0], p[1] - e[0][1]));
      ro.innerHTML = `<div class="dec-nn">Six starting materials (cast iron, aluminium, ABS, CFRP, softwood, PET). Largest distance between the six end points: <b>${spread.toFixed(2)}</b> in latent units. ` +
        (spread < 0.3 ? "They all end up in the same place: the objective has a single basin." : "They end up in different places: the objective has several basins.") + `</div>` +
        `<div class="dec-idx">common end point decodes to: ` + (() => { const x = decode(S.beta, e[0]); return `production ${num(10 ** x[0])} mPt/kg · ρ ${num(10 ** x[3])} kg/m³ · E ${num(10 ** x[4])} GPa · nearest real material ${esc(nearest(S.beta, e[0], 1, true)[0].m.name)}`; })() + `</div>`;
    };
    draw(); readout();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    const map = { "fig-ranking": initRanking, "fig-ashby": initAshby, "fig-energy": initEnergy, "fig-demo": initDemo, "fig-map": initMap, "fig-search": initSearch };
    Object.keys(map).forEach((id) => { const r = document.getElementById(id); if (r) { try { map[id](r); r.classList.add("ready"); } catch (e) { console.error(id, e); r.innerHTML = '<p class="dim">This figure failed to load: ' + esc(e.message) + "</p>"; } } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
