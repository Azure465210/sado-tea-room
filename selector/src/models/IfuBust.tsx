// Urone If (虚音イフ), after the official design: a cream fluffy-furred head with ear tufts, a brown plague-doctor beak mask
// with a pale hooked tip and brass-ringed lenses at the sides, a brown hat (darker band, dark feather, stitched patch),
// a stitched seam on the neck, a maroon scarf knotted at the side, a ragged dark-brown short cape, a mid-brown kimono and
// the tops of the huge sleeves with grey pleated bands and dark wing-feather tips.
// The beak never opens: talking = a subtle nod and a glint in the lenses.
import * as THREE from 'three';
import { add, buildTorso, canvasTex, hairMat, lockGeo, place, toon, torsoProfile, useBust } from './kit';

const PAL = {
  fur: '#e8dcbc',
  furDark: '#c7b48d',
  furLight: '#fffaf0',
  mask: '#6f5d51',
  maskDark: '#3f332d',
  bone: '#ddd4c0',
  brass: '#8c703f',
  glass: '#34343b',
  hat: '#6c4d45',
  hatDark: '#4e3530',
  band: '#45262a',
  patch: '#8f7060',
  feather: '#2d2627',
  scarf: '#4f1c1f',
  scarfDark: '#3f1316',
  cape: '#47342f',
  capeDark: '#2a1f1d',
  kimono: '#7d5a4b',
  kimonoLight: '#9d7a67',
  chest: '#e5dccb',
  cuff: '#a8a29c',
  wing: '#2b2322',
};

const NECK_Y = 0.52; // nod pivot
const HEAD_C = 0.13; // head centre above the pivot
const HEAD_S = 1.3; // head group scale
const HR = 0.15; // fur head radius

/** A curved beak along +z, bending down; the last part is pale bone with a hook. */
function beakGeo(len: number, rx: number, ry: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(Math.max(0.002, Math.pow(1 - t, 0.6) * (1 - 0.1 * t)), t));
  }
  const g = new THREE.LatheGeometry(pts, 24);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const leather = new THREE.Color(PAL.mask),
    bone = new THREE.Color(PAL.bone),
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i);
    const x = p.getX(i) * rx,
      v = p.getZ(i) * ry; // v > 0: upper side
    const drop = -0.4 * len * t * t; // the axis curves down
    const hook = t > 0.8 ? -0.25 * len * (t - 0.8) * (t - 0.8) * 5 : 0;
    p.setXYZ(i, x, v + drop + hook + (v > 0 ? 0.02 * t * len : 0), t * len);
    c.copy(t > 0.72 ? bone : leather);
    if (t > 0.68 && t <= 0.72) c.lerpColors(leather, bone, (t - 0.68) / 0.04);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** A shell segment on a sphere of radius r (polar angles t0..t1, azimuth ±a around the front). */
function spherePatch(r: number, a: number, t0: number, t1: number): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, 40, 24, Math.PI / 2 - a, 2 * a, t0, t1 - t0);
}

function capeTex(): THREE.CanvasTexture {
  return canvasTex(1024, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = PAL.cape;
    g.fillRect(0, 0, W, H);
    // a soft darkening towards the hem
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(20,10,8,0.25)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // the front opening (u = 0.5 is the front): a narrow worn border, then the cut
    const rows = 40;
    const half = (v: number, sd: number) => (0.045 + 0.03 * v + 0.002 * Math.sin(v * 21 + sd)) * W;
    const opening = (grow: number) => {
      g.beginPath();
      for (let k = 0; k <= rows; k++) g.lineTo(W / 2 - half(k / rows, 0) - grow, (k / rows) * H);
      for (let k = rows; k >= 0; k--) g.lineTo(W / 2 + half(k / rows, 1) + grow, (k / rows) * H);
    };
    g.fillStyle = '#54403a';
    opening(W * 0.008);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    opening(0);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(0, H);
    for (let i = 0; i <= 48; i++) {
      const x = (i / 48) * W;
      const depth = i % 2 ? 0.05 + ((i * 7) % 5) * 0.01 : 0.0;
      g.lineTo(x, H * (1 - depth));
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'source-over';
  });
}

