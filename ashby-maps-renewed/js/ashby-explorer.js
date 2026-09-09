// Ashby-Explorer: an interactive stiffness-density (E vs rho) chart with a
// draggable material-index guideline, in the spirit of the Cambridge
// Engineering Department's interactive material-selection charts.
//
// Self-contained, no dependencies. Mounts into every
// <div class="widget" data-widget="ashby-explorer"></div> found on the page.
(function () {
  "use strict";

  var MATERIALS = [
    { name: "Natural rubber", family: "Elastomers", rho: 950, E: 0.00165 },
    { name: "Polyurethane", family: "Elastomers", rho: 1200, E: 0.01625 },
    { name: "Al/SiC composite", family: "Composites", rho: 2780, E: 90.5 },
    { name: "CFRP epoxy", family: "Composites", rho: 1565, E: 54.9 },
    { name: "GFRP epoxy", family: "Composites", rho: 1860, E: 21.4 },
    { name: "Flexible polymer foam", family: "Foams", rho: 54, E: 0.002 },
    { name: "Rigid polymer foam", family: "Foams", rho: 320, E: 0.34 },
    { name: "Al-alloys", family: "Metals & alloys", rho: 2755, E: 72 },
    { name: "Nickel", family: "Metals & alloys", rho: 8890, E: 205 },
    { name: "Stainless steel", family: "Metals & alloys", rho: 7740, E: 200 },
    { name: "Titanium alloys", family: "Metals & alloys", rho: 4610, E: 115 },
    { name: "Epoxies", family: "Polymers", rho: 1270, E: 2.41 },
    { name: "Phenolics", family: "Polymers", rho: 1280, E: 3.795 },
    { name: "Polyamides", family: "Polymers", rho: 1135, E: 1.49 },
    { name: "Polycarbonate", family: "Polymers", rho: 1200, E: 2.38 },
    { name: "Hardwood oak", family: "Natural materials", rho: 940, E: 22.9 },
    { name: "Plywood", family: "Natural materials", rho: 750, E: 6.5 },
    { name: "Softwood pine", family: "Natural materials", rho: 500, E: 12 },
    { name: "Alumina", family: "Technical ceramics", rho: 3700, E: 330 },
    { name: "Silicon carbide", family: "Technical ceramics", rho: 3100, E: 400 },
    { name: "Silicon nitride", family: "Technical ceramics", rho: 3195, E: 310 },
    { name: "Zirconia", family: "Technical ceramics", rho: 5400, E: 200 }
  ];

  var ALWAYS_LABELLED = ["CFRP epoxy", "Softwood pine", "Natural rubber", "Silicon carbide", "Titanium alloys"];

  var FAMILY_COLORS = {
    "Composites": "var(--ae-c-composites)",
    "Elastomers": "var(--ae-c-elastomers)",
    "Foams": "var(--ae-c-foams)",
    "Metals & alloys": "var(--ae-c-metals)",
    "Natural materials": "var(--ae-c-natural)",
    "Polymers": "var(--ae-c-polymers)",
    "Technical ceramics": "var(--ae-c-ceramics)"
  };

  var PRESETS = [
    { key: "tie", slope: 1, label: "Tie · slope 1", formula: "M = E/ρ" },
    { key: "beam", slope: 2, label: "Beam / shaft · slope 2", formula: "M = √E /ρ" },
    { key: "panel", slope: 3, label: "Panel · slope 3", formula: "M = E^{1/3}/ρ" }
  ];

  var RHO_MIN = 30, RHO_MAX = 10000;
  var E_MIN = 0.001, E_MAX = 1000;
  var W = 720, H = 480;
  var MARGIN = { top: 18, right: 18, bottom: 44, left: 54 };
  var PLOT_W = W - MARGIN.left - MARGIN.right;
  var PLOT_H = H - MARGIN.top - MARGIN.bottom;

  var log10 = Math.log10 || function (x) { return Math.log(x) / Math.LN10; };
  var LX_MIN = log10(RHO_MIN), LX_MAX = log10(RHO_MAX);
  var LY_MIN = log10(E_MIN), LY_MAX = log10(E_MAX);
  var PX_PER_DEC_X = PLOT_W / (LX_MAX - LX_MIN);
  var PX_PER_DEC_Y = PLOT_H / (LY_MAX - LY_MIN);

  function xPix(rho) { return MARGIN.left + (log10(rho) - LX_MIN) * PX_PER_DEC_X; }
  function yPix(E) { return MARGIN.top + (1 - (log10(E) - LY_MIN) / (LY_MAX - LY_MIN)) * PLOT_H; }

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function fmtNum(x) {
    if (x >= 100) return x.toFixed(0);
    if (x >= 1) return x.toFixed(1);
    if (x >= 0.01) return x.toFixed(3);
    return x.toExponential(1);
  }

  // logM = c / slope  (derived in the article: log E = slope*log(rho) + slope*log M)
  function cFromMaterial(mat, slope) {
    return log10(mat.E) - slope * log10(mat.rho);
  }

  function bestMaterial(slope) {
    var best = null, bestC = -Infinity;
    MATERIALS.forEach(function (m) {
      var c = cFromMaterial(m, slope);
      if (c > bestC) { bestC = c; best = m; }
    });
    return { material: best, c: bestC };
  }

  function buildDecadeTicks(min, max) {
    var ticks = [];
    var start = Math.ceil(log10(min) - 1e-9);
    var end = Math.floor(log10(max) + 1e-9);
    for (var p = start; p <= end; p++) ticks.push(Math.pow(10, p));
    return ticks;
  }

  function superscriptLabel(parent, value, x, y, anchor) {
    var p = Math.round(Math.log10(value));
    var t = svgEl("text", { class: "ae-tick", x: x, y: y, "text-anchor": anchor || "middle" });
    t.appendChild(document.createTextNode("10"));
    var tsp = svgEl("tspan", { "baseline-shift": "super", "font-size": "7.5" });
    tsp.textContent = String(p);
    t.appendChild(tsp);
    parent.appendChild(t);
  }

  function mount(root) {
    root.classList.add("ashby-explorer");

    // ---- controls ----
    var controls = document.createElement("div");
    controls.className = "ae-controls";

    var presetsWrap = document.createElement("div");
    presetsWrap.className = "ae-presets";
    var buttons = {};
    PRESETS.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ae-preset";
      b.textContent = p.label;
      b.addEventListener("click", function () { setSlope(p.slope, p.key); });
      presetsWrap.appendChild(b);
      buttons[p.key] = b;
    });
    controls.appendChild(presetsWrap);

    var slopeRow = document.createElement("div");
    slopeRow.className = "ae-slope-row";
    var slopeLabel = document.createElement("span");
    slopeLabel.textContent = "slope";
    var slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0.5";
    slider.max = "4";
    slider.step = "0.05";
    slider.value = "1";
    var slopeVal = document.createElement("span");
    slopeVal.style.fontFamily = "IBM Plex Mono, ui-monospace, monospace";
    slopeRow.appendChild(slopeLabel);
    slopeRow.appendChild(slider);
    slopeRow.appendChild(slopeVal);
    controls.appendChild(slopeRow);

    var readout = document.createElement("div");
    readout.className = "ae-readout";
    controls.appendChild(readout);

    root.appendChild(controls);

    // ---- svg ----
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Interactive stiffness-density chart with draggable material-index guideline" });
    root.appendChild(svg);

    var clipId = "ae-clip-" + Math.random().toString(36).slice(2, 9);
    var defs = svgEl("defs", {});
    var clip = svgEl("clipPath", { id: clipId });
    clip.appendChild(svgEl("rect", { x: MARGIN.left, y: MARGIN.top, width: PLOT_W, height: PLOT_H }));
    defs.appendChild(clip);
    svg.appendChild(defs);

    // gridlines
    var gridG = svgEl("g", {});
    buildDecadeTicks(RHO_MIN, RHO_MAX).forEach(function (v) {
      var x = xPix(v);
      gridG.appendChild(svgEl("line", { class: "ae-gridline", x1: x, x2: x, y1: MARGIN.top, y2: MARGIN.top + PLOT_H }));
      superscriptLabel(gridG, v, x, MARGIN.top + PLOT_H + 16, "middle");
    });
    buildDecadeTicks(E_MIN, E_MAX).forEach(function (v) {
      var y = yPix(v);
      gridG.appendChild(svgEl("line", { class: "ae-gridline", x1: MARGIN.left, x2: MARGIN.left + PLOT_W, y1: y, y2: y }));
      superscriptLabel(gridG, v, MARGIN.left - 10, y + 3, "end");
    });
    svg.appendChild(gridG);

    svg.appendChild(svgEl("rect", { class: "ae-frame", x: MARGIN.left, y: MARGIN.top, width: PLOT_W, height: PLOT_H }));

    svg.appendChild(svgEl("text", { class: "ae-axis-label", x: MARGIN.left + PLOT_W / 2, y: H - 6, "text-anchor": "middle" }))
      .textContent = "Density ρ (kg/m³)";
    var yLab = svgEl("text", { class: "ae-axis-label", x: 0, y: 0, "text-anchor": "middle", transform: "translate(14," + (MARGIN.top + PLOT_H / 2) + ") rotate(-90)" });
    yLab.textContent = "Young's modulus E (GPa)";
    svg.appendChild(yLab);

    // clipped group: points + guideline
    var clipped = svgEl("g", { "clip-path": "url(#" + clipId + ")" });
    svg.appendChild(clipped);

    var pointsG = svgEl("g", {});
    var pointEls = MATERIALS.map(function (m) {
      var g = svgEl("g", {});
      var r = m.name === "Natural rubber" || m.name === "Flexible polymer foam" ? 5 : 5.5;
      var c = svgEl("circle", { class: "ae-point", cx: xPix(m.rho), cy: yPix(m.E), r: r, fill: FAMILY_COLORS[m.family] });
      var title = svgEl("title", {});
      title.textContent = m.name + " (" + m.family + ") — ρ=" + m.rho + " kg/m³, E=" + fmtNum(m.E) + " GPa";
      c.appendChild(title);
      g.appendChild(c);
      var staticLabel = null;
      if (ALWAYS_LABELLED.indexOf(m.name) !== -1) {
        staticLabel = svgEl("text", { class: "ae-label", x: xPix(m.rho) + 8, y: yPix(m.E) - 7 });
        staticLabel.textContent = m.name;
        g.appendChild(staticLabel);
      }
      pointsG.appendChild(g);
      return { mat: m, circle: c, staticLabel: staticLabel };
    });
    clipped.appendChild(pointsG);

    var guideline = svgEl("line", { class: "ae-guideline" });
    var guidelineHit = svgEl("line", { class: "ae-guideline-hit" });
    clipped.appendChild(guideline);
    clipped.appendChild(guidelineHit);

    var optimalLabel = svgEl("text", { class: "ae-label", "font-weight": "600" });
    clipped.appendChild(optimalLabel);

    // legend
    var legend = svgEl("g", { class: "ae-legend", transform: "translate(" + (MARGIN.left + 10) + "," + (MARGIN.top + 14) + ")" });
    var families = Object.keys(FAMILY_COLORS);
    families.forEach(function (f, i) {
      var col = i % 2, row = Math.floor(i / 2);
      var gx = col * 145, gy = row * 15;
      legend.appendChild(svgEl("circle", { cx: gx, cy: gy, r: 4, fill: FAMILY_COLORS[f] }));
      var t = svgEl("text", { x: gx + 9, y: gy + 3.5 });
      t.textContent = f;
      legend.appendChild(t);
    });
    svg.appendChild(legend);

    // caption
    var fig = document.createElement("figcaption");
    fig.innerHTML = "Drag the dashed guideline, or pick a case above: it slides parallel to itself along the current slope, and every material below it dims out of contention. The material that survives longest, up and to the left, is the index-optimal choice — the same 22-material set used throughout this article.";
    root.appendChild(fig);

    // ---- state ----
    var state = { slope: 1, c: 0, presetKey: "tie" };

    function setSlope(slope, presetKey) {
      state.slope = slope;
      state.presetKey = presetKey || null;
      var b = bestMaterial(slope);
      state.c = b.c; // snap to the optimum whenever the case/slope changes
      slider.value = String(slope);
      render();
    }

    function dragTo(c) {
      state.c = c;
      state.presetKey = null;
      render();
    }

    function render() {
      var slope = state.slope, c = state.c;

      // guideline endpoints in log space -> pixel space, generously overshot then clipped by <clipPath>
      var lx0 = LX_MIN - 1, lx1 = LX_MAX + 1;
      var ly0 = slope * lx0 + c, ly1 = slope * lx1 + c;
      var x0 = MARGIN.left + (lx0 - LX_MIN) * PX_PER_DEC_X;
      var x1 = MARGIN.left + (lx1 - LX_MIN) * PX_PER_DEC_X;
      var y0 = MARGIN.top + (1 - (ly0 - LY_MIN) / (LY_MAX - LY_MIN)) * PLOT_H;
      var y1 = MARGIN.top + (1 - (ly1 - LY_MIN) / (LY_MAX - LY_MIN)) * PLOT_H;
      [guideline, guidelineHit].forEach(function (l) {
        l.setAttribute("x1", x0); l.setAttribute("y1", y0);
        l.setAttribute("x2", x1); l.setAttribute("y2", y1);
      });

      pointEls.forEach(function (p) {
        var above = cFromMaterial(p.mat, slope) >= c - 1e-9;
        p.circle.classList.toggle("dim", !above);
      });

      var best = bestMaterial(slope);
      best.above = true;
      pointEls.forEach(function (p) {
        p.circle.classList.toggle("optimal", p.mat === best.material);
        if (p.staticLabel) p.staticLabel.style.display = (p.mat === best.material) ? "none" : "";
      });
      optimalLabel.setAttribute("x", xPix(best.material.rho) + 8);
      optimalLabel.setAttribute("y", yPix(best.material.E) - 18 < MARGIN.top + 10 ? yPix(best.material.E) + 20 : yPix(best.material.E) - 18);
      optimalLabel.textContent = best.material.name + " ★";

      var M = Math.pow(10, c / slope);
      var preset = PRESETS.filter(function (p) { return p.key === state.presetKey; })[0];
      var formulaTxt = preset ? preset.formula.replace(/\^\{?1\/(\d)\}?/, "<sup>1/$1</sup>").replace("√E", "&radic;E")
        : ("M = E<sup>" + (1 / slope).toFixed(2) + "</sup>/&rho;");
      readout.innerHTML =
        "slope = <b>" + slope.toFixed(2) + "</b> &nbsp; (" + formulaTxt + ")<br>" +
        "current M = <b>" + M.toExponential(2) + "</b><br>" +
        "optimal: <span class=\"ae-optimal\">" + best.material.name + "</span>";

      slopeVal.textContent = slope.toFixed(2);
      PRESETS.forEach(function (p) { buttons[p.key].classList.toggle("active", state.presetKey === p.key); });
    }

    // ---- interaction: drag guideline ----
    var dragging = false, dragStartY = 0, dragStartC = 0;
    function pointerY(evt) {
      var rect = svg.getBoundingClientRect();
      var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return (clientY - rect.top) * (H / rect.height);
    }
    function onDown(evt) {
      dragging = true;
      dragStartY = pointerY(evt);
      dragStartC = state.c;
      evt.preventDefault();
    }
    function onMove(evt) {
      if (!dragging) return;
      var dy = pointerY(evt) - dragStartY;
      var dLogE = -dy / PX_PER_DEC_Y;
      dragTo(dragStartC + dLogE);
      evt.preventDefault();
    }
    function onUp() { dragging = false; }
    guidelineHit.addEventListener("mousedown", onDown);
    guidelineHit.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    slider.addEventListener("input", function () {
      setSlope(parseFloat(slider.value), null);
    });

    setSlope(1, "tie");
  }

  function init() {
    var roots = document.querySelectorAll('.widget[data-widget="ashby-explorer"]');
    roots.forEach ? roots.forEach(mount) : Array.prototype.forEach.call(roots, mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
