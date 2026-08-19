/*!
 * gp-core.js — small dependency-free GP toolkit shared by the interactive
 * figures in this article (GP Playground + BO/EGO Explorer).
 *
 * Implements exactly the math walked through in Prof. Morlier's
 * GP_tutorial.ipynb / GP_tutorial_2.ipynb: a set of stationary kernels,
 * Cholesky-based GP regression (mean + variance), and a couple of
 * acquisition functions (PI, EI) for Bayesian Optimization / EGO.
 *
 * No external dependencies — this file is vendored so the article renders
 * fully offline. (c) 2026, released under the same license as the article.
 */
(function (global) {
  "use strict";

  // ---- Kernels --------------------------------------------------------
  // Each entry maps (l, sigmaF) -> a function of a *distance* (>=0). All four
  // kernels are stationary and isotropic, so the same distance-based form
  // works whether the underlying input is 1-D (Part 1/2 widgets) or 2-D
  // (the spatial kriging widget in Part 2, Euclidean distance).
  const KernelsByDistance = {
    squared_exponential: (l, sigmaF) => (d) => {
      const u = d / l;
      return sigmaF * sigmaF * Math.exp(-0.5 * u * u);
    },
    exponential: (l, sigmaF) => (d) => {
      const u = d / l;
      return sigmaF * sigmaF * Math.exp(-u);
    },
    matern32: (l, sigmaF) => (d) => {
      const u = d / l;
      const s3 = Math.sqrt(3) * u;
      return sigmaF * sigmaF * (1 + s3) * Math.exp(-s3);
    },
    matern52: (l, sigmaF) => (d) => {
      const u = d / l;
      const s5 = Math.sqrt(5) * u;
      return sigmaF * sigmaF * (1 + s5 + (5 / 3) * u * u) * Math.exp(-s5);
    },
  };

  // 1-D convenience wrapper: each kernel(l, sigmaF) returns a function k(x1, x2).
  const Kernels = {};
  for (const name of Object.keys(KernelsByDistance)) {
    Kernels[name] = (l, sigmaF) => {
      const byDist = KernelsByDistance[name](l, sigmaF);
      return (x1, x2) => byDist(Math.abs(x1 - x2));
    };
  }

  const KERNEL_LABELS = {
    squared_exponential: "Squared-Exponential",
    exponential: "Exponential (Ornstein–Uhlenbeck)",
    matern32: "Matérn 3/2",
    matern52: "Matérn 5/2",
  };

  // ---- Minimal dense linear algebra (n is always small here, <30) -----
  function choleskyDecompose(K) {
    const n = K.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = K[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) {
          L[i][j] = Math.sqrt(Math.max(sum, 1e-12));
        } else {
          L[i][j] = sum / L[j][j];
        }
      }
    }
    return L;
  }

  function solveLower(L, b) {
    // Solves L x = b, L lower-triangular.
    const n = L.length;
    const x = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let k = 0; k < i; k++) sum -= L[i][k] * x[k];
      x[i] = sum / L[i][i];
    }
    return x;
  }

  function solveUpperT(L, b) {
    // Solves L^T x = b (i.e. treats L as lower, solves its transpose).
    const n = L.length;
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = b[i];
      for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
      x[i] = sum / L[i][i];
    }
    return x;
  }

  /**
   * Fit + predict a zero-mean GP regression.
   * @param {number[]} X training inputs (1D)
   * @param {number[]} Y training outputs
   * @param {number[]} Xstar query inputs
   * @param {object} opts {kernel, l, sigmaF, sigmaN}
   * @returns {{mean:number[], std:number[], logMarginalLikelihood:number}}
   */
  function gpRegress(X, Y, Xstar, opts) {
    const kernelFn = Kernels[opts.kernel](opts.l, opts.sigmaF);
    const n = X.length;
    const K = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => kernelFn(X[i], X[j]) + (i === j ? opts.sigmaN * opts.sigmaN : 0))
    );
    const L = choleskyDecompose(K);
    const alpha = solveUpperT(L, solveLower(L, Y));

    const mean = new Array(Xstar.length);
    const std = new Array(Xstar.length);
    for (let t = 0; t < Xstar.length; t++) {
      const kStar = X.map((xi) => kernelFn(xi, Xstar[t]));
      mean[t] = kStar.reduce((s, k, i) => s + k * alpha[i], 0);
      const v = solveLower(L, kStar);
      const kss = kernelFn(Xstar[t], Xstar[t]);
      const varT = Math.max(kss - v.reduce((s, vi) => s + vi * vi, 0), 1e-10);
      std[t] = Math.sqrt(varT);
    }

    // log marginal likelihood = -1/2 y^T alpha - sum(log diag L) - n/2 log(2pi)
    let logDet = 0;
    for (let i = 0; i < n; i++) logDet += Math.log(L[i][i]);
    const dataFit = -0.5 * Y.reduce((s, yi, i) => s + yi * alpha[i], 0);
    const lml = dataFit - logDet - (n / 2) * Math.log(2 * Math.PI);

    return { mean, std, logMarginalLikelihood: lml };
  }

  /**
   * The Gram matrix K used to fit the GP, exposed so the UI can render it as
   * a heatmap (as GP_tutorial.ipynb does with plt.imshow(covXXs) and
   * plt.imshow(covXX_noisy)).
   * @param {number[]} X training inputs (1D)
   * @param {object} opts {kernel, l, sigmaF, sigmaN}
   * @param {boolean} withNoise include the sigma_n^2 diagonal jitter
   */
  function buildGramMatrix(X, opts, withNoise) {
    const kernelFn = Kernels[opts.kernel](opts.l, opts.sigmaF);
    const n = X.length;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => kernelFn(X[i], X[j]) + (withNoise && i === j ? opts.sigmaN * opts.sigmaN : 0))
    );
  }

  /**
   * 2-D counterpart of gpRegress, used by the spatial kriging widget. Points
   * are {x, y} objects (e.g. longitude/latitude); distance is Euclidean.
   * @param {{x:number,y:number}[]} points training locations
   * @param {number[]} Z training values (e.g. temperature)
   * @param {{x:number,y:number}[]} queryPoints locations to predict at
   * @param {object} opts {kernel, l, sigmaF, sigmaN}
   */
  function gpRegress2D(points, Z, queryPoints, opts) {
    const kernelFn = KernelsByDistance[opts.kernel](opts.l, opts.sigmaF);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const n = points.length;
    const K = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => kernelFn(dist(points[i], points[j])) + (i === j ? opts.sigmaN * opts.sigmaN : 0))
    );
    const L = choleskyDecompose(K);
    const alpha = solveUpperT(L, solveLower(L, Z));

    const mean = new Array(queryPoints.length);
    const std = new Array(queryPoints.length);
    for (let t = 0; t < queryPoints.length; t++) {
      const kStar = points.map((p) => kernelFn(dist(p, queryPoints[t])));
      mean[t] = kStar.reduce((s, k, i) => s + k * alpha[i], 0);
      const v = solveLower(L, kStar);
      const kss = kernelFn(0);
      const varT = Math.max(kss - v.reduce((s, vi) => s + vi * vi, 0), 1e-10);
      std[t] = Math.sqrt(varT);
    }
    return { mean, std };
  }

  // ---- Standard normal helpers -----------------------------------------
  function erf(x) {
    // Abramowitz-Stegun approximation, good to ~1e-7
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
      a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }
  function normCdf(x) {
    return 0.5 * (1 + erf(x / Math.SQRT2));
  }
  function normPdf(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  // ---- Acquisition functions (minimization convention, as in the PDF) --
  function expectedImprovement(mean, std, yMin, xi) {
    xi = xi || 0;
    return mean.map((m, i) => {
      const s = std[i];
      if (s < 1e-9) return 0;
      const imp = yMin - m - xi;
      const z = imp / s;
      return imp * normCdf(z) + s * normPdf(z);
    });
  }

  function probabilityOfImprovement(mean, std, yMin, xi) {
    xi = xi || 0;
    return mean.map((m, i) => {
      const s = std[i];
      if (s < 1e-9) return 0;
      const z = (yMin - m - xi) / s;
      return normCdf(z);
    });
  }

  function argmax(arr) {
    let best = -Infinity, idx = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] > best) { best = arr[i]; idx = i; }
    return idx;
  }

  function linspace(a, b, n) {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = a + ((b - a) * i) / (n - 1);
    return out;
  }

  global.GPCore = {
    Kernels,
    KernelsByDistance,
    KERNEL_LABELS,
    gpRegress,
    gpRegress2D,
    buildGramMatrix,
    choleskyDecompose,
    solveLower,
    solveUpperT,
    expectedImprovement,
    probabilityOfImprovement,
    argmax,
    linspace,
  };
})(window);