function stitchTex(base: string, line: string, wPx = 256, hPx = 64): THREE.CanvasTexture {
  return canvasTex(wPx, hPx, (g, W, H) => {
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = line;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(W * 0.3, H * 0.5);
    g.lineTo(W * 0.7, H * 0.5);
    g.stroke();
    for (let i = 0; i < 9; i++) {
      const x = W * (0.32 + i * 0.045);
      g.beginPath();
      g.moveTo(x - 3, H * 0.32);
      g.lineTo(x + 3, H * 0.68);
      g.stroke();
    }
  });
}

function pleatTex(): THREE.CanvasTexture {
  return canvasTex(256, 32, (g, W, H) => {
    g.fillStyle = PAL.cuff;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) {
      g.fillStyle = i % 2 ? '#7d7772' : '#c4beb8';
      g.fillRect((i / 24) * W, 0, 3, H);
    }
  });
}

function patchTex(): THREE.CanvasTexture {
  return canvasTex(64, 64, (g, W, H) => {
    g.fillStyle = PAL.patch;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#4a3530';
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    g.strokeRect(5, 5, W - 10, H - 10);
  });
}

function build() {
  const root = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const furMat = hairMat(PAL.fur, PAL.furDark, PAL.furLight, false);
  const furTuft = toon(PAL.fur, { side: THREE.DoubleSide, emissive: PAL.fur, emissiveIntensity: 0.1 });
  const furShade = toon(PAL.furDark, { side: THREE.DoubleSide });

  // ---- kimono torso (only the front V shows between the cape fronts) ----
  const { mesh: torso, tex: torsoTex } = buildTorso(torsoProfile(0.3, 0.075, -0.1), 0.74, (g, m) => {
    g.fillStyle = PAL.kimono;
    g.fillRect(0, 0, m.W, m.H);
    // pale chest in a deep collar V; the under-collar (viewer's left) runs beneath the over-collar (wearer's left panel)
    g.fillStyle = PAL.chest;
    m.poly(g, [[-0.08, 0.45], [0.08, 0.45], [-0.01, 0.05]]);
    g.fill();
    g.fillStyle = PAL.kimonoLight;
    m.poly(g, [[-0.085, 0.45], [-0.045, 0.45], [0.02, 0.0], [-0.02, 0.0]]);
    g.fill();
    g.fillStyle = PAL.kimono;
    m.poly(g, [[0.08, 0.45], [-0.09, -0.06], [0.4, -0.06], [0.4, 0.45]]);
    g.fill();
    g.fillStyle = PAL.kimonoLight;
    m.poly(g, [[0.08, 0.45], [-0.09, -0.06], [-0.04, -0.06], [0.125, 0.45]]);
    g.fill();
    g.strokeStyle = '#3e2a22';
    g.lineWidth = 3;
    for (const l of [[[0.08, 0.45], [-0.09, -0.06]], [[0.125, 0.45], [-0.04, -0.06]], [[-0.085, 0.45], [-0.02, 0.0]]] as [number, number][][]) {
      m.poly(g, l, false);
      g.stroke();
    }
  });
  textures.push(torsoTex);
  root.add(torso);

  // ---- sleeves: huge rounded tops with grey pleated bands, dark feather tips at the outer edge ----
  const kimonoMat = toon(PAL.kimono);
  const pleat = pleatTex();
  textures.push(pleat);
  const pleatMat = toon(0xffffff, { map: pleat });
  const wingMat = toon(PAL.wing, { side: THREE.DoubleSide });
  for (const d of [-1, 1]) {
    const sl = new THREE.Group();
    sl.position.set(d * 0.42, -0.25, -0.02);
    sl.rotation.z = d * 0.1;
    root.add(sl);
    add(sl, new THREE.SphereGeometry(1, 28, 20), kimonoMat, [0, 0, 0], [0, 0, 0], [0.16, 0.34, 0.2]);
    add(sl, new THREE.CylinderGeometry(0.122, 0.136, 0.05, 32, 1, true), pleatMat, [0, 0.21, 0], [0, 0, 0], [1, 1, 1.24]);
    for (let i = 0; i < 4; i++) {
      const f = add(sl, lockGeo(0.16 - i * 0.012, 0.05, 0.012, -0.02, 0.1), wingMat, [d * (0.13 + i * 0.008), 0.16 - i * 0.05, 0.06 - i * 0.04]);
      f.rotation.set(0.1, d * (1.0 + i * 0.25), d * (0.35 - i * 0.05));
    }
  }

  // ---- cape: a ragged, open-fronted shell over the shoulders ----
  const capePts: [number, number][] = [
    [0.43, -0.1], [0.425, 0.02], [0.42, 0.08], [0.405, 0.16], [0.37, 0.25], [0.31, 0.315], [0.22, 0.37], [0.14, 0.41], [0.11, 0.43],
  ];
  const curve = new THREE.SplineCurve(capePts.map(([r, y]) => new THREE.Vector2(r, y)));
  const capeGeo = new THREE.LatheGeometry(curve.getSpacedPoints(40), 72, Math.PI, Math.PI * 2);
  const ct = capeTex();
  textures.push(ct);
  const cape = add(root, capeGeo, toon(0xffffff, { map: ct, alphaTest: 0.5, side: THREE.DoubleSide }), [0, 0, -0.005], [0, 0, 0], [1, 1, 0.8]);
  cape.renderOrder = 1;

  // ---- neck with a stitched seam ----
  const nt = stitchTex(PAL.chest, '#5b4a42');
  textures.push(nt);
  add(root, new THREE.CylinderGeometry(0.066, 0.075, 0.16, 24, 1, true, Math.PI, Math.PI * 2), toon(0xffffff, { map: nt, side: THREE.DoubleSide }), [0, 0.475, 0.0]);

  // ---- scarf: a draped cowl around the neck, knotted on the viewer's right, loops and tails over the shoulder ----
  const scarfMat = toon(PAL.scarf, { side: THREE.DoubleSide });
  const scarfDark = toon(PAL.scarfDark, { side: THREE.DoubleSide });
  const cowlPts = [[0.215, 0.335], [0.2, 0.37], [0.165, 0.41], [0.12, 0.445], [0.095, 0.465]].map(([r, y]) => new THREE.Vector2(r, y));
  const cowl = new THREE.LatheGeometry(cowlPts, 48);
  {
    const p = cowl.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getX(i), p.getZ(i));
      const y = p.getY(i);
      // the front sags lower and the cloth ripples in folds
      const front = Math.max(0, Math.cos(a));
      const fold = 1 + 0.06 * Math.sin(a * 7) * (0.47 - y) * 6;
      p.setXYZ(i, p.getX(i) * fold, y - 0.045 * front * (0.47 - y) * 8, p.getZ(i) * fold * 0.92);
    }
    cowl.computeVertexNormals();
  }
  add(root, cowl, scarfMat);
  const roll = add(root, new THREE.TorusGeometry(0.098, 0.03, 10, 32), scarfMat, [0, 0.46, 0.0], [Math.PI / 2 + 0.12, 0, 0], [1.05, 0.95, 1]);
  roll.scale.set(1.05, 0.92, 1.4);
  const knot = new THREE.Group();
  knot.position.set(0.19, 0.44, -0.01);
  knot.rotation.set(0, 0.9, -0.2);
  knot.scale.setScalar(1.35);
  root.add(knot);
  add(knot, new THREE.SphereGeometry(1, 16, 12), scarfMat, [0, 0, 0.0], [0, 0, 0], [0.045, 0.042, 0.04]);
  for (const s of [-1, 1]) {
    // two loose loops sticking up and back, like in the art
    add(knot, new THREE.SphereGeometry(1, 18, 12), scarfMat, [s * 0.06, 0.035, -0.01], [0, 0, s * 0.5], [0.07, 0.045, 0.028]);
    add(knot, new THREE.SphereGeometry(1, 12, 8), scarfDark, [s * 0.06, 0.035, 0.012], [0, 0, s * 0.5], [0.04, 0.02, 0.012]);
  }
  for (const s of [-1, 1]) add(knot, lockGeo(0.17, 0.06, 0.016, 0.03, 0.4), scarfMat, [s * 0.015, -0.02, 0.01], [0, 0, s * 0.25]);

  // ---- head (nods from the neck) ----
  const headPivot = new THREE.Group();
  headPivot.position.y = NECK_Y;
  root.add(headPivot);
  const head = new THREE.Group();
  head.position.y = HEAD_C;
  head.rotation.x = 0.1; // a slight downward tilt: the curved beak reads from the front too
  head.scale.setScalar(HEAD_S);
  headPivot.add(head);
  add(head, new THREE.SphereGeometry(HR, 40, 30), furMat, [0, 0, 0], [0, 0, 0], [1, 1.04, 1]);
  // fluffy fur: tufts around the head below the hat, at the cheeks and a ruff under the jaw
  const tuftGeo = lockGeo(0.085, 0.05, 0.016, 0.03, 0.1);
  for (let i = 0; i < 16; i++) {
    const az = Math.PI * 0.32 + (i / 15) * Math.PI * 1.36; // sides and back
    const t = add(head, tuftGeo, i % 3 ? furTuft : furShade);
    // kept low and hanging down, under the hat brim (which droops at the back and on his right): no fur through the hat
    place(t, HR * 0.98, az, 0.18 + (i % 2) * 0.08, 0.22 + (i % 3) * 0.1, Math.sin(i) * 0.3);
  }
  for (let i = 0; i < 12; i++) {
    const az = Math.PI * 0.45 + (i / 11) * Math.PI * 1.1;
    const t = add(head, lockGeo(0.065, 0.05, 0.016, 0.025, 0.12), i % 4 ? furTuft : furShade);
    place(t, HR * 0.95, az, -0.45, 0.3, Math.sin(i * 1.7) * 0.25);
  }
  // fringe of fur on the forehead under the brim, in front of the mask's upper edge
  for (let i = 0; i < 9; i++) {
    const az = -0.75 + (i / 8) * 1.5;
    const t = add(head, lockGeo(0.07 + (i % 2) * 0.02, 0.045, 0.012, 0.025, 0.1), i % 3 === 1 ? furShade : furTuft);
    place(t, HR * 1.03, az, 0.55, 0.35, Math.sin(i * 2.3) * 0.25);
  }
  // ear tufts sticking out sideways, three locks each
  for (const d of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      // low and nearly level, so the tips stay under the hat brim while he turns
      const e = add(head, lockGeo(0.13 - k * 0.022, 0.065, 0.02, 0.02, 0.08), k === 1 ? furShade : furTuft, [d * HR * 0.86, 0.035 - k * 0.025, -0.02 - k * 0.012]);
      e.rotation.order = 'YXZ';
      e.rotation.set(0.15, d * (0.35 + k * 0.15), d * (1.82 - k * 0.25));
    }
  }

  // mask over the face and the beak
  const maskMat = toon(PAL.mask, { emissive: PAL.mask, emissiveIntensity: 0.08 });
  const mask = add(head, spherePatch(HR * 1.035, 1.2, 0.4 * Math.PI, 0.86 * Math.PI), maskMat, [0, 0, 0], [0, 0, 0], [1, 1.04, 1]);
  mask.renderOrder = 0;
  const beak = add(head, beakGeo(0.27, 0.078, 0.07), toon(0xffffff, { vertexColors: true, emissive: '#3a2e28', emissiveIntensity: 0.15 }), [0, -0.025, HR * 0.8]);
  beak.rotation.x = 0.5; // steeply down-forward, so its curve shows below the mask even on the static front view
  // a dark seam ring where the beak meets the mask, with rivets along its sides, and a seam along the top
  const rivet = toon(PAL.maskDark);
  const seam = add(beak, new THREE.TorusGeometry(1, 0.06, 6, 32), rivet, [0, 0.0, 0.012], [0, 0, 0], [0.078 * 0.97, 0.07 * 0.97, 0.08]);
  seam.scale.z = 0.08;
  const rgeo = new THREE.SphereGeometry(0.0065, 8, 6);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9; // along the lower half of the ring
    add(beak, rgeo, rivet, [Math.cos(a) * 0.072, Math.sin(a) * 0.064, 0.03]);
  }
  add(beak, new THREE.BoxGeometry(0.006, 0.006, 0.15), rivet, [0, 0.07, 0.07], [0.3, 0, 0]);

  // brass-ringed lenses at the sides of the mask
  const brass = toon(PAL.brass, { emissive: '#3a2a10', emissiveIntensity: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: PAL.glass, roughness: 0.2, metalness: 0.3, emissive: new THREE.Color('#ffd98a'), emissiveIntensity: 0.05 });
  const glints: THREE.MeshBasicMaterial[] = [];
  for (const d of [-1, 1]) {
    const lens = new THREE.Group();
    place(lens, HR * 1.04, d * 0.68, 0.16);
    head.add(lens);
    add(lens, new THREE.TorusGeometry(0.042, 0.011, 10, 28), brass, [0, 0, 0.006]);
    add(lens, new THREE.CylinderGeometry(0.038, 0.038, 0.012, 24), glassMat, [0, 0, 0.004], [Math.PI / 2, 0, 0]);
    add(lens, new THREE.TorusGeometry(0.022, 0.003, 6, 24), brass, [0, 0, 0.011]);
    const gm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    glints.push(gm);
    add(lens, new THREE.CircleGeometry(0.009, 12), gm, [-0.012, 0.013, 0.0115]);
  }

  // ---- hat: crumpled crown, darker band, stitched patch, dark feather, wide drooping brim ----
  const hat = new THREE.Group();
  hat.position.set(0, 0.092, -0.005);
  hat.rotation.set(-0.08, 0.0, 0.07);
  head.add(hat);
  const hatMat = toon(PAL.hat, { side: THREE.DoubleSide });
  const brimPts = [[0.34, -0.045], [0.31, -0.022], [0.25, -0.004], [0.18, 0.004], [0.15, 0.006]].map(([r, y]) => new THREE.Vector2(r, y));
  const brim = new THREE.LatheGeometry(brimPts, 64);
  {
    const p = brim.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getX(i), p.getZ(i));
      const r = Math.hypot(p.getX(i), p.getZ(i));
      const e = Math.max(0, r - 0.2) / 0.14;
      // droops more at the front and back, a little wavy and ragged at the rim
      p.setY(i, p.getY(i) - e * (0.025 * Math.cos(a) ** 2 - 0.012 * Math.sin(a) ** 2 + 0.006 * Math.sin(a * 9)));
    }
    brim.computeVertexNormals();
  }
  add(hat, brim, hatMat);
  const crownPts = [[0.152, 0.0], [0.158, 0.07], [0.155, 0.13], [0.14, 0.175], [0.08, 0.195], [0.001, 0.19]].map(([r, y]) => new THREE.Vector2(r, y));
  const crown = new THREE.LatheGeometry(crownPts, 48);
  {
    const p = crown.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      // a soft front-to-back crease and a dent at the front left: a well-worn hat
      const top = Math.max(0, (y - 0.12) / 0.075);
      const crease = Math.exp(-(x * x) / 0.0025) * 0.03 * top;
      const dent = Math.exp(-((x + 0.08) ** 2 + (z - 0.1) ** 2) / 0.004) * 0.025 * top;
      p.setY(i, y - crease - dent + 0.008 * Math.sin(x * 40) * top);
    }
    crown.computeVertexNormals();
  }
  add(hat, crown, hatMat);
  add(hat, new THREE.CylinderGeometry(0.161, 0.159, 0.045, 48, 1, true), toon(PAL.band, { side: THREE.DoubleSide }), [0, 0.027, 0]);
  const pt = patchTex();
  textures.push(pt);
  add(hat, new THREE.CylinderGeometry(0.1615, 0.1615, 0.055, 12, 1, true, -0.95, 0.5), toon(0xffffff, { map: pt, side: THREE.DoubleSide }), [0, 0.085, 0]);
  // the feather in the band on the viewer's right, sweeping back and up
  const feather = new THREE.Group();
  feather.position.set(0.15, 0.04, -0.04);
  feather.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0.75, 0.45, -0.5).normalize());
  hat.add(feather);
  const fMat = toon(PAL.feather, { side: THREE.DoubleSide });
  add(feather, lockGeo(0.24, 0.055, 0.006, 0.02, 0.05), fMat);
  add(feather, new THREE.BoxGeometry(0.004, 0.24, 0.004), toon('#5a4a46'), [0, -0.12, 0.006]);

  // talking: a subtle nod from the neck and a glint in the lenses; idle: a slow, small head tilt
  let amp = 0;
  const animate = (t: number, talking: boolean) => {
    amp += ((talking ? 1 : 0) - amp) * 0.1;
    const nod = Math.max(0, Math.sin(t * 4.4));
    headPivot.rotation.x = amp * 0.07 * nod * nod + Math.sin(t * 0.9) * 0.012;
    headPivot.rotation.z = Math.sin(t * 0.6) * 0.015;
    const glint = amp * Math.pow(Math.max(0, Math.sin(t * 4.4 + 0.6)), 6);
    glassMat.emissiveIntensity = 0.05 + glint * 0.9;
    for (const g of glints) g.opacity = 0.35 + glint * 0.65;
  };
  root.userData.textures = textures;
  return { root, animate };
}

export function IfuBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return <primitive object={root} />;
}
