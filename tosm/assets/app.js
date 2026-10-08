function startTOSM(RAW) {
"use strict";
const MATS = RAW.mats; // order: Ti, Al, Steel, BeCu
const NM = MATS.length;
const SHORT = ["Ti-6Al-4V", "Al-2024", "AISI 304", "BeCu C17000"];
const SYM = [d3.symbolCircle, d3.symbolTriangle, d3.symbolSquare, d3.symbolDiamond];
const P3SYM = ["circle", "x", "square", "diamond"];
const LIFE = 98.8;

const rows = RAW.rows.map((r, i) => {
  const o = {}; RAW.cols.forEach((c, j) => o[c] = r[j]);
  o.i = i; o.ys = MATS[o.m].ys; o.util = o.vm / o.ys; return o;
});
const byId = d3.group(rows, d => d.id);

const OBJ = {
  mass:   { label: "Mass", unit: "kg", fmt: ".3f" },
  vm:     { label: "Peak von Mises stress", unit: "MPa", fmt: ",.0f" },
  disp:   { label: "Peak displacement", unit: "mm", fmt: ".3f" },
  co2:    { label: "CO₂, production + lifetime", unit: "t", fmt: ",.1f" },
  energy: { label: "Production energy", unit: "MJ", fmt: ",.1f" },
  water:  { label: "Production water", unit: "L", fmt: ",.1f" },
  cost:   { label: "Material cost", unit: "$", fmt: ",.2f" },
};
const fmtv = (k, v) => v == null ? "–" : d3.format(OBJ[k].fmt)(v);

/* ---------- theme helpers ---------- */
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const mc = m => css("--m" + m);
const renderers = [];
function register(fn) { renderers.push(fn); fn(); }
let rt;
function rerenderAll() { clearTimeout(rt); rt = setTimeout(() => renderers.forEach(f => f()), 80); }
window.addEventListener("resize", rerenderAll);
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rerenderAll); } catch (e) {}
new MutationObserver(rerenderAll).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

function symSvg(m, size = 12, filled = true) {
  const p = d3.symbol(SYM[m], size * size * 0.55)();
  return `<svg width="${size}" height="${size}" viewBox="${-size/2} ${-size/2} ${size} ${size}" aria-hidden="true"><path d="${p}" fill="${filled ? mc(m) : "none"}" stroke="${mc(m)}" stroke-width="1.2"/></svg>`;
}

/* ---------- tooltip ---------- */
const tip = document.getElementById("tip");
function showTip(html, ev) {
  tip.innerHTML = html; tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
  if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
  tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
}
function hideTip() { tip.hidden = true; }
/* ---------- SimJEB designs: thumbnails, metadata, 3-D meshes ---------- */
const ASSET = (typeof window.TOSM_ASSETS === "string") ? window.TOSM_ASSETS : "assets/simjeb/";
const DES = RAW.designs || {};          // id -> [category, author, grabcad slug, SimJEB peak stress, genus]
const SPR = RAW.sprite;                 // { ids, cols }
const sprPos = new Map(SPR.ids.map((id, k) => [id, k]));
const SPR_ROWS = Math.ceil(SPR.ids.length / SPR.cols);
function thumbHTML(id, size, kind = "iso", cls = "") {
  const k = sprPos.get(id); if (k == null) return "";
  const c = k % SPR.cols, r = Math.floor(k / SPR.cols);
  const dim = size == null ? "" : `width:${size}px;height:${size}px;`;
  return `<span class="thumb ${cls}" role="img" aria-label="Rendering of SimJEB bracket ${id}" style="${dim}background-image:url(${ASSET}${kind}.webp);background-size:${SPR.cols * 100}% ${SPR_ROWS * 100}%;background-position:${c / (SPR.cols - 1) * 100}% ${r / (SPR_ROWS - 1) * 100}%"></span>`;
}
const CAT = { flat: "Flat", block: "Block", beam: "Beam", butterfly: "Butterfly", arch: "Arch", other: "Other" };
const des = id => { const a = DES[id]; return a ? { cat: a[0], author: a[1], link: a[2], sjStress: a[3], genus: a[4] } : null; };

function rowTip(d, keys) {
  const k = keys || ["mass", "vm", "disp", "co2"];
  const D = des(d.id);
  return thumbHTML(d.id, 128) + `<div class="t">${symSvg(d.m)} Bracket ${d.id} · ${SHORT[d.m]}</div>` +
    (D ? `<div class="r"><span>Family · designer</span><b>${CAT[D.cat] || D.cat} · ${escapeHTML(D.author)}</b></div>` : "") +
    k.map(key => `<div class="r"><span>${OBJ[key].label}</span><b>${fmtv(key, d[key])} ${OBJ[key].unit}</b></div>`).join("") +
    `<div class="r"><span>Utilisation σ/σy</span><b>${d3.format(".2f")(d.util)}</b></div>`;
}

/* ---------- material chips ---------- */
function matChips(el, state, onChange) {
  el.innerHTML = "";
  MATS.forEach((M, m) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", state[m] ? "true" : "false");
    b.innerHTML = symSvg(m) + SHORT[m];
    b.addEventListener("click", () => { state[m] = !state[m]; b.setAttribute("aria-pressed", state[m]); onChange(); });
    el.appendChild(b);
  });
  // repaint swatches on theme change
  renderers.push(() => el.querySelectorAll(".chip").forEach((b, m) => { b.innerHTML = symSvg(m) + SHORT[m]; }));
}

/* ---------- pareto ---------- */
function paretoIdx(pts, keys) {
  // pts: array of rows; returns subset that is non-dominated (minimisation on all keys)
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i]; let dominated = false;
    for (let j = 0; j < n && !dominated; j++) {
      if (i === j) continue;
      const b = pts[j]; let le = true, lt = false;
      for (const k of keys) { if (b[k] > a[k]) { le = false; break; } if (b[k] < a[k]) lt = true; }
      if (le && lt) dominated = true;
    }
    if (!dominated) out.push(a);
  }
  return out;
}
function feasible(d, mode, sf) {
  if (mode === "none") return true;
  const lim = d.ys / sf;
  return mode === "enforce" ? d.vm <= lim : d.vm >= lim;
}
function uniqBy(arr, keys) {
  const seen = new Set(); return arr.filter(d => { const k = keys.map(x => d[x]).join("|"); if (seen.has(k)) return false; seen.add(k); return true; });
}

