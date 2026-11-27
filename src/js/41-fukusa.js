// ---------- fukusa: the 27 × 30 cm silk cloth (帛紗) ----------
// The cloth is a target-guided soft cloth. Every frame it is rebuilt from the same pure functions of (step, time, teacher):
//  1. a chain of rounded, layer-gapped folds (fukusaFoldState) maps each material point to the cloth's own "D-frame";
//  2. an authored rigid frame (fukusaFrame) places the D-frame in the stage;
//  3. after the rig has solved the body, settleFukusa refits that frame to the real finger contacts and pushes the cloth
//     out of the fingers, forearms and lap.
// Nothing is integrated over time, so playing, seeking, pose pictures and Master's view all show the same shape.
//
// Material coordinates (x, z): metres on the silk laid flat in front of the host, origin at its centre O, x to her right,
// z away from her. Diagonal coordinates (u, v): u runs along A→B, v toward the free corner C.
// Stage space: x = her right, y = up, z = forward (toward the guest).
const FUK_HALF_WIDTH = 0.135,
  FUK_HALF_LENGTH = 0.15;
const FUK_A = [-FUK_HALF_WIDTH, -FUK_HALF_LENGTH]; // near-left corner, held by the left hand
const FUK_B = [FUK_HALF_WIDTH, FUK_HALF_LENGTH]; // far-right corner, lifted by the right hand
const FUK_FREE_CORNER = [FUK_HALF_WIDTH, -FUK_HALF_LENGTH]; // C, the free right-angle corner
const FUK_RIGHT_PINCH = [FUK_B[0] - 0.03, FUK_B[1]]; // 3 cm in from B on the far edge
const FUK_DIAGONAL = Math.hypot(FUK_HALF_WIDTH, FUK_HALF_LENGTH);
const FUK_UX = FUK_HALF_WIDTH / FUK_DIAGONAL,
  FUK_UZ = FUK_HALF_LENGTH / FUK_DIAGONAL;
const fukU = (x, z) => FUK_UX * x + FUK_UZ * z,
  fukV = (x, z) => FUK_UZ * x - FUK_UX * z,
  fukX = (u, v) => u * FUK_UX + v * FUK_UZ,
  fukZ = (u, v) => u * FUK_UZ - v * FUK_UX;
const FUK_LEFT_CLAMP = [fukX(-0.15, 0.012), fukZ(-0.15, 0.012)]; // 5.2 cm from A along the crease: the tail shows past the grip
const FUK_REGRIP = [FUK_HALF_WIDTH, 0]; // middle of the edge nearest her right side; it lies on the sail hinge
const FUK_SAIL_HINGE = FUK_HALF_WIDTH * FUK_UZ,
  FUK_TUCK_HINGE = FUK_SAIL_HINGE;
const FUK_TAIL_HINGE = -FUK_DIAGONAL / 2, // the つ fold puts the tail under: a 10.09 × 10.03 cm pad
  FUK_OBI_HINGE = -0.15,
  FUK_THIGH_HINGE = -0.075,
  FUK_CLAMP_HINGE = FUK_SAIL_HINGE / 2;
const FUK_HOLD_ANGLE = Math.PI / 12, // the user's two 15°: the hanging cloth's yaw (its plane 15° left of straight ahead) and the sail held 15° open
  FUK_GAP = 0.0005, // one layer of the sewn silk
  FUK_INERTIA = false; // the cloth carries no state between frames
const FUK_SOFT = 0.02, // radius of a crease that is still being made
  FUK_SBEND = 0.012, // radius of the soft S-curve with which a loose fold lies down onto the stack
  FUK_R_THUMB = 0.008,
  FUK_R_INDEX = 0.007;
// [u, v] of named points (diagonal coordinates)
const FUK_UV = (p) => [fukU(p[0], p[1]), fukV(p[0], p[1])];
const FUK_M = (u, v) => [fukX(u, v), fukZ(u, v)];
const FUK_O = [0, 0];
const FUK_CREASE_TOP = FUK_M(0.15, FUK_SAIL_HINGE),
  FUK_CREASE_LOW = FUK_M(0, FUK_SAIL_HINGE);
const FUK_STROKE_0 = [0.0388, -0.0242],
  FUK_STROKE_1 = [0.1009, 0.0449],
  FUK_CURL_Q = [0.1226, 0.0914],
  FUK_HOLD_R = [0.1021, 0.0387], // the right thumb on top, 4 mm inside the つ edge
  FUK_PINCH_PARTNER = FUK_M(-0.1817, 0.0223);

// ---- the fold chain: applied in this order; axis 0 compares u, axis 1 compares v ----
const FUK_FOLDS = [
  { axis: 1, h0: 0, dir: -1, side: 1, rest: FUK_GAP / 2, sb: true }, // diag: the A–B diagonal
  { axis: 1, h0: FUK_SAIL_HINGE, dir: 1, side: 1, rest: 0.0006, sb: true }, // sail
  { axis: 0, h0: 0, dir: 1, side: 0, rest: 0.0015, sb: true }, // half (signed): the B half over (+) or under (−) the stack
  { axis: 0, h0: FUK_TAIL_HINGE, dir: -1, side: -1, rest: 0.002, sb: true }, // tail, under
  { axis: 0, h0: FUK_OBI_HINGE, dir: -1, side: -1, rest: 0.005, fixed: true, sb: true }, // obiTuck (women): over the obi's top edge
  { axis: 0, h0: FUK_THIGH_HINGE, dir: 1, side: 1, rest: 0.03, fixed: true, sb: false }, // thighDrape (men): over the thigh
  { axis: 1, h0: FUK_CLAMP_HINGE, dir: 1, side: 1, rest: 0.004, fixed: true, sb: false }, // clamp: the pad folded around the scoop
];
const FUK_NF = FUK_FOLDS.length;
// state: angles (signed for the half fold), wrap weights, drape weight
const FST = {
  ang: new Float64Array(FUK_NF),
  wrapHalf: 0,
  wrapTail: 0,
  drape: 0,
  // derived (prepareFolds)
  th: new Float64Array(FUK_NF),
  sg: new Float64Array(FUK_NF),
  r0: new Float64Array(FUK_NF),
  H: new Float64Array(FUK_NF),
  cs: new Float64Array(FUK_NF),
  sn: new Float64Array(FUK_NF),
  beta: new Float64Array(FUK_NF),
  def: new Float64Array(FUK_NF),
  rref: new Float64Array(FUK_NF),
};
const FST_PREV = new Float64Array(FUK_NF + 3).fill(NaN);
const fe = (t, a, b) => ease((t - a) / (b - a));
const lerpN = (a, b, u) => a + (b - a) * u;
const fsm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
let fukusaHandling = false,
  fukusaLowerObi = false;

// ---- timing ----
// さばき直し (the second folding, 34.2–39.1) replays the first folding about 2.9× faster
// (the sail's fall gets a little more time than the spec's even 2.9×, so no point of the cloth moves faster than 1.5 cm a frame)
const FUK_CLOCK_IN = [34.2, 34.55, 35.05, 35.5, 35.75, 36.1, 36.8, 37.38, 37.96, 38.3, 38.85, 39.1],
  FUK_CLOCK_OUT = [11.6, 12.65, 14.25, 15.2, 16.35, 17.3, 19.55, 21.35, 23.55, 24.75, 26.55, 27.65];
function fukusaClock(t) {
  const I = FUK_CLOCK_IN,
    Q = FUK_CLOCK_OUT;
  if (t <= I[0]) return Q[0];
  for (let i = 1; i < I.length; i++) if (t <= I[i]) return Q[i - 1] + ((Q[i] - Q[i - 1]) * (t - I[i - 1])) / (I[i] - I[i - 1]);
  return Q[Q.length - 1];
}
const FUK_W1 = [9.5, 29.0],
  FUK_W2 = [33.6, 39.1];
const fukInWindow = (t) => (t >= FUK_W1[0] && t < FUK_W1[1]) || (t >= FUK_W2[0] && t < FUK_W2[1]);

