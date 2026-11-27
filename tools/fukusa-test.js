// Checks of the fukusa (41-fukusa.js): fold geometry, contacts, the vertical diagonal, the pad, layers, seeking, continuity,
// timing, plus the rig's bone lengths. Runs without a browser:   node tools/fukusa-test.js
// With a built page it also checks the real fingers on the cloth for both teachers (needs Playwright):
//   node tools/fukusa-test.js --browser dist/sado-tea-room.html
// (contacts, the drawn cloth's and the wrists' continuity at 60 fps, and every finger capsule against the cloth)
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path'),
  { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const bi = process.argv.indexOf('--browser');
if (bi >= 0) return browser(process.argv[bi + 1]);
if (typeof gc !== 'function' && !process.env.FUKUSA_TEST_CHILD) {
  // the allocation check needs --expose-gc: run this file again with it
  const r = spawnSync(process.execPath, ['--expose-gc', __filename], { stdio: 'inherit', env: { ...process.env, FUKUSA_TEST_CHILD: '1' } });
  process.exit(r.status);
}
const THREE = require('../vendor/three.min.js');
const O = { fukusa: new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()) };
const STEPS = [{}, {}, {}, {}];
const ctx = vm.createContext({ THREE, O, STEPS, KNL: [-0.1, 0.2, 0.24], performance, console, ease: (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); } });
vm.runInContext(fs.readFileSync(path.join(root, 'src/js/20-rig.js'), 'utf8') + ';globalThis.testRig=RIG;', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/js/41-fukusa.js'), 'utf8') + `
globalThis.F = { FUK_MESH, FST, FUK_GAP, FUK_DIAGONAL, FUK_A, FUK_B, FUK_FREE_CORNER, FUK_RIGHT_PINCH, FUK_LEFT_CLAMP, FUK_REGRIP, FUK_PINCH_PARTNER, FUK_HOLD_ANGLE, FUK_HOLD_PSI, FUK_PC, fukusaTarget, foldD, prepareFolds, fukusaPlan, settleFukusa, PLAN, FUK_SETTLE, fukusaFoldState };`, ctx);
const F = ctx.F,
  cloth = O.fukusa,
  pos = cloth.geometry.attributes.position,
  N = F.FUK_MESH.n,
  I = F.FUK_MESH.index;
const V = () => new THREE.Vector3();
const point = (m) => ctx.foldSilkPoint(m[0], m[1], V());
const world = (m) => point(m).applyQuaternion(cloth.quaternion).add(cloth.position);
const two = STEPS[2],
  three = STEPS[3];
function go(t, s = two) {
  cloth.position.set(0, 0.45, 0.28);
  cloth.quaternion.identity();
  ctx.updateFukusa(s, t);
  cloth.updateMatrix();
}
const vtx = (i, out = V()) => out.fromBufferAttribute(pos, i);
const results = [];
const fails = new Map(); // FUKUSA_ALL=1 lists every failing check instead of stopping at the first
const ok = (cond, msg) => {
  if (cond) return;
  if (!process.env.FUKUSA_ALL) assert.ok(cond, msg);
  const k = msg.replace(/[-\d.]+/g, '#');
  if (!fails.has(k)) fails.set(k, { n: 0, first: msg });
  fails.get(k).n++;
};
process.on('exit', () => {
  if (fails.size) for (const [, f] of fails) console.log('FAIL ×' + f.n + ': ' + f.first);
});

// 1. isometry and area: every render edge keeps its material length (1 %, or 0.3 mm on the tiny edges beside a crease)
const edges = new Set();
for (let t = 0; t < I.length; t += 3)
  for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) edges.add(a < b ? a * 65536 + b : b * 65536 + a);
const edgeList = [...edges].map((k) => [Math.floor(k / 65536), k % 65536]);
const MX = F.FUK_MESH.mx,
  MZ = F.FUK_MESH.mz;
const pa = V(),
  pb = V(),
  pc = V();
function area() {
  let A = 0;
  for (let t = 0; t < I.length; t += 3) {
    vtx(I[t], pa);
    vtx(I[t + 1], pb).sub(pa);
    vtx(I[t + 2], pc).sub(pa);
    A += pb.cross(pc).length() / 2;
  }
  return A;
}
let worstEdge = 0;
const uOf = (i) => MX[i] * (0.135 / F.FUK_DIAGONAL) + MZ[i] * (0.15 / F.FUK_DIAGONAL),
  vOf = (i) => MX[i] * (0.15 / F.FUK_DIAGONAL) - MZ[i] * (0.135 / F.FUK_DIAGONAL);
const CREASE_U = [0, F.FUK_DIAGONAL / 2, -F.FUK_DIAGONAL / 2, 0.15, -0.15, 0.075, -0.075],
  CREASE_V = [0, 0.100345, -0.100345, 0.0502, -0.0502, 0.1505, -0.1505];
const Q0 = new Float64Array(3),
  Q1 = new Float64Array(3);
for (const [t, s] of [[5], [11], [13.6], [15.7], [18.9], [21], [22.5], [23.6], [25.7], [27], [29], [31], [34.9], [36.5], [38], [40.5], [44], [47], [4.3, three], [7, three]]) {
  go(t, s || two);
  for (const [a, b] of edgeList) {
    // the mapping's length along the edge (8 pieces, so a coarse triangle over a round crease is not counted as stretch)
    const m = Math.hypot(MX[a] - MX[b], MZ[a] - MZ[b]);
    let d = 0;
    F.foldD(MX[a], MZ[a], Q0);
    for (let k = 1; k <= 8; k++) {
      F.foldD(MX[a] + ((MX[b] - MX[a]) * k) / 8, MZ[a] + ((MZ[b] - MZ[a]) * k) / 8, Q1);
      d += Math.hypot(Q1[0] - Q0[0], Q1[1] - Q0[1], Q1[2] - Q0[2]);
      Q0.set(Q1);
    }
    const err = Math.abs(d - m);
    // where two creases cross, the layers of the first are wrapped at different radii by the second: a real stack slips there
    // by up to π × its thickness; elsewhere the cloth must keep its length
    const nearCrease = (i) => (CREASE_U.some((c) => Math.abs(uOf(i) - c) < 0.004) && CREASE_V.some((c) => Math.abs(vOf(i) - c) < 0.004)) || (CREASE_V.some((c) => Math.abs(vOf(i) - c) < 0.01) && CREASE_U.some((c) => Math.abs(uOf(i) - c) < 0.045));
    const crossing = nearCrease(a) || nearCrease(b);
    if (!crossing) worstEdge = Math.max(worstEdge, err / Math.max(m, 0.03));
    // folding the whole 8-layer pad round the scoop (39.9–43) squeezes its folded edge by up to π × its thickness
    const clampZone = F.FST.ang[6] > 0 && (CREASE_U.some((c) => Math.abs(uOf(a) - c) < 0.015) || Math.abs(Math.abs(vOf(a)) - 0.0502) < 0.02 || Math.abs(Math.abs(vOf(a)) - 0.1505) < 0.02 || Math.abs(Math.abs(vOf(a)) - 0.100345) < 0.01);
    ok(err <= Math.max(0.01 * m, clampZone ? 0.004 : crossing ? 0.0015 : 0.0005), `edge length changed at ${t}s: ${(d * 1000).toFixed(2)} vs ${(m * 1000).toFixed(2)} mm (u ${uOf(a).toFixed(4)} v ${vOf(a).toFixed(4)})`);
  }
  const A = area();
  ok(Math.abs(A - 0.081) <= 0.081 * (F.FST.ang[6] > 0 ? 0.03 : 0.005), `area changed at ${t}s: ${A.toFixed(5)}`);
  ok([...pos.array].every(Number.isFinite), `finite at ${t}s`);
}
results.push('isometry (worst ' + (worstEdge * 100).toFixed(2) + ' %) and area');

// 2. contacts track the same material points
const near = (a, b, tol, msg) => ok(a.distanceTo(b) <= tol, msg + ` (${(a.distanceTo(b) * 1000).toFixed(3)} mm)`);
for (const t of [12.65, 13.5, 15.2, 16.9, 18.9, 20.3, 21.35, 22.5, 23.3]) {
  go(t);
  near(ctx.fukusaHandPoint('R', t, V()), world(F.FUK_RIGHT_PINCH), 1e-6, `right pinch at ${t}s`);
}
for (const t of [10.2, 11.6, 13.6, 15.7]) {
  go(t);
  near(ctx.fukusaHandPoint('L', t, V()), world(F.FUK_LEFT_CLAMP), 1e-6, `left clamp at ${t}s`);
}
go(17.55);
near(ctx.fukusaHandPoint('L', 17.55, V()), world(F.FUK_REGRIP), 1e-6, 'left regrip at 17.55s');
for (const t of [20.3, 21.35, 23.55, 25.7, 27.0]) {
  go(t);
  near(ctx.fukusaHandPoint('L', t, V()), world([0, 0]), 1e-6, `left thumb on the centre at ${t}s`);
}
go(17);
{
  const L = ctx.fukusaHandPoint('L', 17, V());
  let d = 9;
  const w = V();
  for (let i = 0; i < N; i++) d = Math.min(d, vtx(i, w).applyQuaternion(cloth.quaternion).add(cloth.position).distanceTo(L));
  ok(d > 0.04, `released left hand is ${(d * 100).toFixed(1)} cm from the cloth`);
}
results.push('pinch, clamp, regrip and thumb contacts');

// 3. the user's correction: right hand above at B, left hand below at A, the A–B diagonal vertical
const up = new THREE.Vector3(0, 1, 0);
let worstAngle = 0;
for (let t = 15.2; t <= 16.35 + 1e-9; t += 0.05) {
  go(t);
  const d = world(F.FUK_RIGHT_PINCH).sub(world(F.FUK_LEFT_CLAMP)),
    ab = world(F.FUK_B).sub(world(F.FUK_A));
  const a1 = (d.angleTo(up) * 180) / Math.PI,
    a2 = (ab.angleTo(up) * 180) / Math.PI;
  worstAngle = Math.max(worstAngle, a1, a2);
  ok(a1 <= 2 && a2 <= 2, `vertical hold at ${t.toFixed(2)}s: pins ${a1.toFixed(2)}°, A–B ${a2.toFixed(2)}°`);
  ok(d.y >= 0.3, `right hand ${(d.y * 100).toFixed(1)} cm above the left at ${t.toFixed(2)}s`);
}
for (let t = 16.35; t <= 19.55 + 1e-9; t += 0.05) {
  go(t);
  const ab = world(F.FUK_B).sub(world(F.FUK_A));
  ok((ab.angleTo(up) * 180) / Math.PI <= 10, `hanging from B at ${t.toFixed(2)}s`);
}
go(15.7);
{
  const A = world(F.FUK_A),
    B = world(F.FUK_B),
    C = world(F.FUK_FREE_CORNER);
  const ab = V().subVectors(B, A).normalize(),
    ac = V().subVectors(C, A);
  const off = ac.clone().addScaledVector(ab, -ac.dot(ab));
  off.y = 0;
  ok(off.length() >= 0.12, `free corner ${(off.length() * 100).toFixed(1)} cm from the diagonal`);
  // the cloth seen face-on (along its normal) is the flat triangle
  const n = new THREE.Vector3(Math.cos(F.FUK_HOLD_PSI), 0, Math.sin(F.FUK_HOLD_PSI)),
    e1 = up.clone(),
    e2 = new THREE.Vector3().crossVectors(n, e1);
  const pts = [];
  const w = V();
  for (let i = 0; i < N; i++) {
    vtx(i, w).applyQuaternion(cloth.quaternion).add(cloth.position);
    pts.push([w.dot(e1), w.dot(e2)]);
  }
  const hull = convexHull(pts);
  let A2 = 0;
  for (let i = 0; i < hull.length; i++) {
    const p = hull[i],
      q = hull[(i + 1) % hull.length];
    A2 += p[0] * q[1] - q[0] * p[1];
  }
  A2 = Math.abs(A2) / 2;
  ok(Math.abs(A2 - 0.0405) <= 0.0405 * 0.15, `hanging triangle area ${A2.toFixed(4)} vs 0.0405`);
}
results.push(`vertical diagonal (worst ${worstAngle.toFixed(2)}°), hang from B, the triangle`);

// 4. the corners meet over the thumb
go(23.55);
// B lies on A with the stack between them (3 mm of layers)
near(world(F.FUK_A), world(F.FUK_B), 0.0035, 'B on A at 23.55s');
near(world(F.FUK_RIGHT_PINCH), world(F.FUK_PINCH_PARTNER), 0.0035, 'pinch over its partner at 23.55s');
results.push('B lands on A');

// 5. the pad and the obi packet (measured in the cloth's own D-frame)
const P3 = new Float64Array(3);
function dBox(s, t) {
  go(t, s);
  const lo = [9, 9, 9],
    hi = [-9, -9, -9];
  for (let i = 0; i < N; i++) {
    F.foldD(MX[i], MZ[i], P3);
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], P3[k]);
      hi[k] = Math.max(hi[k], P3[k]);
    }
  }
  return { lo, hi, size: hi.map((h, k) => h - lo[k]) };
}
function fill(box) {
  // projected area / bounding box, on a 2 mm raster of the triangles (in the D-frame's a, b)
  const g = 0.002,
    nx = Math.ceil(box.size[0] / g),
    ny = Math.ceil(box.size[1] / g),
    hit = new Uint8Array(nx * ny);
  const P = [];
  for (let i = 0; i < N; i++) P.push(Array.from(F.foldD(MX[i], MZ[i], new Float64Array(3))));
  for (let t = 0; t < I.length; t += 3) {
    const a = P[I[t]],
      b = P[I[t + 1]],
      c = P[I[t + 2]];
    const x0 = Math.max(0, Math.floor((Math.min(a[0], b[0], c[0]) - box.lo[0]) / g)),
      x1 = Math.min(nx - 1, Math.floor((Math.max(a[0], b[0], c[0]) - box.lo[0]) / g)),
      y0 = Math.max(0, Math.floor((Math.min(a[1], b[1], c[1]) - box.lo[1]) / g)),
      y1 = Math.min(ny - 1, Math.floor((Math.max(a[1], b[1], c[1]) - box.lo[1]) / g));
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const px = box.lo[0] + (x + 0.5) * g,
          py = box.lo[1] + (y + 0.5) * g;
        const d1 = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]),
          d2 = (c[0] - b[0]) * (py - b[1]) - (c[1] - b[1]) * (px - b[0]),
          d3 = (a[0] - c[0]) * (py - c[1]) - (a[1] - c[1]) * (px - c[0]);
        if ((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0)) hit[x * ny + y] = 1;
      }
  }
  let n = 0;
  for (const h of hit) n += h;
  return n / hit.length;
}
for (const t of [27.0, 29.0, 39.1]) {
  const b = dBox(two, t);
  ok(Math.abs(b.size[0] - 0.1009) <= 0.006 && Math.abs(b.size[1] - 0.1003) <= 0.006, `pad footprint at ${t}s: ${(b.size[0] * 100).toFixed(2)} × ${(b.size[1] * 100).toFixed(2)} cm`);
  // the stack's thickness in the middle of the pad (the half crease may still be wrapped round the thumb)
  const cx = (b.lo[0] + b.hi[0]) / 2,
    cy = (b.lo[1] + b.hi[1]) / 2;
  let c0 = 9,
    c1 = -9;
  for (let i = 0; i < N; i++) {
    F.foldD(MX[i], MZ[i], P3);
    if (Math.abs(P3[0] - cx) < 0.015 && Math.abs(P3[1] - cy) < 0.015) {
      c0 = Math.min(c0, P3[2]);
      c1 = Math.max(c1, P3[2]);
    }
  }
  ok(c1 - c0 >= 0.004 && c1 - c0 <= 0.01, `pad thickness at ${t}s: ${((c1 - c0) * 1000).toFixed(1)} mm`);
  const fr = fill(b);
  ok(fr > 0.9, `pad fill ratio at ${t}s: ${fr.toFixed(3)}`);
}
{
  const b = dBox(two, 5); // women: the packet over the obi's top edge
  // the visible part, from the obi edge (P_L) down
  ok(Math.abs(b.size[1] - 0.1003) <= 0.008, `obi packet width ${(b.size[1] * 100).toFixed(1)} cm`);
  F.foldD(F.FUK_LEFT_CLAMP[0], F.FUK_LEFT_CLAMP[1], P3);
  ok(Math.abs(b.hi[0] - P3[0] - 0.15) <= 0.008, `obi packet hangs ${((b.hi[0] - P3[0]) * 100).toFixed(1)} cm below the obi edge`);
  vm.runInContext('fukusaLowerObi = true', ctx);
  const m = dBox(two, 5);
  vm.runInContext('fukusaLowerObi = false', ctx);
  ok(Math.abs(m.size[1] - 0.1003) <= 0.008, `men's packet width ${(m.size[1] * 100).toFixed(1)} cm`);
  ok(m.size[0] >= 0.15 && m.size[0] <= 0.208, `men's packet length ${(m.size[0] * 100).toFixed(1)} cm`);
}
results.push('pad 10 × 10 cm, about 8 mm, filled; obi packets');

