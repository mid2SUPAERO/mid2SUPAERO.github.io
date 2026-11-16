/*!
 * sm-ui.js — small drawing helpers shared by the widgets (D3 v7).
 */
(function (global) {
  "use strict";
  const d3 = global.d3;
  let uid = 0;

  /**
   * Draw an empty plot frame (grid, axes, labels) into an <svg> and return
   * its scales plus a clipped group to draw the data into.
   */
  function frame(svgNode, o) {
    const svg = d3.select(svgNode).attr("viewBox", `0 0 ${o.width} ${o.height}`);
    svg.selectAll("*").remove();
    const m = Object.assign({ top: 16, right: 14, bottom: 38, left: 46 }, o.margin || {});
    const iw = o.width - m.left - m.right, ih = o.height - m.top - m.bottom;
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
    const x = (o.xLog ? d3.scaleLog() : d3.scaleLinear()).domain(o.xDomain).range([0, iw]);
    const y = (o.yLog ? d3.scaleLog() : d3.scaleLinear()).domain(o.yDomain).range([ih, 0]);
    const xAxis = d3.axisBottom(x).ticks(o.xTicks === undefined ? 6 : o.xTicks, o.xFormat || (o.xLog ? "~s" : undefined)).tickSizeOuter(0);
    const yAxis = d3.axisLeft(y).ticks(o.yTicks === undefined ? 5 : o.yTicks, o.yFormat || (o.yLog ? "~g" : undefined)).tickSizeOuter(0);
    if (o.xTickValues) xAxis.tickValues(o.xTickValues).tickFormat(d3.format("d"));
    if (o.grid !== false) {
      const yt = o.yLog ? y.ticks(o.yTicks === undefined ? 5 : o.yTicks) : y.ticks(o.yTicks === undefined ? 5 : o.yTicks);
      g.append("g").selectAll("line").data(yt).join("line").attr("class", "sm-gridline")
        .attr("x1", 0).attr("x2", iw).attr("y1", (d) => y(d)).attr("y2", (d) => y(d));
    }
    g.append("g").attr("class", "sm-axis").attr("transform", `translate(0,${ih})`).call(xAxis);
    g.append("g").attr("class", "sm-axis").call(yAxis);
    if (o.xLabel) g.append("text").attr("class", "sm-axislabel").attr("x", iw / 2).attr("y", ih + 31).attr("text-anchor", "middle").text(o.xLabel);
    if (o.yLabel) g.append("text").attr("class", "sm-axislabel").attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -m.left + 12).attr("text-anchor", "middle").text(o.yLabel);
    if (o.title) g.append("text").attr("class", "sm-plot-title").attr("x", 0).attr("y", -5).text(o.title);
    const id = "sm-clip-" + (++uid);
    g.append("clipPath").attr("id", id).append("rect").attr("width", iw).attr("height", ih);
    const body = g.append("g").attr("clip-path", `url(#${id})`);
    return { svg, g, body, x, y, iw, ih, margin: m };
  }

  function linePath(xs, ys, f) {
    return d3.line().defined((d) => Number.isFinite(d[1])).x((d) => f.x(d[0])).y((d) => f.y(d[1]))(xs.map((v, i) => [v, ys[i]]));
  }
  function areaPath(xs, lo, hi, f) {
    return d3.area().x((d) => f.x(d[0])).y0((d) => f.y(d[1])).y1((d) => f.y(d[2]))(xs.map((v, i) => [v, lo[i], hi[i]]));
  }
  function fmt(v, digits) {
    if (!Number.isFinite(v)) return v === Infinity ? "∞" : "–";
    const a = Math.abs(v);
    if (a !== 0 && (a < 0.001 || a >= 1e5)) return v.toExponential(1);
    return v.toFixed(digits === undefined ? (a < 1 ? 3 : a < 10 ? 2 : a < 100 ? 1 : 0) : digits);
  }
  /** Wire an <input type=range> to its <output> and a callback. */
  function slider(root, sel, onInput, format) {
    const el = root.querySelector(sel);
    const out = el.parentElement.querySelector("output");
    const show = () => { if (out) out.textContent = format ? format(+el.value) : el.value; };
    el.addEventListener("input", () => { show(); onInput(+el.value); });
    show();
    return { el, set: (v) => { el.value = v; show(); } };
  }
  /**
   * Outline of the region where a field sampled on an nx-by-ny grid of the
   * unit square (values[j * nx + i] at (i/(nx-1), j/(ny-1))) is >= level, as
   * an SVG path in the pixel coordinates of frame f (whose domains are in the
   * units given by toX, toY).
   */
  function contourPath(values, nx, ny, level, f, toX, toY) {
    const c = d3.contours().size([nx, ny]).thresholds([level])(values)[0];
    const proj = d3.geoTransform({
      point: function (px, py) { this.stream.point(f.x(toX((px - 0.5) / (nx - 1))), f.y(toY((py - 0.5) / (ny - 1)))); },
    });
    return d3.geoPath(proj)(c) || "";
  }
  function mountAll(name, fn) {
    const run = () => document.querySelectorAll(`[data-widget='${name}']`).forEach((root) => {
      if (root.dataset.mounted) return;
      root.dataset.mounted = "1";
      fn(root);
    });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  }

  global.SMUI = { frame, linePath, areaPath, fmt, slider, mountAll, contourPath };
})(window);