// the first folding as a function of its own clock tt (sign: −1 the first time, the B half starts under; +1 the second time)
function firstFoldState(tt, sign, A) {
  A.half = tt < 12.65 ? sign * Math.PI : tt < 14.55 ? sign * Math.PI * (1 - fe(tt, 12.65, 14.55)) : tt < 20.3 ? 0 : tt < 21.35 ? (Math.PI / 2) * fe(tt, 20.3, 21.35) : (Math.PI / 2) * (1 + fe(tt, 21.35, 23.55));
  // the sail falls open as the half fold finishes (it starts 0.35 s after the spec's 13.9 so the two hinges never fight)
  A.sail = tt < 14.25 ? Math.PI : tt < 15.2 ? Math.PI * (1 - fe(tt, 14.25, 15.2)) : tt < 18 ? 0 : tt < 19.55 ? (Math.PI - FUK_HOLD_ANGLE) * fe(tt, 18, 19.4) : Math.PI - FUK_HOLD_ANGLE * (1 - fe(tt, 19.55, 20.3));
  A.tail = Math.PI * fe(tt, 24.95, 26.35);
  A.drape = tt < 16.35 ? fe(tt, 14.4, 15.2) : tt < 17.3 ? 1 - 0.4 * fe(tt, 16.35, 17.3) : 0.6 * (1 - fe(tt, 17.3, 18.2));
  A.wrapHalf = tt < 20.3 ? 0 : tt < 27.95 ? 1 : 1 - fe(tt, 27.95, 28.25);
  A.wrapTail = tt < 24.95 ? 0 : tt < 26.35 ? 1 : 1 - fe(tt, 26.35, 26.55);
}
const FA = { half: 0, sail: 0, tail: 0, drape: 0, wrapHalf: 0, wrapTail: 0 };
// fold progress of the cloth in step s at time t; lower = the narrow, low obi (tucked from below)
function fukusaFoldState(s, t, lower) {
  const A = FST.ang,
    P = Math.PI;
  A.fill(0);
  A[0] = P;
  A[1] = P;
  A[2] = -P;
  // men: the part below the low obi bends over the thigh, further while he bows (the obi edge then comes down to the lap)
  const thigh = ((55 + 60 * Math.min(1, Math.max(0, fukusaBelt.pitch) / 0.7)) * P) / 180;
  if (lower) A[5] = thigh;
  else A[4] = P;
  FST.wrapHalf = FST.wrapTail = FST.drape = 0;
  const two = typeof STEPS !== 'undefined' && s === STEPS[2],
    three = typeof STEPS !== 'undefined' && s === STEPS[3];
  if (two) {
    if (t < 33.6) {
      firstFoldState(t, -1, FA);
      A[1] = FA.sail;
      A[2] = FA.half;
      A[3] = FA.tail;
      FST.drape = FA.drape;
      FST.wrapHalf = FA.wrapHalf;
      FST.wrapTail = FA.wrapTail;
      if (t >= 29) {
        FST.wrapHalf = 0;
        FST.wrapTail = 0;
        // the whole-lid pass opens the pad a little, then it closes again
        A[3] = P * (1 - 0.15 * fe(t, 31.8, 32.05) * (1 - fe(t, 32.3, 32.6)));
      }
    } else if (t < 34.2) {
      A[2] = P;
      A[3] = P * (1 - fe(t, 33.6, 34.0));
    } else if (t < 39.1) {
      firstFoldState(fukusaClock(t), 1, FA);
      A[1] = FA.sail;
      A[2] = FA.half;
      A[3] = FA.tail;
      FST.drape = FA.drape;
      FST.wrapHalf = Math.min(FA.wrapHalf, 1 - fe(fukusaClock(t), 26.55, 27.65));
      FST.wrapTail = FA.wrapTail;
    } else {
      A[2] = P;
      A[3] = P * (1 - fe(t, 43.6, 44.4));
      A[6] = ((150 * P) / 180) * fe(t, 40.05, 40.4) * (1 - fe(t, 42.5, 43.0));
    }
    if (lower) A[5] = thigh * (1 - fe(t, 10.2, 10.9) + fe(t, 44.6, 45.2));
    else A[4] = P * (1 - fe(t, 10.2, 10.7) + fe(t, 44.6, 45.2));
  } else if (three) {
    // the kettle lid is lifted with the pad: the end is folded under while she carries it, and opened again on the way back
    A[3] = P * fe(t, 4.0, 5.0) * (1 - fe(t, 8.6, 9.4));
    if (lower) A[5] = thigh * (1 - fe(t, 3.5, 4.0) + fe(t, 9.4, 10));
    else A[4] = P * (1 - fe(t, 3.5, 4.0) + fe(t, 9.4, 10));
  }
  return FST;
}
// derived per-fold numbers: radius, axis height (from the layer stack below the hinge), S-curve
function prepareFolds() {
  let cB = 0,
    cT = 0;
  for (let k = 0; k < FUK_NF; k++) {
    const F = FUK_FOLDS[k],
      a = FST.ang[k],
      th = Math.abs(a);
    FST.th[k] = th;
    if (th <= 1e-9) continue;
    const s = F.side || (a >= 0 ? 1 : -1);
    FST.sg[k] = s;
    let r0 = F.fixed ? F.rest : FUK_SOFT + (F.rest - FUK_SOFT) * fsm(th / Math.PI);
    if (k === 2 && FST.wrapHalf > 0) r0 += (FUK_R_THUMB + FUK_GAP / 2 - r0) * FST.wrapHalf;
    if (k === 3 && FST.wrapTail > 0) r0 += (FUK_R_INDEX + FUK_GAP / 2 - r0) * FST.wrapTail;
    FST.r0[k] = r0;
    const rp = FUK_GAP / 2;
    FST.H[k] = s > 0 ? cT + r0 : cB - r0;
    FST.rref[k] = r0;
    FST.cs[k] = Math.cos(th);
    FST.sn[k] = Math.sin(th);
    // a loose (or wrapped) fold lies down onto the stack in an S-curve, so only its crease stays round
    const w = F.sb ? fsm((th / Math.PI - 0.88) / 0.12) : 0,
      drop = 2 * Math.max(0, r0 - rp) * w;
    const cb = Math.min(1 - Math.cos(1.35), drop / (2 * FUK_SBEND));
    const beta = cb > 0 ? Math.acos(1 - cb) : 0;
    FST.beta[k] = beta;
    FST.def[k] = 2 * FUK_SBEND * (beta - Math.sin(beta));
    // the next fold sees this one pressed
    if (s > 0) {
      const nt = 2 * (cT + rp) - cB;
      cT = nt;
    } else {
      const nb = 2 * (cB - rp) - cT;
      cB = nb;
    }
  }
}
// one fold applied to a point P = [a, b, c] in the D-frame (a along u, b along v, c along the stack normal N)
function applyFold(k, P) {
  const F = FUK_FOLDS[k],
    th = FST.th[k],
    s = FST.sg[k],
    dir = F.dir,
    H = FST.H[k];
  const x = F.axis ? P[1] : P[0];
  const d = dir * (x - F.h0);
  let rho = s * (H - P[2]);
  // a point closer to the axis than half the crease radius (or beyond it: an open flap standing up while this fold starts)
  // is carried with the point at half the radius, offset along the surface normal: it turns rigidly with its layer
  const rmin = FST.r0[k] * 0.5,
    extra = rho < rmin ? rmin - rho : 0;
  if (extra) rho = rmin;
  const half = rho * th * 0.5 + FST.def[k] * 0.5; // centred so that a closed fold lands exactly mirrored about its hinge
  const d2 = d + half;
  if (d2 <= 0) return;
  let p, q,
    nang = th; // direction of the outward normal: (sin nang, −cos nang)
  const arc = rho * th;
  if (d2 <= arc) {
    const al = d2 / rho;
    p = rho * Math.sin(al);
    q = -rho * Math.cos(al);
    nang = al;
  } else {
    const e = d2 - arc,
      ct = FST.cs[k],
      st = FST.sn[k],
      be = FST.beta[k],
      R = FUK_SBEND;
    let along = e,
      off = 0;
    if (be > 0) {
      const L1 = R * be;
      if (e <= L1) {
        const g = e / R;
        along = R * Math.sin(g);
        off = R * (1 - Math.cos(g));
        nang = th + g;
      } else if (e <= 2 * L1) {
        const g = be - (e - L1) / R;
        along = 2 * R * Math.sin(be) - R * Math.sin(g);
        off = R - 2 * R * Math.cos(be) + R * Math.cos(g);
        nang = th + g;
      } else {
        along = 2 * R * Math.sin(be) + (e - 2 * L1);
        off = 2 * R * (1 - Math.cos(be));
      }
    }
    p = rho * st + along * ct - off * st;
    q = -rho * ct + along * st + off * ct;
  }
  if (extra) {
    p -= extra * Math.sin(nang);
    q += extra * Math.cos(nang);
  }
  const xn = F.h0 - dir * half + dir * p;
  if (F.axis) P[1] = xn;
  else P[0] = xn;
  P[2] = H + s * q;
}
// the hanging triangle curls a little: an isometric cone about B, faded out along the held crease
const DRAPE_ALPHA = (58 * Math.PI) / 180;
function applyDrape(P, w) {
  const du = FUK_DIAGONAL - P[0],
    dv = P[1];
  const wf = w * fsm(dv / 0.04);
  if (wf <= 0) return;
  const rr = Math.hypot(du, dv);
  if (rr < 1e-7) return;
  const th = Math.atan2(dv, du),
    al = Math.PI / 2 - (Math.PI / 2 - DRAPE_ALPHA) * wf,
    sa = Math.sin(al),
    ca = Math.cos(al),
    ps = th / sa,
    cp = Math.cos(ps);
  P[0] = FUK_DIAGONAL - rr * (ca * ca + sa * sa * cp);
  P[1] = rr * sa * Math.sin(ps);
  P[2] += rr * sa * ca * (cp - 1); // the free corner curls toward −N (to her left, back toward her eyes)
}
// material (x, z) -> D-frame point
const FP = new Float64Array(3);
function foldD(x, z, P) {
  P[0] = fukU(x, z);
  P[1] = fukV(x, z);
  P[2] = 0;
  for (let k = 0; k < FUK_NF; k++) if (FST.th[k] > 1e-9) applyFold(k, P);
  if (FST.drape > 0) applyDrape(P, FST.drape);
  return P;
}
// P-frame: the mesh's own frame, origin at the centre of the finished pad (set below)
const FUK_PC = new Float64Array(3);
function foldSilkPoint(x, z, out) {
  foldD(x, z, FP);
  return out.set(FP[0] - FUK_PC[0], FUK_PC[2] - FP[2], FP[1] - FUK_PC[1]);
}

// ---- render mesh: a (u, v) grid clipped to the rectangle, with lines on every crease and close beside the pressed ones ----
const fukusaGeometry = new THREE.BufferGeometry();
const FUK_MESH = (function () {
  const D = FUK_DIAGONAL,
    VM = FUK_HALF_WIDTH * FUK_UZ + FUK_HALF_LENGTH * FUK_UX;
  function lines(lo, hi, step, creases) {
    const L = [];
    const n = Math.round((hi - lo) / step);
    for (let i = 0; i <= n; i++) L.push(lo + ((hi - lo) * i) / n);
    for (const [c, offs] of creases) for (const o of offs) for (const sg of o ? [1, -1] : [1]) L.push(c + sg * o);
    L.sort((a, b) => a - b);
    const out = [];
    for (const x of L) if (x >= lo - 1e-9 && x <= hi + 1e-9 && (!out.length || x - out[out.length - 1] > 0.00009)) out.push(x);
    return out;
  }
  const fine = [0, 0.0002, 0.0006, 0.0015, 0.0035, 0.007, 0.012, 0.02],
    mid = [0, 0.002, 0.006, 0.012],
    CL = [0, 0.003, 0.007, 0.012],
    SL = [0, 0.0002, 0.0006, 0.0015, 0.003, 0.0055, 0.009];
  const UL = lines(-D, D, 0.025, [[0, fine.concat([0.0095, 0.0155, 0.026, 0.03, 0.04])], [-D / 2, fine.concat([0.0095, 0.0155])], [D / 2, fine.concat([0.0095, 0.0155])], [-0.15, mid], [0.15, mid], [-0.075, [0, 0.004]], [0.075, [0, 0.004]]]);
  const VL = lines(-VM, VM, 0.025, [[0, [0, 0.0002, 0.0004, 0.001]], [FUK_SAIL_HINGE, SL], [-FUK_SAIL_HINGE, SL], [FUK_CLAMP_HINGE, CL], [-FUK_CLAMP_HINGE, CL], [3 * FUK_CLAMP_HINGE, CL], [-3 * FUK_CLAMP_HINGE, CL]]);
  const planes = [(u, v) => FUK_HALF_WIDTH - fukX(u, v), (u, v) => FUK_HALF_WIDTH + fukX(u, v), (u, v) => FUK_HALF_LENGTH - fukZ(u, v), (u, v) => FUK_HALF_LENGTH + fukZ(u, v)];
  const key = new Map(),
    mu = [],
    mv = [],
    idx = [];
  const vid = (u, v) => {
    const k = Math.round(u * 1e7) + ',' + Math.round(v * 1e7);
    let i = key.get(k);
    if (i == null) {
      i = mu.length;
      key.set(k, i);
      mu.push(u);
      mv.push(v);
    }
    return i;
  };
  for (let i = 0; i + 1 < UL.length; i++)
    for (let j = 0; j + 1 < VL.length; j++) {
      let poly = [
        [UL[i], VL[j]],
        [UL[i + 1], VL[j]],
        [UL[i + 1], VL[j + 1]],
        [UL[i], VL[j + 1]],
      ];
      for (const f of planes) {
        const out = [];
        for (let k = 0; k < poly.length; k++) {
          const a = poly[k],
            b = poly[(k + 1) % poly.length],
            fa = f(a[0], a[1]),
            fb = f(b[0], b[1]);
          if (fa >= -1e-12) out.push(a);
          if ((fa >= -1e-12) !== (fb >= -1e-12)) {
            const s = fa / (fa - fb);
            out.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]);
          }
        }
        poly = out;
        if (poly.length < 3) break;
      }
      if (poly.length < 3) continue;
      const ids = poly.map((p) => vid(p[0], p[1]));
      for (let k = 1; k + 1 < ids.length; k++) {
        const a = ids[0],
          b = ids[k],
          c = ids[k + 1];
        if (a === b || b === c || a === c) continue;
        const ar = (mu[b] - mu[a]) * (mv[c] - mv[a]) - (mu[c] - mu[a]) * (mv[b] - mv[a]);
        if (Math.abs(ar) < 1e-13) continue;
        if (ar > 0) idx.push(a, b, c);
        else idx.push(a, c, b);
      }
    }
  const n = mu.length;
  const mx = new Float64Array(n),
    mz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    mx[i] = fukX(mu[i], mv[i]);
    mz[i] = fukZ(mu[i], mv[i]);
  }
  return { n, mx, mz, index: new Uint16Array(idx), area: FUK_HALF_WIDTH * FUK_HALF_LENGTH * 4 };
})();
const fukusaPositions = new THREE.BufferAttribute(new Float32Array(FUK_MESH.n * 3), 3).setUsage(THREE.DynamicDrawUsage);
const fukusaNormals = new THREE.BufferAttribute(new Float32Array(FUK_MESH.n * 3), 3).setUsage(THREE.DynamicDrawUsage);
const fukusaTarget = new Float32Array(FUK_MESH.n * 3); // the exact target, before the settle
fukusaGeometry.setAttribute('position', fukusaPositions);
fukusaGeometry.setAttribute('normal', fukusaNormals);
fukusaGeometry.setIndex(new THREE.BufferAttribute(FUK_MESH.index, 1));
fukusaGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.25);
O.fukusa.geometry.dispose();
O.fukusa.geometry = fukusaGeometry;
O.fukusa.frustumCulled = false;
// two-sided silk: the back of the cloth reads a little darker, so the folds are legible
function fukusaPatchMaterial(m) {
  m.side = THREE.DoubleSide;
  m.roughness = 0.45;
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb *= gl_FrontFacing ? 1.0 : 0.82;');
  };
  m.customProgramCacheKey = () => 'fukusa-two-sided';
  m.needsUpdate = true;
  return m;
}
O.fukusa.material = fukusaPatchMaterial(O.fukusa.material.clone()); // the silk material is shared with the flower in the alcove
O.fukusa.userData.teacherMat = true;
function writeFukusaTarget(normals) {
  const n = FUK_MESH.n,
    X = FUK_MESH.mx,
    Z = FUK_MESH.mz,
    T = fukusaTarget;
  for (let i = 0; i < n; i++) {
    foldD(X[i], Z[i], FP);
    T[3 * i] = FP[0] - FUK_PC[0];
    T[3 * i + 1] = FUK_PC[2] - FP[2];
    T[3 * i + 2] = FP[1] - FUK_PC[1];
  }
  fukusaPositions.array.set(T);
  fukusaPositions.needsUpdate = true;
  if (normals !== false) fukusaNormalsUpdate(); // while the cloth is handled the settle computes them once, after its push
}
const fnA = new THREE.Vector3(),
  fnB = new THREE.Vector3(),
  fnC = new THREE.Vector3();