/* ---------- common axis drawing ---------- */
function axes(g, x, y, W, H, xl, yl, opts = {}) {
  const xt = opts.xTicks || Math.max(3, Math.floor(W / 90)), yt = opts.yTicks || 6;
  const xa = d3.axisBottom(x).ticks(xt, opts.xFmt || "~s").tickSizeOuter(0);
  const ya = d3.axisLeft(y).ticks(yt, opts.yFmt || "~s").tickSizeOuter(0);
  g.append("g").attr("class", "gridline").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(xt).tickSize(-H).tickFormat(""));
  g.append("g").attr("class", "gridline").call(d3.axisLeft(y).ticks(yt).tickSize(-W).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${H})`).call(xa);
  g.append("g").attr("class", "axis").call(ya);
  if (xl) g.append("text").attr("class", "axis-title").attr("x", W).attr("y", H + 36).attr("text-anchor", "end").text(xl);
  if (yl) g.append("text").attr("class", "axis-title").attr("x", 0).attr("y", -12).attr("text-anchor", "start").text(yl);
}
function logTicksFmt(v) { const s = d3.format("~s")(v); return s; }

function escapeHTML(t) { return String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }

/* ---------- mesh loading ---------- */
const MESH = RAW.mesh;
const bundles = {};
function loadBundle(b) {
  const b64 = window.TOSM_MESH_B64 === true;  // artifact hosting serves the bundles as base64 text
  if (!bundles[b]) bundles[b] = fetch(`${ASSET}meshes_${b}.${b64 ? "txt" : "bin"}`)
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return b64 ? r.text() : r.arrayBuffer(); })
    .then(x => { if (!b64) return x; const s = atob(x.trim()), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; })
    .catch(e => { delete bundles[b]; throw e; });
  return bundles[b];
}
async function loadGeometry(id) {
  const e = MESH && MESH.index[id]; if (!e) throw new Error("no mesh for bracket " + id);
  const [b, off, nv, foff, nf, isz] = e;
  const buf = await loadBundle(b);
  const q = new Uint16Array(buf, off, nv * 3), pos = new Float32Array(nv * 3);
  for (let i = 0; i < pos.length; i++) pos[i] = q[i] * MESH.scale[i % 3] + MESH.min[i % 3];
  const idx = isz === 2 ? new Uint16Array(buf, foff, nf * 3).slice() : new Uint32Array(buf, foff, nf * 3).slice();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

/* ---------- WebGL viewer ---------- */
function makeViewer(el) {
  if (typeof THREE === "undefined" || !THREE.OrbitControls) {
    el.innerHTML = '<p class="vmsg">The 3-D viewer needs three.js, which did not load. The rendering is still available.</p>';
    return null;
  }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { el.innerHTML = '<p class="vmsg">WebGL is not available in this browser. Use the rendering instead.</p>'; return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  el.appendChild(renderer.domElement);
  const msg = document.createElement("p"); msg.className = "vmsg"; el.appendChild(msg);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 4 / 3, 1, 5000);
  cam.up.set(0, 0, 1);
  const lo = MESH.min, hi = MESH.min.map((m, i) => m + MESH.scale[i] * 65535);
  const ctr = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2);
  const home = () => { cam.position.set(ctr.x - 270, ctr.y - 105, ctr.z + 180); controls.target.copy(ctr); controls.update(); };
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(1, -1.5, 2); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-1.5, 1, 0.5); scene.add(fill);
  const mat = new THREE.MeshStandardMaterial({ color: 0xa9b0b8, metalness: 0.25, roughness: 0.55 });
  const controls = new THREE.OrbitControls(cam, renderer.domElement);
  controls.enableDamping = false; controls.minDistance = 120; controls.maxDistance = 900;
  home();
  let mesh = null, want = null;
  const render = () => renderer.render(scene, cam);
  controls.addEventListener("change", render);
  function size() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
    cam.aspect = w / h; cam.updateProjectionMatrix(); render();
  }
  try { new ResizeObserver(size).observe(el); } catch (e) { window.addEventListener("resize", size); }
  function theme() { const c = css("--mesh"); if (c) mat.color.set(c); render(); }
  renderers.push(theme); theme();
  return {
    async show(id) {
      want = id; msg.textContent = "Loading mesh…"; msg.hidden = false;
      try {
        const g = await loadGeometry(id);
        if (want !== id) { g.dispose(); return; }
        if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
        mesh = new THREE.Mesh(g, mat); scene.add(mesh);
        msg.hidden = true; size(); render();
      } catch (e) { if (want === id) msg.textContent = "Could not load the mesh (" + e.message + ")."; }
    },
    home() { home(); render(); },
  };
}

/* ---------- design inspector: 3-D model, SimJEB rendering, metadata, four alloys ---------- */
function makeInspector(root, opts = {}) {
  root.innerHTML = `<div class="insp ${opts.stack ? "insp-stack" : ""}">
    <div class="insp-view">
      <div class="viewer"></div>
      <div class="dispimg" hidden></div>
      <div class="vtabs" role="group" aria-label="View">
        <button type="button" class="chip" data-v="3d" aria-pressed="true">3-D model</button>
        <button type="button" class="chip" data-v="disp" aria-pressed="false">Displacement</button>
        <button type="button" class="chip" data-v="home" aria-label="Reset view">Reset</button>
      </div>
      <p class="vhint">drag to rotate · scroll to zoom</p>
    </div>
    <div class="insp-meta"></div>
  </div>
  <div class="tablewrap insp-table"></div>`;
  const vEl = root.querySelector(".viewer"), dEl = root.querySelector(".dispimg"), meta = root.querySelector(".insp-meta");
  const tbl = root.querySelector(".insp-table"), hint = root.querySelector(".vhint");
  let viewer = null, started = false, cur = null, mode = "3d";
  function ensureViewer() { if (!started) { started = true; viewer = makeViewer(vEl); } }
  root.querySelectorAll(".vtabs .chip").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.v === "home") { viewer && viewer.home(); return; }
    mode = b.dataset.v;
    root.querySelectorAll(".vtabs .chip[data-v='3d'], .vtabs .chip[data-v='disp']").forEach(x => x.setAttribute("aria-pressed", x.dataset.v === mode));
    paintView();
  }));
  function paintView() {
    const is3d = mode === "3d";
    vEl.hidden = !is3d; dEl.hidden = is3d;
    hint.textContent = is3d ? "drag to rotate · scroll to zoom" : "SimJEB rendering · vertical load case, displacement magnitude";
    root.querySelector(".vtabs .chip[data-v='home']").hidden = !is3d;
    if (is3d) { ensureViewer(); if (viewer && cur != null) viewer.show(cur); }
    else dEl.innerHTML = thumbHTML(cur, null, "iso_ver_magdisp", "fill");
  }
  // start the WebGL viewer only once the inspector scrolls near the viewport
  try {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); if (mode === "3d") paintView(); } }, { rootMargin: "300px" });
    io.observe(root);
  } catch (e) { paintView(); }
  function set(id, keepView) {
    cur = id;
    const D = des(id) || {};
    const list = (byId.get(id) || []).slice().sort((a, b) => a.m - b.m);
    const ti = list.find(d => d.m === 0);
    meta.innerHTML = `<h5>Bracket ${id}</h5>
      <dl>
        <dt>Shape family</dt><dd>${CAT[D.cat] || "–"}</dd>
        <dt>Designer</dt><dd>${D.author ? escapeHTML(D.author) : "–"}</dd>
        <dt>Through-holes (genus)</dt><dd>${D.genus ?? "–"}</dd>
        <dt>Mass in Ti-6Al-4V</dt><dd>${ti ? fmtv("mass", ti.mass) + " kg" : "–"}</dd>
        <dt>Peak stress, this study</dt><dd>${ti ? fmtv("vm", ti.vm) + " MPa" : "–"}</dd>
        <dt>Peak stress, SimJEB</dt><dd>${D.sjStress ? d3.format(",.0f")(D.sjStress) + " MPa" : "–"}</dd>
      </dl>
      <p class="links">${D.link ? `<a href="https://grabcad.com/library/${encodeURIComponent(D.link)}" target="_blank" rel="noopener">Original model on GrabCAD ↗</a><br>` : ""}<a href="https://simjeb.github.io/dataview.html" target="_blank" rel="noopener">Explore on simjeb.github.io ↗</a></p>`;
    if (opts.stack) {
      tbl.innerHTML = `<table><thead><tr><th class="l">Material</th><th>Mass [kg]</th><th>Stress [MPa]</th><th class="l">SF 1.25</th><th>CO₂ [t]</th></tr></thead><tbody>` +
        list.map(d => { const ok = d.vm <= d.ys / 1.25;
          return `<tr><td><span class="mat-cell">${symSvg(d.m)}${SHORT[d.m]}</span></td><td>${fmtv("mass", d.mass)}</td><td>${fmtv("vm", d.vm)}</td><td class="l"><span class="pill ${ok ? "pass" : "fail"}">${ok ? "✓ passes" : "✕ fails"}</span></td><td>${fmtv("co2", d.co2)}</td></tr>`; }).join("") + `</tbody></table>`;
    } else
    tbl.innerHTML = `<table><thead><tr><th class="l">Material</th><th>Mass [kg]</th><th>Peak stress [MPa]</th><th>Yield/1.25 [MPa]</th><th class="l">SF 1.25 check</th><th>Displacement [mm]</th><th>CO₂ [t]</th><th>Energy [MJ]</th><th>Water [L]</th><th>Cost [$]</th></tr></thead><tbody>` +
      list.map(d => {
        const ok = d.vm <= d.ys / 1.25;
        return `<tr><td><span class="mat-cell">${symSvg(d.m)}${SHORT[d.m]}</span></td><td>${fmtv("mass", d.mass)}</td><td>${fmtv("vm", d.vm)}</td><td>${d3.format(",.0f")(d.ys / 1.25)}</td>
        <td class="l"><span class="pill ${ok ? "pass" : "fail"}">${ok ? "✓ passes" : "✕ over by " + d3.format(".0%")(d.vm / (d.ys / 1.25) - 1)}</span></td>
        <td>${fmtv("disp", d.disp)}</td><td>${fmtv("co2", d.co2)}</td><td>${fmtv("energy", d.energy)}</td><td>${fmtv("water", d.water)}</td><td>${fmtv("cost", d.cost)}</td></tr>`;
      }).join("") + `</tbody></table>`;
    if (!keepView && (mode === "disp" || started)) paintView();
  }
  renderers.push(() => { if (cur != null) set(cur, true); });
  return { set };
}

/* =======================================================================
   Materials table
   ======================================================================= */
(function () {
  const tb = document.querySelector("#mat-table tbody");
  function draw() {
    tb.innerHTML = MATS.map((M, m) => `<tr><td><span class="mat-cell">${symSvg(m)}${M.name}</span> <span style="color:var(--ink-3)">${M.cls}</span></td>
      <td>${d3.format(",.0f")(M.rho)}</td><td>${d3.format(".1f")(M.E / 1000)}</td><td>${d3.format(".0f")(M.ys)}</td>
      <td>${d3.format(".2f")(M.co2)}</td><td>${d3.format(".0f")(M.energy)}</td><td>${d3.format(".0f")(M.water)}</td><td>${d3.format(".2f")(M.cost)}</td></tr>`).join("");
  }
  register(draw);
})();

/* =======================================================================
   Figure 2 — SimJEB design gallery
   ======================================================================= */
(function () {
  const grid = document.getElementById("gal-grid");
  if (!grid) return;
  const sortSel = document.getElementById("gal-sort"), okBox = document.getElementById("gal-ok");
  const catsEl = document.getElementById("gal-cats"), count = document.getElementById("gal-count");
  const insp = makeInspector(document.getElementById("gal-insp"), { stack: true });
  const ti = new Map(rows.filter(d => d.m === 0).map(d => [d.id, d]));
  const ids = SPR.ids.filter(id => ti.has(id));
  const cats = Object.keys(CAT).filter(c => ids.some(id => (des(id) || {}).cat === c));
  const showCat = Object.fromEntries(cats.map(c => [c, true]));
  catsEl.innerHTML = cats.map(c => `<button type="button" class="chip" data-c="${c}" aria-pressed="true">${CAT[c]} <span class="n">${ids.filter(id => des(id).cat === c).length}</span></button>`).join("");
  catsEl.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => { showCat[b.dataset.c] = !showCat[b.dataset.c]; b.setAttribute("aria-pressed", showCat[b.dataset.c]); draw(); }));
  let sel = null;
  const SORTS = {
    id:   { f: d => d.id, lab: d => "" },
    mass: { f: d => d.mass, lab: d => fmtv("mass", d.mass) + " kg" },
    util: { f: d => d.util, lab: d => "σ/σy " + d3.format(".2f")(d.util) },
    disp: { f: d => d.disp, lab: d => fmtv("disp", d.disp) + " mm" },
    cat:  { f: d => cats.indexOf(des(d.id).cat) * 1e4 + d.mass, lab: d => CAT[des(d.id).cat] },
  };
  [sortSel, okBox].forEach(e => e.addEventListener("change", draw));
  function pick(id) {
    sel = id; insp.set(id);
    grid.querySelectorAll(".tile").forEach(t => t.setAttribute("aria-selected", +t.dataset.id === id));
  }
  function draw() {
    const S = SORTS[sortSel.value];
    const list = ids.map(id => ti.get(id))
      .filter(d => showCat[des(d.id).cat] && (!okBox.checked || d.vm <= d.ys / 1.25))
      .sort((a, b) => S.f(a) - S.f(b));
    count.textContent = `${list.length} of ${ids.length} brackets`;
    grid.innerHTML = list.map(d => {
      const ok = d.vm <= d.ys / 1.25;
      return `<button type="button" class="tile" role="option" data-id="${d.id}" aria-selected="${d.id === sel}">${thumbHTML(d.id)}<span class="cap">${ok ? '<span class="ok" title="Admissible in Ti-6Al-4V at SF 1.25">✓</span> ' : ""}#${d.id}${sortSel.value === "id" ? "" : " · " + S.lab(d)}</span></button>`;
    }).join("") || '<p class="readout">No bracket matches these filters.</p>';
    grid.querySelectorAll(".tile").forEach(t => {
      const d = ti.get(+t.dataset.id);
      t.addEventListener("click", () => pick(d.id));
      t.addEventListener("mousemove", ev => showTip(rowTip(d, ["mass", "vm", "disp", "co2"]), ev));
      t.addEventListener("mouseleave", hideTip);
    });
    if (sel == null && list.length) pick(list[0].id);
  }
  // open on the lightest titanium bracket that passes at SF 1.25
  const start = ids.map(id => ti.get(id)).filter(d => d.vm <= d.ys / 1.25).sort((a, b) => a.mass - b.mass)[0];
  sel = start ? start.id : null;
  draw();
  if (sel != null) {
    pick(sel);
    const t = grid.querySelector(`.tile[data-id="${sel}"]`);
    if (t) grid.scrollTop = Math.max(0, t.offsetTop - 8);
  }
})();

