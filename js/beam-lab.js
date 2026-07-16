/* =====================================================================
   Beam Lab — interactive shear & moment diagram studio
   Statically determinate beams: pin / roller / fixed supports,
   internal hinges, point loads, applied moments, distributed loads
   (uniform / triangular / trapezoidal).

   Conventions: loads positive downward (kN), applied moments positive
   counter-clockwise (kN·m), upward reactions positive, sagging bending
   moment positive. Axial effects are ignored (vertical loading only).
   ===================================================================== */

"use strict";

/* ================= Core solver (pure, testable) ================= */

function distTotals(ld) {
  // trapezoid a..b with intensities w1..w2 (kN/m, downward positive)
  const c = ld.b - ld.a;
  const W = ((ld.w1 + ld.w2) / 2) * c;
  let xc;
  if (Math.abs(ld.w1 + ld.w2) < 1e-12) xc = ld.a + c / 2;
  else xc = ld.a + (c * (ld.w1 + 2 * ld.w2)) / (3 * (ld.w1 + ld.w2));
  return { W, xc };
}

function distForceUpTo(ld, x) {
  // resultant force of the part of the trapezoid between a and x
  if (x <= ld.a) return 0;
  const c = ld.b - ld.a;
  const t = Math.min(x, ld.b) - ld.a;
  const dw = ld.w2 - ld.w1;
  return ld.w1 * t + (dw * t * t) / (2 * c);
}

function distMomentAbout(ld, x) {
  // moment about position x of the load portion left of x:  ∫ w(ξ)(x−ξ)dξ
  if (x <= ld.a) return 0;
  const c = ld.b - ld.a;
  const dw = ld.w2 - ld.w1;
  if (x >= ld.b) {
    const { W, xc } = distTotals(ld);
    return W * (x - xc);
  }
  const t = x - ld.a;
  return (ld.w1 * t * t) / 2 + (dw * t * t * t) / (6 * c);
}

function gaussSolve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-9) return null; // singular
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

function solveBeam(state) {
  const { L, supports, hinges, loads } = state;

  // unknowns: one Ry per support, plus Mz per fixed support
  const unknowns = [];
  supports.forEach((s, i) => {
    unknowns.push({ kind: "Ry", sup: i, x: s.x });
    if (s.type === "fixed") unknowns.push({ kind: "Mz", sup: i, x: s.x });
  });

  const nEq = 2 + hinges.length;
  if (unknowns.length < nEq)
    return { ok: false, msg: "Unstable: not enough reactions for equilibrium — this beam is a mechanism. Add a support or remove a hinge." };
  if (unknowns.length > nEq)
    return { ok: false, msg: `Statically indeterminate (${unknowns.length - nEq}°): statics alone cannot solve this. Remove a reaction or introduce ${unknowns.length - nEq} hinge${unknowns.length - nEq > 1 ? "s" : ""}.` };

  // load resultants
  let sumP = 0, sumPx = 0, sumC = 0;
  for (const ld of loads) {
    if (ld.kind === "point") { sumP += ld.P; sumPx += ld.P * ld.x; }
    else if (ld.kind === "moment") { sumC += ld.M; }
    else { const { W, xc } = distTotals(ld); sumP += W; sumPx += W * xc; }
  }

  const A = [], b = [];
  // ΣFy = 0  →  Σ Ry = Σ P(down)
  A.push(unknowns.map((u) => (u.kind === "Ry" ? 1 : 0)));
  b.push(sumP);
  // ΣM about x=0 (CCW+) = 0  →  Σ Ry·x + Σ Mz = Σ P·x − Σ C
  A.push(unknowns.map((u) => (u.kind === "Ry" ? u.x : 1)));
  b.push(sumPx - sumC);
  // hinge conditions: bending moment (from left segment) = 0
  for (const xh of hinges) {
    A.push(unknowns.map((u) => {
      if (u.x >= xh - 1e-9) return 0;
      return u.kind === "Ry" ? xh - u.x : -1;
    }));
    let rhs = 0;
    for (const ld of loads) {
      if (ld.kind === "point") { if (ld.x < xh) rhs += ld.P * (xh - ld.x); }
      else if (ld.kind === "moment") { if (ld.x < xh) rhs += ld.M; }
      else rhs += distMomentAbout(ld, xh);
    }
    b.push(rhs);
  }

  const sol = gaussSolve(A, b);
  if (!sol)
    return { ok: false, msg: "Unstable configuration: the reactions cannot balance this arrangement (improper constraint layout). Try moving a support or hinge." };

  const reactions = supports.map(() => ({ Ry: 0, Mz: null }));
  unknowns.forEach((u, i) => {
    if (u.kind === "Ry") reactions[u.sup].Ry = sol[i];
    else reactions[u.sup].Mz = sol[i];
  });
  return { ok: true, reactions };
}

function computeDiagrams(state, reactions, N = 1201) {
  const { L, supports, loads } = state;
  const xs = new Float64Array(N), V = new Float64Array(N), M = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const x = (L * k) / (N - 1);
    xs[k] = x;
    let v = 0, m = 0;
    supports.forEach((s, i) => {
      if (s.x < x - 1e-9) {
        v += reactions[i].Ry;
        m += reactions[i].Ry * (x - s.x);
        if (reactions[i].Mz !== null) m -= reactions[i].Mz;
      }
    });
    for (const ld of loads) {
      if (ld.kind === "point") {
        if (ld.x < x - 1e-9) { v -= ld.P; m -= ld.P * (x - ld.x); }
      } else if (ld.kind === "moment") {
        if (ld.x < x - 1e-9) m -= ld.M;
      } else {
        v -= distForceUpTo(ld, x);
        m -= distMomentAbout(ld, x);
      }
    }
    V[k] = v; M[k] = m;
  }
  return { xs, V, M };
}