function fukusaNormalsUpdate() {
  const p = fukusaPositions.array,
    nr = fukusaNormals.array,
    I = FUK_MESH.index;
  nr.fill(0);
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t],
      b = 3 * I[t + 1],
      c = 3 * I[t + 2];
    const e1x = p[b] - p[a],
      e1y = p[b + 1] - p[a + 1],
      e1z = p[b + 2] - p[a + 2],
      e2x = p[c] - p[a],
      e2y = p[c + 1] - p[a + 1],
      e2z = p[c + 2] - p[a + 2];
    const nx = e1y * e2z - e1z * e2y,
      ny = e1z * e2x - e1x * e2z,
      nz = e1x * e2y - e1y * e2x;
    nr[a] += nx;
    nr[a + 1] += ny;
    nr[a + 2] += nz;
    nr[b] += nx;
    nr[b + 1] += ny;
    nr[b + 2] += nz;
    nr[c] += nx;
    nr[c + 1] += ny;
    nr[c + 2] += nz;
  }
  for (let i = 0; i < nr.length; i += 3) {
    const l = Math.hypot(nr[i], nr[i + 1], nr[i + 2]) || 1;
    nr[i] /= l;
    nr[i + 1] /= l;
    nr[i + 2] /= l;
  }
  fukusaNormals.needsUpdate = true;
}
// the P-frame origin: the centre of the finished pad (PAD state), at mid-thickness
(function () {
  FST.ang.fill(0);
  FST.ang[0] = FST.ang[1] = FST.ang[2] = FST.ang[3] = Math.PI;
  FST.wrapHalf = FST.wrapTail = FST.drape = 0;
  prepareFolds();
  const lo = [9, 9, 9],
    hi = [-9, -9, -9];
  for (let i = 0; i < FUK_MESH.n; i++) {
    foldD(FUK_MESH.mx[i], FUK_MESH.mz[i], FP);
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], FP[k]);
      hi[k] = Math.max(hi[k], FP[k]);
    }
  }
  for (let k = 0; k < 3; k++) FUK_PC[k] = (lo[k] + hi[k]) / 2;
})();

// ---- the authored frame (stage space) ----
const fV = (x, y, z) => new THREE.Vector3(x, y, z);
const FK = {
  PL1: fV(-0.025, 0.38, 0.165), // the left clamp after the draw: the packet hangs below it on her midline
  PL2: fV(0.03, 0.3, 0.2), // the left clamp in the vertical hold: the diagonal stands a little right of her midline
  O_LEVEL: fV(-0.05, 0.4, 0.17), // the centre while the pad is folded on the left palm
  PAD_C: fV(0, 0.38, 0.16), // the pad's centre on both palms, on her midline
  G_R: fV(0.03, 0.37, 0.16), // the right grip about which the pad turns over
  W0: fV(0.05, 0.36, 0.11), // the wiping pose
  W1: fV(0.06, 0.32, 0.12), // where the right hand holds the pad when the second folding starts
  LIFT: 0.015,
};
const FUK_DEG = Math.PI / 180;
const fA = (psi, out) => out.set(-Math.sin(psi), 0, Math.cos(psi)); // the cloth's horizontal in-plane axis
const fN = (psi, out) => out.set(Math.cos(psi), 0, Math.sin(psi)); // up × a
const _fm = new THREE.Matrix4(),
  _fu = new THREE.Vector3(),
  _fv = new THREE.Vector3(),
  _fn = new THREE.Vector3();
function qBasis(U, Vv, Nn, out) {
  _fm.makeBasis(U, Vv, Nn);
  return out.setFromRotationMatrix(_fm);
}
function qHang(psi, out) {
  fA(psi, _fv);
  fN(psi, _fn).multiplyScalar(-1);
  return qBasis(_fu.set(0, -1, 0), _fv, _fn, out);
}
function qUp(psi, out) {
  fA(psi, _fv);
  fN(psi, _fn);
  return qBasis(_fu.set(0, 1, 0), _fv, _fn, out);
}
function qLevel(psi, out) {
  fA(psi, _fv);
  fN(psi, _fu).multiplyScalar(-1);
  return qBasis(_fu, _fv, _fn.set(0, 1, 0), out);
}
const Q_FLIP = qBasis(fV(1, 0, 0), fV(0, 0, 1), fV(0, -1, 0), new THREE.Quaternion());
const Q_DP = qBasis(fV(1, 0, 0), fV(0, 0, -1), fV(0, 1, 0), new THREE.Quaternion()); // P-frame axes in the D-frame
// The cloth's yaw ψ: the hanging cloth's plane is spanned by the vertical and a(ψ). At the obi it lies along the hip
// (−20°); from the draw to the palm-up turn it is FUK_HOLD_PSI = +15°: the right hand pinches B with the back of the hand
// up and the fingers along a(ψ), so a(ψ) must point a little to her LEFT of straight ahead, where the right forearm, coming
// across from her right elbow, can continue without bending the wrist; then it turns back to 0 for the level pad.
const FUK_HOLD_PSI = FUK_HOLD_ANGLE;
function psiAt(tt) {
  if (tt < 10.7) return -20 * FUK_DEG;
  if (tt < 11.6) return -20 * FUK_DEG + (FUK_HOLD_PSI + 20 * FUK_DEG) * fe(tt, 10.7, 11.6);
  if (tt < 20.3) return FUK_HOLD_PSI;
  if (tt < 21.35) return lerpN(FUK_HOLD_PSI, 8 * FUK_DEG, fe(tt, 20.3, 21.35));
  if (tt < 23.55) return (8 - 5 * fe(tt, 21.35, 23.55)) * FUK_DEG;
  if (tt < 24.75) return 3 * FUK_DEG;
  return 3 * FUK_DEG * (1 - fe(tt, 24.75, 26.55));
}
// the belt: where the packet is tucked (set by hostUpdate before updateFukusa)
const fukusaBelt = { E: new THREE.Vector3(-0.135, 0.478, -0.08), pitch: 0, q: new THREE.Quaternion() };
const Q_OBI_D = qHang(-20 * FUK_DEG, new THREE.Quaternion());
function beltQuaternion(pitch, out) {
  // the packet hangs from the obi's edge: the edge moves with the trunk, but the silk keeps hanging down when she bows
  return out.copy(Q_OBI_D);
}
// authored D-frame: origin (world of D-point (0,0,0)) and orientation
const DF = { o: new THREE.Vector3(), q: new THREE.Quaternion() };
const fq1 = new THREE.Quaternion(),
  fq2 = new THREE.Quaternion(),
  fw1 = new THREE.Vector3(),
  fw2 = new THREE.Vector3(),
  fw3 = new THREE.Vector3(),
  fw4 = new THREE.Vector3();
const KP = { pl: new Float64Array(3), pr: new Float64Array(3), o: new Float64Array(3) };
function dWorld(P, out) {
  // world position of a D-frame point under the current DF
  return out.set(P[0], P[1], P[2]).applyQuaternion(DF.q).add(DF.o);
}
function pivotFrame(Pw, Pd) {
  // place DF.o so that D-point Pd lands on world point Pw
  DF.o.set(Pd[0], Pd[1], Pd[2]).applyQuaternion(DF.q).negate().add(Pw);
}
const FUK_PL_TRI = new Float64Array(3),
  FUK_O_TRI = new Float64Array(3);
const FK_OE = new THREE.Vector3(),
  FK_OWE = new THREE.Vector3();