/* =======================================================================
   Figure 1 — design space
   ======================================================================= */
let pinnedId = null;
(function () {
  const el = document.getElementById("space-chart");
  const sel = document.getElementById("space-x");
  const card = document.getElementById("space-card");
  const show = [true, true, true, true];
  matChips(document.getElementById("space-mats"), show, draw);
  sel.addEventListener("change", draw);
  // default pin: low-carbon end of the admissible stress–CO2 front
  const adm = rows.filter(d => feasible(d, "enforce", 1.25));
  const fr = paretoIdx(adm, ["vm", "co2"]).sort((a, b) => a.co2 - b.co2);
  pinnedId = fr.length ? fr[0].id : rows[0].id;

  const insp = makeInspector(card);
  function drawCard() { insp.set(pinnedId); }
  drawCard();

  function draw() {
    const xk = sel.value;
    const Wt = el.clientWidth, Ht = Math.max(340, Math.min(520, Wt * 0.52));
    const M = { t: 26, r: 18, b: 46, l: 52 };
    const W = Wt - M.l - M.r, H = Ht - M.t - M.b;
    const data = rows.filter(d => show[d.m] && d[xk] != null);
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", Wt).attr("height", Ht).attr("role", "img").attr("aria-label", "Scatter of all bracket-material runs: " + OBJ[xk].label + " against peak stress");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const xv = rows.map(d => d[xk]).filter(v => v > 0);
    const x = d3.scaleLog().domain([d3.min(xv) * 0.9, d3.max(xv) * 1.1]).range([0, W]);
    const y = d3.scaleLog().domain([150, 150000]).range([H, 0]).clamp(true);
    axes(g, x, y, W, H, `${OBJ[xk].label} [${OBJ[xk].unit}] →`, "↑ Peak von Mises stress [MPa]", { yTicks: 5 });
    // yield lines
    MATS.forEach((Mt, m) => {
      if (!show[m]) return;
      g.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(Mt.ys)).attr("y2", y(Mt.ys))
        .attr("stroke", mc(m)).attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4").attr("opacity", 0.9);
    });
    const yl = [[0, "end", W - 4, -5], [1, "end", W - 4, -5], [2, "start", 4, -5], [3, "start", 4, 13]];
    yl.forEach(([m, anchor, xx, dy]) => {
      if (!show[m]) return;
      g.append("text").attr("x", xx).attr("y", y(MATS[m].ys) + dy).attr("text-anchor", anchor)
        .attr("fill", css("--ink-2")).attr("font-size", 11).attr("paint-order", "stroke").attr("stroke", css("--bg")).attr("stroke-width", 3)
        .text(W < 520 ? `σy ${SHORT[m].split(" ")[0].split("-")[0]} ${d3.format(".0f")(MATS[m].ys)}` : `σy ${SHORT[m]} · ${d3.format(".0f")(MATS[m].ys)} MPa`);
    });
    const ring = css("--bg");
    const pts = g.append("g");
    pts.selectAll("path").data(data).join("path")
      .attr("transform", d => `translate(${x(d[xk])},${y(d.vm)})`)
      .attr("d", d => d3.symbol(SYM[d.m], 34)())
      .attr("fill", d => mc(d.m)).attr("fill-opacity", 0.72).attr("stroke", ring).attr("stroke-width", 0.8);
    const hl = g.append("g").attr("pointer-events", "none");
    function highlight(id, strong) {
      hl.selectAll("*").remove();
      const sib = (byId.get(id) || []).filter(d => show[d.m] && d[xk] != null).sort((a, b) => a[xk] - b[xk]);
      if (!sib.length) return;
      hl.append("path").attr("d", d3.line().x(d => x(d[xk])).y(d => y(d.vm))(sib)).attr("fill", "none").attr("stroke", css("--ink")).attr("stroke-width", 1.2).attr("opacity", 0.7);
      hl.selectAll("path.s").data(sib).join("path").attr("class", "s")
        .attr("transform", d => `translate(${x(d[xk])},${y(d.vm)})`).attr("d", d => d3.symbol(SYM[d.m], 110)())
        .attr("fill", d => mc(d.m)).attr("stroke", css("--ink")).attr("stroke-width", strong ? 2 : 1.5);
    }
    if (pinnedId != null) highlight(pinnedId, true);
    const del = d3.Delaunay.from(data, d => x(d[xk]), d => y(d.vm));
    svg.append("rect").attr("x", M.l).attr("y", M.t).attr("width", W).attr("height", H).attr("fill", "transparent")
      .on("mousemove", ev => {
        const [mx, my] = d3.pointer(ev, g.node()); const i = del.find(mx, my); const d = data[i];
        if (!d || Math.hypot(x(d[xk]) - mx, y(d.vm) - my) > 30) { hideTip(); highlight(pinnedId, true); svg.style("cursor", null); return; }
        svg.style("cursor", "pointer");
        highlight(d.id); showTip(rowTip(d, ["mass", "vm", "disp", "co2"].concat(["mass", "vm", "disp", "co2"].includes(xk) ? [] : [xk])), ev);
      })
      .on("mouseleave", () => { hideTip(); highlight(pinnedId, true); })
      .on("click", ev => {
        const [mx, my] = d3.pointer(ev, g.node()); const d = data[del.find(mx, my)];
        if (d && Math.hypot(x(d[xk]) - mx, y(d.vm) - my) <= 30) { pinnedId = d.id; drawCard(); highlight(pinnedId, true); }
      });
  }
  register(draw);
})();

