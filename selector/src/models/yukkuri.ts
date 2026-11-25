// Shared builder for the head-only Yukkuri manju busts (ReimuBust, MarisaBust).
// A squashed, flat-bottomed manju sitting on y = 0, centred at x = 0, facing +z, with a drawn dot-eye face,
// a mouth that opens, a hair shell, and a gentle squash-bounce while talking.
import * as THREE from 'three';
import { add, canvasTex, hairMat, hairShell, toon, type BustParts, type HeadRig } from './kit';

export interface YukkuriStyle {
  skin: string;
  /** lower iris tint of the dot eyes */
  eye: string;
  hair: string;
  hairDark: string;
  hairLight: string;
  /** manju semi-axes (x, y, z) in bust units */
  size: [number, number, number];
  /** hair edge (polar angle, fraction of PI) at the front, the sides and the back */
  hairEnds: { front: number; side: number; back: number; fringe: number; strands: number };
  blush?: number;
}

export interface YukkuriRig extends BustParts {
  /** bounces and squashes with the manju (origin at the bottom centre) */
  body: THREE.Group;
  /** the unit-sphere space of the manju (scaled); children follow its surface */
  ball: THREE.Group;
  /** world-space (body space) point on the manju surface at azimuth az (+ = towards +x), elevation el, radius factor k */
  surf(az: number, el: number, k?: number): THREE.Vector3;
  hair: THREE.MeshToonMaterial;
}

const FLAT = -0.6; // the unit sphere is flattened below this height
const BOTTOM = FLAT - (1 + FLAT) * 0.3;

/** Radial (x, z) widening and new height for a normalised height n on the unit manju. */
function manjuProfile(n: number): [number, number] {
  const k = n < 0 ? 1 + 0.07 * Math.sin(Math.PI * Math.min(1, -n / 0.85)) : 1 - 0.035 * n * n;
  const y = n < FLAT ? FLAT + (n - FLAT) * 0.3 : n;
  return [k, y];
}

/** Manju shape: a slightly bottom-heavy sphere with a flat base. Works for any shell radius r around 1. */
export function deformManju(geo: THREE.BufferGeometry, r = 1): void {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [k, y] = manjuProfile(p.getY(i) / r);
    p.setXYZ(i, p.getX(i) * k, y * r, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
}

// face patch on the unit sphere (polar angle range and half-width in azimuth)
const T0 = 0.36 * Math.PI,
  T1 = 0.86 * Math.PI,
  A = 1.0;
const EYE_AZ = 0.34,
  EYE_T = 0.53 * Math.PI;
const MOUTH_T = 0.675 * Math.PI,
  M_A = 0.26,
  M_T = 0.09 * Math.PI;

function patchGeo(r: number, a: number, t0: number, t1: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 48, 32, Math.PI / 2 - a, a * 2, t0, t1 - t0);
  deformManju(g, r);
  return g;
}