(function () {
  // constant reference points of the triangle (diagonal folded, nothing else)
  FST.ang.fill(0);
  FST.ang[0] = Math.PI;
  prepareFolds();
  foldD(FUK_LEFT_CLAMP[0], FUK_LEFT_CLAMP[1], FUK_PL_TRI);
  foldD(0, 0, FUK_O_TRI);
  qUp(FUK_HOLD_PSI, DF.q);
  pivotFrame(FK.PL2, FUK_PL_TRI);
  FK_OE.copy(DF.o);
  dWorld(FUK_O_TRI, FK_OWE);
})();
// the first folding's frame at its own clock tt; sign −1 the first time (the left wrist supinates), +1 the second time
function firstFrame(tt, sign) {
  const pl = KP.pl,
    od = KP.o;
  if (tt < 10.2) {
    beltQuaternion(fukusaBelt.pitch, DF.q);
    pivotFrame(fukusaBelt.E, pl);
  } else if (tt < 11.6) {
    beltQuaternion(fukusaBelt.pitch, fq1);
    qHang(psiAt(tt), fq2);
    DF.q.copy(fq1).slerp(fq2, fe(tt, 10.2, 11.6));
    fw1.copy(fukusaBelt.E);
    fw1.y += (fukusaLowerObi ? -1 : 1) * FK.LIFT * fe(tt, 10.2, 10.7);
    fw1.lerp(FK.PL1, fe(tt, 10.7, 11.6));
    pivotFrame(fw1, pl);
  } else if (tt < 12.65) {
    qHang(FUK_HOLD_PSI, DF.q);
    pivotFrame(FK.PL1, pl);
  } else if (tt < 15.2) {
    // the left wrist turns over with the cloth: the frame rolls about V through the clamp while the half fold opens,
    // so the B half (in the right hand) keeps pointing up the whole time
    const p = fe(tt, 12.65, 14.55);
    qHang(FUK_HOLD_PSI, fq2);
    fA(FUK_HOLD_PSI, fw2);
    DF.q.setFromAxisAngle(fw2, -sign * Math.PI * p).multiply(fq2);
    fw1.copy(FK.PL1).lerp(FK.PL2, fe(tt, 12.65, 15.2));
    pivotFrame(fw1, pl);
  } else if (tt < 20.3) {
    qUp(FUK_HOLD_PSI, DF.q);
    DF.o.copy(FK_OE);
    // released at the bottom, the cloth swings about the right pinch until the left hand takes the edge
    const g = 8.5 * FUK_DEG * (tt < 17.3 ? fe(tt, 16.35, 16.9) : 1 - fe(tt, 17.3, 17.6));
    if (g > 0) {
      dWorld(KP.pr, fw3);
      fN(FUK_HOLD_PSI, fw2);
      fq1.setFromAxisAngle(fw2, g);
      DF.q.premultiply(fq1);
      DF.o.sub(fw3).applyQuaternion(fq1).add(fw3);
    }
  } else if (tt < 21.35) {
    // palm up: a quarter turn about V through the centre, synchronised with the half fold
    const psi = psiAt(tt);
    qUp(psi, fq2);
    fA(psi, fw2);
    DF.q.setFromAxisAngle(fw2, (Math.PI / 2) * fe(tt, 20.3, 21.35)).multiply(fq2);
    pivotFrame(FK_OWE, od);
  } else if (tt < 26.55) {
    qLevel(psiAt(tt), DF.q);
    fw1.copy(FK_OWE).lerp(FK.O_LEVEL, fe(tt, 21.35, 23.55));
    pivotFrame(fw1, od);
  } else if (tt < 27.95) {
    qLevel(0, DF.q);
    pivotFrame(FK.O_LEVEL, od);
    fw1.copy(DF.o);
    pivotFrame(FK.PAD_C, FUK_PC);
    DF.o.lerp(fw1, 1 - fe(tt, 26.55, 27.65));
  } else {
    // the right palm turns down with the pad: a half turn about the forward axis through the right grip
    qLevel(0, DF.q);
    pivotFrame(FK.PAD_C, FUK_PC);
    const r = fe(tt, 27.95, 28.6);
    fq1.setFromAxisAngle(fw2.set(0, 0, 1), Math.PI * r);
    DF.q.premultiply(fq1);
    DF.o.sub(FK.G_R).applyQuaternion(fq1).add(FK.G_R);
    if (tt > 28.6) {
      dWorld(FUK_PC, fw1);
      DF.o.addScaledVector(fw2.subVectors(FK.W0, fw1), fe(tt, 28.6, 29.0));
    }
  }
}
function fukusaFrame(t) {
  if (t < FUK_W1[1]) return firstFrame(t, -1);
  if (t < 33.9) {
    DF.q.copy(Q_FLIP);
    pivotFrame(FK.W1, FUK_PC);
    return;
  }
  if (t < 34.2) {
    // the packet swings down from the left clamp: the long side falls and the short tail rises
    DF.q.copy(Q_FLIP);
    pivotFrame(FK.W1, FUK_PC);
    dWorld(KP.pl, fw1);
    const e = fe(t, 33.9, 34.2);
    qHang(FUK_HOLD_PSI, fq2);
    DF.q.slerp(fq2, e);
    fw1.lerp(FK.PL1, e);
    pivotFrame(fw1, KP.pl);
    return;
  }
  firstFrame(fukusaClock(t), 1);
}
const fqP = new THREE.Quaternion();
function writeClothPose(cloth) {
  cloth.quaternion.copy(DF.q).multiply(Q_DP);
  dWorld(FUK_PC, cloth.position);
}
const FUK_AUTH = { p: new THREE.Vector3(), q: new THREE.Quaternion() }; // the authored pose (before the settle)

function updateFukusa(s, time) {
  const tu = typeof performance !== 'undefined' ? performance.now() : 0;
  updateFukusaInner(s, time);
  FUK_SETTLE.updMs += (typeof performance !== 'undefined' ? performance.now() : 0) - tu;
}
function updateFukusaInner(s, time) {
  const cloth = O.fukusa;
  const two = typeof STEPS !== 'undefined' && s === STEPS[2];
  fukusaHandling = two && fukInWindow(time);
  fukusaFoldState(s, time, fukusaLowerObi);
  prepareFolds();
  foldD(FUK_LEFT_CLAMP[0], FUK_LEFT_CLAMP[1], KP.pl);
  foldD(FUK_RIGHT_PINCH[0], FUK_RIGHT_PINCH[1], KP.pr);
  foldD(0, 0, KP.o);
  if (fukusaHandling) {
    fukusaFrame(time);
    writeClothPose(cloth);
  }
  cloth.scale.set(1, 1, 1);
  FUK_AUTH.p.copy(cloth.position);
  FUK_AUTH.q.copy(cloth.quaternion);
  // rebuild only when the shape changed
  let same = true;
  for (let k = 0; k < FUK_NF; k++) if (FST_PREV[k] !== FST.ang[k]) same = false;
  if (FST_PREV[FUK_NF] !== FST.wrapHalf || FST_PREV[FUK_NF + 1] !== FST.wrapTail || FST_PREV[FUK_NF + 2] !== FST.drape) same = false;
  if (same) {
    // the shape is the same: only undo last frame's settle (while the cloth is handled the settle rewrites it anyway)
    if (fukusaPushed && !fukusaHandling) {
      fukusaPositions.array.set(fukusaTarget);
      fukusaPositions.needsUpdate = true;
      fukusaNormalsUpdate();
      fukusaPushed = false;
    }
    return;
  }
  for (let k = 0; k < FUK_NF; k++) FST_PREV[k] = FST.ang[k];
  FST_PREV[FUK_NF] = FST.wrapHalf;
  FST_PREV[FUK_NF + 1] = FST.wrapTail;
  FST_PREV[FUK_NF + 2] = FST.drape;
  writeFukusaTarget(!fukusaHandling || typeof RIG === 'undefined');
  fukusaPushed = false;
}
let fukusaPushed = false;
// pose of the tucked packet at the belt: the left clamp point P_L sits on the belt's edge point E
const fbq = new THREE.Quaternion(),
  fbv = new THREE.Vector3();
function fukusaBeltPose(E, pitch, outPos, outQ) {
  beltQuaternion(pitch, fbq);
  outQ.copy(fbq).multiply(Q_DP);
  foldSilkPoint(FUK_LEFT_CLAMP[0], FUK_LEFT_CLAMP[1], fbv).applyQuaternion(outQ);
  outPos.copy(E).sub(fbv);
}


// ---- hands ----
// A plan says, for one hand at one moment: which part of the hand touches the cloth (kind), the exact material contact point
// in the stage (target), where that hand part's centre must go (aim), how the hand is turned (F = wrist -> knuckles,
// N = out of the back of the hand, stage space), the finger and thumb pose, and how strongly the cloth is fitted to this
// contact after the solve (anchor). Every value is a continuous function of time: a plan is made of branches (one per
// sub-step), and for a short time after a branch starts it is blended from the previous branch's pose (see planBlend), so a
// hand never jumps.
function makePlan() {
  return {
    w: 0,
    anchor: 0,
    kind: 'free',
    target: new THREE.Vector3(),
    aim: new THREE.Vector3(),
    F: new THREE.Vector3(0, 0, 1),
    N: new THREE.Vector3(0, 1, 0),
    fingers: [0.2, 0.2, 0.2, 0.2],
    thumb: 0.3,
    pinch: null,
    lat: false,
    gd: 0.09,
    level: 0,
    ex: [0, 0, 0, 0, 0, 0], // how much each digit is the contact (index, middle, ring, little, thumb, palm): its collision volume shrinks
    br: 0, // branch index
    b0: 0, // branch start (clock time)
    tau: 0, // blend time from the previous branch (real seconds)
    bs: 1, // blend weight of this branch (1 = no blend)
    prev: null,
  };
}
const PLAN = { L: makePlan(), R: makePlan() },
  PREV = { L: makePlan(), R: makePlan() };
PLAN.L.prev = PREV.L;
PLAN.R.prev = PREV.R;
const fp1 = new THREE.Vector3(),
  fp2 = new THREE.Vector3(),
  fp3 = new THREE.Vector3(),
  fp4 = new THREE.Vector3(),
  fpU = new THREE.Vector3(),
  fpV = new THREE.Vector3(),
  fpN = new THREE.Vector3();
// world point of a material point under the authored frame
function fukWorld(m, out) {
  return foldSilkPoint(m[0], m[1], out).applyQuaternion(FUK_AUTH.q).add(FUK_AUTH.p);
}
// world point of a point given in the pad's own (P-frame, mesh-local) coordinates
function padWorld(x, y, z, out) {
  return out.set(x, y, z).applyQuaternion(FUK_AUTH.q).add(FUK_AUTH.p);
}
// world surface normal of the layer at a material point, turned to face `ref`
const fsA = new THREE.Vector3(),
  fsB = new THREE.Vector3(),
  fsC = new THREE.Vector3(),
  fsM = [0, 0];