/* =======================================================================
   Figure 2 — carbon split
   ======================================================================= */
(function () {
  const el = document.getElementById("carbon-chart");
  const sl = document.getElementById("carbon-L"), sv = document.getElementById("carbon-L-val");
  const ro = document.getElementById("carbon-readout");
  const medMass = MATS.map((_, m) => d3.median(rows.filter(d => d.m === m), d => d.mass));
  document.getElementById("carbon-zero").addEventListener("click", () => { sl.value = 0; draw(); });
  document.getElementById("carbon-default").addEventListener("click", () => { sl.value = 98.8; draw(); });
  sl.addEventListener("input", draw);
  function draw() {
    const L = +sl.value; sv.textContent = d3.format(".1f")(L);
    const items = MATS.map((M, m) => {
      const prod = medMass[m] * M.co2 / 1000, use = medMass[m] * L;
      return { m, prod, use, tot: prod + use };
    }).sort((a, b) => a.tot - b.tot);
    const Wt = el.clientWidth, rowH = 34, M = { t: 8, r: 150, b: 40, l: 104 };
    const W = Math.max(120, Wt - M.l - M.r), H = rowH * items.length;
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", Wt).attr("height", H + M.t + M.b).attr("role", "img").attr("aria-label", "CO2 of the median bracket per alloy");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleLinear().domain([0, d3.max(items, d => d.tot) * 1.02]).nice().range([0, W]);
    const yb = d3.scaleBand().domain(items.map(d => d.m)).range([0, H]).padding(0.28);
    g.append("g").attr("class", "gridline").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(Math.max(3, W / 90)).tickSize(-H).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(Math.max(3, W / 90), x.domain()[1] < 1 ? ".3f" : "~s").tickSizeOuter(0));
    g.append("text").attr("class", "axis-title").attr("x", W).attr("y", H + 34).attr("text-anchor", "end").text("t CO₂ per bracket (median mass) →");
    const bar = g.selectAll("g.b").data(items, d => d.m).join("g").attr("class", "b").attr("transform", d => `translate(0,${yb(d.m)})`);
    const bw = yb.bandwidth();
    const segs = [];
    bar.each(function (d) {
      const s = d3.select(this);
      const wp = Math.max(0, x(d.prod)), wu = Math.max(0, x(d.tot) - x(d.prod));
      s.append("rect").attr("x", 0).attr("width", Math.max(wp - (wu > 2 ? 1 : 0), d.prod > 0 ? 1.5 : 0)).attr("height", bw).attr("rx", wu > 2 ? 0 : 3).attr("fill", mc(d.m));
      if (wu > 0.5) s.append("rect").attr("x", wp + (wp > 0.5 ? 1 : 0)).attr("width", Math.max(0, wu - 1)).attr("height", bw).attr("rx", 3).attr("fill", mc(d.m)).attr("fill-opacity", 0.38);
      s.append("text").attr("x", -10).attr("y", bw / 2).attr("dy", "0.35em").attr("text-anchor", "end").attr("fill", css("--ink")).attr("font-size", 12.5).text(SHORT[d.m]);
      const share = d.tot > 0 ? d.prod / d.tot : 0;
      s.append("text").attr("x", x(d.tot) + 8).attr("y", bw / 2).attr("dy", "0.35em").attr("fill", css("--ink-2")).attr("font-size", 12)
        .text(`${d.tot < 1 ? d3.format(".1f")(d.tot * 1000) + " kg" : d3.format(",.1f")(d.tot) + " t"} · ${share >= 0.999 ? "all" : d3.format(share < 0.01 ? ".2%" : ".0%")(share)} production`);
      s.append("rect").attr("x", -M.l).attr("width", W + M.l + M.r).attr("height", bw).attr("fill", "transparent")
        .on("mousemove", ev => showTip(`<div class="t">${symSvg(d.m)} ${SHORT[d.m]}</div>
          <div class="r"><span>Median bracket mass</span><b>${d3.format(".3f")(medMass[d.m])} kg</b></div>
          <div class="r"><span>Production CO₂</span><b>${d3.format(".2f")(d.prod * 1000)} kg</b></div>
          <div class="r"><span>Use-phase CO₂</span><b>${d3.format(",.1f")(d.use)} t</b></div>`, ev))
        .on("mouseleave", hideTip);
    });
    // crossover Ti vs AISI 304
    const ti = 0, st = 2;
    const Lx = (medMass[ti] * MATS[ti].co2 - medMass[st] * MATS[st].co2) / 1000 / (medMass[st] - medMass[ti]);
    const best = items[0];
    ro.innerHTML = `At <b>${d3.format(".1f")(L)} t/kg</b>, <b>${SHORT[best.m]}</b> has the lowest footprint. Titanium overtakes steel once the use-phase factor exceeds <b>${d3.format(".3f")(Lx)} t/kg</b> (${d3.format(".0f")(Lx * 1000)} kg CO₂ per kg flown).`;
  }
  register(draw);
})();

