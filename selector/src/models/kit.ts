// Shared helpers for the procedural busts (selector/src/models/*Bust.tsx).
// Convention: a bust spans y = 0 (mid-chest) to y ≈ 1 (top of head), centred at x = 0, facing +z.
// Everything is built imperatively once per mount (useBust), animated in useFrame and disposed on unmount.
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

export type V3 = [number, number, number];

// ---------- materials ----------
let gradient: THREE.DataTexture | null = null;
/** Shared 3-step ramp for MeshToonMaterial (never disposed). */
export function toonGradient(): THREE.DataTexture {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([165, 165, 165, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}
export function toon(color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });
}

/** Adds a mesh to a parent with position / rotation / scale. */
export function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  m.rotation.set(...r);
  m.scale.set(...s);
  parent.add(m);
  return m;
}

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d') as CanvasRenderingContext2D, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Frees geometries, materials and their colour maps under obj (the shared toon ramp is kept). */
export function disposeTree(obj: THREE.Object3D): void {
  const extra = new Set<THREE.Texture>();
  obj.traverse((o) => {
    // texture frames not bound to a material right now (closed eyes, other mouth shapes) live on any node's userData
    (o.userData.textures as THREE.Texture[] | undefined)?.forEach((t) => extra.add(t));
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
      const mm = mat as THREE.MeshToonMaterial;
      if (mm.map) mm.map.dispose();
      mat.dispose();
    });
  });
  extra.forEach((t) => t.dispose());
}

/** Places obj on a sphere of radius r around its parent's origin: local +z = outward normal, local -y runs down the surface.
 *  az = angle around y from the front (+ = towards +x), el = elevation, tilt lifts the lower end away from the surface. */
export function place(obj: THREE.Object3D, r: number, az: number, el: number, tilt = 0, twist = 0): THREE.Object3D {
  obj.position.set(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
  obj.rotation.order = 'YXZ';
  obj.rotation.set(-el - tilt, az, twist);
  return obj;
}

// ---------- head and face ----------
export interface FaceStyle {
  skin: string;
  iris: string;
  irisDeep?: string;
  lash?: string;
  brow?: string;
  lip?: string;
  /** canvas fractions of the face patch */
  eyeY?: number;
  eyeSpan?: number;
  eyeW?: number;
  eyeH?: number;
  browY?: number;
  browTilt?: number;
  lashWing?: boolean;
  blush?: number;
  nose?: boolean;
  /** polar angle (fraction of PI) of the mouth centre */
  mouthTheta?: number;
  mouthW?: number;
}
export interface HeadRig {
  group: THREE.Group;
  setMouth(i: 0 | 1 | 2): void;
  setBlink(closed: boolean): void;
}

const FACE_PHI = 0.95,
  FACE_T0 = 0.3 * Math.PI,
  FACE_T1 = 0.85 * Math.PI;

/** Chibi head shape: a sphere with a narrower, slightly pointed chin. Applied to the head and to its face decals. */
function deformHead(geo: THREE.BufferGeometry, r: number): void {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const ny = y / r;
    if (ny < 0) {
      const s = Math.pow(-ny, 1.7);
      const front = Math.max(0, z / r);
      x *= 1 - 0.24 * s;
      z *= 1 - 0.1 * s + 0.05 * s * front;
      y *= 1 + 0.07 * s * front;
    }
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
}

function patch(r: number, phiSpan: number, t0: number, t1: number, headR: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 40, 32, Math.PI / 2 - phiSpan, phiSpan * 2, t0, t1 - t0);
  deformHead(g, headR);
  return g;
}