function fukNormal(m, ref, out) {
  const h = 0.004;
  fukWorld(m, fsA);
  const sx = m[0] + h <= FUK_HALF_WIDTH ? h : -h,
    sz = m[1] + h <= FUK_HALF_LENGTH ? h : -h;
  fsM[0] = m[0] + sx;
  fsM[1] = m[1];
  fukWorld(fsM, fsB).sub(fsA).multiplyScalar(Math.sign(sx));
  fsM[0] = m[0];
  fsM[1] = m[1] + sz;
  fukWorld(fsM, fsC).sub(fsA).multiplyScalar(Math.sign(sz));
  out.crossVectors(fsB, fsC).normalize();
  if (ref && out.dot(ref) < 0) out.negate();
  return out;
}
function frameAxes() {
  fpU.set(1, 0, 0).applyQuaternion(DF.q);
  fpV.set(0, 1, 0).applyQuaternion(DF.q);
  fpN.set(0, 0, 1).applyQuaternion(DF.q);
}
function setFingers(P, a, b, c, d) {
  P.fingers[0] = a;
  P.fingers[1] = b;
  P.fingers[2] = c;
  P.fingers[3] = d;
}
function setEx(P, a, b, c, d, th, pa) {
  const e = P.ex;
  e[0] = a;
  e[1] = b;
  e[2] = c;
  e[3] = d;
  e[4] = th;
  e[5] = pa;
}
function planReset(P) {
  P.w = 1;
  P.anchor = 0;
  P.pinch = null;
  P.lat = false;
  P.level = 0;
  P.gd = 0.09;
  P.thumb = 0.3;
  setEx(P, 0, 0, 0, 0, 0, 0);
}
// a hand frame from a cloth side: the cloth lies between index and middle finger (clamp) with the index on side s;
// F0 = preferred finger direction (laid into the cloth's plane). side: 1 left, -1 right (stage space)
function clampFrame(P, s, F0, side) {
  P.F.copy(F0).addScaledVector(s, -F0.dot(s));
  if (P.F.lengthSq() < 1e-8) P.F.set(0, 0, 1).addScaledVector(s, -s.z);
  P.F.normalize();
  P.N.crossVectors(P.F, s).multiplyScalar(side).normalize();
}
const FUK_HOLD_THUMB = FUK_R_THUMB + FUK_GAP;
const FUK_TMP = [0, 0];
// how far the pad of a hand's grip point is from its centre (GRIP.fukusaWipe in 21-host): the hand-over pose at 29.0 / 33.6
const FUK_WIPE_AT = [0, 0.02, -0.02],
  FUK_WIPE_AIM = [0, 0.014, 0.08],
  FUK_PALM_AT = [0, 0.022, 0],
  FUK_PALM_AIM = [0, 0.02, 0.08];
function wipeGripPlan(P) {
  // palm down on the pad, fingers flat along it toward its far edge (what the 'fukusaWipe' hold does)
  P.kind = 'grip';
  padWorld(FUK_WIPE_AT[0], FUK_WIPE_AT[1], FUK_WIPE_AT[2], P.target);
  P.aim.copy(P.target);
  padWorld(FUK_WIPE_AIM[0], FUK_WIPE_AIM[1], FUK_WIPE_AIM[2], P.F).sub(P.target).normalize();
  P.N.set(0, 1, 0).addScaledVector(P.F, -P.F.y).normalize();
  P.gd = 0.08;
  setFingers(P, 0.02, 0.02, 0.02, 0.02);
  P.thumb = 0.25;
  setEx(P, 0.3, 0.3, 0.3, 0.3, 0, 0.3);
}
function palmGripPlan(P) {
  // the pad resting on the flat left palm (what the 'fukusaPalm' hold does)
  P.kind = 'grip';
  padWorld(FUK_PALM_AT[0], FUK_PALM_AT[1], FUK_PALM_AT[2], P.target);
  P.aim.copy(P.target);
  padWorld(FUK_PALM_AIM[0], FUK_PALM_AIM[1], FUK_PALM_AIM[2], P.F).sub(P.target).normalize();
  P.N.set(0, -1, 0).addScaledVector(P.F, -P.F.y).normalize();
  P.gd = 0.085;
  setFingers(P, 0.05, 0.05, 0.05, 0.05);
  P.thumb = 0.2;
  setEx(P, 0.3, 0.3, 0.3, 0.3, 0, 0.6);
}
// the left hand during the first folding (clock tt; sign −1 the first time, +1 the second); br forces a branch
const L_BR = [9.5, 16.35, 17.3, 19.55, 27.65, 26.55],
  L_TAU = [0, 0.3, 0.3, 0.25, 0.2, 0.25];
function planLeft(P, tt, sign, br) {
  frameAxes(); // the authored frame at this moment (U, V, N in the stage)
  planReset(P);
  if (br < 0) br = sign > 0 && tt >= 26.55 ? 5 : tt < 16.35 ? 0 : tt < 17.3 ? 1 : tt < 19.55 ? 2 : tt < 27.65 ? 3 : 4;
  P.br = br;
  P.b0 = L_BR[br];
  P.tau = L_TAU[br];
  if (br === 0) {
    // scissor clamp near A: index and middle finger with the cloth between them; the tail stands past the fingers.
    // The index is on the body side (+n) the first time.
    P.kind = 'clamp';
    P.anchor = (sign < 0 ? fe(tt, 10.0, 10.25) : 1) * (1 - fe(tt, 16.1, 16.35));
    fukWorld(FUK_LEFT_CLAMP, P.target);
    P.aim.copy(P.target);
    P.w = sign < 0 ? fe(tt, 9.5, 10.15) : 1;
    // at the obi the fingers come down from in front and point back along the hip; then forward along the cloth
    const k = 1 - fe(tt, 11.0, 11.9); // the fingers keep pointing down along the hip until the hand is clear of the body
    fp1.copy(fpV).multiplyScalar(lerpN(1, -0.2, k)).addScaledVector(fpU, 0.75 * k);
    // palm up in the hold, the fingers point forward and a little up along the cloth (the forearm comes from her left)
    if (sign < 0) fp1.addScaledVector(fpU, 0.3 * fe(tt, 13.6, 15.0));
    clampFrame(P, fp2.copy(fpN).multiplyScalar(sign), fp1, 1);
    if (tt < 10.2) P.aim.y += (fukusaLowerObi ? -1 : 1) * 0.04 * (1 - fe(tt, 9.5, 10.15));
    const o = fe(tt, 16.1, 16.35);
    setFingers(P, 0.15 - 0.1 * o, 0.55 - 0.35 * o, 0.62 - 0.3 * o, 0.68 - 0.3 * o);
    P.thumb = 0.3;
    const c = (sign < 0 ? fe(tt, 9.9, 10.15) : 1) * (1 - o);
    setEx(P, c, c, 0, 0, 0, 0);
    return P;
  }
  if (br === 1) {
    // released: the hand drops a little, comes out to her left and goes up toward the middle of the right edge;
    // the forearm turns the palm toward the cloth
    P.kind = 'free';
    const e = fe(tt, 16.35, 17.3);
    fukWorld(FUK_LEFT_CLAMP, fp1);
    fp1.addScaledVector(fpN, -0.04).y -= 0.03;
    fukWorld(FUK_REGRIP, fp2).addScaledVector(fpN, -0.06);
    P.target.copy(fp1).lerp(fp2, e);
    P.target.addScaledVector(fpN, -0.03 * Math.sin(Math.PI * e));
    P.aim.copy(P.target);
    P.F.copy(fpV);
    fp3.set(0, sign, 0); // palm up the first time
    P.N.copy(fp3).lerp(fp4.copy(fpN).negate(), e).normalize();
    setFingers(P, 0.05, 0.2, 0.32, 0.38);
    P.thumb = 0.25;
    return P;
  }
  if (br === 2) {
    // fingers forward across the sail hinge, palm on the −N face: the finger roots press the hinge, the fingers fold the
    // flap over to +N, the thumb stands up along the crease. It slides up the hinge line and back down.
    P.kind = 'knuckle';
    const u0 = fukU(FUK_REGRIP[0], FUK_REGRIP[1]);
    let u = u0;
    if (tt >= 17.8 && tt < 18.4) u = lerpN(u0, 0.15, fe(tt, 17.8, 18.4));
    else if (tt >= 18.4) u = lerpN(0.15, 0, fe(tt, 18.4, 19.55));
    FUK_TMP[0] = fukX(u, FUK_SAIL_HINGE);
    FUK_TMP[1] = fukZ(u, FUK_SAIL_HINGE);
    fukWorld(FUK_TMP, P.target);
    P.aim.copy(P.target).addScaledVector(fpN, -0.016).addScaledVector(fpV, -0.012); // finger roots just behind the crease
    P.F.copy(fpV);
    P.N.copy(fpN).negate();
    const c = 0.1 + 0.62 * fe(tt, 18.0, 19.4);
    setFingers(P, c, c + 0.04, c + 0.06, c + 0.08);
    P.thumb = 0.12 + 0.25 * fe(tt, 18.6, 19.4);
    setEx(P, 0.85, 0.85, 0.85, 0.85, 0.7, 0.7); // the fingers are the folding tool: the fold itself is in the target
    return P;
  }
  if (br === 3 || br === 5) {
    // the thumb: back along the half-fold line to the exact centre on the +N face (the fingers stay on the −N face),
    // then the forearm turns the palm up and the thumb is inside the half fold, the fingers flat under the A half
    P.kind = 'thumb';
    P.anchor = fe(tt, 19.9, 20.4) * (1 - fe(tt, 27.45, 27.65));
    if (tt < 20.3) {
      const e = fe(tt, 19.55, 20.3);
      fukWorld(FUK_CREASE_LOW, fp1);
      fukWorld(FUK_O, fp2);
      P.target.copy(fp1).lerp(fp2, e);
      P.aim.copy(P.target).addScaledVector(fpN, FUK_HOLD_THUMB);
      // the fingers open out of the fold (they lie flat behind the strip) while the thumb comes round onto the front face
      const o = fe(tt, 19.55, 19.8);
      setFingers(P, lerpN(0.72, 0.3, o), lerpN(0.76, 0.34, o), lerpN(0.78, 0.38, o), lerpN(0.8, 0.42, o));
      P.thumb = lerpN(0.37, 0.75, o);
    } else {
      fukWorld(FUK_O, P.target);
      const k = 2;
      if (FST.th[k] > 1e-6) {
        // the thumb's centre lies on the half fold's axis: the cloth wraps round it
        const half = FST.r0[k] * FST.th[k] * 0.5 + FST.def[k] * 0.5;
        P.aim.set(-half, KP.o[1], FST.H[k]).applyQuaternion(DF.q).add(DF.o);
      } else P.aim.copy(P.target).addScaledVector(fpN, FUK_HOLD_THUMB);
      // the fingers lie flat under the A half (curled fingertips would come up through it); the thumb comes down onto
      // the stack so that the fingers touch its underside
      const e = fe(tt, 20.3, 20.8);
      setFingers(P, lerpN(0.3, 0.02, e), lerpN(0.34, 0.02, e), lerpN(0.38, 0.03, e), lerpN(0.42, 0.04, e));
      // while the tail is folded under (つ) the fingers sink a little and let it in between, then hold the thicker stack
      const sink = fe(tt, 24.85, 25.15) * (1 - fe(tt, 26.2, 26.5));
      P.thumb = lerpN(0.75, FUK_L_THUMB, e) + 0.48 * sink + 0.05 * fe(tt, 26.2, 26.5);
    }
    // while the A half swings onto the turning fingers, and while the tail is tucked in, the fingers only shrink
    const xf = Math.max(0.7 * fe(tt, 20.1, 20.3) * (1 - fe(tt, 20.8, 21.2)), 0.85 * fe(tt, 24.85, 25.1) * (1 - fe(tt, 26.3, 26.6)));
    setEx(P, xf, xf, xf, xf, 0.35, 0.3);
    P.F.copy(fpV);
    // with the palm up the fingers turn a little toward her right, under the A half (the forearm comes from her left)
    if (tt > 20.3) P.F.addScaledVector(fpU, -0.45 * fe(tt, 20.3, 21.35)).normalize();
    P.N.copy(fpN).negate();
    if (br === 5) {
      // the second time the pad comes to rest on the left palm: the thumb leaves the fold
      palmGripPlan(P);
      P.anchor = 1;
    }
    return P;
  }
  // the thumb comes out of the fold to the left, then the hand goes to the knee (the track takes over)
  P.kind = 'free';
  fukWorld(FUK_O, fp1);
  P.target.copy(fp1).addScaledVector(fpU, 0.06 * fe(tt, 27.65, 27.95));
  P.target.y -= 0.05 * fe(tt, 27.65, 27.85);
  P.aim.copy(P.target);
  P.F.copy(fpV).addScaledVector(fpU, -0.45).normalize();
  P.N.copy(fpN).negate();
  setFingers(P, 0.02, 0.02, 0.03, 0.04);
  P.thumb = 0.4;
  P.w = 1 - fe(tt, 27.8, 28.6);
  return P;
}
// the right hand during the first folding (clock tt; sign −1 the first time, +1 the second)
const R_BR = [11.1, 23.55, 24.75, 26.55, 27.95, 28.6],
  R_TAU = [0, 0.3, 0.25, 0.35, 0, 0.4];
