/*!
 * spatial-kriging.js — "Spatial Kriging Explorer" (GP_tutorial_2.ipynb,
 * "Kriging the French temperatures" example).
 * A 2-D Gaussian process over longitude/latitude: the ten weather stations
 * and average temperatures are the notebook's own dataset. Drag a station
 * to move it, click anywhere inside France to add a new one at the
 * temperature set by the slider, double-click a station to remove it.
 * The France outline is a simplified real coastline (mainland + Corsica,
 * ~410 points, extracted offline from Natural Earth 1:50m data) so the
 * "schematic map" reads as an actual map, not a rectangle.
 */
(function () {
  "use strict";

  const DEFAULT_STATIONS = [
    { name: "Paris", lon: 2.3522, lat: 48.8566, t: 15.2 },
    { name: "Lyon", lon: 4.8357, lat: 45.7640, t: 16.5 },
    { name: "Marseille", lon: 5.3698, lat: 43.2965, t: 18.3 },
    { name: "Bordeaux", lon: -0.5792, lat: 44.8378, t: 17.1 },
    { name: "Toulouse", lon: 1.4442, lat: 43.6047, t: 17.8 },
    { name: "Nantes", lon: -1.5536, lat: 47.2184, t: 14.9 },
    { name: "Strasbourg", lon: 7.7521, lat: 48.5734, t: 13.7 },
    { name: "Lille", lon: 3.0573, lat: 50.6292, t: 14.2 },
    { name: "Nice", lon: 7.2620, lat: 43.7102, t: 19.1 },
    { name: "Rennes", lon: -1.6761, lat: 48.0814, t: 14.5 },
  ];

  function mount(root) {
    const d3s = window.d3;
    const GP = window.GPCore;
    const rings = window.FRANCE_OUTLINE_RINGS || [];

    const state = {
      stations: DEFAULT_STATIONS.map((s) => ({ ...s })),
      l: 3,
      kernel: "matern52",
      mode: "temp", // "temp" | "uncertainty"
      placeTemp: 16,
    };

    const width = 660, height = 460;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    root.innerHTML = `
      <div class="gpw-controls">
        <label>Kernel
          <select class="sk-kernel">
            <option value="matern52">Matérn 5/2</option>
            <option value="squared_exponential">Squared-Exponential</option>
            <option value="matern32">Matérn 3/2</option>
            <option value="exponential">Exponential (OU)</option>
          </select>
        </label>
        <label>Length-scale ℓ = <span class="sk-l-val">3.0</span>°
          <input type="range" class="sk-l" min="0.5" max="8" step="0.1" value="3">
        </label>
        <label>New-station temp = <span class="sk-temp-val">16.0</span>°C
          <input type="range" class="sk-temp" min="-5" max="25" step="0.5" value="16">
        </label>
        <label class="sk-mode-toggle">
          <input type="radio" name="sk-mode" value="temp" checked> Temperature
        </label>
        <label class="sk-mode-toggle">
          <input type="radio" name="sk-mode" value="uncertainty"> Uncertainty
        </label>
        <button class="sk-reset" type="button">Reset stations</button>
      </div>
      <svg class="sk-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Interactive spatial kriging map of France"></svg>
      <p class="gpw-caption">Click inside France to add a station at the slider's temperature · drag a station to move it ·
        double-click to remove it. Schematic equirectangular projection (lon = x, lat = y), same ten cities and
        temperatures as <code>GP_tutorial_2.ipynb</code>'s kriging example.</p>
    `;

    const svg = d3s.select(root.querySelector(".sk-svg"));
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const lonExtent = [-5, 10.5], latExtent = [41, 51.5];
    const x = d3s.scaleLinear().domain(lonExtent).range([0, innerW]);
    const y = d3s.scaleLinear().domain(latExtent).range([innerH, 0]); // invert: higher lat = up

    // ---- France outline (clip path + visible border) ----
    const ringPath = d3s.line().x((d) => x(d[0])).y((d) => y(d[1])).curve(d3s.curveLinearClosed);
    const clipId = "sk-clip-" + Math.random().toString(36).slice(2);
    const clip = svg.append("clipPath").attr("id", clipId);
    rings.forEach((ring) => clip.append("path").attr("d", ringPath(ring)));

    g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "#eef3f8");

    // Click-to-add catcher: appended BEFORE the heatmap/border/stations so
    // stations stay on top and keep receiving their own drag/dblclick
    // events; the heatmap cells and border are pointer-events:none in CSS
    // so clicks on the map (not on a station) fall through to this rect.
    g.append("rect").attr("width", innerW).attr("height", innerH).attr("fill", "transparent")
      .on("click", function (event) {
        const [mx, my] = d3s.pointer(event);
        const lon = x.invert(mx), lat = y.invert(my);
        if (!insideFrance(lon, lat)) return;
        state.stations.push({ name: "New", lon, lat, t: state.placeTemp, __id: Math.random() });
        recompute();
      });

    const heatG = g.append("g").attr("clip-path", `url(#${clipId})`).attr("pointer-events", "none");
    const borderG = g.append("g").attr("pointer-events", "none");
    rings.forEach((ring) => borderG.append("path").attr("d", ringPath(ring))
      .attr("fill", "none").attr("stroke", "#9aa6ad").attr("stroke-width", 1.2));

    const stationsG = g.append("g");
    const labelsG = g.append("g");

    // point-in-polygon test against all rings (mainland OR corsica); union of two simple polygons
    function insideFrance(lon, lat) {
      return rings.some((ring) => d3s.polygonContains(ring, [lon, lat]));
    }

    const GRID_NX = 70, GRID_NY = 50;
    const gridLons = GP.linspace(lonExtent[0], lonExtent[1], GRID_NX);
    const gridLats = GP.linspace(latExtent[0], latExtent[1], GRID_NY);
    const gridPoints = [];
    const gridInside = [];
    for (let j = 0; j < GRID_NY; j++) {
      for (let i = 0; i < GRID_NX; i++) {
        const lon = gridLons[i], lat = gridLats[j];
        gridPoints.push({ x: lon, y: lat });
        gridInside.push(insideFrance(lon, lat));
      }
    }
    const cellW = innerW / GRID_NX, cellH = innerH / GRID_NY;

    function recompute() {
      const stations = state.stations;
      if (stations.length < 2) {
        heatG.selectAll("rect").remove();
      } else {
        const points = stations.map((s) => ({ x: s.lon, y: s.lat }));
        const Z = stations.map((s) => s.t);
        const meanT = Z.reduce((a, b) => a + b, 0) / Z.length;
        const sd = Math.sqrt(Z.reduce((a, b) => a + (b - meanT) * (b - meanT), 0) / Z.length) || 1;
        const opts = { kernel: state.kernel, l: state.l, sigmaF: Math.max(sd, 0.5), sigmaN: 0.15 };
        const { mean, std } = GP.gpRegress2D(points, Z, gridPoints, opts);

        const tExtent = d3s.extent(mean);
        const colorTemp = d3s.scaleSequential(d3s.interpolateYlOrRd).domain(tExtent[0] === tExtent[1] ? [tExtent[0] - 1, tExtent[0] + 1] : tExtent);
        const sMax = Math.max(1e-6, ...std);
        const colorUnc = d3s.scaleSequential(d3s.interpolatePurples).domain([0, sMax]);

        const cellData = [];
        for (let k = 0; k < gridPoints.length; k++) {
          if (!gridInside[k]) continue;
          const i = k % GRID_NX, j = Math.floor(k / GRID_NX);
          cellData.push({ k, i, j, v: state.mode === "temp" ? mean[k] : std[k] });
        }
        const color = state.mode === "temp" ? colorTemp : colorUnc;

        const sel = heatG.selectAll("rect").data(cellData, (d) => d.k);
        sel.exit().remove();
        sel.enter().append("rect")
          .merge(sel)
          .attr("x", (d) => x(gridLons[d.i]) - cellW / 2)
          .attr("y", (d) => y(gridLats[d.j]) - cellH / 2)
          .attr("width", cellW + 0.6)
          .attr("height", cellH + 0.6)
          .attr("fill", (d) => color(d.v));
      }

      const sSel = stationsG.selectAll("circle").data(stations, (d, i) => d.name + i + d.__id);
      sSel.exit().remove();
      const sEnter = sSel.enter().append("circle").attr("r", 6).attr("class", "sk-station");
      sEnter.merge(sSel)
        .attr("cx", (d) => x(d.lon)).attr("cy", (d) => y(d.lat))
        .call(d3s.drag().on("drag", function (event, d) {
          const lon = x.invert(event.x), lat = y.invert(event.y);
          if (insideFrance(lon, lat)) { d.lon = lon; d.lat = lat; }
          d3s.select(this).attr("cx", x(d.lon)).attr("cy", y(d.lat));
          drawLabels();
          recompute();
        }))
        .on("dblclick", function (event, d) {
          event.stopPropagation();
          state.stations = state.stations.filter((s) => s !== d);
          recompute();
        });

      drawLabels();
    }

    function drawLabels() {
      const sel = labelsG.selectAll("text").data(state.stations, (d, i) => d.name + i);
      sel.exit().remove();
      sel.enter().append("text").attr("class", "sk-label").merge(sel)
        .attr("x", (d) => x(d.lon) + 8).attr("y", (d) => y(d.lat) + 3)
        .text((d) => `${d.name} ${d.t.toFixed(1)}°`);
    }

    root.querySelector(".sk-kernel").addEventListener("change", (e) => { state.kernel = e.target.value; recompute(); });
    root.querySelector(".sk-l").addEventListener("input", (e) => {
      state.l = +e.target.value;
      root.querySelector(".sk-l-val").textContent = state.l.toFixed(1);
      recompute();
    });
    root.querySelector(".sk-temp").addEventListener("input", (e) => {
      state.placeTemp = +e.target.value;
      root.querySelector(".sk-temp-val").textContent = state.placeTemp.toFixed(1);
    });
    root.querySelectorAll("input[name='sk-mode']").forEach((el) => {
      el.addEventListener("change", (e) => { state.mode = e.target.value; recompute(); });
    });
    root.querySelector(".sk-reset").addEventListener("click", () => {
      state.stations = DEFAULT_STATIONS.map((s) => ({ ...s }));
      recompute();
    });

    recompute();
  }

  function init() {
    document.querySelectorAll("[data-widget='spatial-kriging']").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