// 6. no layer interpenetration: rays along the stack normal through a 1 cm grid, and the same layer order 1/60 s later
function stackHits(t) {
  go(t);
  const P = [];
  for (let i = 0; i < N; i++) P.push(Array.from(F.foldD(MX[i], MZ[i], new Float64Array(3))));
  const out = new Map();
  let minGap = 9;
  const hinges = [];
  for (let k = 0; k < 7; k++) if (F.FST.th[k] > 1e-6) hinges.push([[1, 1, 0, 0, 0, 1, 1][k], [0, 0.100345, 0, -F.FUK_DIAGONAL / 2, -0.15, -0.075, 0.0502][k]]);
  for (let x = -0.2; x <= 0.2; x += 0.01)
    for (let y = -0.2; y <= 0.2; y += 0.01) {
      if (hinges.some(([ax, h]) => Math.abs((ax ? y : x) - h) < 0.008)) continue;
      const hits = [];
      for (let k = 0; k < I.length; k += 3) {
        const a = P[I[k]],
          b = P[I[k + 1]],
          c = P[I[k + 2]];
        const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
        if (Math.abs(den) < 1e-14) continue;
        const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den,
          l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den,
          l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        // skip the rounded crease bands (their surface is not across the ray)
        const nz = Math.abs(((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / Math.hypot(...cross(sub(b, a), sub(c, a))));
        if (nz < 0.985) continue; // only the flat (stacked) parts: an open flap or a round crease is not a layer spacing
        // the material region of the hit: which side of each crease line the triangle's centroid lies on
        const mu = (FUKu(I[k]) + FUKu(I[k + 1]) + FUKu(I[k + 2])) / 3,
          mv = (FUKv(I[k]) + FUKv(I[k + 1]) + FUKv(I[k + 2])) / 3;
        hits.push([l1 * a[2] + l2 * b[2] + l3 * c[2], region(mu, mv)]);
      }
      hits.sort((p, q) => p[0] - q[0]);
      const uniq = [];
      for (const h of hits) if (!uniq.length || h[0] - uniq[uniq.length - 1][0] > 1e-7 || h[1] !== uniq[uniq.length - 1][1]) uniq.push(h);
      for (let i = 1; i < uniq.length; i++) if (uniq[i][1] !== uniq[i - 1][1]) minGap = Math.min(minGap, uniq[i][0] - uniq[i - 1][0]);
      out.set(x.toFixed(2) + ',' + y.toFixed(2), uniq.map((h) => h[1]).join('/'));
    }
  return { minGap, order: out };
}
const FUKu = (i) => MX[i] * (0.135 / F.FUK_DIAGONAL) + MZ[i] * (0.15 / F.FUK_DIAGONAL),
  FUKv = (i) => MX[i] * (0.15 / F.FUK_DIAGONAL) - MZ[i] * (0.135 / F.FUK_DIAGONAL);
// the material region of a triangle: which side of every crease that is folded now
const region = (u, v) => {
  const A = F.FST.ang;
  return (A[2] ? (u > 0 ? 1 : 0) : 0) + (v > 0 ? 2 : 0) + (A[1] && Math.abs(v) > 0.100345 ? 4 : 0) + (A[3] && Math.abs(u) > F.FUK_DIAGONAL / 2 ? 8 : 0) + (A[6] && Math.abs(v) > 0.0502 && Math.abs(v) < 0.1505 ? 16 : 0) + (A[4] && Math.abs(u) > 0.15 ? 32 : 0) + (A[5] && Math.abs(u) > 0.075 ? 64 : 0);
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
for (const t of [19.6, 23.6, 26.6, 29, 31.5, 39.1, 40.5]) {
  const h0 = stackHits(t),
    h1 = stackHits(t + 1 / 60);
  ok(h0.minGap >= 0.45 * F.FUK_GAP, `layers ${(h0.minGap * 1000).toFixed(3)} mm apart at ${t}s`);
  let same = true;
  for (const [k, v] of h0.order) if (h1.order.get(k) !== v && v.split('/').length === (h1.order.get(k) || '').split('/').length) same = false;
  ok(same, `layer order changes between ${t}s and ${t + 1 / 60}s`);
}
results.push('layers stay apart and in order');

// 7. crisp creases: the innermost rounded band of a pressed crease is at most 6 mm wide; no folded-over shading spikes
go(29);
for (let k = 0; k < 4; k++) ok(Math.PI * F.FST.r0[k] <= 0.0065, `crease ${k} band ${(Math.PI * F.FST.r0[k] * 1000).toFixed(1)} mm`);
{
  const nrm = [];
  for (let t = 0; t < I.length; t += 3) {
    vtx(I[t], pa);
    vtx(I[t + 1], pb).sub(pa);
    vtx(I[t + 2], pc).sub(pa);
    nrm.push(pb.clone().cross(pc).normalize());
  }
  const byEdge = new Map();
  for (let t = 0, f = 0; t < I.length; t += 3, f++)
    for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) {
      const key = a < b ? a * 65536 + b : b * 65536 + a;
      if (byEdge.has(key)) {
        const g = byEdge.get(key);
        const atCrossing = (i) => CREASE_U.some((c) => Math.abs(uOf(i) - c) < 0.008) && CREASE_V.some((c) => Math.abs(vOf(i) - c) < 0.003);
        if (atCrossing(a) && atCrossing(b)) continue; // the corner where two creases cross
        const ang = (Math.acos(Math.max(-1, Math.min(1, nrm[f].dot(nrm[g])))) * 180) / Math.PI;
        if (ang > 100 && process.env.FUKUSA_ALL) console.log('  njump', ang.toFixed(0), uOf(a).toFixed(4), vOf(a).toFixed(4), uOf(b).toFixed(4), vOf(b).toFixed(4));
        ok(ang <= 100, `normal jump ${ang.toFixed(0)}° across an edge of the pad`);
      } else byEdge.set(key, f);
    }
}
results.push('crisp creases');

// 8. determinism and reverse seeks
function snapshot(t) {
  go(t);
  return Float32Array.from(pos.array);
}
const fresh = {};
for (const t of [15.7, 22.15, 25.7, 36, 41.2]) fresh[t] = snapshot(t);
for (const t of [27, 12, 23, 18, 29, 40, 0, 14, 19, 22.15, 25.7, 36, 34.4, 41.2, 44.5, 15.7]) {
  const a = snapshot(t);
  if (fresh[t]) ok(a.every((v, i) => v === fresh[t][i]), `seek to ${t}s gives a different cloth`);
  ok(a.every(Number.isFinite), `finite after seeking to ${t}s`);
}
results.push('seeking is bit-exact');

// 9. continuity: no vertex jumps more than 1.5 cm in 1/60 s (world, inside the handling windows; shape everywhere)
const prev = new Float32Array(N * 3),
  cur = new Float32Array(N * 3);
function sampleWorld(t, out) {
  go(t);
  const w = V();
  for (let i = 0; i < N; i++) {
    vtx(i, w);
    if (ctx.fukusaHandlingNow()) w.applyQuaternion(cloth.quaternion).add(cloth.position);
    out[3 * i] = w.x;
    out[3 * i + 1] = w.y;
    out[3 * i + 2] = w.z;
  }
  return ctx.fukusaHandlingNow();
}
vm.runInContext('globalThis.fukusaHandlingNow = () => fukusaHandling', ctx);
const dense = [9.5, 10.2, 12.65, 14.55, 15.2, 20.3, 23.55, 26.55, 27.95, 29.0, 33.6, 34.2, 39.1, 43.3, 45.2];
const times = [];
for (let t = 9.4; t <= 46.3; t += 1 / 60) times.push(t);
for (const d of dense) for (let k = -12; k <= 12; k++) times.push(d + k / 240);
times.sort((a, b) => a - b);
let worstStep = 0,
  worstAt = 0,
  worstFast = 0;
for (let i = 0; i < times.length; i++) {
  const t = times[i];
  const h0 = sampleWorld(t, prev);
  const h1 = sampleWorld(t + 1 / 60, cur);
  if (h0 !== h1) continue; // the hand-over to the tracks: the browser part checks the drawn cloth's continuity across it
  let m = 0;
  for (let k = 0; k < N; k++) m = Math.max(m, Math.hypot(cur[3 * k] - prev[3 * k], cur[3 * k + 1] - prev[3 * k + 1], cur[3 * k + 2] - prev[3 * k + 2]));
  if (t >= 33.55 && t < 39.1) worstFast = Math.max(worstFast, m); // the second folding replays the first about 2.9× faster
  else if (m > worstStep) {
    worstStep = m;
    worstAt = t;
  }
  if (m > 0.015 && process.env.FUKUSA_ALL) console.log('  jump', (m * 100).toFixed(2), 'cm at', t.toFixed(3));
  i += 3; // every fourth sample is enough between the dense points
}
ok(worstStep <= 0.015, `vertex jumps ${(worstStep * 100).toFixed(2)} cm in 1/60 s at ${worstAt.toFixed(3)}s`);
ok(worstFast <= 0.025, `vertex jumps ${(worstFast * 100).toFixed(2)} cm in 1/60 s in the second folding`);
results.push(`continuity (worst ${(worstStep * 100).toFixed(2)} cm per 1/60 s; ${(worstFast * 100).toFixed(2)} cm in the faster second folding)`);

// 10. hang sanity: released at the bottom, the cloth hangs nearly under its pin
go(16.9);
{
  // area-weighted centre of mass of the triangles
  const c = V(),
    w = V();
  let A = 0;
  for (let t = 0; t < I.length; t += 3) {
    vtx(I[t], pa);
    vtx(I[t + 1], pb);
    vtx(I[t + 2], pc);
    const a = w.subVectors(pb, pa).cross(V().subVectors(pc, pa)).length() / 2;
    A += a;
    c.addScaledVector(pa.add(pb).add(pc), a / 3);
  }
  c.multiplyScalar(1 / A).applyQuaternion(cloth.quaternion).add(cloth.position);
  const pin = world(F.FUK_RIGHT_PINCH);
  ok(Math.hypot(c.x - pin.x, c.z - pin.z) <= 0.02, `centre of mass ${(Math.hypot(c.x - pin.x, c.z - pin.z) * 100).toFixed(1)} cm from the pin`);
}
results.push('hangs under its pin');

// 11. the rig: bone lengths; the raised right forearm stays near level only as asked (level ≤ 0.3)
const pose = { legs: 0, torso: [0, 0, 0], snap: true, L: { grip: new THREE.Vector3(0.19, 0.635, 0.37) }, R: { grip: new THREE.Vector3(-0.19, 0.635, 0.37) } };
const rig = ctx.testRig;
rig.solve(pose);
for (const arm of Object.values(rig.S.arms)) {
  ok(Math.abs(arm.shoulder.distanceTo(arm.elbow) - 0.29) < 0.00001, 'upper arm length');
  ok(Math.abs(arm.elbow.distanceTo(arm.wrist) - 0.232) < 0.00001, 'forearm length');
}
for (let t = 12.65; t <= 23.55; t += 0.1) {
  go(t);
  const P = F.fukusaPlan('R', t);
  ok(P.level <= 0.3, `right level ${P.level} at ${t.toFixed(2)}s`);
}
results.push('rig bone lengths, right level ≤ 0.3');

// 12. performance and allocations of the settle (synthetic hands near the cloth)
ctx.F2 = F;
function fakeS(t) {
  const S = { arms: {} };
  for (const side of [1, -1]) {
    const key = side > 0 ? 'L' : 'R',
      P = ctx.F2.fukusaPlan(key, t);
    const g = new THREE.Vector3(P.aim.x * -1, P.aim.y, P.aim.z + 0.17);
    S.arms[side] = { side, wrist: g.clone().add(new THREE.Vector3(0, 0, -0.1)), elbow: g.clone().add(new THREE.Vector3(0, -0.1, -0.3)), fwd: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), curl: 0.4, fingers: null, thumb: 0.4, pinch: null };
  }
  return S;
}
const perf = {};
for (const t of [15.7, 25.7]) {
  go(t);
  const S = fakeS(t);
  const settle = () => {
    ctx.F2.fukusaPlan('L', t);
    ctx.F2.fukusaPlan('R', t);
    ctx.F2.settleFukusa(S, 1 / 60, false);
  };
  for (let k = 0; k < 300; k++) settle();
  gc();
  const h0 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  for (let k = 0; k < 1000; k++) settle();
  const ms = (performance.now() - t0) / 1000;
  gc();
  const dh = process.memoryUsage().heapUsed - h0; // what stays allocated
  perf[t] = { ms, dh };
  ok(ms <= 2, `settle takes ${ms.toFixed(3)} ms at ${t}s`);
  ok(dh < 64 * 1024, `settle allocates ${(dh / 1024).toFixed(1)} KB per 1000 calls at ${t}s`);
  ok([...pos.array].every(Number.isFinite), 'settled cloth is finite');
}
{
  // the settle is deterministic too
  go(25.7);
  const S = fakeS(25.7);
  ctx.F2.fukusaPlan('L', 25.7);
  ctx.F2.fukusaPlan('R', 25.7);
  ctx.F2.settleFukusa(S, 0, true);
  const a = Float32Array.from(pos.array);
  go(12);
  go(25.7);
  ctx.F2.fukusaPlan('L', 25.7);
  ctx.F2.fukusaPlan('R', 25.7);
  ctx.F2.settleFukusa(S, 0, true);
  ok(a.every((v, i) => v === pos.array[i]), 'settle is not deterministic');
}
{
  // the target rebuild alone
  const t0 = performance.now();
  for (let k = 0; k < 200; k++) go(15.7 + (k % 2) * 0.01);
  perf.target = (performance.now() - t0) / 200;
}
results.push(`settle ${perf[15.7].ms.toFixed(3)} / ${perf[25.7].ms.toFixed(3)} ms, target rebuild ${perf.target.toFixed(3)} ms, ${(perf[15.7].dh / 1024).toFixed(1)} KB per 1000 settles`);

// 14. narration: both scripts follow the lesson's lines and timing rule
for (const sc of ['ifu', 'shizue']) {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'check-script.js'), path.join(root, 'src/data', sc + '-script.json')], { encoding: 'utf8' });
  ok(r.status === 0, `check-script ${sc}: ${r.stdout}`);
}
results.push('scripts');
console.log('PASS: ' + results.join('; ') + '.');