/* =======================================================================
   Figure 3 — percentage change vs Ti
   ======================================================================= */
(function () {
  const el = document.getElementById("delta-chart");
  const sel = document.getElementById("delta-stat");
  const lg = document.getElementById("delta-legend");
  const KEYS = ["mass", "vm", "disp", "co2", "energy", "water", "cost"];
  const LBL = { mass: "Mass", vm: "Stress", disp: "Displacement", co2: "CO₂", energy: "Energy", water: "Water", cost: "Cost" };
  const OTH = [1, 2, 3];
  const stats = {};
  OTH.forEach(m => {
    stats[m] = {};
    KEYS.forEach(k => {
      const v = [];
      byId.forEach(list => {
        const t = list.find(d => d.m === 0), o = list.find(d => d.m === m);
        if (t && o && t[k] != null && o[k] != null && t[k] !== 0) v.push((o[k] - t[k]) / t[k] * 100);
      });
      v.sort(d3.ascending);
      stats[m][k] = { median: d3.quantileSorted(v, 0.5), q1: d3.quantileSorted(v, 0.25), q3: d3.quantileSorted(v, 0.75), mean: d3.mean(v), sd: d3.deviation(v), n: v.length };
    });
  });
  sel.addEventListener("change", draw);
  function draw() {
    lg.innerHTML = OTH.map(m => `<span>${symSvg(m)}${SHORT[m]} vs Ti-6Al-4V</span>`).join("");
    const mode = sel.value;
    const val = s => mode === "median" ? s.median : s.mean;
    const lo = s => mode === "median" ? s.q1 : s.mean - s.sd;
    const hi = s => mode === "median" ? s.q3 : s.mean + s.sd;
    let ext = [0, 0];
    OTH.forEach(m => KEYS.forEach(k => { ext[0] = Math.min(ext[0], lo(stats[m][k])); ext[1] = Math.max(ext[1], hi(stats[m][k])); }));
    const Wt = el.clientWidth, Ht = 340, M = { t: 24, r: 10, b: 34, l: 50 };
    const W = Wt - M.l - M.r, H = Ht - M.t - M.b;
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", Wt).attr("height", Ht).attr("role", "img").attr("aria-label", "Percentage change relative to titanium");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x0 = d3.scaleBand().domain(KEYS).range([0, W]).paddingInner(0.22).paddingOuter(0.05);
    const x1 = d3.scaleBand().domain(OTH).range([0, x0.bandwidth()]).padding(0.08);
    const y = d3.scaleLinear().domain([Math.min(-100, ext[0]), ext[1]]).nice().range([H, 0]);
    g.append("g").attr("class", "gridline").call(d3.axisLeft(y).ticks(6).tickSize(-W).tickFormat(""));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => (d > 0 ? "+" : "") + d + "%").tickSizeOuter(0));
    g.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", css("--ink-3"));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x0).tickFormat(k => W < 520 ? ({ mass: "Mass", vm: "Stress", disp: "Disp.", co2: "CO₂", energy: "Energy", water: "Water", cost: "Cost" })[k] : LBL[k]).tickSize(0)).call(a => { a.select(".domain").remove(); if (W < 420) a.selectAll("text").attr("font-size", 10); });
    g.append("text").attr("class", "axis-title").attr("x", 0).attr("y", -12).text("↑ Change vs the same bracket in Ti-6Al-4V");
    const ink = css("--ink");
    KEYS.forEach(k => OTH.forEach(m => {
      const s = stats[m][k], v = val(s), bx = x0(k) + x1(m), bw = x1.bandwidth();
      const y0 = y(0), yv = y(v), top = Math.min(y0, yv), h = Math.abs(yv - y0);
      const r = Math.min(3, bw / 2, h);
      // bar with rounded data-end
      const path = v >= 0
        ? `M${bx},${y0}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + bw - r}Q${bx + bw},${top} ${bx + bw},${top + r}V${y0}Z`
        : `M${bx},${y0}V${top + h - r}Q${bx},${top + h} ${bx + r},${top + h}H${bx + bw - r}Q${bx + bw},${top + h} ${bx + bw},${top + h - r}V${y0}Z`;
      g.append("path").attr("d", path).attr("fill", mc(m));
      const cx = bx + bw / 2;
      g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", y(lo(s))).attr("y2", y(hi(s))).attr("stroke", ink).attr("stroke-width", 1.2).attr("opacity", 0.75);
      [lo(s), hi(s)].forEach(e => g.append("line").attr("x1", cx - Math.min(4, bw / 3)).attr("x2", cx + Math.min(4, bw / 3)).attr("y1", y(e)).attr("y2", y(e)).attr("stroke", ink).attr("stroke-width", 1.2).attr("opacity", 0.75));
      g.append("rect").attr("x", bx - 1).attr("width", bw + 2).attr("y", 0).attr("height", H).attr("fill", "transparent")
        .on("mousemove", ev => showTip(`<div class="t">${symSvg(m)} ${SHORT[m]} · ${LBL[k]}</div>
          <div class="r"><span>${mode === "median" ? "Median" : "Mean"}</span><b>${d3.format("+.1f")(v)}%</b></div>
          <div class="r"><span>${mode === "median" ? "Interquartile range" : "± 1 SD"}</span><b>${d3.format("+.1f")(lo(s))}% to ${d3.format("+.1f")(hi(s))}%</b></div>
          <div class="r"><span>Brackets</span><b>${s.n}</b></div>`, ev))
        .on("mouseleave", hideTip);
    }));
  }
  register(draw);
})();

/* =======================================================================
   Figure 4 — feasibility ECDF
   ======================================================================= */