const FUK_PINCH_PITCH = 5 * FUK_DEG;
function planRight(P, tt, sign, br) {
  frameAxes();
  planReset(P);
  P.gd = 0.1;
  if (br < 0) br = tt < 23.55 ? 0 : tt < 24.75 ? 1 : tt < 26.55 ? 2 : tt < 27.95 ? 3 : tt < 28.6 ? 4 : 5;
  P.br = br;
  P.b0 = R_BR[br];
  P.tau = R_TAU[br];
  if (br === 0) {
    // a key pinch 3 cm inside B, the back of the hand up and the forearm nearly level: the thumb pad on the −n face, the
    // side of the curled index on the +n face ("thumb on top, fingers behind"); the fingers point forward along the
    // cloth, 15° down
    P.kind = 'pinch';
    P.anchor = 1.5 * (sign < 0 ? fe(tt, 12.45, 12.7) : fe(tt, 12.45, 12.75)) * (1 - fe(tt, 20.3, 20.8)); // from the half fold on, the pinch moves the B half only
    fukWorld(FUK_RIGHT_PINCH, P.target);
    P.aim.copy(P.target);
    P.w = sign < 0 ? fe(tt, 11.1, 12.45) : 1;
    // the B half stays upright from the pinch to the half fold: its in-plane horizontal is the frame's V (until the lift
    // the packet hangs with V = a as well)
    P.F.copy(fpV).setY(0).normalize().multiplyScalar(Math.cos(FUK_PINCH_PITCH));
    P.F.y = -Math.sin(FUK_PINCH_PITCH);
    P.N.set(0, 1, 0);
    if (tt > 21.35) {
      // during the half fold the pinch rides on the B half: the forearm turns with it
      const g = (Math.PI / 2) * fe(tt, 21.35, 23.55);
      fq1.setFromAxisAngle(fpV, -g);
      P.F.applyQuaternion(fq1);
      P.N.applyQuaternion(fq1);
    }
    P.N.addScaledVector(P.F, -P.N.dot(P.F)).normalize();
    setFingers(P, 0.65, 0.75, 0.85, 0.9);
    P.thumb = 0.6;
    P.lat = true;
    P.pinch = tt < 12.45 ? 0.025 : lerpN(0.025, 0.0015, fe(tt, 12.45, 12.65));
    if (tt > 23.3) P.pinch += 0.008 * fe(tt, 23.3, 23.55);
    const c = 0.35 * fe(tt, 12.25, 12.5);
    setEx(P, c, 0, 0, 0, c, 0);
    return P;
  }
  if (br === 1) {
    // 一: the index straightens out of the pinch and draws left -> right across the top
    P.kind = 'index';
    // the stroke follows the top surface: a straight line in the material of the top layer
    const e = fe(tt, 24.05, 24.75);
    FUK_TMP[0] = lerpN(FUK_STROKE_0[0], FUK_STROKE_1[0], e);
    FUK_TMP[1] = lerpN(FUK_STROKE_0[1], FUK_STROKE_1[1], e);
    fukWorld(FUK_TMP, P.target);
    fp4.set(0, 1, 0);
    fukNormal(FUK_TMP, fp4, fp3);
    P.aim.copy(P.target).addScaledVector(fp3, FUK_R_INDEX + 0.0015 + 0.015 * (1 - fe(tt, 23.85, 24.05)));
    P.F.set(-0.35, -0.06, 0.94).normalize();
    P.N.set(0, 1, 0).addScaledVector(P.F, -P.F.y).normalize();
    setFingers(P, 0.05, 0.0, 0.0, 0.02); // the other fingers lie straight beside it (curled, they would dip into the pad)
    P.thumb = 0.35;
    setEx(P, 0.3, 0, 0, 0, 0, 0);
    return P;
  }
  if (br === 2) {
    // つ: the index hooks round the end and folds it under while the wrist turns over
    P.kind = 'index';
    const e = fe(tt, 24.75, 26.55);
    fukWorld(FUK_CURL_Q, P.target);
    // the outside of the end at Q: the layer's normal, turned away from the pad's centre (up at the start)
    dWorld(FUK_PC, fp2);
    fp4.subVectors(P.target, fp2);
    fp4.addScaledVector(fpV, -fp4.dot(fpV));
    fp4.normalize().lerp(fp1.set(0, 1, 0), 1 - Math.min(1, e * 2));
    fukNormal(FUK_CURL_Q, fp4, fp3);
    P.aim.copy(P.target).addScaledVector(fp3, FUK_R_INDEX + 0.0015);
    // the forearm supinates (about 150° + the wrist): back of the hand up -> toward her right -> down, ending in the
    // both-palms-up hold, so the hand stays on the pad's right side
    const g = fe(tt, 24.85, 26.45);
    P.F.set(-0.35, -0.06, 0.94).normalize().lerp(fp1.set(-0.3, 0, 0.95).normalize(), g).normalize();
    fp4.set(1, 0, 0).addScaledVector(P.F, -P.F.x).normalize(); // her right, across the forearm
    fp1.set(0, 1, 0).addScaledVector(P.F, -P.F.y).normalize();
    P.N.copy(fp1).multiplyScalar(Math.cos(Math.PI * g)).addScaledVector(fp4, Math.sin(Math.PI * g)).normalize();
    const c = 0.1 + 0.3 * Math.sin(Math.PI * e);
    setFingers(P, c, lerpN(0.0, 0.02, g), lerpN(0.0, 0.02, g), lerpN(0.02, 0.03, g));
    P.thumb = lerpN(0.35, FUK_R_THUMB_HOLD, g);
    setEx(P, 0.35, 0, 0, 0, 0, 0);
    return P;
  }
  if (br === 3 || br === 4) {
    // both palms up: the fingers lie flat under the pad, the thumb rests on top near the つ edge; then the palm turns down
    // with the pad (a rigid half turn about the forward axis through the right grip, the same turn as the cloth's)
    P.kind = 'thumb';
    P.anchor = fe(tt, 26.85, 27.15);
    fukWorld(FUK_HOLD_R, P.target);
    fp4.set(0, 1, 0);
    fukNormal(FUK_HOLD_R, fp4, fp3);
    P.aim.copy(P.target).addScaledVector(fp3, FUK_HOLD_THUMB);
    P.F.set(-0.3, 0, 0.95).normalize();
    P.N.set(0, -1, 0);
    if (br === 4) {
      // the thumb's aim is a point of the pad: it turns with the pad (its top side turns down)
      fq1.setFromAxisAngle(fp1.set(0, 0, 1), Math.PI * fe(tt, 27.95, 28.6));
      P.F.applyQuaternion(fq1);
      P.N.applyQuaternion(fq1);
      fp4.set(0, 1, 0).applyQuaternion(fq1);
      fukNormal(FUK_HOLD_R, fp4, fp3);
      P.aim.copy(P.target).addScaledVector(fp3, FUK_HOLD_THUMB);
    }
    setFingers(P, 0.0, 0.02, 0.02, 0.03);
    P.thumb = FUK_R_THUMB_HOLD;
    setEx(P, 0.15, 0.15, 0.15, 0.15, 0.35, 0.3);
    return P;
  }
  // the hand settles on the pad in the wiping grip, exactly the grip the tracks take over at 29.0
  wipeGripPlan(P);
  P.anchor = 1;
  return P;
}
// the thumb opposition for the palm-up holds: the thumb tip lies on the stack while the flat fingers touch its underside
const FUK_L_THUMB = 0.58,
  FUK_R_THUMB_HOLD = 0.45;
// the second folding starts with the pad in the right hand (wiping grip, W1) and the left hand taking the clamp
function planReclamp(P, t) {
  frameAxes();
  planReset(P);
  P.br = 0;
  P.b0 = 0;
  P.tau = 0;
  P.kind = 'clamp';
  fukWorld(FUK_LEFT_CLAMP, P.target);
  P.aim.copy(P.target);
  clampFrame(P, fp2.copy(fpN), fp1.copy(fpV), 1); // palm up for the re-handling clamp: the index on the other face
  setFingers(P, 0.15, 0.55, 0.62, 0.68);
  const c = fe(t, 33.85, 34.0);
  setEx(P, c, c, 0, 0, 0, 0);
  P.w = fe(t, 33.6, 34.0);
  P.anchor = fe(t, 33.9, 34.1);
  return P;
}
const FUK_W1_GRIP = new THREE.Vector3(),
  FUK_W1_F = new THREE.Vector3();
