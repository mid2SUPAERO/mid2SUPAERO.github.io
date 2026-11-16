/*!
 * sm-core.js — the numerical core shared by the interactive figures of
 * "On surrogate modeling". No dependencies; everything runs in the browser.
 *
 * Contents: seeded random numbers, test functions (Forrester, Branin, wing
 * weight), two small solvers (potential flow around a Joukowski airfoil, a
 * tapered wing-box beam), a small neural network trained with Adam, designs
 * of experiments (grid, random, Latin hypercube, Halton), least-squares
 * polynomials, radial basis functions, ordinary kriging with
 * maximum-likelihood length-scales, error metrics, k-fold splitting, and a
 * symmetric eigen-solver for POD.
 *
 * These are compact teaching implementations. The companion notebook does the
 * same computations with SMT and scikit-learn; numbers agree in trend, not to
 * the last digit.
 */
(function (global) {
  "use strict";

  // ---- random numbers ------------------------------------------------------
  function rng(seed) {
    // mulberry32
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randn(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function linspace(a, b, n) {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = n === 1 ? a : a + ((b - a) * i) / (n - 1);
    return out;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---- test functions ------------------------------------------------------
  const forrester = (x) => Math.pow(6 * x - 2, 2) * Math.sin(12 * x - 4);
  // Cheap version: A f(x) + B (x - 0.5) - C. The classic choice is A=0.5, B=10, C=5.
  const forresterLo = (x, A, B, C) =>
    (A === undefined ? 0.5 : A) * forrester(x) + (B === undefined ? 10 : B) * (x - 0.5) - (C === undefined ? 5 : C);

  function branin01(u1, u2) {
    const x1 = 15 * u1 - 5, x2 = 15 * u2;
    return Math.pow(x2 - (5.1 / (4 * Math.PI * Math.PI)) * x1 * x1 + (5 / Math.PI) * x1 - 6, 2) +
      10 * (1 - 1 / (8 * Math.PI)) * Math.cos(x1) + 10;
  }

  const WING = {
    names: ["S_w", "W_fw", "A", "Λ", "q", "λ", "t_c", "N_z", "W_dg", "W_p"],
    long: ["wing area", "fuel weight in wing", "aspect ratio", "sweep", "dynamic pressure", "taper ratio",
      "thickness / chord", "ultimate load factor", "design gross weight", "paint weight"],
    limits: [[150, 200], [220, 300], [6, 10], [-10, 10], [16, 45], [0.5, 1], [0.08, 0.18], [2.5, 6], [1700, 2500], [0.025, 0.08]],
  };
  function wingWeight01(u) {
    const v = u.map((ui, i) => WING.limits[i][0] + ui * (WING.limits[i][1] - WING.limits[i][0]));
    const [Sw, Wfw, A, LamDeg, q, lam, tc, Nz, Wdg, Wp] = v;
    const c = Math.cos((LamDeg * Math.PI) / 180);
    return 0.036 * Math.pow(Sw, 0.758) * Math.pow(Wfw, 0.0035) * Math.pow(A / (c * c), 0.6) * Math.pow(q, 0.006) *
      Math.pow(lam, 0.04) * Math.pow((100 * tc) / c, -0.3) * Math.pow(Nz * Wdg, 0.49) + Sw * Wp;
  }

  // ---- two small "solvers" -------------------------------------------------
  /**
   * Potential flow around a Joukowski airfoil, by conformal mapping.
   * The circle of centre (-eps, kappa) through zeta = 1 is mapped by
   * z = zeta + 1/zeta. eps sets the thickness, kappa the camber. The Kutta
   * condition fixes the circulation. Returns n surface points, ordered from
   * the trailing edge over the upper surface to the leading edge and back
   * along the lower surface, with the pressure coefficient at each, and the
   * lift coefficient.
   */
  function joukowski(alphaDeg, kappa, eps, n) {
    n = n || 128;
    const al = (alphaDeg * Math.PI) / 180;
    const a = Math.hypot(1 + eps, kappa), beta = Math.asin(kappa / a);
    const x = new Float64Array(n), y = new Float64Array(n), cp = new Float64Array(n), s = new Float64Array(n);
    let xmin = Infinity, xmax = -Infinity;
    for (let j = 0; j < n; j++) {
      s[j] = (j + 0.5) / n;
      const th = -beta + 2 * Math.PI * s[j];
      const zr = -eps + a * Math.cos(th), zi = kappa + a * Math.sin(th);
      const den = zr * zr + zi * zi;
      x[j] = zr + zr / den; y[j] = zi - zi / den;
      const dr = 1 - (zr * zr - zi * zi) / (den * den), di = (2 * zr * zi) / (den * den);
      const w = 2 * (Math.sin(th - al) + Math.sin(al + beta));     // speed on the circle
      cp[j] = 1 - (w * w) / (dr * dr + di * di);
      if (x[j] < xmin) xmin = x[j];
      if (x[j] > xmax) xmax = x[j];
    }
    const chord = xmax - xmin;
    const xc = Float64Array.from(x, (v) => (v - xmin) / chord);
    const yc = Float64Array.from(y, (v) => v / chord);
    let cpMin = Infinity;
    for (let j = 0; j < n; j++) if (cp[j] < cpMin) cpMin = cp[j];
    return { s, xc, yc, cp, cl: (8 * Math.PI * a * Math.sin(al + beta)) / chord, cpMin, chord };
  }

  /**
   * A tapered thin-walled wing box, clamped at the root, under a uniform
   * lift load. Width and height shrink linearly to `taper` times their root
   * value; the wall thickness t is constant. Returns the tip deflection (m),
   * the largest bending stress (Pa) and the mass (kg). SI units.
   * opts.nSeg sets the number of integration segments and opts.shear adds
   * the shear deflection of the webs; a small nSeg without shear is the
   * "cheap" version of the same model.
   */
  const WINGBOX = { L: 5.5, b0: 0.6, taper: 0.5, q: 3600, E: 70e9, G: 26e9, rho: 2700, nSeg: 200, shear: true };
  function wingbox(h0, t, opts) {
    const o = Object.assign({}, WINGBOX, opts || {});
    const N = o.nSeg, dx = o.L / N;
    let tip = 0, mass = 0, sigmaMax = 0;
    for (let i = 0; i < N; i++) {
      const xm = (i + 0.5) * dx, tau = 1 - (1 - o.taper) * (xm / o.L);
      const b = o.b0 * tau, h = h0 * tau;
      const I = (b * h * h * h - (b - 2 * t) * Math.pow(h - 2 * t, 3)) / 12;
      const M = (o.q * (o.L - xm) * (o.L - xm)) / 2, V = o.q * (o.L - xm);
      tip += ((M * (o.L - xm)) / (o.E * I)) * dx;
      if (o.shear) tip += (V / (o.G * 2 * t * h)) * dx;
      mass += o.rho * (2 * t * (b + h) - 4 * t * t) * dx;
      const sig = (M * h) / (2 * I);
      if (sig > sigmaMax) sigmaMax = sig;
    }
    return { tip, sigmaMax, mass };
  }

  // ---- a small multilayer perceptron, trained with Adam ---------------------
  /**
   * sizes = [inputs, hidden..., 1]. tanh hidden units, linear output, mean
   * squared error. Written for clarity, not speed: one sample at a time,
   * gradients by hand (the chain rule, layer by layer).
   */
  function mlp(sizes, r) {
    const L = sizes.length - 1;
    const W = [], B = [], mW = [], vW = [], mB = [], vB = [], gW = [], gB = [];
    for (let l = 0; l < L; l++) {
      const nin = sizes[l], nout = sizes[l + 1];
      const w = new Float64Array(nin * nout);
      const sc = Math.sqrt(1 / nin);
      for (let i = 0; i < w.length; i++) w[i] = randn(r) * sc;
      W.push(w); B.push(new Float64Array(nout));
      mW.push(new Float64Array(w.length)); vW.push(new Float64Array(w.length)); gW.push(new Float64Array(w.length));
      mB.push(new Float64Array(nout)); vB.push(new Float64Array(nout)); gB.push(new Float64Array(nout));
    }
    const acts = sizes.map((k) => new Float64Array(k));
    const deltas = sizes.map((k) => new Float64Array(k));
    let step = 0;
    function forward(x) {
      acts[0].set(x);
      for (let l = 0; l < L; l++) {
        const nin = sizes[l], nout = sizes[l + 1], w = W[l], a = acts[l], out = acts[l + 1];
        for (let j = 0; j < nout; j++) {
          let z = B[l][j];
          const off = j * nin;
          for (let i = 0; i < nin; i++) z += w[off + i] * a[i];
          out[j] = l === L - 1 ? z : Math.tanh(z);
        }
      }
      return acts[L][0];
    }
    // opt: "adam" (default) or "gd" (plain gradient descent, w <- w - lr * grad)
    function trainBatch(X, Y, idx, lr, opt) {
      for (let l = 0; l < L; l++) { gW[l].fill(0); gB[l].fill(0); }
      let loss = 0;
      for (const n of idx) {
        const err = forward(X[n]) - Y[n];
        loss += err * err;
        deltas[L][0] = 2 * err;
        for (let l = L - 1; l >= 0; l--) {
          const nin = sizes[l], nout = sizes[l + 1], w = W[l], a = acts[l], dOut = deltas[l + 1], dIn = deltas[l];
          dIn.fill(0);
          for (let j = 0; j < nout; j++) {
            const g = dOut[j], off = j * nin;
            if (g === 0) continue;
            gB[l][j] += g;
            for (let i = 0; i < nin; i++) { gW[l][off + i] += g * a[i]; dIn[i] += g * w[off + i]; }
          }
          if (l > 0) for (let i = 0; i < nin; i++) dIn[i] *= 1 - a[i] * a[i];     // derivative of tanh
        }
      }
      step++;
      const b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, step), c2 = 1 - Math.pow(b2, step), m = idx.length;
      for (let l = 0; l < L; l++) {
        for (const [p, g, mo, ve] of [[W[l], gW[l], mW[l], vW[l]], [B[l], gB[l], mB[l], vB[l]]]) {
          for (let i = 0; i < p.length; i++) {
            const gi = g[i] / m;
            if (opt === "gd") { p[i] -= lr * gi; continue; }
            mo[i] = b1 * mo[i] + (1 - b1) * gi;
            ve[i] = b2 * ve[i] + (1 - b2) * gi * gi;
            p[i] -= (lr * (mo[i] / c1)) / (Math.sqrt(ve[i] / c2) + 1e-8);
          }
        }
      }
      return loss / m;
    }
    const nParams = W.reduce((q, w, l) => q + w.length + B[l].length, 0);
    return { forward, trainBatch, predict: (X) => X.map((x) => forward(x)), nParams, steps: () => step };
  }

  // ---- designs of experiments (points in the unit hypercube) ---------------
  function doeRandom(n, d, r) {
    return Array.from({ length: n }, () => Array.from({ length: d }, () => r()));
  }
  function doeLHS(n, d, r) {
    const cols = [];
    for (let j = 0; j < d; j++) {
      const perm = shuffle(Array.from({ length: n }, (_, i) => i), r);
      cols.push(perm.map((p) => (p + r()) / n));
    }
    return Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
  }
  function minDist(P) {
    let best = Infinity;
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        let s = 0;
        for (let k = 0; k < P[i].length; k++) s += (P[i][k] - P[j][k]) ** 2;
        if (s < best) best = s;
      }
    }
    return Math.sqrt(best);
  }
  function doeLHSMaximin(n, d, r, tries) {
    let best = null, bestD = -1;
    for (let t = 0; t < (tries || 200); t++) {
      const P = doeLHS(n, d, r);
      const m = minDist(P);
      if (m > bestD) { bestD = m; best = P; }
    }
    return best;
  }
  function vanDerCorput(i, base) {
    let f = 1, x = 0;
    while (i > 0) { f /= base; x += f * (i % base); i = Math.floor(i / base); }
    return x;
  }
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
  function doeHalton(n, d, r) {
    // Randomly shifted Halton sequence (Cranley-Patterson rotation) so that "resample" gives a new design.
    const shift = Array.from({ length: d }, () => (r ? r() : 0));
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: d }, (_, j) => (vanDerCorput(i + 1, PRIMES[j]) + shift[j]) % 1));
  }
  function doeGrid(n, d) {
    // Largest full-factorial grid with at most n points (cell-centred), d = 2 only.
    const k = Math.max(2, Math.floor(Math.sqrt(n) + 1e-9));
    const out = [];
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) out.push([(i + 0.5) / k, (j + 0.5) / k]);
    return out;
  }
  function fillDistance2D(P, m) {
    // Largest distance from any location of the unit square to its nearest sample, and where it occurs.
    m = m || 61;
    let worst = -1, at = [0.5, 0.5];
    for (let a = 0; a < m; a++) {
      for (let b = 0; b < m; b++) {
        const x = a / (m - 1), y = b / (m - 1);
        let best = Infinity;
        for (let i = 0; i < P.length; i++) {
          const s = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2;
          if (s < best) best = s;
        }
        if (best > worst) { worst = best; at = [x, y]; }
      }
    }
    return { radius: Math.sqrt(worst), at };
  }

  // ---- dense linear algebra (small n) --------------------------------------
  function cholesky(K) {
    const n = K.length;
    const L = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = K[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) {
          if (!(sum > 1e-14)) return null;          // not positive definite
          L[i][j] = Math.sqrt(sum);
        } else L[i][j] = sum / L[j][j];
      }
    }
    return L;
  }
  function solveLower(L, b) {
    const n = L.length, x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i][k] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }
  function solveUpperT(L, b) {
    const n = L.length, x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }
  const cholSolve = (L, b) => solveUpperT(L, solveLower(L, b));

  function solveLinear(A, b) {
    // Gaussian elimination with partial pivoting; A is n x n (copied).
    const n = A.length;
    const M = A.map((row, i) => Float64Array.from([...row, b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r2 = c + 1; r2 < n; r2++) if (Math.abs(M[r2][c]) > Math.abs(M[p][c])) p = r2;
      if (Math.abs(M[p][c]) < 1e-14) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r2 = c + 1; r2 < n; r2++) {
        const f = M[r2][c] / M[c][c];
        if (f === 0) continue;
        for (let k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
      }
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = M[i][n];
      for (let k = i + 1; k < n; k++) s -= M[i][k] * x[k];
      x[i] = s / M[i][i];
    }
    return x;
  }

  function lstsq(A, b) {
    // Least squares by Householder QR. Falls back to a tiny ridge when A is
    // rank-deficient or has more columns than rows.
    const m = A.length, p = A[0].length;
    if (m >= p) {
      const R = A.map((row) => Float64Array.from(row));
      const y = Float64Array.from(b);
      let ok = true;
      for (let k = 0; k < p; k++) {
        let norm = 0;
        for (let i = k; i < m; i++) norm += R[i][k] * R[i][k];
        norm = Math.sqrt(norm);
        if (norm < 1e-12) { ok = false; break; }
        const alpha = R[k][k] > 0 ? -norm : norm;
        const v = new Float64Array(m);
        for (let i = k; i < m; i++) v[i] = R[i][k];
        v[k] -= alpha;
        let vv = 0;
        for (let i = k; i < m; i++) vv += v[i] * v[i];
        if (vv < 1e-300) continue;
        for (let j = k; j < p; j++) {
          let dot = 0;
          for (let i = k; i < m; i++) dot += v[i] * R[i][j];
          const f = (2 * dot) / vv;
          for (let i = k; i < m; i++) R[i][j] -= f * v[i];
        }
        let dot = 0;
        for (let i = k; i < m; i++) dot += v[i] * y[i];
        const f = (2 * dot) / vv;
        for (let i = k; i < m; i++) y[i] -= f * v[i];
      }
      if (ok) {
        const x = new Float64Array(p);
        for (let i = p - 1; i >= 0; i--) {
          let s = y[i];
          for (let k = i + 1; k < p; k++) s -= R[i][k] * x[k];
          if (Math.abs(R[i][i]) < 1e-11) { ok = false; break; }
          x[i] = s / R[i][i];
        }
        if (ok) return x;
      }
    }
    const G = Array.from({ length: p }, () => new Float64Array(p));
    const rhs = new Float64Array(p);
    for (let i = 0; i < m; i++) {
      for (let a = 0; a < p; a++) {
        rhs[a] += A[i][a] * b[i];
        for (let c = 0; c <= a; c++) G[a][c] += A[i][a] * A[i][c];
      }
    }
    for (let a = 0; a < p; a++) { for (let c = 0; c < a; c++) G[c][a] = G[a][c]; G[a][a] += 1e-8; }
    const L = cholesky(G);
    return L ? cholSolve(L, rhs) : new Float64Array(p);
  }

  // Symmetric eigen-decomposition by cyclic Jacobi rotations. Returns
  // eigenvalues (descending) and the matching eigenvectors as columns.
  function eigSym(Ain) {
    const n = Ain.length;
    const A = Ain.map((r2) => Float64Array.from(r2));
    const V = Array.from({ length: n }, (_, i) => { const r2 = new Float64Array(n); r2[i] = 1; return r2; });
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) {
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p], akq = A[k][q];
            A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k], aqk = A[q][k];
            A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) {
            const vkp = V[k][p], vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
    return {
      values: order.map((i) => A[i][i]),
      vectors: order.map((i) => V.map((row) => row[i])),     // vectors[k] is the k-th eigenvector
    };
  }

  // POD by the method of snapshots. snapshots: array of n fields (each length m).
  function pod(snapshots) {
    const n = snapshots.length, m = snapshots[0].length;
    const mean = new Float64Array(m);
    for (const s of snapshots) for (let i = 0; i < m; i++) mean[i] += s[i] / n;
    const C = snapshots.map((s) => Float64Array.from(s, (v, i) => v - mean[i]));
    const G = Array.from({ length: n }, (_, i) => Float64Array.from({ length: n }, (_, j) => {
      let d = 0; for (let k = 0; k < m; k++) d += C[i][k] * C[j][k]; return d;
    }));
    const { values, vectors } = eigSym(G);
    const sing = values.map((v) => Math.sqrt(Math.max(v, 0)));
    const modes = [];
    for (let k = 0; k < n; k++) {
      if (sing[k] < 1e-6 * sing[0]) break;      // below this, a mode is rounding error
      const u = new Float64Array(m);
      for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) u[i] += (vectors[k][j] * C[j][i]) / sing[k];
      modes.push(u);
    }
    // coefficients[k][j]: coefficient of mode k for snapshot j
    const coeffs = modes.map((u) => C.map((c) => { let d = 0; for (let i = 0; i < m; i++) d += u[i] * c[i]; return d; }));
    return { mean, modes, sing, coeffs };
  }

  // ---- polynomial least squares -------------------------------------------
  function legendre(t, deg) {
    // P_0..P_deg at t in [-1, 1]
    const out = new Float64Array(deg + 1);
    out[0] = 1;
    if (deg >= 1) out[1] = t;
    for (let k = 2; k <= deg; k++) out[k] = ((2 * k - 1) * t * out[k - 1] - (k - 1) * out[k - 2]) / k;
    return out;
  }
  function polyFit1D(x, y, deg) {
    // x in [0, 1]; Legendre basis keeps the problem well conditioned up to degree ~12.
    const A = x.map((xi) => legendre(2 * xi - 1, deg));
    const beta = lstsq(A, y);
    return {
      predict: (xq) => xq.map((xi) => { const b = legendre(2 * xi - 1, deg); let s = 0; for (let k = 0; k <= deg; k++) s += beta[k] * b[k]; return s; }),
      nParams: deg + 1,
    };
  }
  function polyBasisND(u, order) {
    // order 1: 1, u_i ; order 2: adds u_i u_j (i <= j). Inputs centred on 0.5.
    const d = u.length, c = u.map((v) => v - 0.5);
    const out = [1, ...c];
    if (order >= 2) for (let i = 0; i < d; i++) for (let j = i; j < d; j++) out.push(c[i] * c[j]);
    return out;
  }
  function polyFitND(X, y, order) {
    const beta = lstsq(X.map((u) => polyBasisND(u, order)), y);
    return {
      predict: (Xq) => Xq.map((u) => { const b = polyBasisND(u, order); let s = 0; for (let k = 0; k < b.length; k++) s += beta[k] * b[k]; return s; }),
      nParams: beta.length,
    };
  }

  // ---- radial basis functions ---------------------------------------------
  function dist(a, b) {
    let s = 0;
    for (let k = 0; k < a.length; k++) s += (a[k] - b[k]) ** 2;
    return Math.sqrt(s);
  }
  function rbfFit(X, y, opts) {
    // kernel 'cubic' (r^3, with a linear polynomial tail) or 'gaussian' (exp(-(r/eps)^2), constant tail).
    opts = opts || {};
    const kind = opts.kernel || "cubic", eps = opts.eps || 0.25;
    const phi = kind === "cubic" ? (r2) => r2 * r2 * r2 : (r2) => Math.exp(-(r2 / eps) * (r2 / eps));
    const n = X.length, d = X[0].length;
    const tail = kind === "cubic" ? (u) => [1, ...u] : () => [1];
    const p = tail(X[0]).length;
    const N = n + p;
    const A = Array.from({ length: N }, () => new Float64Array(N));
    const rhs = new Float64Array(N);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) A[i][j] = phi(dist(X[i], X[j])) + (i === j ? (opts.reg || 1e-10) : 0);
      const t = tail(X[i]);
      for (let k = 0; k < p; k++) { A[i][n + k] = t[k]; A[n + k][i] = t[k]; }
      rhs[i] = y[i];
    }
    const w = solveLinear(A, rhs) || new Float64Array(N);
    return {
      predict: (Xq) => Xq.map((u) => {
        let s = 0;
        for (let i = 0; i < n; i++) s += w[i] * phi(dist(u, X[i]));
        const t = tail(u);
        for (let k = 0; k < p; k++) s += w[n + k] * t[k];
        return s;
      }),
      nParams: n, d,
    };
  }

  // ---- ordinary kriging ---------------------------------------------------
  const CORR = {
    matern52: (h) => { const s = Math.sqrt(5) * h; return (1 + s + (s * s) / 3) * Math.exp(-s); },
    matern32: (h) => { const s = Math.sqrt(3) * h; return (1 + s) * Math.exp(-s); },
    sqexp: (h) => Math.exp(-0.5 * h * h),
  };
  function scaledDist(a, b, ell) {
    let s = 0;
    for (let k = 0; k < a.length; k++) { const t = (a[k] - b[k]) / ell[k]; s += t * t; }
    return Math.sqrt(s);
  }
  function krigState(X, y, ell, lambda, corr) {
    const n = X.length;
    const R = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        const v = i === j ? 1 + lambda + 1e-9 : corr(scaledDist(X[i], X[j], ell));
        R[i][j] = v; R[j][i] = v;
      }
    }
    const L = cholesky(R);
    if (!L) return null;
    const ones = new Float64Array(n).fill(1);
    const Ri1 = cholSolve(L, ones), Riy = cholSolve(L, y);
    let s11 = 0, s1y = 0;
    for (let i = 0; i < n; i++) { s11 += Ri1[i]; s1y += Riy[i]; }
    const mu = s1y / s11;
    const alpha = new Float64Array(n);
    let quad = 0;
    for (let i = 0; i < n; i++) { alpha[i] = Riy[i] - mu * Ri1[i]; quad += (y[i] - mu) * alpha[i]; }
    const sigma2 = Math.max(quad / n, 1e-300);
    let logDet = 0;
    for (let i = 0; i < n; i++) logDet += 2 * Math.log(L[i][i]);
    return { L, mu, alpha, sigma2, s11, logLik: -0.5 * n * Math.log(sigma2) - 0.5 * logDet };
  }
  /**
   * Ordinary kriging on points X (arrays, inputs assumed scaled to [0,1]).
   * opts: kernel ('matern52' | 'matern32' | 'sqexp'), noise (bool: estimate a nugget),
   *       ellMin, ellMax (bounds on the length-scale), ard (bool: one length-scale per input),
   *       ell (fix the length-scale instead of fitting it).
   */
  function krigFit(X, y, opts) {
    opts = opts || {};
    const corr = CORR[opts.kernel || "matern52"];
    const n = X.length, d = X[0].length;
    const ellMin = opts.ellMin || 0.03, ellMax = opts.ellMax || 3 * Math.sqrt(d);
    const lambdas = opts.noise ? [1e-6, 1e-4, 1e-3, 3e-3, 1e-2, 3e-2, 0.1, 0.3] : [opts.nugget || 0];
    const grid = opts.ell ? [opts.ell] : linspace(Math.log(ellMin), Math.log(ellMax), opts.nGrid || 28).map(Math.exp);
    let best = null;
    for (const lam of lambdas) {
      for (const e of grid) {
        const ell = new Array(d).fill(e);
        const st = krigState(X, y, ell, lam, corr);
        if (st && (!best || st.logLik > best.st.logLik)) best = { st, ell, lam };
      }
    }
    if (!best) best = { st: krigState(X, y, new Array(d).fill(0.3), 1e-3, corr), ell: new Array(d).fill(0.3), lam: 1e-3 };
    if (opts.ard && d > 1 && !opts.ell) {
      const mult = [0.4, 0.65, 1.5, 2.5, 4];
      for (let sweep = 0; sweep < 2; sweep++) {
        for (let k = 0; k < d; k++) {
          for (const mfac of mult) {
            const ell = best.ell.slice();
            ell[k] = clamp(ell[k] * mfac, ellMin, 20 * ellMax);
            const st = krigState(X, y, ell, best.lam, corr);
            if (st && st.logLik > best.st.logLik) best = { st, ell, lam: best.lam };
          }
        }
      }
    }
    const { st, ell, lam } = best;
    function predict(Xq, withSd) {
      const mean = new Float64Array(Xq.length), sd = withSd ? new Float64Array(Xq.length) : null;
      const r2 = new Float64Array(n);
      for (let t = 0; t < Xq.length; t++) {
        let m = st.mu;
        for (let i = 0; i < n; i++) { r2[i] = corr(scaledDist(Xq[t], X[i], ell)); m += r2[i] * st.alpha[i]; }
        mean[t] = m;
        if (withSd) {
          const v = solveLower(st.L, r2);
          let vv = 0, oneRi = 0;
          for (let i = 0; i < n; i++) vv += v[i] * v[i];
          const w = solveUpperT(st.L, v);
          for (let i = 0; i < n; i++) oneRi += w[i];
          const varT = st.sigma2 * Math.max(1 - vv + ((1 - oneRi) * (1 - oneRi)) / st.s11, 0);
          sd[t] = Math.sqrt(varT);
        }
      }
      return withSd ? { mean, sd } : mean;
    }
    return {
      predict: (Xq) => Array.from(predict(Xq, false)),
      predictSd: (Xq) => { const o = predict(Xq, true); return { mean: Array.from(o.mean), sd: Array.from(o.sd) }; },
      ell, lambda: lam, sigma2: st.sigma2, mu: st.mu, noiseSd: Math.sqrt(st.sigma2 * lam), logLik: st.logLik,
      atBound: !opts.ell && Math.min(...ell) <= ellMin * 1.0001,
      nParams: n,
    };
  }

  // ---- error metrics and validation ----------------------------------------
  function metrics(y, yhat) {
    const n = y.length;
    let se = 0, ae = 0, mx = 0, mean = 0;
    for (let i = 0; i < n; i++) mean += y[i] / n;
    let tot = 0;
    for (let i = 0; i < n; i++) {
      const e = y[i] - yhat[i];
      se += e * e; ae += Math.abs(e); mx = Math.max(mx, Math.abs(e)); tot += (y[i] - mean) ** 2;
    }
    return { rmse: Math.sqrt(se / n), mae: ae / n, max: mx, r2: 1 - se / tot };
  }
  function kfold(n, k, r) {
    const idx = shuffle(Array.from({ length: n }, (_, i) => i), r);
    const folds = Array.from({ length: k }, () => []);
    idx.forEach((v, i) => folds[i % k].push(v));
    return folds;
  }
  function quantileSorted(sorted, rank) {
    // rank is 1-based; returns +Infinity when the rank exceeds the sample size.
    return rank <= sorted.length ? sorted[rank - 1] : Infinity;
  }

  // ---- standard normal ------------------------------------------------------
  function erf(x) {
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return sign * y;
  }
  const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  const normPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  global.SM = {
    rng, randn, shuffle, linspace, clamp, normCdf, normPdf,
    forrester, forresterLo, branin01, WING, wingWeight01,
    joukowski, wingbox, WINGBOX, mlp,
    doeRandom, doeLHS, doeLHSMaximin, doeHalton, doeGrid, minDist, fillDistance2D,
    cholesky, cholSolve, solveLower, solveUpperT, solveLinear, lstsq, eigSym, pod,
    polyFit1D, polyFitND, rbfFit, krigFit, metrics, kfold, quantileSorted, dist,
  };
})(typeof window !== "undefined" ? window : globalThis);