(function () {
  const el = document.getElementById("feas-chart");
  const sl = document.getElementById("feas-sf"), sv = document.getElementById("feas-sf-val");
  const lg = document.getElementById("feas-legend");
  const sorted = MATS.map((_, m) => rows.filter(d => d.m === m).map(d => d.util).sort(d3.ascending));
  sl.addEventListener("input", draw);
  function draw() {
    const sf = +sl.value; sv.textContent = d3.format(".2f")(sf);
    const lim = 1 / sf;
    const counts = sorted.map(a => d3.bisectRight(a, lim));
    lg.innerHTML = MATS.map((M, m) => `<span>${symSvg(m)}${SHORT[m]}: <b style="color:var(--ink)">${counts[m]}</b>&thinsp;/&thinsp;${sorted[m].length} pass</span>`).join("");
    const Wt = el.clientWidth, Ht = 320, M = { t: 24, r: 16, b: 46, l: 46 };
    const W = Wt - M.l - M.r, H = Ht - M.t - M.b;
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", Wt).attr("height", Ht).attr("role", "img").attr("aria-label", "Cumulative distribution of utilisation per alloy");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleLog().domain([0.3, 300]).range([0, W]).clamp(true);
    const y = d3.scaleLinear().domain([0, 1]).range([H, 0]);
    axes(g, x, y, W, H, "Utilisation σmax / σy (log) →", "↑ Share of brackets at or below", { yFmt: ".0%", yTicks: 5 });
    // admissible zone
    g.insert("rect", ":first-child").attr("x", 0).attr("y", 0).attr("width", x(lim)).attr("height", H).attr("fill", css("--surface"));
    g.append("line").attr("x1", x(lim)).attr("x2", x(lim)).attr("y1", 0).attr("y2", H).attr("stroke", css("--ink")).attr("stroke-width", 1.5);
    if (x(lim) > 80) g.append("text").attr("x", x(lim) - 6).attr("y", 14).attr("text-anchor", "end").attr("fill", css("--ink-2")).attr("font-size", 11.5).text("admissible");
    g.append("text").attr("x", x(lim) + 6).attr("y", 14).attr("fill", css("--ink-2")).attr("font-size", 11.5).text(`1/SF = ${d3.format(".2f")(lim)}`);
    const lab = [[0, 0.5], [1, 0.5], [2, 0.3], [3, 0.72]];
    sorted.forEach((a, m) => {
      const pts = [[x.domain()[0], 0]]; a.forEach((u, i) => { pts.push([u, i / a.length]); pts.push([u, (i + 1) / a.length]); }); pts.push([x.domain()[1], 1]);
      g.append("path").attr("d", d3.line().x(p => x(p[0])).y(p => y(p[1]))(pts)).attr("fill", "none").attr("stroke", mc(m)).attr("stroke-width", 2);
    });
    lab.forEach(([m, q]) => {
      const a = sorted[m], u = d3.quantileSorted(a, q);
      g.append("path").attr("transform", `translate(${x(u)},${y(q)})`).attr("d", d3.symbol(SYM[m], 60)()).attr("fill", mc(m)).attr("stroke", css("--bg")).attr("stroke-width", 1.5);
      g.append("text").attr("x", x(u) + 9).attr("y", y(q)).attr("dy", "0.35em").attr("fill", css("--ink")).attr("font-size", 11.5).attr("paint-order", "stroke").attr("stroke", css("--bg")).attr("stroke-width", 3).text(SHORT[m]);
    });
    // crosshair
    const ch = g.append("g").attr("pointer-events", "none").style("display", "none");
    ch.append("line").attr("y1", 0).attr("y2", H).attr("stroke", css("--ink-3")).attr("stroke-dasharray", "3 3");
    svg.append("rect").attr("x", M.l).attr("y", M.t).attr("width", W).attr("height", H).attr("fill", "transparent")
      .on("mousemove", ev => {
        const [mx] = d3.pointer(ev, g.node()); const u = x.invert(mx);
        ch.style("display", null).select("line").attr("x1", mx).attr("x2", mx);
        showTip(`<div class="t">σmax/σy ≤ ${d3.format(".2f")(u)}</div>` + sorted.map((a, m) => `<div class="r"><span>${symSvg(m)} ${SHORT[m]}</span><b>${d3.format(".0%")(d3.bisectRight(a, u) / a.length)} · ${d3.bisectRight(a, u)}</b></div>`).join(""), ev);
      })
      .on("mouseleave", () => { ch.style("display", "none"); hideTip(); });
  }
  register(draw);
})();

/* =======================================================================
   Figure 5 — Pareto explorer
   ======================================================================= */