function eyeTex(s: YukkuriStyle, closed: boolean): THREE.CanvasTexture {
  const [sx, sy] = s.size;
  return canvasTex(512, 512, (g, W, H) => {
    // canvas pixels per bust unit, horizontally and vertically, near the eyes
    const kx = W / (2 * A) / (sx * Math.sin(EYE_T)),
      ky = H / (T1 - T0) / sy;
    const ey = ((EYE_T - T0) / (T1 - T0)) * H;
    const ew = 0.043 * kx,
      eh = 0.062 * ky;
    g.lineCap = g.lineJoin = 'round';
    if (s.blush) {
      for (const d of [-1, 1]) {
        const bx = W / 2 + d * (((EYE_AZ + 0.17) / (2 * A)) * W),
          by = ey + eh * 1.25;
        const rg = g.createRadialGradient(bx, by, 2, bx, by, ew * 1.5);
        rg.addColorStop(0, `rgba(240,110,120,${s.blush})`);
        rg.addColorStop(1, 'rgba(240,110,120,0)');
        g.fillStyle = rg;
        g.beginPath();
        g.ellipse(bx, by, ew * 1.6, eh * 0.55, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const d of [-1, 1]) {
      const cx = W / 2 + d * ((EYE_AZ / (2 * A)) * W);
      // small brows
      g.strokeStyle = '#3a2a24';
      g.lineWidth = eh * 0.13;
      g.beginPath();
      g.moveTo(cx - ew * 0.8, ey - eh * 1.35 + d * eh * 0.05);
      g.quadraticCurveTo(cx, ey - eh * 1.55, cx + ew * 0.8, ey - eh * 1.35 - d * eh * 0.05);
      g.stroke();
      if (closed) {
        g.strokeStyle = '#1a1212';
        g.lineWidth = eh * 0.2;
        g.beginPath();
        g.moveTo(cx - ew * 0.95, ey - eh * 0.05);
        g.quadraticCurveTo(cx, ey + eh * 0.45, cx + ew * 0.95, ey - eh * 0.05);
        g.stroke();
        continue;
      }
      const grad = g.createLinearGradient(0, ey - eh, 0, ey + eh);
      grad.addColorStop(0, '#120b0b');
      grad.addColorStop(0.55, '#1e1414');
      grad.addColorStop(1, s.eye);
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(cx, ey, ew, eh, 0, 0, Math.PI * 2);
      g.fill();
      // highlights: a big one top-left, a small one bottom-right
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(cx - ew * 0.32, ey - eh * 0.38, ew * 0.36, eh * 0.28, -0.3, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(cx + ew * 0.38, ey + eh * 0.42, ew * 0.15, eh * 0.11, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function mouthTex(i: 0 | 1 | 2): THREE.CanvasTexture {
  return canvasTex(128, 128, (g, W, H) => {
    const cx = W / 2,
      cy = H * 0.42;
    g.lineCap = g.lineJoin = 'round';
    g.strokeStyle = '#5a2626';
    if (i === 0) {
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(cx - 16, cy - 3);
      g.quadraticCurveTo(cx, cy + 9, cx + 16, cy - 3);
      g.stroke();
      return;
    }
    const w = i === 1 ? 17 : 21,
      h = i === 1 ? 14 : 26;
    g.beginPath();
    g.moveTo(cx - w, cy - 4);
    g.quadraticCurveTo(cx, cy, cx + w, cy - 4);
    g.bezierCurveTo(cx + w * 0.9, cy + h, cx - w * 0.9, cy + h, cx - w, cy - 4);
    g.fillStyle = '#7a2a30';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#e57f88';
    g.beginPath();
    g.ellipse(cx, cy + h * 0.8, w * 0.6, h * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.lineWidth = 3;
    g.stroke();
  });
}

/** Builds the manju with face and hair shell; the caller adds the character's hair locks and accessories. */
export function buildYukkuri(s: YukkuriStyle): YukkuriRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const [sx, sy, sz] = s.size;
  const cy = -BOTTOM * sy;
  const ball = new THREE.Group();
  ball.position.y = cy;
  ball.scale.set(sx, sy, sz);
  body.add(ball);

  const skin = toon(s.skin, { emissive: s.skin, emissiveIntensity: 0.16 });
  const g = new THREE.SphereGeometry(1, 64, 48);
  deformManju(g);
  add(ball, g, skin);

  const eyes = [eyeTex(s, false), eyeTex(s, true)];
  const faceMat = toon(0xffffff, { map: eyes[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  add(ball, patchGeo(1.002, A, T0, T1), faceMat);
  const mouths = [mouthTex(0), mouthTex(1), mouthTex(2)];
  const mouthMat = toon(0xffffff, { map: mouths[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  add(ball, patchGeo(1.004, M_A, MOUTH_T - M_T, MOUTH_T + M_T), mouthMat);

  const hair = hairMat(s.hair, s.hairDark, s.hairLight);
  const shell = hairShell(1.05, hair, s.hairEnds);
  deformManju(shell.geometry, 1.05);
  ball.add(shell);
  root.userData.textures = [...eyes, ...mouths];

  let mouth = 0,
    blink = false;
  const head: HeadRig = {
    group: body,
    setMouth(i) {
      if (i !== mouth) {
        mouth = i;
        mouthMat.map = mouths[i];
      }
    },
    setBlink(c) {
      if (c !== blink) {
        blink = c;
        faceMat.map = eyes[c ? 1 : 0];
      }
    },
  };

  const surf = (az: number, el: number, k = 1) => {
    const [w, y] = manjuProfile(Math.sin(el));
    return new THREE.Vector3(sx * k * w * Math.cos(el) * Math.sin(az), cy + sy * k * y, sz * k * w * Math.cos(el) * Math.cos(az));
  };

  // squash-bounce while talking, a slow breath otherwise (body origin = bottom centre)
  let amp = 0;
  const animate = (t: number, talking: boolean) => {
    amp += ((talking ? 1 : 0) - amp) * 0.12;
    const hop = Math.abs(Math.sin(t * 6.2));
    const land = Math.pow(1 - hop, 3);
    const breath = Math.sin(t * 1.7) * 0.012;
    const sq = amp * land * 0.075 + breath * (1 - amp);
    body.position.y = amp * hop * 0.03;
    body.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
  };

  return { root, head, animate, body, ball, surf, hair };
}

/** A white ribbon/frill outline: offsets a closed outline outward with small scallops. */
export function scallop(pts: THREE.Vector2[], grow: number, bumps: number, amp: number): THREE.Shape {
  const c = pts.reduce((a, p) => a.add(p), new THREE.Vector2()).multiplyScalar(1 / pts.length);
  const out = pts.map((p, i) => {
    const d = p.clone().sub(c);
    const len = d.length();
    const k = 1 + (grow + amp * Math.abs(Math.sin((i / pts.length) * Math.PI * bumps))) / Math.max(len, 1e-4);
    return c.clone().add(d.multiplyScalar(k));
  });
  return new THREE.Shape(out);
}
