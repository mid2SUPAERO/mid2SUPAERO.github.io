// Ashby-Explorer: eleven interactive material-property charts with a
// draggable index guideline, in the spirit of the Cambridge Engineering
// Department's interactive material-selection charts
// (www-materials.eng.cam.ac.uk/mpsite/interactive_charts/).
//
// Self-contained, no dependencies. Mounts into every
// <div class="widget" data-widget="ashby-explorer"></div> found on the page.
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Data: the same 22-material set used throughout the article, extended
  // with the extra properties the additional charts need. Values are
  // illustrative, order-of-magnitude teaching figures (like the eco-cost
  // and cost figures elsewhere in this article), not authoritative
  // datasheet/CES entries.
  // ---------------------------------------------------------------------
  var MATERIALS = [
    { name: "Natural rubber", family: "Elastomers", rho: 950, E: 0.00165, sigma_y: 20, Cm: 2.0, K1c: 1.0, elong: 500, Tmax: 80, resistivity: 1e13, recycle: 0.15, energy: 5 },
    { name: "Polyurethane", family: "Elastomers", rho: 1200, E: 0.01625, sigma_y: 30, Cm: 3.0, K1c: 2.0, elong: 400, Tmax: 90, resistivity: 1e13, recycle: 0.15, energy: 90 },
    { name: "Al/SiC composite", family: "Composites", rho: 2780, E: 90.5, sigma_y: 400, Cm: 30.0, K1c: 15, elong: 1.0, Tmax: 300, resistivity: 5e-8, recycle: 0.05, energy: 150 },
    { name: "CFRP epoxy", family: "Composites", rho: 1565, E: 54.9, sigma_y: 550, Cm: 35.0, K1c: 25, elong: 1.5, Tmax: 150, resistivity: 1e-5, recycle: 0.05, energy: 300 },
    { name: "GFRP epoxy", family: "Composites", rho: 1860, E: 21.4, sigma_y: 300, Cm: 5.0, K1c: 20, elong: 2.5, Tmax: 120, resistivity: 1e12, recycle: 0.05, energy: 100 },
    { name: "Flexible polymer foam", family: "Foams", rho: 54, E: 0.002, sigma_y: 0.05, Cm: 3.0, K1c: 0.01, elong: 150, Tmax: 80, resistivity: 1e15, recycle: 0.1, energy: 90 },
    { name: "Rigid polymer foam", family: "Foams", rho: 320, E: 0.34, sigma_y: 8, Cm: 3.0, K1c: 0.05, elong: 5, Tmax: 100, resistivity: 1e15, recycle: 0.1, energy: 100 },
    { name: "Al-alloys", family: "Metals & alloys", rho: 2755, E: 72, sigma_y: 300, Cm: 2.0, K1c: 25, elong: 12, Tmax: 150, resistivity: 2.8e-8, recycle: 0.4, energy: 200 },
    { name: "Nickel", family: "Metals & alloys", rho: 8890, E: 205, sigma_y: 200, Cm: 15.0, K1c: 100, elong: 40, Tmax: 1000, resistivity: 7e-8, recycle: 0.3, energy: 150 },
    { name: "Stainless steel", family: "Metals & alloys", rho: 7740, E: 200, sigma_y: 300, Cm: 3.0, K1c: 80, elong: 50, Tmax: 800, resistivity: 7.2e-7, recycle: 0.6, energy: 80 },
    { name: "Titanium alloys", family: "Metals & alloys", rho: 4610, E: 115, sigma_y: 900, Cm: 35.0, K1c: 60, elong: 10, Tmax: 400, resistivity: 4.2e-7, recycle: 0.2, energy: 800 },
    { name: "Epoxies", family: "Polymers", rho: 1270, E: 2.41, sigma_y: 60, Cm: 3.0, K1c: 1.0, elong: 4, Tmax: 120, resistivity: 1e15, recycle: 0.02, energy: 140 },
    { name: "Phenolics", family: "Polymers", rho: 1280, E: 3.795, sigma_y: 40, Cm: 2.0, K1c: 1.0, elong: 1.5, Tmax: 150, resistivity: 1e13, recycle: 0.02, energy: 80 },
    { name: "Polyamides", family: "Polymers", rho: 1135, E: 1.49, sigma_y: 70, Cm: 3.0, K1c: 3.0, elong: 60, Tmax: 100, resistivity: 1e13, recycle: 0.3, energy: 120 },
    { name: "Polycarbonate", family: "Polymers", rho: 1200, E: 2.38, sigma_y: 65, Cm: 3.0, K1c: 3.0, elong: 100, Tmax: 120, resistivity: 1e15, recycle: 0.3, energy: 110 },
    { name: "Hardwood oak", family: "Natural materials", rho: 940, E: 22.9, sigma_y: 90, Cm: 1.5, K1c: 10, elong: 1.0, Tmax: 150, resistivity: 5e13, recycle: 0.5, energy: 10 },
    { name: "Plywood", family: "Natural materials", rho: 750, E: 6.5, sigma_y: 50, Cm: 1.0, K1c: 7, elong: 1.0, Tmax: 120, resistivity: 5e13, recycle: 0.3, energy: 15 },
    { name: "Softwood pine", family: "Natural materials", rho: 500, E: 12, sigma_y: 40, Cm: 0.8, K1c: 6, elong: 1.0, Tmax: 120, resistivity: 5e13, recycle: 0.5, energy: 8 },
    { name: "Alumina", family: "Technical ceramics", rho: 3700, E: 330, sigma_y: 300, Cm: 10.0, K1c: 4, elong: 0.02, Tmax: 1700, resistivity: 1e14, recycle: 0.05, energy: 50 },
    { name: "Silicon carbide", family: "Technical ceramics", rho: 3100, E: 400, sigma_y: 400, Cm: 15.0, K1c: 3.5, elong: 0.02, Tmax: 1600, resistivity: 1e5, recycle: 0.05, energy: 40 },
    { name: "Silicon nitride", family: "Technical ceramics", rho: 3195, E: 310, sigma_y: 600, Cm: 20.0, K1c: 5, elong: 0.02, Tmax: 1400, resistivity: 1e13, recycle: 0.05, energy: 80 },
    { name: "Zirconia", family: "Technical ceramics", rho: 5400, E: 200, sigma_y: 450, Cm: 15.0, K1c: 8, elong: 0.02, Tmax: 2000, resistivity: 1e10, recycle: 0.05, energy: 60 }
  ];

  var FAMILY_COLORS = {
    "Composites": "var(--ae-c-composites)",
    "Elastomers": "var(--ae-c-elastomers)",
    "Foams": "var(--ae-c-foams)",
    "Metals & alloys": "var(--ae-c-metals)",
    "Natural materials": "var(--ae-c-natural)",
    "Polymers": "var(--ae-c-polymers)",
    "Technical ceramics": "var(--ae-c-ceramics)"
  };

  var log10 = Math.log10 || function (x) { return Math.log(x) / Math.LN10; };

  function acc(key) { return function (m) { return m[key]; }; }
  var specificStiffness = function (m) { return m.E / (m.rho / 1000); };   // GPa per Mg/m3
  var specificStrength = function (m) { return m.sigma_y / (m.rho / 1000); }; // MPa per Mg/m3

  // ---------------------------------------------------------------------
  // Chart catalogue — mirrors the Cambridge "Select chart" list. Convention
  // (matching the source): "Property1 – Property2" plots Property1 on the
  // vertical (y) axis and Property2 on the horizontal (x) axis.
  //
  // guideline:true charts get the log-log draggable index line derived in
  // the article (log Y = slope·log X + slope·log M). Two charts — the ones
  // actually derived in the article text, stiffness-density and
  // strength-density — carry named engineering-case presets with slopes
  // verified against Section 2's results table. The rest expose the same
  // mechanic generically (no invented named cases), which is still exactly
  // correct for any index of the form M = Y^a / X.
  // ---------------------------------------------------------------------
  var CHARTS = [
    {
      id: "stiffness-density", label: "Young's modulus – Density",
      y: { key: "E", get: acc("E"), label: "Young's modulus E (GPa)", scale: "log" },
      x: { key: "rho", get: acc("rho"), label: "Density ρ (kg/m³)", scale: "log" },
      guideline: true,
      presets: [
        { key: "tie", slope: 1, label: "Tie · slope 1", formula: "M = E/ρ" },
        { key: "beam", slope: 2, label: "Beam / shaft · slope 2", formula: "M = √E /ρ" },
        { key: "panel", slope: 3, label: "Panel · slope 3", formula: "M = E<sup>1/3</sup>/ρ" }
      ]
    },
    {
      id: "stiffness-cost", label: "Young's modulus – Cost",
      y: { key: "E", get: acc("E"), label: "Young's modulus E (GPa)", scale: "log" },
      x: { key: "Cm", get: acc("Cm"), label: "Relative cost Cm (£/kg)", scale: "log" },
      guideline: true
    },
    {
      id: "strength-density", label: "Strength – Density",
      y: { key: "sigma_y", get: acc("sigma_y"), label: "Strength σy (MPa)", scale: "log" },
      x: { key: "rho", get: acc("rho"), label: "Density ρ (kg/m³)", scale: "log" },
      guideline: true,
      presets: [
        { key: "tie", slope: 1, label: "Tie · slope 1", formula: "M = σy/ρ" },
        { key: "beam", slope: 1.5, label: "Beam · slope 1.5", formula: "M = σy<sup>2/3</sup>/ρ" },
        { key: "panel", slope: 2, label: "Panel · slope 2", formula: "M = σy<sup>1/2</sup>/ρ" }
      ]
    },
    {
      id: "strength-toughness", label: "Strength – Toughness",
      y: { key: "sigma_y", get: acc("sigma_y"), label: "Strength σy (MPa)", scale: "log" },
      x: { key: "K1c", get: acc("K1c"), label: "Fracture toughness K1c (MPa·√m)", scale: "log" },
      guideline: true
    },
    {
      id: "strength-elongation", label: "Strength – Elongation",
      y: { key: "sigma_y", get: acc("sigma_y"), label: "Strength σy (MPa)", scale: "log" },
      x: { key: "elong", get: acc("elong"), label: "Elongation at break (%)", scale: "log" },
      guideline: true
    },
    {
      id: "strength-cost", label: "Strength – Cost",
      y: { key: "sigma_y", get: acc("sigma_y"), label: "Strength σy (MPa)", scale: "log" },
      x: { key: "Cm", get: acc("Cm"), label: "Relative cost Cm (£/kg)", scale: "log" },
      guideline: true
    },
    {
      id: "strength-temp", label: "Strength – Max service temperature",
      y: { key: "sigma_y", get: acc("sigma_y"), label: "Strength σy (MPa)", scale: "log" },
      x: { key: "Tmax", get: acc("Tmax"), label: "Max service temperature (°C)", scale: "log" },
      guideline: true
    },
    {
      id: "spec-spec", label: "Specific stiffness – Specific strength",
      y: { key: "specE", get: specificStiffness, label: "Specific stiffness E/ρ (GPa per Mg/m³)", scale: "log" },
      x: { key: "specS", get: specificStrength, label: "Specific strength σy/ρ (MPa per Mg/m³)", scale: "log" },
      guideline: true
    },
    {
      id: "resistivity-cost", label: "Electrical resistivity – Cost",
      y: { key: "resistivity", get: acc("resistivity"), label: "Electrical resistivity (Ω·m)", scale: "log" },
      x: { key: "Cm", get: acc("Cm"), label: "Relative cost Cm (£/kg)", scale: "log" },
      guideline: true
    },
    {
      id: "recycling-cost", label: "Recycle fraction – Cost",
      y: { key: "recycle", get: acc("recycle"), label: "Recycle fraction", scale: "linear", min: 0, max: 1 },
      x: { key: "Cm", get: acc("Cm"), label: "Relative cost Cm (£/kg)", scale: "log" },
      guideline: false
    },
    {
      id: "energy-cost", label: "Energy content – Cost",
      y: { key: "energy", get: acc("energy"), label: "Embodied energy (MJ/kg)", scale: "log" },
      x: { key: "Cm", get: acc("Cm"), label: "Relative cost Cm (£/kg)", scale: "log" },
      guideline: true
    }
  ];

  var W = 720, H = 480;
  var MARGIN = { top: 18, right: 18, bottom: 44, left: 62 };
  var PLOT_W = W - MARGIN.left - MARGIN.right;
  var PLOT_H = H - MARGIN.top - MARGIN.bottom;

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function fmtNum(x) {
    if (x === 0) return "0";
    var ax = Math.abs(x);
    if (ax >= 1000 || ax < 0.001) return x.toExponential(2);
    if (ax >= 100) return x.toFixed(0);
    if (ax >= 1) return x.toFixed(2);
    return x.toFixed(4);
  }

  // ---- domain + scale helpers, computed per chart from the live data ----
  function computeDomain(axis) {
    if (axis.scale === "linear") {
      return { min: axis.min != null ? axis.min : 0, max: axis.max != null ? axis.max : 1 };
    }
    var vals = MATERIALS.map(axis.get).filter(function (v) { return v > 0; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    return { min: mn / 2, max: mx * 2 };
  }

  function buildDecadeTicks(min, max) {
    var ticks = [];
    var start = Math.ceil(log10(min) - 1e-9);
    var end = Math.floor(log10(max) + 1e-9);
    for (var p = start; p <= end; p++) ticks.push(Math.pow(10, p));
    return ticks;
  }

  function buildLinearTicks(min, max) {
    var n = 5, ticks = [];
    for (var i = 0; i <= n; i++) ticks.push(min + (max - min) * i / n);
    return ticks;
  }

  function superscriptLabel(parent, value, x, y, anchor) {
    var p = Math.round(log10(value));
    var t = svgEl("text", { class: "ae-tick", x: x, y: y, "text-anchor": anchor || "middle" });
    t.appendChild(document.createTextNode("10"));
    var tsp = svgEl("tspan", { "baseline-shift": "super", "font-size": "7.5" });
    tsp.textContent = String(p);
    t.appendChild(tsp);
    parent.appendChild(t);
  }

  function mount(root) {
    root.classList.add("ashby-explorer");

    // ---- chart selector ----
    var selectRow = document.createElement("div");
    selectRow.className = "ae-select-row";
    var selectLabel = document.createElement("label");
    selectLabel.textContent = "Select chart:";
    selectLabel.setAttribute("for", "ae-select-" + Math.random().toString(36).slice(2, 7));
    var select = document.createElement("select");
    select.id = selectLabel.getAttribute("for");
    CHARTS.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.label;
      select.appendChild(opt);
    });
    selectRow.appendChild(selectLabel);
    selectRow.appendChild(select);
    root.appendChild(selectRow);

    // ---- controls (rebuilt per chart) ----
    var controls = document.createElement("div");
    controls.className = "ae-controls";
    root.appendChild(controls);

    // ---- family legend (static — same 7 families on every chart) ----
    var legendRow = document.createElement("div");
    legendRow.className = "ae-legend-row";
    Object.keys(FAMILY_COLORS).forEach(function (f) {
      var item = document.createElement("span");
      item.className = "ae-legend-item";
      var dot = document.createElement("span");
      dot.className = "ae-legend-dot";
      dot.style.background = FAMILY_COLORS[f];
      item.appendChild(dot);
      item.appendChild(document.createTextNode(f));
      legendRow.appendChild(item);
    });
    root.appendChild(legendRow);

    // ---- svg host (rebuilt per chart) ----
    var svgHost = document.createElement("div");
    root.appendChild(svgHost);

    var fig = document.createElement("figcaption");
    root.appendChild(fig);

    function buildChart(chart) {
      controls.innerHTML = "";
      svgHost.innerHTML = "";

      var xDom = computeDomain(chart.x), yDom = computeDomain(chart.y);
      var LX_MIN = chart.x.scale === "log" ? log10(xDom.min) : xDom.min;
      var LX_MAX = chart.x.scale === "log" ? log10(xDom.max) : xDom.max;
      var LY_MIN = chart.y.scale === "log" ? log10(yDom.min) : yDom.min;
      var LY_MAX = chart.y.scale === "log" ? log10(yDom.max) : yDom.max;
      var PX_PER_UNIT_X = PLOT_W / (LX_MAX - LX_MIN);
      var PX_PER_UNIT_Y = PLOT_H / (LY_MAX - LY_MIN);

      function xVal(raw) { return chart.x.scale === "log" ? log10(raw) : raw; }
      function yVal(raw) { return chart.y.scale === "log" ? log10(raw) : raw; }
      function xPix(raw) { return MARGIN.left + (xVal(raw) - LX_MIN) * PX_PER_UNIT_X; }
      function yPix(raw) { return MARGIN.top + (1 - (yVal(raw) - LY_MIN) / (LY_MAX - LY_MIN)) * PLOT_H; }

      var hasGuideline = !!chart.guideline;
      var presets = chart.presets || [];

      // -- controls: presets (if any) --
      var buttons = {};
      if (presets.length) {
        var presetsWrap = document.createElement("div");
        presetsWrap.className = "ae-presets";
        presets.forEach(function (p) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "ae-preset";
          b.textContent = p.label;
          b.addEventListener("click", function () { setSlope(p.slope, p.key); });
          presetsWrap.appendChild(b);
          buttons[p.key] = b;
        });
        controls.appendChild(presetsWrap);
      }

      var slider = null, slopeVal = null;
      if (hasGuideline) {
        var slopeRow = document.createElement("div");
        slopeRow.className = "ae-slope-row";
        var slopeLabel = document.createElement("span");
        slopeLabel.textContent = "slope";
        slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0.3"; slider.max = "4"; slider.step = "0.05"; slider.value = "1";
        slopeVal = document.createElement("span");
        slopeVal.style.fontFamily = "IBM Plex Mono, ui-monospace, monospace";
        slopeRow.appendChild(slopeLabel);
        slopeRow.appendChild(slider);
        slopeRow.appendChild(slopeVal);
        controls.appendChild(slopeRow);
      }

      var readout = document.createElement("div");
      readout.className = "ae-readout";
      controls.appendChild(readout);

      // -- svg --
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Interactive " + chart.label + " chart" + (hasGuideline ? " with draggable index guideline" : "") });
      svgHost.appendChild(svg);

      var clipId = "ae-clip-" + Math.random().toString(36).slice(2, 9);
      var defs = svgEl("defs", {});
      var clip = svgEl("clipPath", { id: clipId });
      clip.appendChild(svgEl("rect", { x: MARGIN.left, y: MARGIN.top, width: PLOT_W, height: PLOT_H }));
      defs.appendChild(clip);
      svg.appendChild(defs);

      var gridG = svgEl("g", {});
      var xTicks = chart.x.scale === "log" ? buildDecadeTicks(xDom.min, xDom.max) : buildLinearTicks(xDom.min, xDom.max);
      xTicks.forEach(function (v) {
        var x = xPix(v);
        gridG.appendChild(svgEl("line", { class: "ae-gridline", x1: x, x2: x, y1: MARGIN.top, y2: MARGIN.top + PLOT_H }));
        if (chart.x.scale === "log") superscriptLabel(gridG, v, x, MARGIN.top + PLOT_H + 16, "middle");
        else {
          var t = svgEl("text", { class: "ae-tick", x: x, y: MARGIN.top + PLOT_H + 14, "text-anchor": "middle" });
          t.textContent = v.toFixed(1);
          gridG.appendChild(t);
        }
      });
      var yTicks = chart.y.scale === "log" ? buildDecadeTicks(yDom.min, yDom.max) : buildLinearTicks(yDom.min, yDom.max);
      yTicks.forEach(function (v) {
        var y = yPix(v);
        gridG.appendChild(svgEl("line", { class: "ae-gridline", x1: MARGIN.left, x2: MARGIN.left + PLOT_W, y1: y, y2: y }));
        if (chart.y.scale === "log") superscriptLabel(gridG, v, MARGIN.left - 10, y + 3, "end");
        else {
          var ty = svgEl("text", { class: "ae-tick", x: MARGIN.left - 10, y: y + 3, "text-anchor": "end" });
          ty.textContent = v.toFixed(1);
          gridG.appendChild(ty);
        }
      });
      svg.appendChild(gridG);

      svg.appendChild(svgEl("rect", { class: "ae-frame", x: MARGIN.left, y: MARGIN.top, width: PLOT_W, height: PLOT_H }));

      var xLab = svgEl("text", { class: "ae-axis-label", x: MARGIN.left + PLOT_W / 2, y: H - 6, "text-anchor": "middle" });
      xLab.textContent = chart.x.label;
      svg.appendChild(xLab);
      var yLab = svgEl("text", { class: "ae-axis-label", x: 0, y: 0, "text-anchor": "middle", transform: "translate(16," + (MARGIN.top + PLOT_H / 2) + ") rotate(-90)" });
      yLab.textContent = chart.y.label;
      svg.appendChild(yLab);

      var clipped = svgEl("g", { "clip-path": "url(#" + clipId + ")" });
      svg.appendChild(clipped);

      var pointsG = svgEl("g", {});
      var pointEls = MATERIALS.map(function (m) {
        var xv = chart.x.get(m), yv = chart.y.get(m);
        var g = svgEl("g", {});
        var c = svgEl("circle", { class: "ae-point", cx: xPix(xv), cy: yPix(yv), r: 5.5, fill: FAMILY_COLORS[m.family] });
        var title = svgEl("title", {});
        title.textContent = m.name + " (" + m.family + ") — " + chart.x.label.split(" (")[0] + "=" + fmtNum(xv) + ", " + chart.y.label.split(" (")[0] + "=" + fmtNum(yv);
        c.appendChild(title);
        g.appendChild(c);
        pointsG.appendChild(g);
        return { mat: m, circle: c, x: xv, y: yv };
      });
      clipped.appendChild(pointsG);

      var guideline, guidelineHit, optimalLabel;
      if (hasGuideline) {
        guideline = svgEl("line", { class: "ae-guideline" });
        guidelineHit = svgEl("line", { class: "ae-guideline-hit" });
        clipped.appendChild(guideline);
        clipped.appendChild(guidelineHit);
        optimalLabel = svgEl("text", { class: "ae-label", "font-weight": "600" });
        clipped.appendChild(optimalLabel);
      }

      fig.innerHTML = hasGuideline
        ? "Drag the dashed guideline" + (presets.length ? ", or pick a case above" : "") + ": it slides parallel to itself along the current slope, and every material below it dims out of contention. The material that survives longest is the index-optimal choice for <span class=\"ae-formula\">M = Y<sup>a</sup>/X</span>. Hover any point for its name and values — the same 22-material set used throughout this article, illustrative teaching values."
        : "Hover any point for its name and values. This pair doesn't reduce to a single log&ndash;log index line (the vertical axis is a bounded fraction, not a power law), so it's shown as a plain interactive scatter rather than with a draggable guideline.";

      // ---- state + math (only meaningful when both axes are log) ----
      var state = { slope: 1, c: 0, presetKey: null };

      function cFromMaterial(mat, slope) {
        return yVal(chart.y.get(mat)) - slope * xVal(chart.x.get(mat));
      }
      function bestMaterial(slope) {
        var best = null, bestC = -Infinity;
        MATERIALS.forEach(function (m) {
          var c = cFromMaterial(m, slope);
          if (c > bestC) { bestC = c; best = m; }
        });
        return { material: best, c: bestC };
      }
      function setSlope(slope, presetKey) {
        state.slope = slope;
        state.presetKey = presetKey || null;
        state.c = bestMaterial(slope).c;
        if (slider) slider.value = String(slope);
        render();
      }
      function dragTo(c) {
        state.c = c;
        state.presetKey = null;
        render();
      }

      function render() {
        if (!hasGuideline) return;
        var slope = state.slope, c = state.c;
        var lx0 = LX_MIN - 2, lx1 = LX_MAX + 2;
        var ly0 = slope * lx0 + c, ly1 = slope * lx1 + c;
        var px0 = MARGIN.left + (lx0 - LX_MIN) * PX_PER_UNIT_X;
        var px1 = MARGIN.left + (lx1 - LX_MIN) * PX_PER_UNIT_X;
        var py0 = MARGIN.top + (1 - (ly0 - LY_MIN) / (LY_MAX - LY_MIN)) * PLOT_H;
        var py1 = MARGIN.top + (1 - (ly1 - LY_MIN) / (LY_MAX - LY_MIN)) * PLOT_H;
        [guideline, guidelineHit].forEach(function (l) {
          l.setAttribute("x1", px0); l.setAttribute("y1", py0);
          l.setAttribute("x2", px1); l.setAttribute("y2", py1);
        });

        pointEls.forEach(function (p) {
          var above = cFromMaterial(p.mat, slope) >= c - 1e-9;
          p.circle.classList.toggle("dim", !above);
        });

        var best = bestMaterial(slope);
        pointEls.forEach(function (p) { p.circle.classList.toggle("optimal", p.mat === best.material); });
        var lx = xPix(chart.x.get(best.material)), ly = yPix(chart.y.get(best.material));
        optimalLabel.setAttribute("x", lx + 8);
        optimalLabel.setAttribute("y", ly - 18 < MARGIN.top + 10 ? ly + 20 : ly - 18);
        optimalLabel.textContent = best.material.name + " ★";

        var M = Math.pow(10, c / slope);
        var preset = presets.filter(function (p) { return p.key === state.presetKey; })[0];
        var formulaTxt = preset ? preset.formula : ("M = Y<sup>" + (1 / slope).toFixed(2) + "</sup>/X");
        readout.innerHTML =
          "slope = <b>" + slope.toFixed(2) + "</b> &nbsp; (" + formulaTxt + ")<br>" +
          "current M = <b>" + M.toExponential(2) + "</b><br>" +
          "optimal: <span class=\"ae-optimal\">" + best.material.name + "</span>";
        if (slopeVal) slopeVal.textContent = slope.toFixed(2);
        presets.forEach(function (p) { buttons[p.key].classList.toggle("active", state.presetKey === p.key); });
      }

      if (hasGuideline) {
        var dragging = false, dragStartY = 0, dragStartC = 0;
        function pointerY(evt) {
          var rect = svg.getBoundingClientRect();
          var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
          return (clientY - rect.top) * (H / rect.height);
        }
        function onDown(evt) { dragging = true; dragStartY = pointerY(evt); dragStartC = state.c; evt.preventDefault(); }
        function onMove(evt) {
          if (!dragging) return;
          var dy = pointerY(evt) - dragStartY;
          var dLogY = -dy / PX_PER_UNIT_Y;
          dragTo(dragStartC + dLogY);
          evt.preventDefault();
        }
        function onUp() { dragging = false; }
        guidelineHit.addEventListener("mousedown", onDown);
        guidelineHit.addEventListener("touchstart", onDown, { passive: false });
        window.addEventListener("mousemove", onMove);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchend", onUp);
        slider.addEventListener("input", function () { setSlope(parseFloat(slider.value), null); });

        setSlope(1, presets.length ? presets[0].key : null);
      } else {
        readout.innerHTML = "no single-index guideline for this pair &mdash; explore by hovering the points.";
      }
    }

    select.addEventListener("change", function () {
      buildChart(CHARTS.filter(function (c) { return c.id === select.value; })[0]);
    });

    buildChart(CHARTS[0]);
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