function eyeTex(s: FaceStyle, closed: boolean): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, W, H) => {
    const lash = s.lash || '#2a1d1d',
      brow = s.brow || lash;
    const ey = (s.eyeY ?? 0.47) * H,
      span = (s.eyeSpan ?? 0.17) * W,
      ew = (s.eyeW ?? 0.125) * W,
      eh = (s.eyeH ?? 0.15) * H;
    g.lineCap = g.lineJoin = 'round';
    // blush
    if (s.blush) {
      for (const sx of [-1, 1]) {
        const bx = W / 2 + sx * (span + ew * 0.25),
          by = ey + eh * 0.95;
        const rg = g.createRadialGradient(bx, by, 2, bx, by, ew * 0.7);
        rg.addColorStop(0, `rgba(240,120,130,${s.blush})`);
        rg.addColorStop(1, 'rgba(240,120,130,0)');
        g.fillStyle = rg;
        g.beginPath();
        g.ellipse(bx, by, ew * 0.75, eh * 0.4, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const sx of [-1, 1]) {
      const cx = W / 2 + sx * span;
      g.save();
      g.translate(cx, ey);
      g.scale(sx, 1); // sx = +1: viewer's right eye; outer corner at +x
      const L = -ew / 2,
        R = ew / 2;
      // brow
      const by = -(s.browY ?? 1.05) * eh,
        tilt = s.browTilt ?? 0.08;
      g.strokeStyle = brow;
      g.lineWidth = eh * 0.07;
      g.beginPath();
      g.moveTo(L * 0.85, by + ew * tilt * 0.5);
      g.quadraticCurveTo(0, by - eh * 0.16, R * 1.05, by - ew * tilt * 0.5);
      g.stroke();
      if (closed) {
        g.strokeStyle = lash;
        g.lineWidth = eh * 0.11;
        g.beginPath();
        g.moveTo(L, eh * 0.02);
        g.quadraticCurveTo(0, eh * 0.28, R, -eh * 0.04);
        g.stroke();
        g.restore();
        continue;
      }
      const top = () => {
        g.moveTo(L, eh * 0.05);
        g.bezierCurveTo(L * 0.7, -eh * 0.62, R * 0.6, -eh * 0.66, R, -eh * 0.12);
      };
      // eye white
      g.beginPath();
      top();
      g.bezierCurveTo(R * 0.85, eh * 0.45, L * 0.6, eh * 0.62, L, eh * 0.05);
      g.fillStyle = '#fbfbfb';
      g.fill();
      g.save();
      g.clip();
      // iris (taller than the opening, cut by the lid) with a darker top, pupil, light rim at the bottom
      const ig = g.createLinearGradient(0, -eh * 0.5, 0, eh * 0.5);
      ig.addColorStop(0, s.irisDeep || lash);
      ig.addColorStop(0.55, s.iris);
      ig.addColorStop(1, '#ffffff');
      g.fillStyle = ig;
      g.beginPath();
      g.ellipse(-ew * 0.02, eh * 0.04, ew * 0.37, eh * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = s.irisDeep || lash;
      g.beginPath();
      g.ellipse(-ew * 0.02, -eh * 0.02, ew * 0.15, eh * 0.24, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = eh * 0.04;
      g.strokeStyle = s.irisDeep || lash;
      g.beginPath();
      g.ellipse(-ew * 0.02, eh * 0.04, ew * 0.37, eh * 0.5, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      // upper lash line (thick, with an outer flick), small lower lash
      g.strokeStyle = lash;
      g.fillStyle = lash;
      g.lineWidth = eh * 0.13;
      g.beginPath();
      top();
      g.stroke();
      if (s.lashWing !== false) {
        g.beginPath();
        g.moveTo(R * 0.7, -eh * 0.42);
        g.quadraticCurveTo(R * 1.2, -eh * 0.36, R * 1.28, -eh * 0.5);
        g.quadraticCurveTo(R * 1.12, -eh * 0.12, R * 0.92, -eh * 0.1);
        g.fill();
      }
      g.lineWidth = eh * 0.045;
      g.beginPath();
      g.moveTo(R * 0.15, eh * 0.43);
      g.quadraticCurveTo(R * 0.75, eh * 0.33, R * 0.95, eh * 0.12);
      g.stroke();
      g.restore();
      // highlights (same side on both eyes)
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(cx - ew * 0.13, ey - eh * 0.14, ew * 0.11, eh * 0.1, -0.4, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(cx + ew * 0.11, ey + eh * 0.2, ew * 0.045, 0, Math.PI * 2);
      g.fill();
    }
    if (s.nose) {
      g.fillStyle = 'rgba(150,90,80,0.55)';
      g.beginPath();
      g.ellipse(W / 2, ey + eh * 1.05, 3, 2.2, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function mouthTex(s: FaceStyle, i: 0 | 1 | 2): THREE.CanvasTexture {
  return canvasTex(128, 128, (g, W, H) => {
    const cx = W / 2,
      cy = H / 2,
      w = (s.mouthW ?? 1) * 30,
      lineCol = s.lip ? shade(s.lip, 0.55) : '#6b3434';
    g.lineCap = g.lineJoin = 'round';
    if (i === 0) {
      g.strokeStyle = lineCol;
      g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(cx - w * 0.42, cy - 2);
      g.quadraticCurveTo(cx, cy + 7, cx + w * 0.42, cy - 2);
      g.stroke();
      return;
    }
    const h = i === 1 ? 13 : 24,
      ww = i === 1 ? w * 0.75 : w * 0.85;
    g.beginPath();
    g.moveTo(cx - ww / 2, cy - h * 0.3);
    g.quadraticCurveTo(cx, cy - h * 0.12, cx + ww / 2, cy - h * 0.3);
    g.bezierCurveTo(cx + ww * 0.42, cy + h * 0.75, cx - ww * 0.42, cy + h * 0.75, cx - ww / 2, cy - h * 0.3);
    g.fillStyle = '#7a2e33';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#e8838a';
    g.beginPath();
    g.ellipse(cx, cy + h * 0.62, ww * 0.32, h * 0.35, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.strokeStyle = lineCol;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(cx - ww / 2, cy - h * 0.3);
    g.bezierCurveTo(cx - ww * 0.42, cy + h * 0.75, cx + ww * 0.42, cy + h * 0.75, cx + ww / 2, cy - h * 0.3);
    g.quadraticCurveTo(cx, cy - h * 0.12, cx - ww / 2, cy - h * 0.3);
    g.stroke();
  });
}

/** Darkens (k < 1) or lightens (k > 1) a CSS colour. */
export function shade(css: string, k: number): string {
  const c = new THREE.Color(css);
  if (k <= 1) c.multiplyScalar(k);
  else c.lerp(new THREE.Color(1, 1, 1), k - 1);
  return '#' + c.getHexString();
}

/** A chibi head (origin at its centre, radius r) with ears, a drawn face (eyes blink) and a mouth that opens. */
export function buildHead(s: FaceStyle, r = 0.24): HeadRig {
  const group = new THREE.Group();
  const skin = toon(s.skin, { emissive: s.skin, emissiveIntensity: 0.14 });
  const headGeo = new THREE.SphereGeometry(r, 48, 36);
  deformHead(headGeo, r);
  add(group, headGeo, skin);
  const earGeo = new THREE.SphereGeometry(r * 0.16, 12, 10);
  for (const sx of [-1, 1]) add(group, earGeo.clone(), skin.clone(), [sx * r * 0.93, -r * 0.08, -r * 0.05], [0, 0, 0], [0.5, 1, 0.75]);
  earGeo.dispose();
  const eyes = [eyeTex(s, false), eyeTex(s, true)];
  const faceMat = toon(0xffffff, { map: eyes[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  add(group, patch(r * 1.002, FACE_PHI, FACE_T0, FACE_T1, r), faceMat);
  const mt = (s.mouthTheta ?? 0.72) * Math.PI;
  const mouths = [mouthTex(s, 0), mouthTex(s, 1), mouthTex(s, 2)];
  const mouthMat = toon(0xffffff, { map: mouths[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  add(group, patch(r * 1.004, 0.36, mt - 0.12 * Math.PI, mt + 0.12 * Math.PI, r), mouthMat);
  group.userData.textures = [...eyes, ...mouths];
  let mouth = 0,
    blink = false;
  return {
    group,
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
}

// ---------- hair ----------
/** Toon hair material with fine strand lines running from the crown (meridians of a hairShell). */
export function hairMat(color: string, dark: string, light: string, double = true): THREE.MeshToonMaterial {
  const tex = canvasTex(512, 128, (g, W, H) => {
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const x = (i / 90) * W + ((i * 37) % 7) - 3;
      g.strokeStyle = i % 3 === 0 ? light : dark;
      g.globalAlpha = 0.35;
      g.lineWidth = i % 3 === 0 ? 2 : 1.5;
      g.beginPath();
      g.moveTo(x, H * (0.05 + ((i * 13) % 5) * 0.03));
      g.lineTo(x + ((i % 2) * 2 - 1) * 2, H);
      g.stroke();
    }
    g.globalAlpha = 1;
  });
  tex.wrapS = THREE.RepeatWrapping;
  return toon(0xffffff, { map: tex, side: double ? THREE.DoubleSide : THREE.FrontSide });
}

/** A hair shell over the head whose lower edge follows ends.front / side / back (polar angle, fraction of PI).
 *  fringe adds n pointed strands to the front edge (depth as a fraction of PI) within ±fringeSpan of the front. */
export function hairShell(r: number, mat: THREE.Material, ends: { front: number; side: number; back: number; fringe?: number; strands?: number; fringeSpan?: number; part?: number }): THREE.Mesh {
  const g = new THREE.SphereGeometry(r, 64, 28, 0, Math.PI * 2, 0, Math.PI * 0.99); // < PI: keep both triangles in the last row
  const p = g.attributes.position as THREE.BufferAttribute,
    uv = g.attributes.uv as THREE.BufferAttribute;
  const n = ends.strands ?? 7,
    fs = ends.fringeSpan ?? 1.25,
    part = ends.part ?? 0;
  for (let i = 0; i < p.count; i++) {
    const phi = uv.getX(i) * Math.PI * 2,
      v = 1 - uv.getY(i);
    const az = Math.atan2(-Math.cos(phi), Math.sin(phi)); // 0 = front, + = towards +x
    const d = Math.abs(az);
    const sm = (a: number, b: number, t: number) => a + (b - a) * (t * t * (3 - 2 * t));
    let end = Math.PI * (d < Math.PI / 2 ? sm(ends.front, ends.side, d / (Math.PI / 2)) : sm(ends.side, ends.back, (d - Math.PI / 2) / (Math.PI / 2)));
    if (ends.fringe && Math.abs(az - part) < fs) {
      const k = ((az - part + fs) / (2 * fs)) * n;
      const tri = 1 - Math.abs((k % 1) * 2 - 1); // 0 at strand gaps, 1 at strand tips
      const fade = Math.cos(((az - part) / fs) * Math.PI * 0.5);
      end += Math.PI * ends.fringe * (1 - (1 - tri) * (1 - tri)) * (0.45 + 0.55 * fade); // broad locks, narrow notches
    }
    const th = v * end;
    p.setXYZ(i, -r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th));
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/** A tapered, slightly bent lock of hair: top centre at the origin, hanging along -y; bend pushes the tip towards +z. */
export function lockGeo(len: number, w: number, thick: number, bend = 0, tipW = 0.08): THREE.BufferGeometry {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0);
  sh.quadraticCurveTo(-w * 0.55, -len * 0.55, -w * tipW, -len);
  sh.lineTo(w * tipW, -len);
  sh.quadraticCurveTo(w * 0.55, -len * 0.55, w / 2, 0);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.5, bevelSize: Math.min(w * 0.12, thick * 0.6), bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -thick / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = Math.max(0, -p.getY(i) / len);
    p.setZ(i, p.getZ(i) + bend * t * t);
  }
  g.computeVertexNormals();
  return g;
}

/** A ringed drill curl: top at the origin, spiralling down to -len. */
export function drillGeo(len: number, r: number, rings = 5): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const taper = Math.sin(Math.min(1, t * 6) * Math.PI * 0.5) * (1 - 0.72 * t);
    const ridge = 0.82 + 0.18 * Math.abs(Math.cos(t * rings * Math.PI));
    pts.push(new THREE.Vector2(Math.max(0.001, r * taper * ridge), -t * len));
  }
  pts.push(new THREE.Vector2(0.001, -len - r * 0.08));
  const g = new THREE.LatheGeometry(pts.reverse(), 20);
  g.computeVertexNormals();
  return g;
}

/** A curtain of long hair: an open cylinder part with a tapered bottom and pointed ends.
 *  Spans angle `span` (radians) centred on the back (behind the head), from y = 0 down to -h. */
export function curtainGeo(rTop: number, rBot: number, h: number, span: number, points = 9, depth = 0.06): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, 48, 10, true, Math.PI - span / 2, span);
  g.translate(0, -h / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute,
    uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = 1 - uv.getY(i);
    const k = uv.getX(i) * points;
    const tri = 1 - Math.abs((k % 1) * 2 - 1);
    p.setY(i, p.getY(i) + depth * (1 - tri) * t * t);
  }
  g.computeVertexNormals();
  return g;
}

// ---------- torso ----------
export interface TorsoMap {
  W: number;
  H: number;
  /** canvas pixel of the front surface point at model x, y */
  uv(x: number, y: number): [number, number];
  /** traces a polygon given in model x, y (edges subdivided so they follow the surface) */
  poly(g: CanvasRenderingContext2D, pts: [number, number][], close?: boolean): void;
  R(y: number): number;
}
/** A lathe torso (front at +z) from a profile [radius, y] listed bottom to top, depth-scaled, textured by draw(). */
export function buildTorso(profile: [number, number][], depth: number, draw: (g: CanvasRenderingContext2D, m: TorsoMap) => void): { mesh: THREE.Mesh; tex: THREE.CanvasTexture } {
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = curve.getSpacedPoints(48);
  const W = 1024,
    H = 512;
  const at = (y: number) => {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].y >= y || i === pts.length - 1) {
        const a = pts[i - 1],
          b = pts[i];
        const t = b.y === a.y ? 0 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
        return { r: a.x + (b.x - a.x) * t, v: (i - 1 + t) / (pts.length - 1) };
      }
    }
    return { r: pts[0].x, v: 0 };
  };
  const map: TorsoMap = {
    W,
    H,
    R: (y) => at(y).r,
    uv(x, y) {
      const { r, v } = at(y);
      const phi = Math.asin(Math.max(-1, Math.min(1, x / r)));
      return [(0.5 + phi / (Math.PI * 2)) * W, (1 - v) * H];
    },
    poly(g, ps, close = true) {
      g.beginPath();
      const all = close ? [...ps, ps[0]] : ps;
      all.forEach((q, i) => {
        if (i === 0) {
          const [u, w] = map.uv(q[0], q[1]);
          g.moveTo(u, w);
          return;
        }
        const a = all[i - 1];
        for (let k = 1; k <= 12; k++) {
          const t = k / 12;
          const [u, w] = map.uv(a[0] + (q[0] - a[0]) * t, a[1] + (q[1] - a[1]) * t);
          g.lineTo(u, w);
        }
      });
      if (close) g.closePath();
    },
  };
  const tex = canvasTex(W, H, (g) => draw(g, map));
  const geo = new THREE.LatheGeometry(pts, 72, Math.PI, Math.PI * 2);
  const mesh = new THREE.Mesh(geo, toon(0xffffff, { map: tex }));
  mesh.scale.z = depth;
  // bottom cap
  const capGeo = new THREE.CircleGeometry(pts[0].x, 48);
  capGeo.rotateX(Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, toon(0x222222));
  cap.position.y = pts[0].y;
  mesh.add(cap);
  return { mesh, tex };
}

/** A standard bust torso profile: shoulders of half-width sw at y ≈ 0.3, neck opening rn at y ≈ 0.42. */
export function torsoProfile(sw = 0.31, rn = 0.075, bottom = -0.04): [number, number][] {
  return [
    [sw * 0.9, bottom],
    [sw * 0.95, 0.1],
    [sw, 0.22],
    [sw * 0.93, 0.3],
    [sw * 0.66, 0.37],
    [rn * 1.6, 0.405],
    [rn, 0.42],
  ];
}

// ---------- animation ----------
export interface BustParts {
  root: THREE.Group;
  head?: HeadRig;
  /** the head group's resting rotation is animated (nod while talking) */
  animate?: (t: number, talking: boolean) => void;
}
/** Builds the bust once per mount, disposes it on unmount, blinks, and opens / closes the mouth while talking. */
export function useBust(build: () => BustParts, talking: boolean): THREE.Group {
  const parts = useMemo(build, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => disposeTree(parts.root), [parts]);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    const h = parts.head;
    if (h) {
      h.setBlink(t % 3.7 < 0.13);
      if (talking) {
        const v = Math.abs(Math.sin(t * 11) * (0.6 + 0.4 * Math.sin(t * 3.1)));
        h.setMouth(v > 0.62 ? 2 : v > 0.25 ? 1 : 0);
        h.group.rotation.x = Math.sin(t * 5.5) * 0.025;
      } else {
        h.setMouth(0);
        h.group.rotation.x *= 0.9;
      }
    }
    parts.animate?.(t, talking);
  });
  return parts.root;
}

/** A ribbon bow (centre at the origin, facing +z) with two short tails. */
export function bow(mat: THREE.Material, w = 0.12, tails = true): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    add(g, new THREE.SphereGeometry(1, 16, 12), mat, [sx * w * 0.42, 0, 0], [0, 0, sx * 0.3], [w * 0.4, w * 0.25, w * 0.11]);
    if (tails) add(g, lockGeo(w * 0.7, w * 0.26, w * 0.05, 0, 0.3), mat, [sx * w * 0.07, -w * 0.03, -w * 0.02], [0, 0, sx * 0.4]);
  }
  add(g, new THREE.SphereGeometry(1, 12, 10), mat, [0, 0, w * 0.05], [0, 0, 0], [w * 0.14, w * 0.15, w * 0.11]);
  return g;
}

/** Skin-coloured neck from y0 to y1. */
export function neck(parent: THREE.Object3D, skin: string, r = 0.056, y0 = 0.34, y1 = 0.54): THREE.Mesh {
  return add(parent, new THREE.CylinderGeometry(r, r * 1.1, y1 - y0, 20), toon(skin), [0, (y0 + y1) / 2, -0.01]);
}

/** Resting height of the head centre and head radius used by the busts. */
export const HEAD_Y = 0.655,
  HEAD_R = 0.24;