function planWipeHold(P, t) {
  frameAxes();
  planReset(P);
  P.br = 0;
  P.b0 = 0;
  P.tau = 0;
  if (t < 33.9) {
    wipeGripPlan(P);
    FUK_W1_GRIP.copy(P.aim);
    FUK_W1_F.copy(P.F);
  } else {
    // the packet swings down out of the hand; the hand stays where it was
    wipeGripPlan(P);
    P.target.copy(FUK_W1_GRIP);
    P.aim.copy(FUK_W1_GRIP);
    P.F.copy(FUK_W1_F);
    P.N.set(0, 1, 0).addScaledVector(P.F, -P.F.y).normalize();
  }
  P.anchor = 1 - fe(t, 33.9, 34.1);
  P.w = 1;
  return P;
}
// evaluate a branch plan and, just after a branch starts, the previous branch at the same moment for blending
function planBlend(key, fn, tt, sign, rate) {
  const P = PLAN[key];
  fn(P, tt, sign, -1);
  P.bs = 1;
  // the blend must be over before the next branch starts (the second folding runs faster)
  const B = key === 'L' ? L_BR : R_BR,
    next = key === 'L' ? (P.br === 3 && sign > 0 ? 26.55 : P.br === 4 || P.br === 5 ? 99 : B[P.br + 1]) : P.br < 5 ? B[P.br + 1] : 99;
  const tau = Math.min(P.tau * rate, 0.9 * (next - P.b0));
  if (tau > 0 && P.br > 0 && tt - P.b0 < tau) {
    const br = P.br === 5 && key === 'L' ? 3 : P.br - 1;
    fn(PREV[key], tt, sign, br);
    P.bs = fsm((tt - P.b0) / tau);
  }
  return P;
}
// local speed of the second folding's clock (clock seconds per real second)
function fukusaClockRate(t) {
  const I = FUK_CLOCK_IN,
    Q = FUK_CLOCK_OUT;
  for (let i = 1; i < I.length; i++) if (t <= I[i]) return (Q[i] - Q[i - 1]) / (I[i] - I[i - 1]);
  return 1;
}
// the plan for a hand at absolute step time t
function fukusaPlan(key, t) {
  const P = PLAN[key];
  P.w = 0;
  P.bs = 1;
  if (!fukusaHandling) return P;
  if (t < FUK_W1[1]) {
    if (key === 'L') {
      if (t >= 9.5) planBlend('L', planLeft, t, -1, 1);
    } else if (t >= 11.1) planBlend('R', planRight, t, -1, 1);
    return P;
  }
  // the second folding
  if (t < 34.2) {
    if (key === 'L') planReclamp(P, t);
    else planWipeHold(P, t);
    return P;
  }
  const tc = fukusaClock(t),
    rate = fukusaClockRate(t);
  if (key === 'L') planBlend('L', planLeft, tc, 1, rate);
  else {
    planBlend('R', planRight, tc, 1, rate);
    if (t < 34.45) {
      // from the wiping grip to the pinch
      planWipeHold(PREV.R, t);
      P.bs = fsm((t - 34.2) / 0.25);
    }
    // the right hand lets go of the finished pad and goes for the scoop
    P.w = 1 - fe(t, 38.85, 39.1);
    P.anchor *= P.w;
    PREV.R.w = P.w;
    PREV.R.anchor *= P.w;
  }
  return P;
}
// the stage-space material point a hand touches (exact, before the rig)
function fukusaHandPoint(hand, time, out) {
  const P = fukusaPlan(hand, time);
  return out.copy(P.target);
}
// rig input for a hand that handles the cloth. Goal compensation: the rig steers the grip point (wrist + F·gd), so the goal is
// moved by the contact's offset inside the hand, and the contact (not the palm) lands on the cloth.
const fukHP = typeof RIG !== 'undefined' && RIG.makeHandPoints ? RIG.makeHandPoints() : null;
const fukVH = { side: 1, wrist: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), fingers: [0, 0, 0, 0], curl: 0.3, thumb: 0.3, pinch: null, pinchW: 1, pinchLat: false };
const fukIn = {
  L: { w: 0, F: new THREE.Vector3(), N: new THREE.Vector3(), gd: 0.09, fingers: [0, 0, 0, 0], thumb: 0.3, pinch: null, pinchW: 1, lat: false, level: 0, cLocal: new THREE.Vector3(), cGoal: new THREE.Vector3() },
  R: { w: 0, F: new THREE.Vector3(), N: new THREE.Vector3(), gd: 0.09, fingers: [0, 0, 0, 0], thumb: 0.3, pinch: null, pinchW: 1, lat: false, level: 0, cLocal: new THREE.Vector3(), cGoal: new THREE.Vector3() },
};
const fkh1 = new THREE.Vector3(),
  fkh2 = new THREE.Vector3(),
  fkh3 = new THREE.Vector3(),
  fkh4 = new THREE.Vector3(),
  fkF = new THREE.Vector3(),
  fkN = new THREE.Vector3(),
  fkQ0 = new THREE.Quaternion(),
  fkQ1 = new THREE.Quaternion(),
  fkM = new THREE.Matrix4(),
  fkX = new THREE.Vector3();
function handContact(HP, kind, a, out) {
  if (kind === 'clamp') return out.copy(HP.clamp);
  if (kind === 'pinch') return out.copy(HP.pinchMid);
  if (kind === 'thumb') return out.copy(HP.thumbTip);
  if (kind === 'index') return out.copy(HP.tip[0]);
  if (kind === 'knuckle') return out.copy(HP.base[0]).add(HP.base[1]).multiplyScalar(0.5);
  if (kind === 'grip') return out.copy(a.wrist).addScaledVector(a.fwd, a.gd);
  return out.copy(HP.palm);
}
// stage-space frame of a plan as a quaternion (X = N × F, N, F)
function planQ(P, q) {
  fkF.copy(P.F).normalize();
  fkN.copy(P.N).addScaledVector(fkF, -P.N.dot(fkF));
  if (fkN.lengthSq() < 1e-8) fkN.set(0, 1, 0).addScaledVector(fkF, -fkF.y);
  fkN.normalize();
  fkX.crossVectors(fkN, fkF);
  return q.setFromRotationMatrix(fkM.makeBasis(fkX, fkN, fkF));
}
// host-space grip goal of one plan (where wrist + F·gd must go so that the plan's contact lands on its aim)
function planGoal(P, side, F, N, out) {
  const MXs = typeof MX === 'undefined' ? -1 : MX,
    HZ = typeof HOST_Z === 'undefined' ? -0.17 : HOST_Z;
  out.set(P.aim.x * MXs, P.aim.y, P.aim.z - HZ);
  if (!fukHP) return out;
  fukVH.side = side;
  fukVH.wrist.set(0, 0, 0);
  fukVH.fwd.copy(F);
  fukVH.up.copy(N);
  fukVH.fingers = P.fingers;
  fukVH.thumb = P.thumb;
  fukVH.pinch = P.pinch;
  fukVH.pinchW = P.pinch == null ? 0 : 1;
  fukVH.pinchLat = P.lat;
  fukVH.gd = P.gd;
  RIG.handPoints(fukVH, fukHP);
  handContact(fukHP, P.kind, fukVH, fkh4);
  // the contact in the hand's own frame (X = N × F, N, F), for the rig's contact fix
  fkX.crossVectors(N, F);
  fkCL.set(fkh4.dot(fkX), fkh4.dot(N), fkh4.dot(F));
  return out.sub(fkh4).addScaledVector(F, P.gd);
}
const fkCL = new THREE.Vector3();
// the plan's hand frame in host space
function planHostFrame(P, F, N) {
  const MXs = typeof MX === 'undefined' ? -1 : MX;
  F.set(P.F.x * MXs, P.F.y, P.F.z).normalize();
  N.set(P.N.x * MXs, P.N.y, P.N.z);
  N.addScaledVector(F, -N.dot(F));
  if (N.lengthSq() < 1e-8) N.set(0, 1, 0).addScaledVector(F, -F.y);
  N.normalize();
}
function poseFukusaHand(arm, time, input, fromBelow) {
  const P = fukusaPlan(arm.key, time);
  if (!(P.w > 0)) return;
  const MXs = typeof MX === 'undefined' ? -1 : MX,
    HZ = typeof HOST_Z === 'undefined' ? -0.17 : HOST_Z;
  const K = fukIn[arm.key];
  planHostFrame(P, K.F, K.N);
  planGoal(P, arm.side, K.F, K.N, fkh1);
  K.cLocal.copy(fkCL);
  K.cGoal.set(P.aim.x * MXs, P.aim.y, P.aim.z - HZ);
  let w = P.w;
  K.gd = P.gd;
  K.thumb = P.thumb;
  K.level = P.level;
  for (let i = 0; i < 4; i++) K.fingers[i] = P.fingers[i];
  K.pinch = P.pinch;
  K.pinchW = P.pinch == null ? 0 : 1;
  K.lat = P.lat;
  if (P.bs < 1) {
    // blend from the previous branch: goal, frame (shortest rotation), fingers, thumb, pinch
    const Q = P.prev,
      s = P.bs;
    planHostFrame(Q, fkF, fkN);
    planGoal(Q, arm.side, fkF, fkN, fkh2);
    fkh1.lerp(fkh2, 1 - s);
    K.cLocal.lerp(fkCL, 1 - s);
    K.cGoal.lerp(fkh3.set(Q.aim.x * MXs, Q.aim.y, Q.aim.z - HZ), 1 - s);
    // slerp in host space
    fkX.crossVectors(fkN, fkF);
    fkQ0.setFromRotationMatrix(fkM.makeBasis(fkX, fkN, fkF));
    fkX.crossVectors(K.N, K.F);
    fkQ1.setFromRotationMatrix(fkM.makeBasis(fkX, K.N, K.F));
    fkQ0.slerp(fkQ1, s);
    K.F.set(0, 0, 1).applyQuaternion(fkQ0);
    K.N.set(0, 1, 0).applyQuaternion(fkQ0);
    K.gd = lerpN(Q.gd, P.gd, s);
    K.thumb = lerpN(Q.thumb, P.thumb, s);
    K.level = lerpN(Q.level, P.level, s);
    for (let i = 0; i < 4; i++) K.fingers[i] = lerpN(Q.fingers[i], P.fingers[i], s);
    const qp = Q.pinch == null ? 0 : 1,
      pp = P.pinch == null ? 0 : 1;
    K.pinch = Q.pinch != null && P.pinch != null ? lerpN(Q.pinch, P.pinch, s) : Q.pinch != null ? Q.pinch : P.pinch;
    K.pinchW = lerpN(qp, pp, s);
    K.lat = (Q.lat && qp > 0) || (P.lat && pp > 0);
    w = lerpN(Q.w, P.w, s);
  }
  fkh2.set(fkh1.x * MXs, fkh1.y, fkh1.z + HZ);
  arm.goal.lerp(fkh2, w);
  K.w = w;
  input.fk = K;
}

// ---- settle: after the rig has solved the body ----
// 1. frame refit: the cloth moves (≤ 5 cm) so that the anchoring contacts meet the real fingers; every weight is continuous;
// 2. collision: cloth vertices near the hands are pushed out of the finger, thumb, palm and forearm volumes; the push is
//    limited and spread to the neighbouring vertices, and a finger that passes through the middle of a triangle pushes it too.
const FUK_SETTLE = { last: 0, corr: new THREE.Vector3(), ms: 0, calls: 0, updMs: 0 };
const fsH = { 1: null, '-1': null };
const fst1 = new THREE.Vector3(),
  fst2 = new THREE.Vector3(),
  fst3 = new THREE.Vector3(),
  fstQ = new THREE.Quaternion(),
  fstQi = new THREE.Quaternion();
const fukCaps = []; // capsules in cloth-local space: [ax, ay, az, bx, by, bz, r, finger?]
for (let i = 0; i < 40; i++) fukCaps.push(new Float64Array(8));
let fukCapN = 0;
function addCap(a, b, r, MXs, HZ, finger) {
  if (!(r > 0.001)) return;
  const c = fukCaps[fukCapN++];
  c[0] = a.x * MXs;
  c[1] = a.y;
  c[2] = a.z + HZ;
  c[3] = b.x * MXs;
  c[4] = b.y;
  c[5] = b.z + HZ;
  c[6] = r;
  c[7] = finger ? 1 : 0;
}
// vertex neighbours (material mesh), for spreading the push
const FUK_NB = (function () {
  const n = FUK_MESH.n,
    I = FUK_MESH.index,
    sets = [];
  for (let i = 0; i < n; i++) sets.push(new Set());
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t],
      b = I[t + 1],
      c = I[t + 2];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  const start = new Uint32Array(n + 1);
  let k = 0;
  for (let i = 0; i < n; i++) {
    start[i] = k;
    k += sets[i].size;
  }
  start[n] = k;
  const list = new Uint16Array(k);
  k = 0;
  for (let i = 0; i < n; i++) for (const j of sets[i]) list[k++] = j;
  return { start, list };
})();
const FUK_DISP = new Float32Array(FUK_MESH.n * 3),
  FUK_DISP2 = new Float32Array(FUK_MESH.n * 3),
  FUK_NEAR = new Uint8Array(FUK_MESH.n),
  FUK_PUSH_MAX = 0.01;