const BeamLabCore = { solveBeam, computeDiagrams, distTotals };
if (typeof globalThis !== "undefined") globalThis.BeamLabCore = BeamLabCore;

/* ================= UI layer ================= */

if (typeof document !== "undefined" && document.getElementById("beam-svg")) {
  initBeamLab();
}

function initBeamLab() {
  const state = {
    L: 10,
    supports: [
      { x: 0, type: "pin" },
      { x: 10, type: "roller" },
    ],
    hinges: [],
    loads: [{ kind: "point", x: 5, P: 20 }],
    practice: false,
    revealR: false,
    revealD: false,
  };

  const $ = (id) => document.getElementById(id);
  const fmt = (v, d = 1) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(d).replace(/\.0$/, "");

  /* ---------- theme ---------- */
  (function initTheme() {
    const stored = localStorage.getItem("theme");
    if (stored) document.documentElement.dataset.theme = stored;
    const btn = $("theme-toggle");
    const SUN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
    const MOON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    const set = () => (btn.innerHTML = document.documentElement.dataset.theme === "light" ? MOON : SUN);
    set();
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("theme", next);
      set();
    });
  })();

  /* ---------- control panels ---------- */
  function numInput(value, step, min, max, onchange, width) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.value = value;
    inp.step = step;
    if (min !== null) inp.min = min;
    if (max !== null) inp.max = max;
    if (width) inp.style.width = width;
    inp.addEventListener("change", () => onchange(parseFloat(inp.value) || 0));
    return inp;
  }

  function removeBtn(onclick) {
    const b = document.createElement("button");
    b.className = "bl-remove";
    b.title = "Remove";
    b.textContent = "×";
    b.addEventListener("click", onclick);
    return b;
  }

  function label(text) {
    const s = document.createElement("span");
    s.className = "bl-lbl";
    s.textContent = text;
    return s;
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function renderControls() {
    // beam length
    $("beam-length").value = state.L;

    // supports
    const supList = $("sup-list");
    supList.innerHTML = "";
    state.supports.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "bl-row";
      const sel = document.createElement("select");
      ["pin", "roller", "fixed"].forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t[0].toUpperCase() + t.slice(1);
        if (s.type === t) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", () => { s.type = sel.value; update(); });
      row.append(sel, label("at x ="), numInput(s.x, 0.5, 0, state.L, (v) => { s.x = clamp(v, 0, state.L); update(); }), label("m"),
        removeBtn(() => { state.supports.splice(i, 1); update(); }));
      supList.appendChild(row);
    });

    // hinges
    const hList = $("hinge-list");
    hList.innerHTML = "";
    state.hinges.forEach((xh, i) => {
      const row = document.createElement("div");
      row.className = "bl-row";
      row.append(label("Hinge at x ="), numInput(xh, 0.5, 0, state.L, (v) => { state.hinges[i] = clamp(v, 0, state.L); update(); }), label("m"),
        removeBtn(() => { state.hinges.splice(i, 1); update(); }));
      hList.appendChild(row);
    });

    // loads
    const lList = $("load-list");
    lList.innerHTML = "";
    state.loads.forEach((ld, i) => {
      const row = document.createElement("div");
      row.className = "bl-row";
      if (ld.kind === "point") {
        row.append(label("Point"), numInput(ld.P, 5, null, null, (v) => { ld.P = v; update(); }), label("kN at x ="),
          numInput(ld.x, 0.5, 0, state.L, (v) => { ld.x = clamp(v, 0, state.L); update(); }), label("m"));
      } else if (ld.kind === "moment") {
        row.append(label("Moment"), numInput(ld.M, 5, null, null, (v) => { ld.M = v; update(); }), label("kN·m at x ="),
          numInput(ld.x, 0.5, 0, state.L, (v) => { ld.x = clamp(v, 0, state.L); update(); }), label("m"));
      } else {
        row.classList.add("bl-row-tall");
        const shape = document.createElement("select");
        [["uniform", "Uniform"], ["tri-up", "Triangular ▲ 0→w"], ["tri-down", "Triangular ▼ w→0"], ["trap", "Trapezoidal"]].forEach(([v, t]) => {
          const o = document.createElement("option");
          o.value = v; o.textContent = t;
          o.selected = ld.shape === v;
          shape.appendChild(o);
        });
        shape.addEventListener("change", () => {
          ld.shape = shape.value;
          if (ld.shape === "uniform") ld.w1 = ld.w2 = Math.max(ld.w1, ld.w2) || 5;
          if (ld.shape === "tri-up") { ld.w1 = 0; ld.w2 = ld.w2 || 5; }
          if (ld.shape === "tri-down") { ld.w2 = 0; ld.w1 = ld.w1 || 5; }
          update();
        });
        const l1 = document.createElement("div"); l1.className = "bl-subrow";
        const l2 = document.createElement("div"); l2.className = "bl-subrow";
        l1.append(shape, removeBtn(() => { state.loads.splice(i, 1); update(); }));
        l2.append(label("w₁"), numInput(ld.w1, 1, null, null, (v) => { ld.w1 = v; if (ld.shape === "uniform") ld.w2 = v; update(); }, "58px"),
          label("w₂"), numInput(ld.w2, 1, null, null, (v) => { ld.w2 = v; if (ld.shape === "uniform") ld.w1 = v; update(); }, "58px"),
          label("kN/m,"), label("x ="), numInput(ld.a, 0.5, 0, state.L, (v) => { ld.a = clamp(v, 0, ld.b - 0.1); update(); }, "58px"),
          label("→"), numInput(ld.b, 0.5, 0, state.L, (v) => { ld.b = clamp(v, ld.a + 0.1, state.L); update(); }, "58px"), label("m"));
        row.append(l1, l2);
        lList.appendChild(row);
        return;
      }
      row.append(removeBtn(() => { state.loads.splice(i, 1); update(); }));
      lList.appendChild(row);
    });
  }

  /* ---------- drawing helpers ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const BW = 960, MARG = 70;
  const sx = (x) => MARG + (x / state.L) * (BW - 2 * MARG);

  function drawBeam(result) {
    const svg = $("beam-svg");
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${BW} 250`);
    const yB = 150;

    // distributed loads (behind beam line)
    for (const ld of state.loads) {
      if (ld.kind !== "dist") continue;
      const x1 = sx(ld.a), x2 = sx(ld.b);
      const hMax = 46, wRef = Math.max(Math.abs(ld.w1), Math.abs(ld.w2), 1e-9);
      const h1 = (Math.abs(ld.w1) / wRef) * hMax, h2 = (Math.abs(ld.w2) / wRef) * hMax;
      el("path", { d: `M${x1} ${yB - 8 - h1} L${x2} ${yB - 8 - h2} L${x2} ${yB - 8} L${x1} ${yB - 8} Z`, class: "bl-dist" }, svg);
      const nArr = Math.max(3, Math.round((x2 - x1) / 34));
      for (let a = 0; a <= nArr; a++) {
        const f = a / nArr;
        const ax = x1 + f * (x2 - x1);
        const ah = h1 + f * (h2 - h1);
        if (ah < 3) continue;
        el("line", { x1: ax, y1: yB - 8 - ah, x2: ax, y2: yB - 12, class: "bl-arrow-line" }, svg);
        el("path", { d: `M${ax - 3.5} ${yB - 15} L${ax} ${yB - 8} L${ax + 3.5} ${yB - 15} Z`, class: "bl-arrow-head" }, svg);
      }
      el("text", { x: (x1 + x2) / 2, y: yB - 14 - Math.max(h1, h2), class: "bl-load-lbl", "text-anchor": "middle" }, svg)
        .textContent = ld.w1 === ld.w2 ? `${fmt(ld.w1)} kN/m` : `${fmt(ld.w1)}→${fmt(ld.w2)} kN/m`;
    }

    // beam line
    el("rect", { x: sx(0), y: yB - 4, width: sx(state.L) - sx(0), height: 8, rx: 2, class: "bl-beam" }, svg);

    // point loads & moments
    for (const ld of state.loads) {
      if (ld.kind === "point") {
        const x = sx(ld.x), up = ld.P < 0;
        const y1 = up ? yB + 62 : yB - 70, y2 = up ? yB + 10 : yB - 10;
        el("line", { x1: x, y1, x2: x, y2, class: "bl-arrow-line bl-point" }, svg);
        el("path", { d: up ? `M${x - 5} ${y2 + 9} L${x} ${y2} L${x + 5} ${y2 + 9} Z` : `M${x - 5} ${y2 - 9} L${x} ${y2} L${x + 5} ${y2 - 9} Z`, class: "bl-arrow-head bl-point-head" }, svg);
        el("text", { x, y: up ? yB + 76 : yB - 76, class: "bl-load-lbl", "text-anchor": "middle" }, svg).textContent = `${fmt(Math.abs(ld.P))} kN`;
      } else if (ld.kind === "moment") {
        const x = sx(ld.x);
        const ccw = ld.M >= 0;
        el("path", { d: `M${x + (ccw ? 14 : -14)} ${yB - 26} A18 18 0 1 ${ccw ? 0 : 1} ${x + (ccw ? -14 : 14)} ${yB - 26}`, class: "bl-moment-arc" }, svg);
        const tipX = x + (ccw ? -14 : 14);
        el("path", { d: `M${tipX - 4} ${yB - 34} L${tipX} ${yB - 25} L${tipX + 5} ${yB - 31} Z`, class: "bl-arrow-head bl-moment-head" }, svg);
        el("text", { x, y: yB - 52, class: "bl-load-lbl", "text-anchor": "middle" }, svg).textContent = `${fmt(Math.abs(ld.M))} kN·m`;
      }
    }

    // supports + reactions
    state.supports.forEach((s, i) => {
      const x = sx(s.x);
      if (s.type === "fixed") {
        const side = s.x < state.L / 2 ? -1 : 1;
        const wx = x + side * 6;
        el("line", { x1: wx, y1: yB - 34, x2: wx, y2: yB + 34, class: "bl-support-line", "stroke-width": 3 }, svg);
        for (let h = -30; h <= 30; h += 10)
          el("line", { x1: wx, y1: yB + h, x2: wx + side * 9, y2: yB + h + 8, class: "bl-hatch" }, svg);
      } else {
        el("path", { d: `M${x} ${yB + 5} L${x - 12} ${yB + 26} L${x + 12} ${yB + 26} Z`, class: "bl-support" }, svg);
        if (s.type === "roller") {
          el("circle", { cx: x - 6, cy: yB + 31, r: 4, class: "bl-roller" }, svg);
          el("circle", { cx: x + 6, cy: yB + 31, r: 4, class: "bl-roller" }, svg);
          el("line", { x1: x - 16, y1: yB + 36, x2: x + 16, y2: yB + 36, class: "bl-support-line" }, svg);
        } else {
          el("line", { x1: x - 16, y1: yB + 27, x2: x + 16, y2: yB + 27, class: "bl-support-line" }, svg);
          for (let h = -14; h <= 12; h += 6.5)
            el("line", { x1: x + h, y1: yB + 27, x2: x + h + 6, y2: yB + 34, class: "bl-hatch" }, svg);
        }
      }
      // reaction labels
      if (result.ok && (!state.practice || state.revealR)) {
        const r = result.reactions[i];
        const t = el("text", { x, y: yB + 56, class: "bl-react-lbl", "text-anchor": "middle" }, svg);
        t.textContent = `R = ${fmt(r.Ry, 2)} kN ${r.Ry >= 0 ? "↑" : "↓"}`;
        if (r.Mz !== null) {
          const t2 = el("text", { x, y: yB + 72, class: "bl-react-lbl", "text-anchor": "middle" }, svg);
          t2.textContent = `M = ${fmt(r.Mz, 2)} kN·m ${r.Mz >= 0 ? "↺" : "↻"}`;
        }
      }
    });

    // hinges
    for (const xh of state.hinges) {
      el("circle", { cx: sx(xh), cy: yB, r: 6.5, class: "bl-hinge" }, svg);
    }

    // dimension chain: distances between every feature (supports, loads, hinges)
    const stations = new Set([0, state.L]);
    state.supports.forEach((s) => stations.add(s.x));
    state.hinges.forEach((h) => stations.add(h));
    state.loads.forEach((ld) => {
      if (ld.kind === "dist") { stations.add(ld.a); stations.add(ld.b); }
      else stations.add(ld.x);
    });
    const st = [...stations].sort((a, b) => a - b).filter((v, i, arr) => i === 0 || v - arr[i - 1] > 1e-6);
    const yC = 206;
    if (st.length > 2) {
      el("line", { x1: sx(0), y1: yC, x2: sx(state.L), y2: yC, class: "bl-dim" }, svg);
      st.forEach((v) => el("line", { x1: sx(v), y1: yC - 5, x2: sx(v), y2: yC + 5, class: "bl-dim" }, svg));
      for (let i = 1; i < st.length; i++) {
        const seg = st[i] - st[i - 1];
        if (seg < state.L * 0.03) continue; // too tight to label
        el("text", { x: sx((st[i] + st[i - 1]) / 2), y: yC - 6, class: "bl-dim-lbl", "text-anchor": "middle" }, svg)
          .textContent = fmt(seg, 2);
      }
    }

    // total length line
    const yD = 236;
    el("line", { x1: sx(0), y1: yD, x2: sx(state.L), y2: yD, class: "bl-dim" }, svg);
    el("line", { x1: sx(0), y1: yD - 5, x2: sx(0), y2: yD + 5, class: "bl-dim" }, svg);
    el("line", { x1: sx(state.L), y1: yD - 5, x2: sx(state.L), y2: yD + 5, class: "bl-dim" }, svg);
    el("text", { x: sx(state.L / 2), y: yD - 6, class: "bl-dim-lbl", "text-anchor": "middle" }, svg).textContent = `L = ${fmt(state.L)} m`;
  }

  function drawDiagram(svgId, xs, Y, unit, cls) {
    const svg = $(svgId);
    svg.innerHTML = "";
    const H = 190, pad = 24;
    svg.setAttribute("viewBox", `0 0 ${BW} ${H}`);
    let yMax = Math.max(...Y), yMin = Math.min(...Y);
    if (yMax - yMin < 1e-6) { yMax += 1; yMin -= 1; }
    const span = yMax - yMin;
    const yPix = (v) => pad + ((yMax - v) / span) * (H - 2 * pad);

    // zero axis
    if (yMax >= 0 && yMin <= 0)
      el("line", { x1: sx(0), y1: yPix(0), x2: sx(state.L), y2: yPix(0), class: "bl-axis" }, svg);

    // area + curve
    let dArea = `M${sx(xs[0])} ${yPix(0)}`;
    let dLine = "";
    for (let k = 0; k < xs.length; k++) {
      const px = sx(xs[k]), py = yPix(Y[k]);
      dArea += ` L${px} ${py}`;
      dLine += (k === 0 ? "M" : "L") + `${px} ${py}`;
    }
    dArea += ` L${sx(xs[xs.length - 1])} ${yPix(0)} Z`;
    el("path", { d: dArea, class: `bl-area ${cls}` }, svg);
    el("path", { d: dLine, class: `bl-curve ${cls}` }, svg);

    // extreme labels
    let iMax = 0, iMin = 0;
    for (let k = 0; k < Y.length; k++) {
      if (Y[k] > Y[iMax]) iMax = k;
      if (Y[k] < Y[iMin]) iMin = k;
    }
    for (const idx of new Set([iMax, iMin])) {
      if (Math.abs(Y[idx]) < 1e-3) continue;
      const anchor = xs[idx] < state.L * 0.12 ? "start" : xs[idx] > state.L * 0.88 ? "end" : "middle";
      el("circle", { cx: sx(xs[idx]), cy: yPix(Y[idx]), r: 3, class: `bl-peak ${cls}` }, svg);
      el("text", {
        x: sx(xs[idx]), y: yPix(Y[idx]) + (Y[idx] >= 0 ? -8 : 15),
        class: "bl-peak-lbl", "text-anchor": anchor,
      }, svg).textContent = `${fmt(Y[idx], 2)} ${unit} @ ${fmt(xs[idx], 2)} m`;
    }
    return { yPix };
  }

  /* ---------- hover crosshair ---------- */
  let lastDiag = null;
  function bindHover() {
    const wrap = $("bl-diagrams");
    const tip = $("bl-tip");
    const move = (clientX) => {
      if (!lastDiag || (state.practice && !state.revealD)) { tip.style.display = "none"; return; }
      const rect = $("shear-svg").getBoundingClientRect();
      const fx = (clientX - rect.left) / rect.width * BW;
      const x = clamp((fx - MARG) / (BW - 2 * MARG) * state.L, 0, state.L);
      const k = Math.round((x / state.L) * (lastDiag.xs.length - 1));
      tip.style.display = "block";
      tip.style.left = `${((sx(x)) / BW) * 100}%`;
      tip.innerHTML = `<strong>x = ${fmt(x, 2)} m</strong><br>V = ${fmt(lastDiag.V[k], 2)} kN<br>M = ${fmt(lastDiag.M[k], 2)} kN·m`;
    };
    wrap.addEventListener("mousemove", (e) => move(e.clientX));
    wrap.addEventListener("mouseleave", () => (tip.style.display = "none"));
    wrap.addEventListener("touchmove", (e) => { move(e.touches[0].clientX); }, { passive: true });
  }

  /* ---------- practice mode ---------- */
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rint = (lo, hi, step = 1) => lo + step * Math.floor(Math.random() * ((hi - lo) / step + 1));

  function generatePractice() {
    const template = rnd(["ss-point", "ss-udl-point", "overhang", "cantilever", "compound"]);
    const L = rint(6, 12, 2);
    state.L = L;
    state.hinges = [];
    if (template === "ss-point") {
      state.supports = [{ x: 0, type: "pin" }, { x: L, type: "roller" }];
      state.loads = [{ kind: "point", x: rint(2, L - 2), P: rint(10, 50, 5) }];
      if (Math.random() < 0.5) state.loads.push({ kind: "point", x: rint(2, L - 2), P: rint(10, 40, 5) });
    } else if (template === "ss-udl-point") {
      state.supports = [{ x: 0, type: "pin" }, { x: L, type: "roller" }];
      state.loads = [
        { kind: "dist", shape: "uniform", a: 0, b: L, w1: rint(2, 8), w2: 0 },
        { kind: "point", x: rint(2, L - 2), P: rint(10, 40, 5) },
      ];
      state.loads[0].w2 = state.loads[0].w1;
    } else if (template === "overhang") {
      const b = L - rint(2, 3);
      state.supports = [{ x: 0, type: "pin" }, { x: b, type: "roller" }];
      state.loads = [
        { kind: "point", x: L, P: rint(10, 30, 5) },
        { kind: "dist", shape: "uniform", a: 0, b, w1: rint(2, 6), w2: 0 },
      ];
      state.loads[1].w2 = state.loads[1].w1;
    } else if (template === "cantilever") {
      state.supports = [{ x: 0, type: "fixed" }];
      state.loads = [{ kind: "point", x: L, P: rint(10, 30, 5) }];
      if (Math.random() < 0.6)
        state.loads.push({ kind: "dist", shape: "tri-down", a: 0, b: L, w1: rint(3, 8), w2: 0 });
    } else {
      // compound beam with internal hinge (determinate: 3 reactions, 1 hinge)
      const xr = L * 0.5, xh = L * 0.3;
      state.supports = [{ x: 0, type: "pin" }, { x: xr, type: "roller" }, { x: L, type: "roller" }];
      state.hinges = [xh];
      state.loads = [
        { kind: "point", x: rint(Math.ceil(xr) + 1, L - 1), P: rint(15, 40, 5) },
        { kind: "dist", shape: "uniform", a: 0, b: xr, w1: rint(2, 6), w2: 0 },
      ];
      state.loads[1].w2 = state.loads[1].w1;
    }
    state.practice = true;
    state.revealR = false;
    state.revealD = false;
    scored = false;
    forfeited = false;
    update();
  }

  /* ---------- shareable links ---------- */
  function encodeState() {
    const s = state.supports.map((u) => `${u.type}@${u.x}`).join(";");
    const h = state.hinges.join(";");
    const l = state.loads.map((ld) =>
      ld.kind === "point" ? `P${ld.P}@${ld.x}` :
      ld.kind === "moment" ? `C${ld.M}@${ld.x}` :
      `D${ld.w1}:${ld.w2}@${ld.a}-${ld.b}`).join(";");
    let hash = `#L=${state.L}&s=${s}`;
    if (h) hash += `&h=${h}`;
    if (l) hash += `&l=${l}`;
    return hash;
  }

  function decodeState(hash) {
    try {
      if (!hash || hash.length < 4) return null;
      const params = {};
      hash.replace(/^#/, "").split("&").forEach((p) => {
        const [k, v] = p.split("=");
        params[k] = v;
      });
      if (!params.L || !params.s) return null;
      const out = { L: parseFloat(params.L), supports: [], hinges: [], loads: [] };
      if (!(out.L > 0)) return null;
      for (const tok of params.s.split(";")) {
        const [type, x] = tok.split("@");
        if (!["pin", "roller", "fixed"].includes(type)) return null;
        out.supports.push({ type, x: parseFloat(x) || 0 });
      }
      if (params.h) out.hinges = params.h.split(";").map(parseFloat).filter((v) => !isNaN(v));
      if (params.l) for (const tok of params.l.split(";")) {
        const kind = tok[0];
        const rest = tok.slice(1);
        const [val, pos] = rest.split("@");
        if (kind === "P") out.loads.push({ kind: "point", P: parseFloat(val), x: parseFloat(pos) });
        else if (kind === "C") out.loads.push({ kind: "moment", M: parseFloat(val), x: parseFloat(pos) });
        else if (kind === "D") {
          const [w1, w2] = val.split(":").map(parseFloat);
          const [a, b] = pos.split("-").map(parseFloat);
          const shape = w1 === w2 ? "uniform" : w1 === 0 ? "tri-up" : w2 === 0 ? "tri-down" : "trap";
          out.loads.push({ kind: "dist", shape, w1, w2, a, b });
        } else return null;
      }
      return out;
    } catch { return null; }
  }

  let toastTimer = null;
  function shareLink() {
    const hash = encodeState();
    history.replaceState(null, "", hash);
    const url = location.href;
    const done = () => {
      const t = $("bl-toast");
      t.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
    };
    navigator.clipboard ? navigator.clipboard.writeText(url).then(done, done) : done();
  }

  /* ---------- check-my-answer ---------- */
  let scored = false;
  let forfeited = false;
  let streak = 0;
  const store = {
    get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const getScore = () => parseInt(store.get("bl-solved", "0"), 10);
  const getBest = () => parseInt(store.get("bl-best", "0"), 10);
  function renderScore() {
    const n = getScore(), best = getBest();
    $("bl-score").textContent = n > 0 ? `Solved: ${n} · Best streak: ${best}` : "";
    $("bl-streak").innerHTML =
      `Streak: <strong>${streak}</strong> · Solved: <strong>${n}</strong> · Best: <strong>${Math.max(best, streak)}</strong>`;
    $("forfeit-note").style.display = forfeited ? "inline" : "none";
  }

  function scoreCode(name, solved, best) {
    let h = 0;
    const s = `${name.toLowerCase().trim()}|${solved}|${best}|BL2026`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(36).toUpperCase().padStart(7, "0");
  }

  function copyScoreCard() {
    const name = store.get("bl-name", "") || "anonymous";
    const solved = getScore(), best = getBest();
    const text = `Beam Lab score card — ${name}: ${solved} solved, best streak ${best} [${scoreCode(name, solved, best)}]`;
    const done = () => {
      const t = $("bl-toast");
      t.textContent = "Score card copied — paste it to your instructor";
      t.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.classList.remove("show"); t.textContent = "Link copied to clipboard"; }, 2600);
    };
    navigator.clipboard ? navigator.clipboard.writeText(text).then(done, done) : done();
  }

  function renderAnswerPanel(result) {
    const card = $("answer-card");
    const show = state.practice && !state.revealR && result.ok;
    card.style.display = show ? "block" : "none";
    if (!show) return;
    const list = $("answer-list");
    list.innerHTML = "";
    $("answer-result").textContent = "";
    const letters = "ABCDEF";
    state.supports.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "bl-row";
      row.append(label(`R${letters[i]} at x = ${fmt(s.x)} m (kN, ↑ positive):`));
      const inp = document.createElement("input");
      inp.type = "number"; inp.step = "0.1"; inp.className = "bl-answer";
      inp.dataset.expect = result.reactions[i].Ry;
      row.appendChild(inp);
      if (s.type === "fixed") {
        row.append(label(`M${letters[i]} (kN·m, ↺ positive):`));
        const im = document.createElement("input");
        im.type = "number"; im.step = "0.1"; im.className = "bl-answer";
        im.dataset.expect = result.reactions[i].Mz;
        row.appendChild(im);
      }
      list.appendChild(row);
    });
  }

  function checkAnswers() {
    const inputs = [...document.querySelectorAll(".bl-answer")];
    if (!inputs.length) return;
    let correct = 0;
    inputs.forEach((inp) => {
      const expect = parseFloat(inp.dataset.expect);
      const got = parseFloat(inp.value);
      const tol = Math.max(0.5, Math.abs(expect) * 0.02);
      const ok = !isNaN(got) && Math.abs(got - expect) <= tol;
      inp.classList.toggle("ok", ok);
      inp.classList.toggle("bad", !ok);
      if (ok) correct++;
    });
    const res = $("answer-result");
    if (correct === inputs.length) {
      res.textContent = "All correct — excellent! Hit “Next problem” to keep the streak alive.";
      res.className = "bl-answer-result ok";
      if (!scored && !forfeited) {
        scored = true;
        streak++;
        store.set("bl-solved", String(getScore() + 1));
        if (streak > getBest()) store.set("bl-best", String(streak));
        renderScore();
      }
    } else {
      res.textContent = `${correct} / ${inputs.length} correct — check your equilibrium.`;
      res.className = "bl-answer-result bad";
    }
  }

  /* ---------- worked solution ---------- */
  function eq(str) { return `<div class="sol-eq">${str}</div>`; }
  function note(str) { return `<div class="sol-note">${str}</div>`; }

  function solutionHTML(result) {
    const letters = "ABCDEF";
    const sup = state.supports;
    let html = "";

    // 0. unknowns
    const unk = [];
    sup.forEach((s, i) => {
      unk.push(`R<sub>${letters[i]}</sub>`);
      if (s.type === "fixed") unk.push(`M<sub>${letters[i]}</sub>`);
    });
    html += note(`<strong>Unknowns (${unk.length}):</strong> ${unk.join(", ")} — ` +
      `equations available: ΣF<sub>y</sub>, ΣM${state.hinges.length ? `, plus ${state.hinges.length} hinge condition${state.hinges.length > 1 ? "s" : ""}` : ""} → statically determinate.`);

    // 1. distributed load resultants (formula matches the load shape)
    const dists = state.loads.filter((l) => l.kind === "dist");
    if (dists.length) {
      html += note("<strong>1 · Replace each distributed load with its resultant:</strong>");
      dists.forEach((ld) => {
        const { W, xc } = distTotals(ld);
        const c = ld.b - ld.a;
        if (Math.abs(ld.w1 - ld.w2) < 1e-9) {
          html += eq(`Uniform: W = w·ℓ = ${fmt(ld.w1)} × ${fmt(c)} = <strong>${fmt(W, 2)} kN</strong>, at the middle of the loaded length → x̄ = <strong>${fmt(xc, 2)} m</strong>`);
        } else if (Math.abs(ld.w1) < 1e-9 || Math.abs(ld.w2) < 1e-9) {
          const wPk = Math.abs(ld.w1) > Math.abs(ld.w2) ? ld.w1 : ld.w2;
          html += eq(`Triangular: W = ½·w·ℓ = ½ × ${fmt(wPk)} × ${fmt(c)} = <strong>${fmt(W, 2)} kN</strong>, at ⅓ of the length from the peak end → x̄ = <strong>${fmt(xc, 2)} m</strong>`);
        } else {
          html += eq(`Trapezoidal: W = ½(w₁ + w₂)·ℓ = ½(${fmt(ld.w1)} + ${fmt(ld.w2)}) × ${fmt(c)} = <strong>${fmt(W, 2)} kN</strong>, at x̄ = <strong>${fmt(xc, 2)} m</strong>`);
        }
      });
    }

    // effective point-load list (points + resultants)
    const forces = [];
    for (const ld of state.loads) {
      if (ld.kind === "point") forces.push({ F: ld.P, x: ld.x });
      else if (ld.kind === "dist") { const { W, xc } = distTotals(ld); forces.push({ F: W, x: xc }); }
    }
    const couples = state.loads.filter((l) => l.kind === "moment");

    // 2. ΣFy
    const stepN = dists.length ? 2 : 1;
    html += note(`<strong>${stepN} · Vertical equilibrium, ΣF<sub>y</sub> = 0 (↑+):</strong>`);
    const rTerms = sup.map((s, i) => `R<sub>${letters[i]}</sub>`).join(" + ");
    const loadSum = forces.reduce((a, f) => a + f.F, 0);
    html += eq(`${rTerms} = ${forces.map((f) => fmt(f.F, 2)).join(" + ") || "0"} = <strong>${fmt(loadSum, 2)} kN</strong>`);

    // 3. ΣM about x=0
    html += note(`<strong>${stepN + 1} · Moment equilibrium about x = 0, ΣM = 0 (↺+):</strong>`);
    const lhs = sup.map((s, i) => {
      let t = `R<sub>${letters[i]}</sub>·(${fmt(s.x)})`;
      if (s.type === "fixed") t += ` + M<sub>${letters[i]}</sub>`;
      return t;
    }).join(" + ");
    const rhsTerms = forces.map((f) => `${fmt(f.F, 2)}·(${fmt(f.x, 2)})`);
    couples.forEach((c) => rhsTerms.push(`(${fmt(-c.M, 2)})`));
    html += eq(`${lhs} = ${rhsTerms.join(" + ") || "0"} = <strong>${fmt(forces.reduce((a, f) => a + f.F * f.x, 0) - couples.reduce((a, c) => a + c.M, 0), 2)} kN·m</strong>`);

    // 4. hinge conditions
    state.hinges.forEach((xh, k) => {
      html += note(`<strong>${stepN + 2 + k} · Hinge condition at x = ${fmt(xh)} m — bending moment of the left segment = 0:</strong>`);
      const terms = [];
      sup.forEach((s, i) => {
        if (s.x < xh - 1e-9) {
          terms.push(`R<sub>${letters[i]}</sub>·(${fmt(xh - s.x, 2)})`);
          if (s.type === "fixed") terms.push(`− M<sub>${letters[i]}</sub>`);
        }
      });
      const rhs = [];
      for (const ld of state.loads) {
        if (ld.kind === "point" && ld.x < xh) rhs.push(`${fmt(ld.P, 2)}·(${fmt(xh - ld.x, 2)})`);
        else if (ld.kind === "moment" && ld.x < xh) rhs.push(`(${fmt(ld.M, 2)})`);
        else if (ld.kind === "dist" && ld.a < xh) rhs.push(`${fmt(distMomentAbout(ld, xh), 2)}`);
      }
      html += eq(`${terms.join(" + ") || "0"} = ${rhs.join(" + ") || "0"}`);
    });

    // 5. solved reactions
    html += note(`<strong>Solving the system:</strong>`);
    sup.forEach((s, i) => {
      const r = result.reactions[i];
      html += eq(`R<sub>${letters[i]}</sub> = <strong>${fmt(r.Ry, 2)} kN</strong> ${r.Ry >= 0 ? "↑" : "↓"}` +
        (r.Mz !== null ? ` , M<sub>${letters[i]}</sub> = <strong>${fmt(r.Mz, 2)} kN·m</strong> ${r.Mz >= 0 ? "↺" : "↻"}` : ""));
    });
    html += note(`With the reactions known, V(x) and M(x) follow by sectioning from the left — see the diagrams above. Check: the shear diagram must close to zero at the free end, and M = 0 at every hinge and simple end support.`);
    return html;
  }

  /* ---------- presets ---------- */
  const PRESETS = {
    "ss-udl": () => ({
      L: 10,
      supports: [{ x: 0, type: "pin" }, { x: 10, type: "roller" }],
      hinges: [],
      loads: [{ kind: "dist", shape: "uniform", a: 0, b: 10, w1: 5, w2: 5 }],
    }),
    "ss-point": () => ({
      L: 10,
      supports: [{ x: 0, type: "pin" }, { x: 10, type: "roller" }],
      hinges: [],
      loads: [{ kind: "point", x: 5, P: 20 }],
    }),
    "cantilever": () => ({
      L: 6,
      supports: [{ x: 0, type: "fixed" }],
      hinges: [],
      loads: [{ kind: "point", x: 6, P: 15 }],
    }),
    "overhang": () => ({
      L: 10,
      supports: [{ x: 0, type: "pin" }, { x: 7, type: "roller" }],
      hinges: [],
      loads: [
        { kind: "dist", shape: "uniform", a: 0, b: 7, w1: 4, w2: 4 },
        { kind: "point", x: 10, P: 12 },
      ],
    }),
    "compound": () => ({
      L: 12,
      supports: [{ x: 0, type: "pin" }, { x: 6, type: "roller" }, { x: 12, type: "roller" }],
      hinges: [3.5],
      loads: [
        { kind: "point", x: 9, P: 25 },
        { kind: "dist", shape: "uniform", a: 0, b: 6, w1: 4, w2: 4 },
      ],
    }),
    "triangular": () => ({
      L: 8,
      supports: [{ x: 0, type: "pin" }, { x: 8, type: "roller" }],
      hinges: [],
      loads: [{ kind: "dist", shape: "tri-up", a: 0, b: 8, w1: 0, w2: 9 }],
    }),
  };

  /* ---------- main update ---------- */
  function update() {
    state.L = Math.max(1, state.L);
    state.supports.forEach((s) => (s.x = clamp(s.x, 0, state.L)));
    state.hinges = state.hinges.map((h) => clamp(h, 0, state.L));
    state.loads.forEach((ld) => {
      if (ld.kind === "dist") { ld.a = clamp(ld.a, 0, state.L); ld.b = clamp(ld.b, 0, state.L); }
      else ld.x = clamp(ld.x, 0, state.L);
    });

    renderControls();
    const result = solveBeam(state);
    drawBeam(result);

    const msg = $("bl-msg");
    const cover = $("practice-cover");
    $("practice-bar").style.display = state.practice ? "flex" : "none";
    if (state.practice) renderScore();

    if (!result.ok) {
      msg.textContent = result.msg;
      msg.style.display = "block";
      $("shear-svg").innerHTML = "";
      $("moment-svg").innerHTML = "";
      lastDiag = null;
      cover.style.display = "none";
      $("answer-card").style.display = "none";
      $("solution-card").style.display = "none";
      return;
    }
    msg.style.display = "none";

    lastDiag = computeDiagrams(state, result.reactions);
    drawDiagram("shear-svg", lastDiag.xs, lastDiag.V, "kN", "bl-shear");
    drawDiagram("moment-svg", lastDiag.xs, lastDiag.M, "kN·m", "bl-momentd");

    cover.style.display = state.practice && !state.revealD ? "flex" : "none";
    $("reveal-r").disabled = state.revealR;
    $("reveal-d").disabled = state.revealD;

    renderAnswerPanel(result);
    const solVisible = !state.practice || state.revealD;
    $("solution-card").style.display = solVisible ? "block" : "none";
    if (solVisible) $("solution-body").innerHTML = solutionHTML(result);
  }

  /* ---------- wire static controls ---------- */
  $("beam-length").addEventListener("change", (e) => {
    state.L = Math.max(1, parseFloat(e.target.value) || 10);
    update();
  });
  $("add-pin").addEventListener("click", () => { state.supports.push({ x: state.L / 2, type: "pin" }); update(); });
  $("add-roller").addEventListener("click", () => { state.supports.push({ x: state.L / 2, type: "roller" }); update(); });
  $("add-fixed").addEventListener("click", () => { state.supports.push({ x: 0, type: "fixed" }); update(); });
  $("add-hinge").addEventListener("click", () => { state.hinges.push(state.L / 2); update(); });
  $("add-point").addEventListener("click", () => { state.loads.push({ kind: "point", x: state.L / 2, P: 20 }); update(); });
  $("add-moment").addEventListener("click", () => { state.loads.push({ kind: "moment", x: state.L / 2, M: 15 }); update(); });
  $("add-dist").addEventListener("click", () => { state.loads.push({ kind: "dist", shape: "uniform", a: 0, b: state.L, w1: 5, w2: 5 }); update(); });

  $("preset-select").addEventListener("change", (e) => {
    if (!PRESETS[e.target.value]) return;
    Object.assign(state, PRESETS[e.target.value](), { practice: false, revealR: false, revealD: false });
    e.target.value = "";
    update();
  });

  function nextProblem() {
    if (state.practice && !scored) streak = 0; // moved on without solving — streak resets
    generatePractice();
  }
  function forfeitIfUnsolved() {
    if (state.practice && !scored && !forfeited) {
      forfeited = true;
      streak = 0;
    }
  }
  $("gen-practice").addEventListener("click", nextProblem);
  $("next-problem").addEventListener("click", nextProblem);
  $("reveal-r").addEventListener("click", () => { forfeitIfUnsolved(); state.revealR = true; update(); });
  $("reveal-d").addEventListener("click", () => { forfeitIfUnsolved(); state.revealR = true; state.revealD = true; update(); });
  $("exit-practice").addEventListener("click", () => { state.practice = false; state.revealR = state.revealD = false; forfeited = false; update(); });
  $("copy-scorecard").addEventListener("click", copyScoreCard);

  // player identity (local, groundwork for the future class leaderboard)
  const nameInput = $("player-name");
  nameInput.value = store.get("bl-name", "");
  nameInput.addEventListener("change", () => store.set("bl-name", nameInput.value.trim()));
  $("share-btn").addEventListener("click", shareLink);
  $("check-answers").addEventListener("click", checkAnswers);

  // load a shared beam from the URL, if present (also when the hash changes live)
  function applyHash() {
    const shared = decodeState(location.hash);
    if (shared) {
      Object.assign(state, shared, { practice: false, revealR: false, revealD: false });
      return true;
    }
    return false;
  }
  applyHash();
  window.addEventListener("hashchange", () => { if (applyHash()) update(); });

  bindHover();
  renderScore();
  update();
}