(function () {
  const el = document.getElementById("par-chart");
  const sx = document.getElementById("par-x"), sy = document.getElementById("par-y");
  const scon = document.getElementById("par-con"), ssf = document.getElementById("par-sf"), ssv = document.getElementById("par-sf-val");
  const per = document.getElementById("par-per"), lg = document.getElementById("par-log");
  const ro = document.getElementById("par-readout");
  const thead = document.querySelector("#par-table thead"), tbody = document.querySelector("#par-table tbody");
  const include = [true, true, true, true];
  const OPTS = ["vm", "co2", "mass", "disp", "energy", "water", "cost"];
  [sx, sy].forEach((s, j) => { s.innerHTML = OPTS.map(k => `<option value="${k}">${OBJ[k].label} [${OBJ[k].unit}]</option>`).join(""); s.value = j ? "co2" : "vm"; });
  matChips(document.getElementById("par-mats"), include, draw);
  [sx, sy, scon, per, lg].forEach(e => e.addEventListener("change", draw));
  ssf.addEventListener("input", draw);
  let hlFn = () => {};

  function draw() {
    const xk = sx.value, yk = sy.value, mode = scon.value, sf = +ssf.value, isLog = lg.checked;
    ssv.textContent = d3.format(".2f")(sf);
    ssf.disabled = mode === "none";
    const data = rows.filter(d => include[d.m] && d[xk] != null && d[yk] != null);
    const feas = data.filter(d => feasible(d, mode, sf));
    let fronts = [];
    if (xk === yk) fronts = [];
    else if (per.checked) MATS.forEach((_, m) => { const f = feas.filter(d => d.m === m); if (f.length) fronts.push({ m, pts: uniqBy(paretoIdx(f, [xk, yk]), [xk, yk]).sort((a, b) => a[xk] - b[xk] || a[yk] - b[yk]) }); });
    else if (feas.length) fronts.push({ m: null, pts: uniqBy(paretoIdx(feas, [xk, yk]), [xk, yk]).sort((a, b) => a[xk] - b[xk] || a[yk] - b[yk]) });
    const onFront = new Set(); fronts.forEach(f => f.pts.forEach(d => onFront.add(d.i)));

    const Wt = el.clientWidth, Ht = Math.max(360, Math.min(540, Wt * 0.56));
    const M = { t: 26, r: 18, b: 46, l: 54 };
    const W = Wt - M.l - M.r, H = Ht - M.t - M.b;
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", Wt).attr("height", Ht).attr("role", "img").attr("aria-label", "Pareto explorer scatter");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const allx = rows.map(d => d[xk]).filter(v => v != null && v > 0), ally = rows.map(d => d[yk]).filter(v => v != null && v > 0);
    const mk = (vals) => isLog ? d3.scaleLog().domain([d3.min(vals) * 0.85, d3.max(vals) * 1.15]) : d3.scaleLinear().domain([0, d3.max(vals) * 1.03]);
    const x = mk(allx).range([0, W]), y = mk(ally).range([H, 0]);
    axes(g, x, y, W, H, `${OBJ[xk].label} [${OBJ[xk].unit}] →`, `↑ ${OBJ[yk].label} [${OBJ[yk].unit}]`, { yTicks: 5 });
    const ring = css("--bg");
    const inf = data.filter(d => !feasible(d, mode, sf));
    g.append("g").selectAll("path").data(inf).join("path")
      .attr("transform", d => `translate(${x(d[xk])},${y(d[yk])})`).attr("d", d => d3.symbol(SYM[d.m], 22)())
      .attr("fill", "none").attr("stroke", d => mc(d.m)).attr("stroke-opacity", 0.28).attr("stroke-width", 1);
    g.append("g").selectAll("path").data(feas.filter(d => !onFront.has(d.i))).join("path")
      .attr("transform", d => `translate(${x(d[xk])},${y(d[yk])})`).attr("d", d => d3.symbol(SYM[d.m], 40)())
      .attr("fill", d => mc(d.m)).attr("fill-opacity", 0.75).attr("stroke", ring).attr("stroke-width", 0.8);
    // fronts
    const ink = css("--ink");
    fronts.forEach(f => {
      if (f.pts.length > 1) {
        const step = d3.line().curve(d3.curveStepAfter).x(d => x(d[xk])).y(d => y(d[yk]));
        g.append("path").attr("d", step(f.pts)).attr("fill", "none").attr("stroke", f.m == null ? ink : mc(f.m)).attr("stroke-width", 2).attr("opacity", 0.85);
      }
      g.append("g").selectAll("path").data(f.pts).join("path")
        .attr("transform", d => `translate(${x(d[xk])},${y(d[yk])})`).attr("d", d => d3.symbol(SYM[d.m], 90)())
        .attr("fill", d => mc(d.m)).attr("stroke", ink).attr("stroke-width", 1.6);
    });
    const hl = g.append("g").attr("pointer-events", "none");
    hlFn = (d) => {
      hl.selectAll("*").remove(); if (!d) return;
      hl.append("circle").attr("cx", x(d[xk])).attr("cy", y(d[yk])).attr("r", 11).attr("fill", "none").attr("stroke", css("--accent")).attr("stroke-width", 2);
    };
    if (!data.length) {
      g.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle").attr("fill", css("--ink-2")).text("Select at least one material.");
    }
    const del = d3.Delaunay.from(data, d => x(d[xk]), d => y(d[yk]));
    svg.append("rect").attr("x", M.l).attr("y", M.t).attr("width", W).attr("height", H).attr("fill", "transparent")
      .on("mousemove", ev => {
        if (!data.length) return;
        const [mx, my] = d3.pointer(ev, g.node()); const d = data[del.find(mx, my)];
        if (!d || Math.hypot(x(d[xk]) - mx, y(d[yk]) - my) > 28) { hideTip(); hlFn(null); highlightRow(null); return; }
        const keys = [...new Set([xk, yk, "mass", "vm"])];
        showTip(rowTip(d, keys) + `<div class="r"><span>Status</span><b>${onFront.has(d.i) ? "on the front" : feasible(d, mode, sf) ? "admissible" : "violates constraint"}</b></div>`, ev);
        hlFn(d); highlightRow(d.i);
      })
      .on("mouseleave", () => { hideTip(); hlFn(null); highlightRow(null); });

    // readout
    const nf = fronts.reduce((s, f) => s + f.pts.length, 0);
    const comp = d3.rollup(fronts.flatMap(f => f.pts), v => v.length, d => d.m);
    ro.innerHTML = xk === yk ? "Choose two different objectives." :
      `<b>${feas.length}</b> of ${data.length} designs satisfy the constraint · <b>${nf}</b> on the front` +
      (nf ? " (" + [...comp].sort((a, b) => a[0] - b[0]).map(([m, n]) => `${n} ${SHORT[m]}`).join(", ") + ")" : "") +
      (mode === "enforce" && !feas.length ? ". No design passes; lower the safety factor or include titanium." : "");
    // table
    thead.innerHTML = `<tr><th class="l">Bracket</th><th class="l">Material</th><th>${OBJ[xk].label} [${OBJ[xk].unit}]</th><th>${OBJ[yk].label} [${OBJ[yk].unit}]</th>${xk !== "mass" && yk !== "mass" ? "<th>Mass [kg]</th>" : ""}<th>σmax/σy</th></tr>`;
    const all = fronts.flatMap(f => f.pts).sort((a, b) => a[xk] - b[xk]);
    tbody.innerHTML = all.slice(0, 60).map(d => `<tr data-row="${d.i}"><td class="l"><span class="mat-cell">${thumbHTML(d.id, 40)}${d.id}</span></td><td class="l"><span class="mat-cell">${symSvg(d.m)}${SHORT[d.m]}</span></td><td>${fmtv(xk, d[xk])}</td><td>${fmtv(yk, d[yk])}</td>${xk !== "mass" && yk !== "mass" ? `<td>${fmtv("mass", d.mass)}</td>` : ""}<td>${d3.format(".2f")(d.util)}</td></tr>`).join("") +
      (all.length > 60 ? `<tr><td class="l" colspan="6" style="color:var(--ink-3)">… ${all.length - 60} more on the front</td></tr>` : "") +
      (!all.length ? `<tr><td class="l" colspan="6" style="color:var(--ink-3)">No designs on the front with these settings.</td></tr>` : "");
    tbody.querySelectorAll("tr[data-row]").forEach(tr => {
      tr.addEventListener("mouseenter", () => { hlFn(rows[+tr.dataset.row]); tr.classList.add("hl"); });
      tr.addEventListener("mouseleave", () => { hlFn(null); tr.classList.remove("hl"); });
    });
  }
  function highlightRow(i) { tbody.querySelectorAll("tr").forEach(tr => tr.classList.toggle("hl", i != null && tr.dataset.row == i)); }
  register(draw);
})();

/* =======================================================================
   Figure 6 — notebook front vs exact front
   ======================================================================= */