// push point (x, y, z) straight out of every capsule (away from its axis); returns the pushed point in fsp
const fsp = new Float64Array(3);
function capPush(x, y, z, fingersOnly) {
  for (let c = 0; c < fukCapN; c++) {
    const C = fukCaps[c];
    if (fingersOnly && !C[7]) continue;
    const r = C[6];
    const bx = C[3] - C[0],
      by = C[4] - C[1],
      bz = C[5] - C[2];
    const px = x - C[0],
      py = y - C[1],
      pz = z - C[2];
    const bb = bx * bx + by * by + bz * bz;
    let s = bb > 1e-12 ? (px * bx + py * by + pz * bz) / bb : 0;
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    const dx = px - bx * s,
      dy = py - by * s,
      dz = pz - bz * s,
      d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) continue;
    const d = Math.sqrt(d2) || 1e-6,
      k = (r - d) / d;
    x += dx * k;
    y += dy * k;
    z += dz * k;
  }
  fsp[0] = x;
  fsp[1] = y;
  fsp[2] = z;
}
// the refit contribution of one plan (weight wt): real contact minus planned aim
function refitAdd(P, HP, a, wt, corr, MXs, HZ) {
  if (!(wt > 0) || P.kind === 'free') return 0;
  handContact(HP, P.kind, a, fst1);
  fst1.set(fst1.x * MXs, fst1.y, fst1.z + HZ).sub(P.aim);
  corr.addScaledVector(fst1, wt);
  return wt;
}
function settleFukusa(S, dt, snap) {
  if (!fukusaHandling || typeof RIG === 'undefined' || !RIG.handPoints) return;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const MXs = typeof MX === 'undefined' ? -1 : MX,
    HZ = typeof HOST_Z === 'undefined' ? -0.17 : HOST_Z;
  const cloth = O.fukusa;
  const corr = FUK_SETTLE.corr.set(0, 0, 0);
  let wsum = 0;
  fukCapN = 0;
  for (let hk = 0; hk < 2; hk++) {
    const key = hk ? 'R' : 'L',
      P = PLAN[key],
      side = key === 'L' ? 1 : -1,
      a = S.arms[side];
    const HP = fsH[side] || (fsH[side] = RIG.makeHandPoints());
    RIG.handPoints(a, HP);
    // contact digits shrink their collision volume (they hold the cloth), continuously with the plan
    const s = P.w > 0 ? P.bs : 0,
      Q = P.prev,
      ex = (i) => (P.w > 0 ? (s < 1 ? lerpN(Q.ex[i], P.ex[i], s) : P.ex[i]) * Math.min(1, P.w * 2) : 0);
    for (let i = 0; i < 4; i++) {
      const e = ex(i);
      addCap(HP.base[i], HP.mid[i], HP.rad[i] * (1 - 0.5 * e), MXs, HZ, true);
      addCap(HP.mid[i], HP.tip[i], HP.tipR[i] * (1 - e), MXs, HZ, true);
    }
    const et = ex(4);
    addCap(HP.thumbBase, HP.thumbMid, 0.009 * (1 - 0.5 * et), MXs, HZ, true);
    addCap(HP.thumbMid, HP.thumbTip, 0.0072 * (1 - et), MXs, HZ, true);
    addCap(a.wrist, HP.palm, 0.016 * (1 - ex(5)), MXs, HZ, false);
    fst2.copy(a.elbow).lerp(a.wrist, 0.35);
    addCap(fst2, a.wrist, 0.03, MXs, HZ, false);
    // refit: real contact vs planned aim (stage), weighted by the continuous anchors
    if (P.w > 0) {
      wsum += refitAdd(P, HP, a, P.anchor * s, corr, MXs, HZ);
      if (s < 1) wsum += refitAdd(Q, HP, a, Q.anchor * (1 - s), corr, MXs, HZ);
    }
  }
  if (wsum > 0) {
    corr.multiplyScalar(1 / Math.max(1, wsum));
    const l = corr.length();
    if (l > 0.05) corr.multiplyScalar(0.05 / l);
    cloth.position.add(corr);
  }
  // collision push-out in the cloth's local frame
  cloth.updateMatrix();
  fstQ.copy(cloth.quaternion);
  fstQi.copy(fstQ).invert();
  const T = fukusaTarget,
    pos = fukusaPositions.array,
    n = FUK_MESH.n,
    D = FUK_DISP,
    D2 = FUK_DISP2,
    near = FUK_NEAR;
  // capsules -> cloth local
  for (let c = 0; c < fukCapN; c++) {
    const C = fukCaps[c];
    fst2.set(C[0], C[1], C[2]).sub(cloth.position).applyQuaternion(fstQi);
    fst3.set(C[3], C[4], C[5]).sub(cloth.position).applyQuaternion(fstQi);
    C[0] = fst2.x;
    C[1] = fst2.y;
    C[2] = fst2.z;
    C[3] = fst3.x;
    C[4] = fst3.y;
    C[5] = fst3.z;
  }
  // 1. per-vertex push, limited
  let any = false;
  for (let i = 0; i < n; i++) {
    const x = T[3 * i],
      y = T[3 * i + 1],
      z = T[3 * i + 2];
    capPush(x, y, z, false);
    let dx = fsp[0] - x,
      dy = fsp[1] - y,
      dz = fsp[2] - z;
    const l = dx * dx + dy * dy + dz * dz;
    near[i] = 0;
    if (l > 0) {
      any = true;
      near[i] = 1;
      if (l > FUK_PUSH_MAX * FUK_PUSH_MAX) {
        const k = FUK_PUSH_MAX / Math.sqrt(l);
        dx *= k;
        dy *= k;
        dz *= k;
      }
    }
    D[3 * i] = dx;
    D[3 * i + 1] = dy;
    D[3 * i + 2] = dz;
  }
  if (any) {
    // 2. spread the push to the neighbours (two smoothing passes over the pushed vertices and their rings)
    const NB = FUK_NB;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) if (near[i] === 1) for (let k = NB.start[i]; k < NB.start[i + 1]; k++) if (!near[NB.list[k]]) near[NB.list[k]] = 2;
      for (let i = 0; i < n; i++) if (near[i] === 2) near[i] = 1;
      for (let i = 0; i < n; i++) {
        if (!near[i]) continue;
        let sx = 0,
          sy = 0,
          sz = 0;
        const k0 = NB.start[i],
          k1 = NB.start[i + 1];
        for (let k = k0; k < k1; k++) {
          const j = 3 * NB.list[k];
          sx += D[j];
          sy += D[j + 1];
          sz += D[j + 2];
        }
        const m = k1 > k0 ? 1 / (k1 - k0) : 0;
        D2[3 * i] = 0.5 * D[3 * i] + 0.5 * sx * m;
        D2[3 * i + 1] = 0.5 * D[3 * i + 1] + 0.5 * sy * m;
        D2[3 * i + 2] = 0.5 * D[3 * i + 2] + 0.5 * sz * m;
      }
      for (let i = 0; i < n; i++) {
        if (!near[i]) continue;
        D[3 * i] = D2[3 * i];
        D[3 * i + 1] = D2[3 * i + 1];
        D[3 * i + 2] = D2[3 * i + 2];
      }
    }
    // 3. final: the smoothed cloth, pushed again where it is still inside (limited), then the triangle middles
    for (let i = 0; i < n; i++) {
      let x = T[3 * i] + D[3 * i],
        y = T[3 * i + 1] + D[3 * i + 1],
        z = T[3 * i + 2] + D[3 * i + 2];
      if (near[i]) {
        capPush(x, y, z, false);
        const dx = fsp[0] - T[3 * i],
          dy = fsp[1] - T[3 * i + 1],
          dz = fsp[2] - T[3 * i + 2];
        const l = Math.hypot(dx, dy, dz),
          k = l > FUK_PUSH_MAX ? FUK_PUSH_MAX / l : 1;
        x = T[3 * i] + dx * k;
        y = T[3 * i + 1] + dy * k;
        z = T[3 * i + 2] + dz * k;
      }
      pos[3 * i] = x;
      pos[3 * i + 1] = y;
      pos[3 * i + 2] = z;
    }
    // a finger through the middle of a triangle: test the centroid and the edge midpoints of triangles near the hands;
    // each of the triangle's corners takes the largest such push it meets
    const I = FUK_MESH.index;
    D2.fill(0);
    let tri = false;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t],
        b = I[t + 1],
        c = I[t + 2];
      if (!near[a] && !near[b] && !near[c]) continue;
      for (let q = 0; q < 4; q++) {
        const wa = q === 0 ? 1 / 3 : q === 1 ? 0.5 : q === 2 ? 0 : 0.5,
          wb = q === 0 ? 1 / 3 : q === 1 ? 0.5 : q === 2 ? 0.5 : 0,
          wc = 1 - wa - wb;
        const x = pos[3 * a] * wa + pos[3 * b] * wb + pos[3 * c] * wc,
          y = pos[3 * a + 1] * wa + pos[3 * b + 1] * wb + pos[3 * c + 1] * wc,
          z = pos[3 * a + 2] * wa + pos[3 * b + 2] * wb + pos[3 * c + 2] * wc;
        capPush(x, y, z, true);
        const dx = fsp[0] - x,
          dy = fsp[1] - y,
          dz = fsp[2] - z,
          l2 = dx * dx + dy * dy + dz * dz;
        if (l2 === 0) continue;
        tri = true;
        for (let k = 0; k < 3; k++) {
          const v = k === 0 ? a : k === 1 ? b : c,
            wv = k === 0 ? wa : k === 1 ? wb : wc;
          if (wv <= 0) continue;
          const o = 3 * v;
          if (l2 > D2[o] * D2[o] + D2[o + 1] * D2[o + 1] + D2[o + 2] * D2[o + 2]) {
            D2[o] = dx;
            D2[o + 1] = dy;
            D2[o + 2] = dz;
          }
        }
      }
    }
    if (tri)
      for (let i = 0; i < n; i++) {
        const o = 3 * i,
          l = Math.hypot(D2[o], D2[o + 1], D2[o + 2]),
          k = l > 0.006 ? 0.006 / l : 1; // a triangle's middle lifts its corners by at most 6 mm
        pos[o] += D2[o] * k;
        pos[o + 1] += D2[o + 1] * k;
        pos[o + 2] += D2[o + 2] * k;
      }
  } else pos.set(T);
  fukusaPositions.needsUpdate = true;
  fukusaNormalsUpdate();
  fukusaPushed = true; // the next frame starts again from the exact target
  FUK_SETTLE.ms += (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  FUK_SETTLE.calls++;
}
// tools only (contact checks, timing): exposed through window.__sado in 90-main
function fukusaToolPlan(key) {
  return fukusaHandling ? PLAN[key] : null;
}
function fukusaToolPerf() {
  return { updMs: FUK_SETTLE.updMs, setMs: FUK_SETTLE.ms, corr: FUK_SETTLE.corr.toArray() };
}