function convexHull(P) {
  P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const c = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [],
    hi = [];
  for (const p of P) {
    while (lo.length >= 2 && c(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (hi.length >= 2 && c(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
    hi.push(p);
  }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

// ---- 13. in the page, both teachers: the real fingers on the cloth ----
async function browser(html) {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let fails = 0;
  for (const teacher of ['shizue', 'ifu']) {
    const p = await b.newPage({ viewport: { width: 320, height: 240 } });
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await p.goto('file://' + path.resolve(html) + '#teacher=' + teacher);
    await p.waitForTimeout(1200);
    await p.click('#start').catch(() => {});
    const rows = await p.evaluate(() => {
      const S = window.__sado,
        O = S.O,
        T = THREE,
        out = [];
      S.setMotion('smooth');
      const times = [10.9, 12.6, 13.6, 15.7, 17.55, 18.9, 21.0, 23.0, 24.4, 24.5, 25.2, 25.8, 27.2, 28.4, 30.7, 31.0, 36.0, 40.6, 41.0];
      const HP = { 1: S.rig.makeHandPoints(), '-1': S.rig.makeHandPoints() };
      const tri = new T.Triangle(),
        q = new T.Vector3(),
        v = new T.Vector3();
      for (const t of times) {
        S.sample(2, t, 0);
        for (let k = 0; k < 10; k++) S.sample(2, t, 1 / 60); // as when the lesson plays into this moment (the elbow eases)
        const f = O.fukusa;
        f.updateMatrixWorld(true);
        const pos = f.geometry.attributes.position,
          I = f.geometry.index.array;
        const W = [];
        for (let i = 0; i < pos.count; i++) W.push(new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(f.matrixWorld));
        const dist = (p) => {
          let d = 9;
          for (let k = 0; k < I.length; k += 3) {
            tri.set(W[I[k]], W[I[k + 1]], W[I[k + 2]]);
            tri.closestPointToPoint(p, q);
            d = Math.min(d, q.distanceTo(p));
          }
          return d;
        };
        const row = { t };
        for (const side of [1, -1]) {
          const a = S.rig.S.arms[side],
            h = S.rig.makeHandPoints && S.rig.handPoints(a, HP[side]);
          const key = side > 0 ? 'L' : 'R';
          const P = S.fukusaPlan ? S.fukusaPlan(key) : null;
          if (!P || !(P.w > 0.5) || P.kind === 'free') continue;
          // world (scene) positions of the hand parts: host space shifted by HOST_Z
          const toW = (u) => v.set(u.x, u.y, u.z - 0.17).clone();
          let c, r;
          if (P.kind === 'clamp') {
            c = toW(h.clamp);
            r = 0;
          } else if (P.kind === 'pinch') {
            c = toW(h.pinchMid);
            r = 0;
          } else if (P.kind === 'thumb') {
            c = toW(h.thumbTip);
            r = 0.0072;
          } else if (P.kind === 'index') {
            c = toW(h.tip[0]);
            r = h.tipR[0];
          } else continue;
          row[key] = +((dist(c) - r) * 1000).toFixed(1);
          // wrist above the lap
          const lap = S.rig.lapHeight(a.wrist.x, a.wrist.z);
          row[key + 'wrist'] = +((a.wrist.y - lap) * 100).toFixed(1);
        }
        out.push(row);
      }
      return out;
    });
    for (const r of rows) {
      const bad = (r.L != null && Math.abs(r.L) > 3) || (r.R != null && Math.abs(r.R) > 3) || (r.Lwrist != null && r.Lwrist < 2);
      if (bad) fails++;
      console.log(teacher, JSON.stringify(r), bad ? 'FAIL' : '');
    }
    // continuity in the page: the DRAWN cloth (after the settle) and both hands, played frame by frame at 60 fps
    const cont = await p.evaluate(() => {
      const S = window.__sado,
        f = S.O.fukusa,
        R = S.rig,
        pos = f.geometry.attributes.position,
        HP = { 1: R.makeHandPoints(), '-1': R.makeHandPoints() };
      const v = new THREE.Vector3();
      let prev = null,
        ph = null;
      const worst = { first: [0, 0], second: [0, 0], hand: [0, 0], handFast: [0, 0] };
      S.sample(2, 9.3, 0);
      for (let t = 9.3; t <= 46.3; t += 1 / 60) {
        S.sample(2, t, 1 / 60);
        f.updateMatrixWorld(true);
        const W = new Float64Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(f.matrixWorld);
          W[3 * i] = v.x;
          W[3 * i + 1] = v.y;
          W[3 * i + 2] = v.z;
        }
        const H = [];
        for (const side of [1, -1]) {
          const a = R.S.arms[side];
          R.handPoints(a, HP[side]);
          H.push(a.wrist.clone(), HP[side].tip[0].clone(), HP[side].thumbTip.clone());
        }
        if (prev) {
          let m = 0;
          for (let i = 0; i < W.length; i += 3) m = Math.max(m, Math.hypot(W[i] - prev[i], W[i + 1] - prev[i + 1], W[i + 2] - prev[i + 2]));
          const k = t > 33.6 && t < 39.1 ? 'second' : 'first'; // the second folding replays the first about 2.9× faster
          if (m > worst[k][0]) worst[k] = [m, t];
          // the wrists, while this module plans the hands (9.5–29.0 and 33.6–39.1) and across both hand-overs
          if ((t > 9.5 && t < 29.1) || (t > 33.6 && t < 39.2)) {
            let hm = 0;
            for (let i = 0; i < H.length; i += 3) hm = Math.max(hm, H[i].distanceTo(ph[i]));
            const hk = t > 33.6 && t < 39.2 ? 'handFast' : 'hand';
            if (hm > worst[hk][0]) worst[hk] = [hm, t];
          }
        }
        prev = W;
        ph = H;
      }
      return worst;
    });
    const cm = (x) => (x[0] * 100).toFixed(2) + ' cm at ' + x[1].toFixed(3) + 's';
    const cBad = cont.first[0] > 0.02 || cont.second[0] > 0.03 || cont.hand[0] > 0.025 || cont.handFast[0] > 0.04;
    if (cBad) fails++;
    console.log(teacher, `continuity (drawn cloth per 1/60 s): worst ${cm(cont.first)}, second folding ${cm(cont.second)}; wrists ${cm(cont.hand)}, second folding ${cm(cont.handFast)}`, cBad ? 'FAIL' : '');
    // every finger and thumb capsule against the cloth's triangles at the pose pictures (the digits that hold the cloth
    // between them, and the left thumb inside the half fold, are planned contacts and are left out)
    const pen = await p.evaluate(() => {
      const S = window.__sado,
        f = S.O.fukusa,
        R = S.rig,
        T = THREE,
        out = [];
      const tri = new T.Triangle(),
        q = new T.Vector3();
      for (const t of [12.6, 15.7, 21.0, 23.0, 24.5, 25.8, 27.2, 28.4, 31.0, 36.0, 41.0]) {
        S.sample(2, t, 0);
        for (let k = 0; k < 20; k++) S.sample(2, t, 1 / 60);
        f.updateMatrixWorld(true);
        const pos = f.geometry.attributes.position,
          I = f.geometry.index.array,
          W = [];
        for (let i = 0; i < pos.count; i++) W.push(new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(f.matrixWorld));
        const dist = (p) => {
          let d = 9;
          for (let k = 0; k < I.length; k += 3) {
            const A = W[I[k]];
            if (Math.abs(A.x - p.x) > 0.06 || Math.abs(A.y - p.y) > 0.06 || Math.abs(A.z - p.z) > 0.06) continue;
            tri.set(A, W[I[k + 1]], W[I[k + 2]]);
            tri.closestPointToPoint(p, q);
            d = Math.min(d, q.distanceTo(p));
          }
          return d;
        };
        let worst = 9,
          at = '';
        for (const side of [1, -1]) {
          const key = side > 0 ? 'L' : 'R',
            P = S.fukusaPlan(key),
            kind = P && P.w > 0.5 ? P.kind : 'free';
          const a = R.S.arms[side],
            h = R.handPoints(a, R.makeHandPoints());
          const segs = [];
          for (let i = 0; i < 4; i++) {
            if (kind === 'clamp' && i < 2) continue; // the cloth lies between index and middle finger
            if (kind === 'pinch' && i === 0) continue;
            segs.push([key + 'f' + i, h.base[i], h.mid[i], h.rad[i]], [key + 'f' + i + 't', h.mid[i], h.tip[i], h.tipR[i]]);
          }
          if (!(kind === 'pinch' || (kind === 'thumb' && key === 'L' && t > 20.3))) segs.push([key + 'th', h.thumbMid, h.thumbTip, 0.0072]);
          for (const [nm, A, B, r] of segs)
            for (let s = 0; s <= 4; s++) {
              const p = A.clone().lerp(B, s / 4);
              p.z -= 0.17; // host space -> world
              const d = dist(p) - r;
              if (d < worst) {
                worst = d;
                at = nm;
              }
            }
        }
        out.push({ t, worst: +(worst * 1000).toFixed(1), at });
      }
      return out;
    });
    for (const r of pen) {
      const bad = r.worst < -6; // a few mm where a finger presses (or the tail is tucked in between the pad and the fingers)
      if (bad) fails++;
      console.log(teacher, 'finger capsules', JSON.stringify(r), bad ? 'FAIL' : '');
    }
    await p.close();
  }
  await b.close();
  console.log(fails ? `FAIL: ${fails} contact rows out of tolerance` : 'PASS: browser contacts for both teachers');
  process.exit(fails ? 1 : 0);
}