(function () {
  const el = document.getElementById("sign-chart");
  const lg = document.getElementById("sign-legend");
  const SCT = [[400, 90.167333], [406, 62.004925], [635, 54.689873], [655, 53.987023], [667, 41.675048], [804, 25.987655], [930, 25.749913], [1050, 21.332127], [1370, 20.142431], [1600, 16.550615], [1830, 15.139777], [2450, 12.862062], [3640, 12.575704], [9360, 12.277687]];
  const saved = SCT.map(([vm, co2]) => rows.find(d => d.vm === vm && Math.abs(d.co2 - co2) < 1e-3)).filter(Boolean);
  const exact = uniqBy(paretoIdx(rows.filter(d => feasible(d, "enforce", 1.25)), ["vm", "co2"]), ["vm", "co2"]).sort((a, b) => a.vm - b.vm);
  function draw() {
    lg.innerHTML = `<span><svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="5" fill="none" stroke="${css("--ink")}" stroke-width="1.6"/></svg>Saved notebook front (σ ≥ σy/1.25)</span>
      <span><svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="5" fill="${css("--accent")}" stroke="${css("--bg")}" stroke-width="1"/></svg>Exact front, σ ≤ σy/1.25</span>
      <span><svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="3" fill="${css("--ink-3")}" opacity=".45"/></svg>All 1,516 designs</span>`;
    const Wt = el.clientWidth, Ht = Math.max(320, Math.min(440, Wt * 0.48));
    const M = { t: 26, r: 18, b: 46, l: 54 };
    const W = Wt - M.l - M.r, H = Ht - M.t - M.b;
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("width", Wt).attr("height", Ht).attr("role", "img").attr("aria-label", "Saved notebook Pareto front against exact constrained front");
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleLog().domain([300, 150000]).range([0, W]).clamp(true);
    const y = d3.scaleLog().domain([10, 450]).range([H, 0]);
    axes(g, x, y, W, H, "Peak von Mises stress [MPa] →", "↑ CO₂, production + lifetime [t]", { yTicks: 5 });
    g.append("g").selectAll("circle").data(rows).join("circle").attr("cx", d => x(d.vm)).attr("cy", d => y(d.co2)).attr("r", 2.2).attr("fill", css("--ink-3")).attr("opacity", 0.28);
    const step = d3.line().curve(d3.curveStepAfter).x(d => x(d.vm)).y(d => y(d.co2));
    g.append("path").attr("d", step(saved)).attr("fill", "none").attr("stroke", css("--ink")).attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
    g.append("path").attr("d", step(exact)).attr("fill", "none").attr("stroke", css("--accent")).attr("stroke-width", 2);
    g.append("g").selectAll("circle").data(saved).join("circle").attr("cx", d => x(d.vm)).attr("cy", d => y(d.co2)).attr("r", 5.5).attr("fill", css("--bg")).attr("stroke", css("--ink")).attr("stroke-width", 1.6);
    g.append("g").selectAll("circle").data(exact).join("circle").attr("cx", d => x(d.vm)).attr("cy", d => y(d.co2)).attr("r", 5.5).attr("fill", css("--accent")).attr("stroke", css("--bg")).attr("stroke-width", 1.5);
    const pts = saved.map(d => ({ d, k: "saved" })).concat(exact.map(d => ({ d, k: "exact" })));
    const del = d3.Delaunay.from(pts, p => x(p.d.vm), p => y(p.d.co2));
    svg.append("rect").attr("x", M.l).attr("y", M.t).attr("width", W).attr("height", H).attr("fill", "transparent")
      .on("mousemove", ev => {
        const [mx, my] = d3.pointer(ev, g.node()); const p = pts[del.find(mx, my)];
        if (!p || Math.hypot(x(p.d.vm) - mx, y(p.d.co2) - my) > 24) return hideTip();
        showTip(rowTip(p.d, ["vm", "co2", "mass"]) + `<div class="r"><span>Source</span><b>${p.k === "saved" ? "saved notebook front" : "exact constrained front"}</b></div>`, ev);
      })
      .on("mouseleave", hideTip);
  }
  register(draw);
})();

/* =======================================================================
   Figure 7 — 3D fronts (Plotly)
   ======================================================================= */
(function () {
  const el = document.getElementById("p3-chart");
  const scon = document.getElementById("p3-con"), ssf = document.getElementById("p3-sf"), ssv = document.getElementById("p3-sf-val");
  const all = document.getElementById("p3-all"), lg = document.getElementById("p3-legend"), ro = document.getElementById("p3-readout");
  const K = ["vm", "co2", "disp"];
  let cache = {};
  function fronts(mode, sf) {
    const key = mode + sf; if (cache[key]) return cache[key];
    return cache[key] = MATS.map((_, m) => uniqBy(paretoIdx(rows.filter(d => d.m === m && feasible(d, mode, sf)), K), K));
  }
  [scon, all].forEach(e => e.addEventListener("change", draw));
  ssf.addEventListener("input", draw);
  let camera = null;
  function draw() {
    if (typeof Plotly === "undefined") { el.innerHTML = '<p class="readout">The 3-D view needs Plotly, which did not load.</p>'; return; }
    const mode = scon.value, sf = +ssf.value; ssv.textContent = d3.format(".2f")(sf); ssf.disabled = mode === "none";
    const F = fronts(mode, sf);
    const p3s = m => { const c = mc(m); return `<svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">${[`<circle r="4.5" fill="${c}"/>`, `<path d="M-4,-4L4,4M4,-4L-4,4" stroke="${c}" stroke-width="2"/>`, `<rect x="-4" y="-4" width="8" height="8" fill="${c}"/>`, `<path d="M0,-5.5L5,0L0,5.5L-5,0Z" fill="${c}"/>`][m]}</svg>`; };
    lg.innerHTML = MATS.map((_, m) => `<span>${p3s(m)}${SHORT[m]}: <b style="color:var(--ink)">${F[m].length}</b> on front</span>`).join("");
    const ink = css("--ink"), ink3 = css("--ink-3"), grid = css("--rule"), bg = css("--bg");
    const traces = [];
    if (all.checked) traces.push({ type: "scatter3d", mode: "markers", name: "All designs", x: rows.map(d => d.vm), y: rows.map(d => d.co2), z: rows.map(d => d.disp),
      marker: { size: 2, color: ink3, opacity: 0.35 }, hoverinfo: "skip", showlegend: false });
    F.forEach((pts, m) => {
      traces.push({ type: "scatter3d", mode: "markers", name: SHORT[m], x: pts.map(d => d.vm), y: pts.map(d => d.co2), z: pts.map(d => d.disp),
        text: pts.map(d => `Bracket ${d.id} · ${SHORT[m]}<br>Stress ${fmtv("vm", d.vm)} MPa<br>CO₂ ${fmtv("co2", d.co2)} t<br>Displacement ${fmtv("disp", d.disp)} mm<br>σ/σy ${d3.format(".2f")(d.util)}`),
        hovertemplate: "%{text}<extra></extra>",
        marker: { size: 5, color: mc(m), symbol: P3SYM[m], opacity: 0.9, line: { color: bg, width: 0.5 } } });
    });
    const ax = (t, tv) => ({ title: { text: t, font: { size: 12, color: ink } }, type: "log", tickvals: tv, ticktext: tv.map(v => d3.format("~s")(v)), gridcolor: grid, zerolinecolor: grid, color: ink3, backgroundcolor: bg, showbackground: false, tickfont: { size: 11, color: ink3 } });
    const layout = {
      paper_bgcolor: bg, plot_bgcolor: bg, margin: { l: 0, r: 0, t: 0, b: 0 }, showlegend: false,
      font: { family: "IBM Plex Sans, system-ui, sans-serif", color: ink },
      hoverlabel: { bgcolor: bg, bordercolor: grid, font: { color: ink, size: 12 } },
      scene: { xaxis: ax("Stress [MPa]", [300, 1000, 3000, 10000, 30000, 100000]), yaxis: ax("CO₂ [t]", [10, 30, 100, 300]), zaxis: ax("Displacement [mm]", [0.1, 0.3, 1, 3, 10, 30]),
        camera: camera || { eye: { x: 1.25, y: -1.35, z: 0.75 } }, aspectmode: "cube" }
    };
    Plotly.react(el, traces, layout, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ["toImage", "resetCameraLastSave3d"] });
    if (!el._camHook) { el._camHook = true; el.on("plotly_relayout", e => { if (e["scene.camera"]) camera = e["scene.camera"]; }); }
    const tot = F.reduce((s, f) => s + f.length, 0);
    ro.innerHTML = mode === "enforce" ? `With σ ≤ σy/${d3.format(".2f")(sf)}, <b>${tot}</b> designs form the per-alloy fronts.` : `Without the constraint, <b>${tot}</b> designs are non-dominated within their own alloy.`;
  }
  register(draw);
})();
}

Promise.all(["data/tosm.json", "data/simjeb.json"].map(u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ": HTTP " + r.status); return r.json(); })))
  .then(([tosm, sj]) => startTOSM(Object.assign(tosm, sj)))
  .catch(e => { document.querySelectorAll(".chart").forEach(el => el.innerHTML = '<p class="readout">Could not load the data (' + e.message + '). Serve the folder over HTTP, e.g. <code>python -m http.server</code>.</p>'); });
