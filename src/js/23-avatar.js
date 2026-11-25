// ---------- avatar: the tea master's body, built on the rig's joints ----------
// Everything here is drawn from the skeleton in 20-rig.js, so limbs have real lengths and never stretch.
// The face is the teacher's drawn portrait (art/<teacher>/portrait.svg): its face groups are rasterised and projected onto the
// front of the head. makeAvatar(teacher) builds one teacher; dispose() takes it all down again, so a change of teacher
// rebuilds cleanly. spec.style chooses the body details (defaults = shizue, who must stay exactly as she was):
//   hair 'chignon' | 'short', garment 'kimono' | 'jittoku', feathers, tail, pixels (bool), kneeGap (metres, half-gap at the knees)
function makeAvatar(teacher) {
  const PORTRAIT_SVG = teacher.art.svg;
  const SPEC = teacher.art.spec;
  const PAL = SPEC.palette,
    FACE = SPEC.face;
  const STYLE = Object.assign(
    { hair: 'chignon', garment: 'kimono', feathers: false, tail: false, pixels: false, kneeGap: 0, mask: false, earTufts: false, neckSeam: false, scarf: false, cape: false, sleeves: 'kimono', hands: 'skin', hakama: false, hat: false },
    SPEC.style || {},
  );
  const JIT = STYLE.garment === 'jittoku';
  // the chimera (ifu's official look): a modelled beak mask on a fur-covered head instead of a projected face
  const BEAST = STYLE.mask === 'beak';
  const MAN_OBI = JIT || STYLE.hakama; // a man's narrow obi, no drum knot
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UPV = V(0, 1, 0),
    ZV = V(0, 0, 1);
  // everything of this avatar hangs under one group at the host's seat (same frame as hostRoot), so dispose() finds it all
  const root = new THREE.Group();
  hostRoot.add(root);
  let disposed = false;
  const textures = [];
  const std = (color, rough, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough == null ? 0.9 : rough }, extra || {}));
  const MAT = {
    kimono: std(PAL.kimono, 0.95, { side: THREE.DoubleSide }),
    collar: std(PAL.kimonoShade, 0.95, { side: THREE.DoubleSide }),
    haneri: std(PAL.haneri, 1, { side: THREE.DoubleSide }),
    obi: std(PAL.obi, 0.8, { side: THREE.DoubleSide }),
    obiAccent: std(PAL.obiAccent, 0.7, { side: THREE.DoubleSide }),
    obiage: std(PAL.obiage, 0.9, { side: THREE.DoubleSide }),
    skin: std(PAL.skin, 0.75, { side: THREE.DoubleSide }),
    ear: std(PAL.skinShade, 0.8),
    tabi: std(PAL.tabi, 1),
    hair: std(0xffffff, 0.62),
    face: std(PAL.skin, 0.78),
  };
  if (JIT) {
    // the jittoku: black, slightly sheer gauze. Drawn opaque (no sorting trouble) with a faint weave of the kimono showing through.
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = PAL.jittoku || '#16151b';
    g.fillRect(0, 0, 64, 64);
    g.globalAlpha = 0.16;
    g.strokeStyle = PAL.kimono;
    for (let i = 0; i < 64; i += 4) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 64);
      g.moveTo(0, i + 2);
      g.lineTo(64, i + 2);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
    textures.push(t);
    MAT.jittoku = std(0xffffff, 0.55, { map: t, side: THREE.DoubleSide });
    MAT.jittokuEdge = std(PAL.jittoku || '#16151b', 0.5, { side: THREE.DoubleSide });
    MAT.cord = std(PAL.jittokuCord || '#2e2c34', 0.6);
    // nue: a faint tiger-stripe lining, seen along the turned-back front edges
    const s = document.createElement('canvas');
    s.width = 64;
    s.height = 256;
    const sg = s.getContext('2d');
    sg.fillStyle = PAL.stripe || '#bf8a3a';
    sg.fillRect(0, 0, 64, 256);
    sg.fillStyle = PAL.jittoku || '#16151b';
    for (let y = 0; y < 256; y += 22) {
      sg.beginPath();
      sg.moveTo(0, y);
      sg.lineTo(64, y + 10);
      sg.lineTo(64, y + 16);
      sg.lineTo(0, y + 8);
      sg.fill();
    }
    const st = new THREE.CanvasTexture(s);
    st.encoding = THREE.sRGBEncoding;
    st.wrapT = THREE.RepeatWrapping;
    textures.push(st);
    MAT.stripe = std(0xffffff, 0.8, { map: st, side: THREE.DoubleSide });
  }
  // a small canvas texture: draw(g, w, h) paints it
  const canvasTex = (w, h, draw, rx, ry) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry || rx);
    textures.push(t);
    return t;
  };
  let rnd = 7; // a fixed pseudo-random sequence, so every build looks the same
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) - 1) / 2147483646;
  if (BEAST) {
    const furTex = canvasTex(
      128,
      128,
      (g, w, h) => {
        g.fillStyle = PAL.fur;
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 520; i++) {
          const x = rand() * w,
            y = rand() * h,
            l = 4 + rand() * 7;
          g.strokeStyle = rand() < 0.55 ? PAL.furShade : PAL.hairLight;
          g.globalAlpha = 0.25 + rand() * 0.35;
          g.lineWidth = 0.8 + rand();
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + 1.5, y + l * 0.5, x + (rand() - 0.5) * 3, y + l);
          g.stroke();
        }
      },
      3,
    );
    MAT.fur = std(0xffffff, 1, { map: furTex, side: THREE.DoubleSide });
    MAT.furShade = std(PAL.furShade, 1, { side: THREE.DoubleSide });
    MAT.face = MAT.fur;
    MAT.leather = std(PAL.mask, 0.55, { side: THREE.DoubleSide });
    MAT.leatherDark = std(PAL.maskDark, 0.6);
    MAT.beak = std(PAL.beak || PAL.mask, 0.5, { side: THREE.DoubleSide });
    MAT.stitch = std('#e0cfa8', 0.8);
    MAT.brass = std(PAL.brass, 0.32, { metalness: 0.75 });
    MAT.lens = std(PAL.lens, 0.12, { metalness: 0.4, emissive: new THREE.Color(PAL.brass), emissiveIntensity: 0 });
    MAT.glint = new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0.55, depthWrite: false });
    MAT.scarf = std(PAL.scarf, 0.95, { side: THREE.DoubleSide });
    MAT.cape = std(PAL.cape, 1, { side: THREE.DoubleSide });
    // hakama: dark brown with pressed pleats running down the lap (u goes round the loft, so the lines run hip -> knee)
    MAT.hakama = std(
      0xffffff,
      0.95,
      {
        side: THREE.DoubleSide,
        map: canvasTex(256, 16, (g, w, h) => {
          g.fillStyle = PAL.hakama;
          g.fillRect(0, 0, w, h);
          for (let i = 0; i < 16; i++) {
            const x = (i + 0.5) * (w / 16);
            g.fillStyle = PAL.hakamaDark;
            g.fillRect(x, 0, 3, h);
            g.fillStyle = 'rgba(255,255,255,0.06)';
            g.fillRect(x + 3, 0, 4, h);
          }
        }),
      },
    );
    MAT.hakamaPlain = std(PAL.hakama, 0.95, { side: THREE.DoubleSide });
    // the huge sleeves: kimono brown, turning into dark feather tips at the bottom toward the sleeve end
    // (u goes round the sleeve ring from the top, 0.5 = the bottom; v runs from the shoulder end to the cuff end)
    MAT.sleeve = std(
      0xffffff,
      0.95,
      {
        side: THREE.DoubleSide,
        map: canvasTex(256, 128, (g, w, h) => {
          g.fillStyle = PAL.kimono;
          g.fillRect(0, 0, w, h);
          g.strokeStyle = PAL.kimonoShade;
          g.globalAlpha = 0.5;
          for (let k = 0; k < 6; k++) {
            g.beginPath();
            g.moveTo(w * (0.08 + k * 0.17), 0);
            g.lineTo(w * (0.1 + k * 0.17), h);
            g.stroke();
          }
          g.globalAlpha = 1;
          // the lower half of the sleeve, toward the cuff end, turns into dark feathers (tips pointing down to the bottom, u = 0.5):
          // a dark field, separated feather edges, and the brown cloth ending above it in rounded lobes
          const half = (v) => 0.17 + 0.09 * v; // how far up the sides the feathers reach (u from the bottom)
          for (let y = 0; y < h; y++) {
            const v = y / h,
              hw = half(v) * w;
            g.fillStyle = PAL.sleeveFeather;
            g.fillRect(w * 0.5 - hw, y, hw * 2, 1);
          }
          g.lineWidth = 1.4;
          for (let k = 0; k < 30; k++) {
            const y = h * (0.02 + (k / 29) * 0.96);
            for (const sd of [-1, 1]) {
              const u0 = w * 0.5 + sd * half(y / h) * w;
              g.strokeStyle = 'rgba(120,100,85,0.55)';
              g.beginPath();
              g.moveTo(u0, y);
              g.quadraticCurveTo(u0 - sd * w * 0.06, y + 2, w * 0.5 + sd * 3, y + 5);
              g.stroke();
            }
          }
          for (let k = 0; k < 16; k++) {
            const y = h * (k / 15);
            for (const sd of [-1, 1]) {
              const u0 = w * 0.5 + sd * half(y / h) * w;
              g.fillStyle = PAL.kimono;
              g.beginPath();
              g.ellipse(u0 + sd * 3, y, 9, 6.5, 0, 0, Math.PI * 2);
              g.fill();
            }
          }
        }),
      },
    );
    MAT.sleeve.map.flipY = false; // canvas rows run with v: the top of the picture is the shoulder end
    // grey striped cuff bands
    MAT.cuff = std(
      0xffffff,
      0.9,
      {
        side: THREE.DoubleSide,
        map: canvasTex(16, 64, (g, w, h) => {
          for (let i = 0; i < 8; i++) {
            g.fillStyle = i % 2 ? PAL.cuff : PAL.stripe;
            g.fillRect(0, i * 8, w, 8);
          }
        }),
      },
    );
    // dark scaly talon hands
    MAT.talonPlain = std(PAL.talon, 0.55);
    MAT.talon = std(
      0xffffff,
      0.55,
      {
        map: canvasTex(
          64,
          64,
          (g, w, h) => {
            g.fillStyle = PAL.talon;
            g.fillRect(0, 0, w, h);
            g.strokeStyle = 'rgba(0,0,0,0.45)';
            g.lineWidth = 1.2;
            for (let y = 0; y < h + 8; y += 8)
              for (let x = (y / 8) % 2 ? 4 : 0; x < w + 8; x += 8) {
                g.beginPath();
                g.arc(x, y, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
                g.stroke();
              }
          },
          2,
        ),
      },
    );
    MAT.claw = std(PAL.claw, 0.4);
    MAT.tail = MAT.fur;
    MAT.tuft = std(PAL.tailTuft, 1, { side: THREE.DoubleSide });
    MAT.feather = std(PAL.sleeveFeather, 0.8, { side: THREE.DoubleSide });
    MAT.hat = std(PAL.hat, 0.95, { side: THREE.DoubleSide });
    MAT.hatBand = std(PAL.hatBand, 0.9);
    MAT.hatPatch = std(PAL.hatPatch, 0.95, { side: THREE.DoubleSide });
    MAT.hatFeather = std(PAL.hatFeather, 0.8, { side: THREE.DoubleSide });
    MAT.bandage = std(PAL.bandage, 0.95);
  }
  // shizue: skin everywhere. ifu: fur at the neck and throat, talons for hands, the lion paw / bird foot under the seat
  MAT.hand = STYLE.hands === 'talon' ? MAT.talon : MAT.skin;
  MAT.neck = BEAST ? MAT.fur : MAT.skin;
  MAT.throat = BEAST ? MAT.furShade : MAT.skin;
  const SLEEVE_MAT = STYLE.sleeves === 'wing' ? MAT.sleeve : null;
  if (BEAST)
    // his palette is picked from the official art, so its colours are sRGB: bring the flat colours into linear space
    // (the canvas textures are already marked sRGB). Shizue's materials keep their original, tuned colours.
    new Set(Object.values(MAT)).forEach((m) => {
      if (m.color && m.color.getHex() !== 0xffffff) m.color.convertSRGBToLinear();
      if (m.emissive && m.emissive.getHex()) m.emissive.convertSRGBToLinear();
    });
  const CH = { nod: 0, clock: 0 }; // the chimera's moving parts (cape, tail) and its talking nod

  // ---- a loft: a tube through elliptical rings, rebuilt whenever the rings move (lap, sleeves, trunk) ----
  function Loft(nRings, segs, mat, withUV) {
    const nv = nRings * segs + 2,
      pos = new Float32Array(nv * 3),
      idx = [];
    for (let i = 0; i < nRings - 1; i++)
      for (let j = 0; j < segs; j++) {
        const a = i * segs + j,
          b = i * segs + ((j + 1) % segs),
          c = a + segs,
          d = b + segs;
        idx.push(a, b, c, b, d, c);
      }
    const c0 = nRings * segs,
      c1 = c0 + 1;
    for (let j = 0; j < segs; j++) {
      idx.push(c0, (j + 1) % segs, j);
      idx.push(c1, (nRings - 1) * segs + j, (nRings - 1) * segs + ((j + 1) % segs));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (withUV) {
      // u round the ring (0 = the first half-axis), v along the rings
      const uv = new Float32Array(nv * 2);
      for (let i = 0; i < nRings; i++) for (let j = 0; j < segs; j++) uv.set([j / segs, i / (nRings - 1)], (i * segs + j) * 2);
      uv.set([0.5, 0, 0.5, 1], nRings * segs * 2);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    geo.setIndex(idx);
    const m = mesh(geo, mat);
    m.frustumCulled = false;
    const cs = [],
      sn = [];
    for (let j = 0; j < segs; j++) {
      cs.push(Math.cos((j / segs) * Math.PI * 2));
      sn.push(Math.sin((j / segs) * Math.PI * 2));
    }
    return {
      mesh: m,
      // ring i: centre C, half-axes U and V (vectors)
      ring(i, cx, cy, cz, ux, uy, uz, vx, vy, vz) {
        let o = i * segs * 3;
        for (let j = 0; j < segs; j++) {
          pos[o++] = cx + cs[j] * ux + sn[j] * vx;
          pos[o++] = cy + cs[j] * uy + sn[j] * vy;
          pos[o++] = cz + cs[j] * uz + sn[j] * vz;
        }
        if (i === 0) pos.set([cx, cy, cz], c0 * 3);
        if (i === nRings - 1) pos.set([cx, cy, cz], c1 * 3);
      },
      caps(ax, ay, az, bx, by, bz) {
        pos.set([ax, ay, az], c0 * 3);
        pos.set([bx, by, bz], c1 * 3);
      },
      done() {
        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();
      },
    };
  }
  const cyl = (rTop, rBot, mat, parent) => {
    const c = mesh(new THREE.CylinderGeometry(rTop, rBot, 1, 16), mat);
    (parent || root).add(c);
    return c;
  };
  const ball = (r, mat, parent, sx, sy, sz) => {
    const c = mesh(new THREE.SphereGeometry(r, 18, 14), mat);
    if (sx) c.scale.set(sx, sy, sz);
    (parent || root).add(c);
    return c;
  };
  const tA = V(),
    tB = V(),
    tC = V(),
    tD = V(),
    tE = V(),
    tF = V(),
    tX = V(),
    m4 = new THREE.Matrix4(),
    q1 = new THREE.Quaternion();
  function seg(m, A, B) {
    // stretch a unit cylinder from A to B
    tA.subVectors(B, A);
    const len = Math.max(1e-4, tA.length());
    m.position.copy(A).addScaledVector(tA, 0.5);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(UPV, tA.multiplyScalar(1 / len));
  }

  // ---- trunk: kimono body, obi, collar (all fixed in the trunk frame: origin at the hips, y along the spine) ----
  const trunkG = new THREE.Group();
  root.add(trunkG);
  // [height, half-width, half-depth, forward offset]
  const TRUNK_RINGS = [
    [-0.075, 0.15, 0.118, -0.004],
    [-0.02, 0.166, 0.13, 0],
    [0.06, 0.164, 0.128, 0],
    [0.11, 0.16, 0.123, 0.002],
    [0.26, 0.157, 0.119, 0.004],
    [0.34, 0.16, 0.114, 0.004],
    [0.395, 0.17, 0.104, 0],
    [0.43, 0.172, 0.092, -0.004], // shoulder line: the kimono falls from here over the arms
    [0.452, 0.128, 0.075, -0.01],
    [0.47, 0.084, 0.058, -0.018],
    [0.49, 0.066, 0.046, -0.03], // the slope up to the back of the neck
    [0.506, 0.05, 0.036, -0.036],
  ];
  function trunkAt(y) {
    // interpolated ring at height y
    const R = TRUNK_RINGS;
    let i = 0;
    while (i < R.length - 2 && R[i + 1][0] < y) i++;
    const a = R[i],
      b = R[i + 1],
      u = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
    return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u];
  }
  function onTrunk(phi, y, off, out) {
    // a point on the trunk surface at angle phi (0 = front, + toward her left) and height y, pushed out by `off`
    const r = trunkAt(y),
      nx = Math.sin(phi) / r[0],
      nz = Math.cos(phi) / r[1],
      n = Math.hypot(nx, nz);
    return out.set(r[0] * Math.sin(phi) + (nx / n) * off, y, r[2] + r[1] * Math.cos(phi) + (nz / n) * off);
  }
  {
    const L = Loft(TRUNK_RINGS.length, 40, MAT.kimono);
    TRUNK_RINGS.forEach((r, i) => L.ring(i, 0, r[0], r[3], r[1], 0, 0, 0, 0, r[2]));
    L.caps(0, -0.08, 0, 0, 0.51, -0.036);
    L.done();
    trunkG.add(L.mesh);
    const band = (y0, y1, grow, mat, n) => {
      const B = Loft(n || 3, 40, mat);
      for (let i = 0; i < (n || 3); i++) {
        const y = y0 + ((y1 - y0) * i) / ((n || 3) - 1),
          r = trunkAt(y);
        B.ring(i, 0, y, r[2], r[0] + grow, 0, 0, 0, 0, r[1] + grow);
      }
      B.caps(0, y0, 0, 0, y1, 0);
      B.done();
      trunkG.add(B.mesh);
    };
    if (STYLE.hakama) hakamaTop(band);
    else if (JIT) band(0.1, 0.2, 0.007, MAT.obi, 3); // a man's kaku-obi: narrower, no cord, no obiage, no drum knot
    else {
    band(0.095, 0.265, 0.007, MAT.obi, 4); // obi
    band(0.172, 0.188, 0.0105, MAT.obiAccent, 2); // obijime cord
    band(0.258, 0.286, 0.004, MAT.obiage, 3); // obiage, peeping over the obi
    // the drum knot (otaiko) at the back: a soft, flat cushion
    const tg = new THREE.SphereGeometry(1, 24, 16),
      tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.42);
      tp.setXYZ(i, sq(tp.getX(i)), sq(tp.getY(i)), sq(tp.getZ(i)));
    }
    tg.computeVertexNormals();
    const taiko = mesh(tg, MAT.obi);
    taiko.scale.set(0.122, 0.118, 0.036);
    taiko.position.set(0, 0.205, -0.15);
    taiko.rotation.x = -0.05;
    trunkG.add(taiko);
    }
    // Collar. Worn LEFT OVER RIGHT: the panel from her left shoulder lies on top and runs down to her right side
    // (seen from the front, the upper edge runs from the viewer's upper right to the lower left). The reverse is for the dead.
    // Each panel is a band on the chest: its inner edge follows `line` ([height, angle]: 0 = front centre, + = her left).
    const tang = (phi, y, out) => {
      const r = trunkAt(y);
      return out.set(r[0] * Math.cos(phi), 0, -r[1] * Math.sin(phi)).normalize(); // along the surface, toward her left
    };
    const band2 = (line, w0, w1, dir, off, mat) => {
      // quads between the inner edge (at w0 from the line) and the outer edge (at w1), measured toward `dir` (+1 her left)
      const pos = [],
        idx = [];
      line.forEach((q, i) => {
        onTrunk(q[1], q[0], off, tA);
        tang(q[1], q[0], tB);
        pos.push(tA.x + tB.x * w0 * dir, tA.y, tA.z + tB.z * w0 * dir, tA.x + tB.x * w1 * dir, tA.y, tA.z + tB.z * w1 * dir);
        if (i < line.length - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      trunkG.add(mesh(g, mat, { shadow: false }));
    };
    const fine = (pts, n) => {
      // resample a [height, angle] polyline so the bands hug the curved chest
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < n; j++) out.push([pts[i][0] + ((pts[i + 1][0] - pts[i][0]) * j) / n, pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * j) / n]);
      out.push(pts[pts.length - 1]);
      return out;
    };
    const lineTop = fine([[0.478, 1.5], [0.468, 1.05], [0.456, 0.72], [0.436, 0.42], [0.408, 0.13], [0.36, -0.12], [0.268, -0.4]], 4); // her left panel
    const lineUnder = fine([[0.478, -1.5], [0.468, -1.05], [0.456, -0.72], [0.436, -0.42], [0.416, -0.2], [0.396, -0.03]], 4); // her right panel, underneath
    band2(lineUnder, -0.012, 0, -1, 0.0015, MAT.haneri);
    band2(lineUnder, 0, 0.034, -1, 0.0025, MAT.collar);
    band2(lineTop, -0.012, 0, 1, 0.004, MAT.haneri);
    band2(lineTop, 0, 0.034, 1, 0.005, MAT.collar);
    // the throat: skin between the two collar edges
    {
      const pos = [],
        idx = [],
        ys = [0.476, 0.47, 0.464, 0.457, 0.449, 0.44, 0.43, 0.42, 0.41, 0.402],
        NC = 14;
      const at = (line, y) => {
        for (let i = 0; i < line.length - 1; i++) if (y <= line[i][0] && y >= line[i + 1][0]) return line[i][1] + ((line[i + 1][1] - line[i][1]) * (line[i][0] - y)) / (line[i][0] - line[i + 1][0]);
        return line[line.length - 1][1];
      };
      ys.forEach((y, i) => {
        const a = Math.min(1.0, at(lineTop, y)) ,
          b = Math.max(-1.0, at(lineUnder, y));
        for (let j = 0; j <= NC; j++) {
          onTrunk(b + ((a - b) * j) / NC, y, 0.0012, tA);
          pos.push(tA.x, tA.y, tA.z);
        }
        const n1 = NC + 1;
        if (i < ys.length - 1) for (let j = 0; j < NC; j++) idx.push(i * n1 + j, i * n1 + j + 1, i * n1 + j + n1, i * n1 + j + 1, i * n1 + j + n1 + 1, i * n1 + j + n1);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      trunkG.add(mesh(g, MAT.throat, { shadow: false }));
    }
    // behind the neck the collar stands a little away from the nape, with the white han-eri inside it
    const back = (r, tube, y, z, mat) => {
      const t = mesh(new THREE.TorusGeometry(r, tube, 8, 28, Math.PI * 1.25), mat);
      t.rotation.set(-Math.PI / 2 + 0.2, 0, Math.PI * 0.875 + Math.PI); // open toward the front, higher at the back
      t.scale.set(1, 1.05, 1.6);
      t.position.set(0, y, z);
      trunkG.add(t);
    };
    back(0.066, 0.011, 0.497, -0.03, MAT.collar);
    back(0.056, 0.008, 0.505, -0.026, MAT.haneri);
    const neck = mesh(new THREE.CylinderGeometry(0.044, 0.054, 0.15, 20), MAT.neck);
    neck.position.set(0, 0.53, -0.014);
    neck.scale.z = 0.94;
    trunkG.add(neck);
    if (JIT) jittoku();
    if (BEAST) chimeraTrunk();
  }
  // ---- the jittoku: a short over-robe on the trunk, open at the front so the kimono collar and the obi show; flat cords at the chest ----
  function jittoku() {
    // where the front edge is (angle from the front centre) at each height: wide at the neck, nearly parallel down the chest
    const EDGE = [[-0.07, 0.42], [0.25, 0.45], [0.33, 0.5], [0.38, 0.62], [0.42, 0.86], [0.45, 1.1], [0.47, 1.3]];
    const edgeAt = (y) => {
      let i = 0;
      while (i < EDGE.length - 2 && EDGE[i + 1][0] < y) i++;
      const a = EDGE[i],
        b = EDGE[i + 1],
        u = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
      return a[1] + (b[1] - a[1]) * u;
    };
    const ys = [];
    for (let y = -0.07; y < 0.4695; y += 0.02) ys.push(y);
    ys.push(0.47);
    // a strip of the trunk surface between two angles (functions of y), pushed out by `off`
    const strip = (fromA, toA, off, mat, n, vRepeat) => {
      const pos = [],
        uv = [],
        idx = [];
      ys.forEach((y, i) => {
        const a0 = fromA(y),
          a1 = toA(y);
        for (let j = 0; j <= n; j++) {
          onTrunk(a0 + ((a1 - a0) * j) / n, y, off, tA);
          pos.push(tA.x, tA.y, tA.z);
          uv.push(j / n, (y + 0.07) * (vRepeat || 1));
        }
        if (i < ys.length - 1) for (let j = 0; j < n; j++) idx.push(i * (n + 1) + j, i * (n + 1) + j + 1, (i + 1) * (n + 1) + j, i * (n + 1) + j + 1, (i + 1) * (n + 1) + j + 1, (i + 1) * (n + 1) + j);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      trunkG.add(mesh(g, mat, { shadow: false }));
    };
    const G = 0.009; // clear of the kimono, the collar bands and the obi
    strip((y) => edgeAt(y), (y) => Math.PI * 2 - edgeAt(y), G, MAT.jittoku, 48);
    // the front edges are a little thicker (the robe's own collar), with the striped lining just showing at the edge
    for (const s of [1, -1]) {
      strip((y) => s * edgeAt(y), (y) => s * (edgeAt(y) + 0.2), G + 0.0025, MAT.jittokuEdge, 3);
      strip((y) => s * (edgeAt(y) - 0.012), (y) => s * (edgeAt(y) + 0.045), G + 0.0035, MAT.stripe, 2, 4);
    }
    // behind the neck the robe's collar stands up over the kimono collar
    const t = mesh(new THREE.TorusGeometry(0.074, 0.012, 8, 28, Math.PI * 1.1), MAT.jittokuEdge);
    t.rotation.set(-Math.PI / 2 + 0.2, 0, Math.PI * 0.95 + Math.PI);
    t.scale.set(1.12, 1.05, 1.55);
    t.position.set(0, 0.478, -0.034);
    trunkG.add(t);
    // the short flat cords, tied in a small bow at the chest
    const cy = 0.3,
      knot = onTrunk(0, cy - 0.006, G + 0.012, V());
    for (const s of [1, -1]) {
      const a = onTrunk(s * (edgeAt(cy) + 0.08), cy, G + 0.004, V());
      const c = cyl(0.0042, 0.0042, MAT.cord, trunkG);
      seg(c, a, knot);
      c.scale.z = 0.45; // flat cords
      const end = cyl(0.0038, 0.0034, MAT.cord, trunkG);
      seg(end, knot, tB.copy(knot).add(V(s * 0.012, -0.045, 0.006)));
    }
    ball(0.0085, MAT.cord, trunkG, 1.3, 0.8, 0.7).position.copy(knot);
  }

  // ---- head: its outline is measured from the portrait; the portrait's face is projected onto it ----
  const headG = new THREE.Group();
  headG.scale.setScalar(1.06); // a touch larger than strict anatomy: the face has to read from the guest's seat
  root.add(headG);
  const HEAD_H = 0.205,
    K = HEAD_H / (FACE.chinY - FACE.topY), // metres per portrait unit
    HEAD_TOP = BODY.headCentre + HEAD_H / 2,
    HEAD_Z = 0.012,
    HEAD_DEEP = 1.2; // a head is deeper than it is wide
  const TEX = { x0: FACE.cx - 150, y0: FACE.topY - 16, w: 300, h: FACE.chinY - FACE.topY + 32, px: 2 };
  const yOf = (py) => HEAD_TOP - (py - FACE.topY) * K; // portrait y -> head-frame y
  let headMesh;
  const hairCut = { local: new THREE.Plane(), world: new THREE.Plane() }; // where the hair stops (kept in step with the head)
  const NAPE_SHORT = { y: 0.094, z: 0.06 }; // short hair: where the cut meets the back centre (below the head centre, behind it)
  {
    const N = FACE.halfWidths.length - 1,
      pts = [new THREE.Vector2(0.0005, HEAD_TOP - HEAD_H)];
    for (let i = N; i >= 0; i--) pts.push(new THREE.Vector2(Math.max(0.0005, FACE.halfWidths[i] * K), HEAD_TOP - (HEAD_H * i) / N));
    pts.push(new THREE.Vector2(0.0005, HEAD_TOP));
    const g = new THREE.LatheGeometry(pts, 44);
    const p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      // straight-on projection of the portrait; the back of the head takes the plain skin at the picture's edge
      const u = z >= -0.004 ? (x / K + 150) / TEX.w : x >= 0 ? 0.992 : 0.008;
      uv.setXY(i, u, 1 - ((HEAD_TOP - y) / K + 16) / TEX.h);
      p.setZ(i, z * HEAD_DEEP + HEAD_Z);
    }
    g.computeVertexNormals();
    headMesh = mesh(g, MAT.face, { name: 'The host, ' + teacher.name, jp: '亭主 ' + teacher.nameJa, desc: teacher.headDesc });
    headG.add(headMesh);
    const rAt = (py) => FACE.halfWidths[Math.max(0, Math.min(N, Math.round(((py - FACE.topY) / (FACE.chinY - FACE.topY)) * N)))] * K;
    const earY = FACE.earBox[1] + FACE.earBox[3] / 2;
    if (BEAST) chimeraHead(rAt);
    else for (const s of [1, -1]) {
      const e = ball(0.02, MAT.ear, headG, 0.42, 1.15, 0.75);
      e.position.set(s * (rAt(earY) + 0.003), yOf(earY), HEAD_Z - 0.014);
      e.rotation.y = s * 0.35;
    }
    // hair: a cap swept back from the forehead to the nape, and a low chignon
    if (!BEAST) {
    const hc = document.createElement('canvas');
    hc.width = 256;
    hc.height = 128;
    const hg = hc.getContext('2d');
    hg.fillStyle = PAL.hair;
    hg.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 150; i++) {
      hg.strokeStyle = i % 3 ? PAL.hairLight : PAL.hairDark;
      hg.globalAlpha = 0.1 + ((i * 37) % 10) / 28;
      hg.lineWidth = 0.6 + ((i * 13) % 5) / 4;
      const x = (i * 97) % 256;
      hg.beginPath();
      hg.moveTo(x, 0);
      hg.lineTo(x + ((i * 7) % 5) - 2, 128);
      hg.stroke();
    }
    const ht = new THREE.CanvasTexture(hc);
    textures.push(ht);
    ht.encoding = THREE.sRGBEncoding;
    ht.wrapS = THREE.RepeatWrapping;
    MAT.hair.map = ht;
    // The hair follows the head's own outline, 6 mm outside it, and is cut off by a slanted plane that runs from the
    // hairline on the forehead down to the nape. (The portrait's own hair-front art sits under its front edge.)
    // short hair has no chignon to hide the back of the neck, so it reaches lower and is cut lower at the nape
    const SHORT = STYLE.hair === 'short',
      CAP_END = SHORT ? 0.93 : 0.8;
    const hp = [new THREE.Vector2(0.0005, HEAD_TOP - HEAD_H * CAP_END)];
    for (let i = Math.round(N * CAP_END); i >= 0; i--) hp.push(new THREE.Vector2(FACE.halfWidths[i] * K + 0.006, HEAD_TOP - (HEAD_H * i) / N + 0.004 * (1 - i / N)));
    hp.push(new THREE.Vector2(0.0005, HEAD_TOP + 0.0045));
    const capGeo = new THREE.LatheGeometry(hp, 44);
    const cpos = capGeo.attributes.position;
    for (let i = 0; i < cpos.count; i++) cpos.setZ(i, cpos.getZ(i) * (HEAD_DEEP + 0.03) + HEAD_Z - 0.002);
    capGeo.computeVertexNormals();
    MAT.hairCap = MAT.hair.clone();
    MAT.hairCap.side = THREE.DoubleSide;
    const frontY = yOf(FACE.hairCentreY) + 0.012,
      frontZ = HEAD_Z + rAt(FACE.hairCentreY) * HEAD_DEEP,
      napeY = BODY.headCentre - (SHORT ? NAPE_SHORT.y : 0.066),
      napeZ = HEAD_Z - (SHORT ? NAPE_SHORT.z : 0.075);
    hairCut.local.setFromNormalAndCoplanarPoint(V(0, frontZ - napeZ, -(frontY - napeY)).normalize(), V(0, frontY, frontZ));
    MAT.hairCap.clippingPlanes = [hairCut.world];
    renderer.localClippingEnabled = true;
    const cap = mesh(capGeo, MAT.hairCap);
    headG.add(cap);
    if (STYLE.hair !== 'short') {
      const bun = ball(0.04, MAT.hair, headG, 1.12, 0.84, 0.82);
      bun.position.set(0, BODY.headCentre - 0.058, HEAD_Z - 0.092);
    }
    // griffin: a few small feathers tucked above and behind one ear (her left)
    if (STYLE.feathers) {
      const fy = yOf(FACE.earBox[1] + 4),
        fx = rAt(FACE.earBox[1] + 4) + 0.004;
      const cols = [PAL.accent || '#d29a2e', PAL.hairLight, PAL.stripe || PAL.accent || '#bf8a3a'];
      [[0.22, 0.05], [0.42, 0.043], [0.62, 0.035]].forEach(([up, len], k) => {
        // a vane: broad on one side of the quill, narrow on the other, with a soft rounded tip
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.quadraticCurveTo(0.012, len * 0.4, 0.002, len);
        sh.quadraticCurveTo(-0.0065, len * 0.5, 0, 0);
        const m = mesh(new THREE.ShapeGeometry(sh, 6), std(cols[k], 0.7, { side: THREE.DoubleSide }), { shadow: false });
        // lay it on the side of the head, pointing back and up
        tA.set(0, Math.sin(up), -Math.cos(up)).normalize();
        tC.set(1, 0, 0.15).normalize();
        tB.crossVectors(tA, tC).normalize();
        tC.crossVectors(tB, tA);
        m4.makeBasis(tB, tA, tC);
        m.quaternion.setFromRotationMatrix(m4);
        m.position.set(fx + k * 0.0012, fy - 0.004 + k * 0.004, HEAD_Z - 0.018 - k * 0.004);
        headG.add(m);
      });
    }
    }
  }
  // face pictures: 3 eye states x 2 mouth states, drawn once from the portrait
  const faceTex = {};
  let faceKey = '';
  (function makeFaces() {
    if (BEAST) return; // nothing is projected: the mask and the fur are modelled
    const doc = new DOMParser().parseFromString(PORTRAIT_SVG, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return;
    const SHOW = ['face-base', 'lines', 'brows', 'nose', 'hair-front'];
    const EYES = { open: 'eyes-open', lowered: 'eyes-lowered', closed: 'eyes-closed' },
      MOUTH = { rest: 'mouth-rest', talk: 'mouth-talk' };
    const variant = (ids) => {
      const d = doc.cloneNode(true),
        r = d.documentElement;
      for (const g of [...r.children]) {
        if (g.tagName !== 'g') continue;
        if (ids.includes(g.id)) g.removeAttribute('display');
        else g.setAttribute('display', 'none');
      }
      r.setAttribute('viewBox', `${TEX.x0} ${TEX.y0} ${TEX.w} ${TEX.h}`);
      r.setAttribute('width', TEX.w * TEX.px);
      r.setAttribute('height', TEX.h * TEX.px);
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(r));
    };
    const load = (src) =>
      new Promise((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
      });
    const W = TEX.w * TEX.px,
      H = TEX.h * TEX.px;
    load(variant(['face-base'])).then((base) => {
      if (!base || disposed) return;
      // the colour at the edge of the face continues around the sides and back of the head
      const c0 = document.createElement('canvas');
      c0.width = W;
      c0.height = H;
      const g0 = c0.getContext('2d');
      g0.drawImage(base, 0, 0);
      const ex = Math.round((FACE.cx - TEX.x0 + FACE.halfWidths[14] - 5) * TEX.px),
        ey = Math.round((FACE.eyeY + 40 - TEX.y0) * TEX.px),
        px = g0.getImageData(ex, ey, 1, 1).data;
      const edge = px[3] > 200 ? `rgb(${px[0]},${px[1]},${px[2]})` : PAL.skin;
      // hands, neck and throat take the cheek colour of the portrait, so skin is one colour everywhere
      const ck = g0.getImageData(Math.round((FACE.cx - TEX.x0 + 62) * TEX.px), Math.round((FACE.eyeY + 62 - TEX.y0) * TEX.px), 1, 1).data;
      if (ck[3] > 200) {
        MAT.skin.color.setRGB(ck[0] / 255, ck[1] / 255, ck[2] / 255).convertSRGBToLinear();
        MAT.ear.color.copy(MAT.skin.color).multiplyScalar(0.92);
      }
      for (const e in EYES)
        for (const m in MOUTH) {
          load(variant(SHOW.concat([EYES[e], MOUTH[m]]))).then((im) => {
            if (!im || disposed) return;
            const c = document.createElement('canvas');
            c.width = W;
            c.height = H;
            const g = c.getContext('2d');
            g.fillStyle = edge;
            g.fillRect(0, 0, W, H);
            g.drawImage(im, 0, 0);
            const t = new THREE.CanvasTexture(c);
            t.encoding = THREE.sRGBEncoding;
            t.anisotropy = 4;
            faceTex[e + '|' + m] = t;
            textures.push(t);
          });
        }
    });
  })();

  // ---- arms, sleeves and hands (placed every frame from the rig) ----
  const FINGERS = [
    // [across the palm (+ = thumb side), knuckle set-back, first bone, second bone, radius]: index, middle, ring, little
    [0.0275, 0.003, 0.04, 0.033, 0.0078],
    [0.0092, 0, 0.043, 0.035, 0.008],
    [-0.0092, 0.003, 0.04, 0.033, 0.0076],
    [-0.0275, 0.011, 0.032, 0.027, 0.0068],
  ];
  const SLEEVE_N = 8;
  const ARM = {};
  for (const s of [1, -1]) {
    const outer = JIT ? MAT.jittoku : MAT.kimono; // with the jittoku the over-robe's sleeves are what we see; the kimono shows at the cuff
    const A = (ARM[s] = {
      shoulder: ball(0.047, outer, root, 1, 0.72, 1),
      upper: cyl(0.045, 0.049, outer),
      elbow: ball(0.048, outer),
      fore: cyl(0.041, 0.047, outer),
      cuff: SLEEVE_MAT ? cyl(0.05, 0.05, MAT.cuff) : cyl(0.0345, 0.038, JIT ? MAT.kimono : MAT.haneri),
      wrist: cyl(0.0245, 0.027, MAT.hand),
      sleeve: Loft(SLEEVE_N, SLEEVE_MAT ? 24 : 16, SLEEVE_MAT || outer, !!SLEEVE_MAT),
      palm: MAT.talonPlain ? ball(1, MAT.talonPlain, root, 0.032, 0.0115, 0.046) : ball(1, MAT.skin, root, 0.039, 0.0125, 0.05), // talons: a slimmer, plain palm
      fingers: [],
      thumb: [cyl(0.0082, 0.0095, MAT.hand), cyl(0.007, 0.008, MAT.hand), ball(0.0072, MAT.talonPlain || MAT.hand)],
    });
    root.add(A.sleeve.mesh);
    if (STYLE.cape) A.rings = [];
    for (const f of FINGERS) A.fingers.push([cyl(f[4] * 0.92, f[4], MAT.hand), cyl(f[4] * 0.8, f[4] * 0.92, MAT.hand), ball(f[4] * 0.82, MAT.talonPlain || MAT.hand)]);
    if (STYLE.hands === 'talon') {
      // small claws at the finger and thumb tips
      const cg = new THREE.ConeGeometry(0.0042, 0.016, 8);
      cg.translate(0, 0.008, 0);
      A.claws = [];
      for (let i = 0; i < 5; i++) A.claws.push(mesh(cg, MAT.claw, { shadow: false }));
      A.claws.forEach((c) => root.add(c));
    }
  }
  const SLEEVE = SLEEVE_MAT ? [
    // the chimera's huge rounded sleeves: fuller and deeper, rounded at the cuff end; the last ring stays short of the hand
    [0.5, 0.11, 0.056],
    [0.75, 0.22, 0.062],
    [1.0, 0.31, 0.066],
    [1.25, 0.36, 0.068],
    [1.5, 0.375, 0.066],
    [1.72, 0.36, 0.06],
    [1.9, 0.3, 0.048],
    [2.0, 0.2, 0.03],
  ] : [
    // along the arm: [where (0 = shoulder, 1 = elbow, 2 = sleeve end near the wrist), how far the cloth hangs, half thickness]
    [0.5, 0.1, 0.05],
    [0.75, 0.2, 0.05],
    [1.0, 0.28, 0.048],
    [1.25, 0.32, 0.044],
    [1.5, 0.335, 0.041],
    [1.75, 0.335, 0.039],
    [1.93, 0.32, 0.036],
    [2.0, 0.26, 0.024],
  ];
  const hDir = V(1, 0, 0);
  function placeArm(a, A, side) {
    A.shoulder.position.copy(a.shoulder);
    A.shoulder.position.y -= 0.006;
    seg(A.upper, a.shoulder, a.elbow);
    A.elbow.position.copy(a.elbow);
    tB.lerpVectors(a.elbow, a.wrist, SLEEVE_MAT ? 0.74 : 0.82);
    seg(A.fore, a.elbow, tB);
    tC.lerpVectors(a.elbow, a.wrist, 0.89);
    seg(A.cuff, tB, tC);
    seg(A.wrist, tC, a.wrist);
    // sleeve: a bag of cloth hanging from the arm; it lies on the lap or the tatami where it lands
    for (let i = 0; i < SLEEVE.length; i++) {
      const k = SLEEVE[i][0];
      if (k <= 1) tD.lerpVectors(a.shoulder, a.elbow, k);
      else tD.lerpVectors(a.elbow, a.wrist, (k - 1) * 0.84);
      tE.subVectors(k <= 1 ? a.elbow : a.wrist, k <= 1 ? a.shoulder : a.elbow);
      tE.y = 0;
      if (tE.lengthSq() > 4e-4) hDir.copy(tE.normalize());
      let drop = SLEEVE[i][1],
        thick = SLEEVE[i][2];
      const topY = tD.y + 0.05;
      const ground = Math.max(RIG.lapHeight(tD.x, tD.z), 0) + 0.006;
      // the big sleeves ride over the utensils, also over the bowl held in the other hand or just under the forearm
      const uFloor = utensilFloor(tD.x, tD.z, tD.y, SLEEVE[i][2] + 0.03);
      let botY = tD.y - drop,
        spread = 0;
      if (botY < ground) {
        spread = Math.min(0.028, (ground - botY) * 0.12); // the cloth that lands on the lap or the mat folds; it widens only a little
        botY = ground;
      }
      // over a utensil the cloth gathers up round the forearm (it may get much shorter) instead of passing through it
      const onUtensil = uFloor > botY;
      if (onUtensil) {
        botY = uFloor;
        spread = Math.min(spread, 0.006);
      }
      const minH = onUtensil ? 0.03 : 0.085;
      if (botY > topY - minH) botY = topY - minH;
      thick += spread;
      // thickness is across the arm, pushed away from the body where the cloth bunches
      const ox = -hDir.z,
        oz = hDir.x,
        out = (ox * side >= 0 ? 1 : -1) * spread * 0.6;
      A.sleeve.ring(i, tD.x + ox * out, (topY + botY) / 2, tD.z + oz * out, 0, (topY - botY) / 2, 0, ox * thick, 0, oz * thick);
      if (A.rings && k <= 1.25) {
        const R = A.rings[i] || (A.rings[i] = { top: V(), bot: V(), r: 0 });
        R.top.set(tD.x + ox * out, topY, tD.z + oz * out);
        R.bot.set(tD.x + ox * out, botY, tD.z + oz * out);
        R.r = thick + 0.014;
      }
      if (i === SLEEVE.length - 2 && A.hem) A.hem.set(tD.x + ox * out, botY, tD.z + oz * out, ox * thick, oz * thick);
    }
    A.sleeve.done();
    // hand: palm, four fingers held together, thumb on the inner side
    const f = a.fwd,
      n = a.up;
    tX.crossVectors(n, f).normalize(); // across the palm
    const lat = -side; // thumb side along tX
    m4.makeBasis(tX, n, f);
    A.palm.quaternion.setFromRotationMatrix(m4);
    A.palm.position.copy(a.wrist).addScaledVector(f, 0.05).addScaledVector(n, -0.002);
    const curl = a.curl;
    for (let i = 0; i < 4; i++) {
      const F = FINGERS[i],
        G = A.fingers[i];
      const fingerCurl = a.fingers ? a.fingers[i] : curl;
      const th1 = 0.1 + fingerCurl * 1.2,
        th2 = th1 + 0.12 + fingerCurl * 1.35;
      tA.copy(a.wrist).addScaledVector(f, BODY.palm - F[1]).addScaledVector(tX, lat * F[0]);
      tB.copy(tA).addScaledVector(f, Math.cos(th1) * F[2]).addScaledVector(n, -Math.sin(th1) * F[2]);
      tC.copy(tB).addScaledVector(f, Math.cos(th2) * F[3]).addScaledVector(n, -Math.sin(th2) * F[3]);
      tD.copy(tA); // seg() uses tA
      seg(G[0], tD, tB);
      seg(G[1], tB, tC);
      G[2].position.copy(tC);
      if (A.claws) clawAt(A.claws[i], tB, tC, F[4] * 0.55);
    }
    const th = a.thumb;
    tD.copy(a.wrist).addScaledVector(f, 0.03).addScaledVector(tX, lat * 0.033).addScaledVector(n, -0.006);
    tE.set(0, 0, 0).addScaledVector(f, 0.78 - 0.1 * th).addScaledVector(tX, lat * (0.6 - 0.5 * th)).addScaledVector(n, -(0.12 + 0.62 * th)).normalize();
    tB.copy(tD).addScaledVector(tE, 0.042);
    tE.addScaledVector(f, 0.35).addScaledVector(tX, -lat * 0.25).normalize();
    tC.copy(tB).addScaledVector(tE, 0.032);
    seg(A.thumb[0], tD, tB);
    seg(A.thumb[1], tB, tC);
    A.thumb[2].position.copy(tC);
    if (A.claws) clawAt(A.claws[4], tB, tC, 0.004);
  }
  // the chimera's sleeves never swallow a utensil: under each sleeve ring the 'floor' is the top of any utensil below it
  // (host-space boxes of the utensils, refreshed once a frame, and the brazier, kettle and water jar from the rig's obstacles)
  const UTENSILS = ['bowl', 'natsume', 'lid', 'chasen', 'chashaku', 'hishaku', 'kamaLid', 'kashiki'],
    utBoxes = UTENSILS.map(() => new THREE.Box3());
  function refreshUtensilBoxes() {
    UTENSILS.forEach((k, i) => {
      const b = utBoxes[i];
      if (!O[k] || !O[k].visible) return b.makeEmpty();
      b.setFromObject(O[k]);
      b.min.z -= HOST_Z;
      b.max.z -= HOST_Z;
    });
  }
  function utensilFloor(x, z, armY, reach) {
    let f = 0;
    for (const b of utBoxes) {
      if (b.isEmpty() || b.min.y > armY) continue;
      const dx = Math.max(b.min.x - x, 0, x - b.max.x),
        dz = Math.max(b.min.z - z, 0, z - b.max.z);
      if (dx * dx + dz * dz < reach * reach) f = Math.max(f, b.max.y + 0.01);
    }
    for (const o of RIG.obstacles) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + reach) f = Math.max(f, (o.ball ? o.y0 + o.ry : o.y1) + 0.01);
    }
    return f;
  }
  function clawAt(c, B, C, back) {
    // a claw continues the last bone, curving a little toward the palm side
    tF.subVectors(C, B).normalize();
    c.position.copy(C).addScaledVector(tF, -back);
    c.quaternion.setFromUnitVectors(UPV, tF);
  }

  // ---- legs and the lower kimono: one garment from the obi over the thighs and shins to the feet ----
  // with hakama the lower garment is the dark pleated hakama; under the seat his left foot is the cream lion paw, his right the dark bird foot
  const HK = STYLE.hakama;
  const lap = Loft(10, 32, HK ? MAT.hakama : MAT.kimono, HK),
    shins = Loft(6, 24, HK ? MAT.hakama : MAT.kimono, HK),
    seat = ball(1, HK ? MAT.hakamaPlain : MAT.kimono, root, 0.17, 0.115, 0.15),
    feet = BEAST ? { 1: ball(1, MAT.fur, root), '-1': ball(1, MAT.talon, root) } : { 1: ball(1, MAT.tabi, root), '-1': ball(1, MAT.tabi, root) };
  root.add(lap.mesh, shins.mesh);
  const LAP = [
    // [along hip -> knee, half width, half thickness]
    [-0.2, 0.13, 0.05],
    [-0.12, 0.158, 0.078],
    [0.0, 0.172, 0.092],
    [0.25, 0.177, 0.09],
    [0.5, 0.179, 0.086],
    [0.75, 0.178, 0.081],
    [1.0, 0.175, 0.075],
    [1.09, 0.17, 0.068],
    [1.15, 0.158, 0.055],
    [1.19, 0.135, 0.036],
  ];
  const SHIN = [
    [-0.03, 0.15, 0.04],
    [0.05, 0.168, 0.058],
    [0.4, 0.165, 0.056],
    [0.8, 0.156, 0.05],
    [0.97, 0.146, 0.044],
    [1.03, 0.12, 0.028],
  ];
  // a man sits with his knees about a fist apart: the lap widens toward the knees (the rig's lap is widened to match, 20-rig)
  const kneeW = (k) => STYLE.kneeGap * Math.max(0, Math.min(1, (k - 0.3) / 0.7));
  RIG.setLapWide(STYLE.kneeGap);
  function placeLegs(S) {
    const L = S.legsOut[1],
      hy = S.hip.y,
      hz = S.hip.z,
      ky = L.knee.y,
      kz = L.knee.z,
      ay = L.ankle.y,
      az = L.ankle.z;
    let dy = ky - hy,
      dz = kz - hz,
      len = Math.hypot(dy, dz) || 1;
    for (let i = 0; i < LAP.length; i++) {
      const k = LAP[i][0],
        t = LAP[i][2];
      lap.ring(i, 0, hy + dy * k, hz + dz * k, LAP[i][1] + kneeW(k), 0, 0, 0, (dz / len) * t, (-dy / len) * t);
    }
    lap.caps(0, hy - dy * 0.22, hz - dz * 0.22, 0, hy + dy * 1.2, hz + dz * 1.2);
    lap.done();
    dy = ay - ky;
    dz = az - kz;
    len = Math.hypot(dy, dz) || 1;
    for (let i = 0; i < SHIN.length; i++) {
      const k = SHIN[i][0],
        t = SHIN[i][2];
      shins.ring(i, 0, ky + dy * k, kz + dz * k, SHIN[i][1] + STYLE.kneeGap * Math.max(0, 1 - k), 0, 0, 0, (-dz / len) * t, (dy / len) * t);
    }
    shins.caps(0, ky - dy * 0.04, kz - dz * 0.04, 0, ay + dy * 0.05, az + dz * 0.05);
    shins.done();
    seat.position.set(0, hy - 0.025, hz - 0.03);
    for (const s of [1, -1]) {
      const G = S.legsOut[s],
        ft = feet[s];
      tA.subVectors(G.toe, G.ankle);
      const fl = tA.length();
      ft.position.copy(G.ankle).addScaledVector(tA, 0.45);
      ft.position.y = Math.max(0.026, ft.position.y);
      ft.quaternion.setFromUnitVectors(ZV, tA.normalize());
      ft.scale.set(0.04, 0.028, fl * 0.62);
    }
  }

  // ======== the chimera (ifu's official look): fur, beak mask, scarf, cape, hakama, tail, hat ========
  // merge several small geometries (each placed by a matrix) into one mesh: fur tufts and feather fans are many little pieces
  function merged(parts, mat, parent) {
    const P = [],
      N = [],
      U = [],
      I = [];
    for (const [g0, m] of parts) {
      const g = g0.clone().applyMatrix4(m),
        base = P.length / 3,
        p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        P.push(p.getX(i), p.getY(i), p.getZ(i));
        N.push(n.getX(i), n.getY(i), n.getZ(i));
        U.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) I.push(base + g.index.getX(i));
      else for (let i = 0; i < p.count; i++) I.push(base + i);
      g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I);
    const m = mesh(g, mat, { shadow: false });
    parent.add(m);
    return m;
  }
  // a matrix that stands a +y-pointing piece at `at`, pointing along `dir`
  function aim(at, dir, s) {
    return new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromUnitVectors(UPV, dir.clone().normalize()), V(s || 1, s || 1, s || 1));
  }
  function tuftGeo(r, h) {
    const g = new THREE.ConeGeometry(r, h, 7, 1, true);
    g.translate(0, h / 2, 0);
    return g;
  }
  // hakama over the lower trunk, the maroon obi above it, the hakama cords wound over the obi and tied in front
  function hakamaTop(band) {
    band(-0.075, 0.14, 0.006, MAT.hakamaPlain, 5);
    band(0.1, 0.215, 0.009, MAT.obi, 3);
    band(0.124, 0.134, 0.0125, MAT.obiAccent, 2);
    band(0.146, 0.156, 0.0125, MAT.obiAccent, 2);
    const kn = onTrunk(0, 0.14, 0.017, V());
    const k1 = mesh(new THREE.BoxGeometry(0.036, 0.013, 0.01), MAT.obiAccent);
    k1.position.copy(kn);
    k1.rotation.z = 0.08;
    const k2 = mesh(new THREE.BoxGeometry(0.013, 0.032, 0.011), MAT.obiAccent);
    k2.position.copy(kn).add(V(0, -0.002, 0.004));
    trunkG.add(k1, k2);
    for (const s of [1, -1]) {
      const c = cyl(0.0032, 0.0032, MAT.obiAccent, trunkG);
      seg(c, kn.clone().add(V(s * 0.006, -0.006, 0.006)), kn.clone().add(V(s * 0.014, -0.05, 0.012)));
    }
  }
  // neck seam, scarf tied at his left side, and the ragged short cape (its cloth is pushed clear of the arms every frame)
  function chimeraTrunk() {
    if (STYLE.neckSeam) {
      const y = 0.53,
        r = 0.0498;
      const t = mesh(new THREE.TorusGeometry(r, 0.0016, 6, 40), MAT.leatherDark, { shadow: false });
      t.rotation.x = Math.PI / 2;
      t.scale.set(1, 0.94, 1);
      t.position.set(0, y, -0.014);
      trunkG.add(t);
      for (let a = -1.1; a <= 1.11; a += 0.22) {
        const st = mesh(new THREE.BoxGeometry(0.0018, 0.011, 0.002), MAT.leatherDark, { shadow: false });
        st.position.set(r * Math.sin(a), y, -0.014 + r * 0.94 * Math.cos(a));
        st.rotation.set(0, a, 0.35);
        trunkG.add(st);
      }
    }
    if (STYLE.scarf) {
      const g = new THREE.Group();
      g.position.set(0, 0.49, -0.014);
      g.rotation.x = 0.2; // lower in front
      trunkG.add(g);
      const ring = mesh(new THREE.TorusGeometry(0.073, 0.021, 10, 36), MAT.scarf);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1, 0.84, 1.15);
      g.add(ring);
      const drape = mesh(new THREE.TorusGeometry(0.084, 0.016, 8, 24, Math.PI), MAT.scarf);
      drape.rotation.x = Math.PI / 2;
      drape.scale.set(1, 0.9, 1);
      drape.position.set(0, -0.024, 0.004);
      g.add(drape);
      // the knot at his left, with two short tails falling onto the chest
      const kn = V(0.062, 0.478, 0.036);
      ball(0.021, MAT.scarf, trunkG, 1.05, 0.9, 0.85).position.copy(kn);
      ball(0.016, MAT.scarf, trunkG, 1.3, 0.75, 0.7).position.copy(kn).add(V(0.02, 0.006, -0.006));
      for (const [ex, ey, ez, r] of [
        [0.08, 0.392, 0.1, 0.016],
        [0.047, 0.4, 0.108, 0.014],
      ]) {
        const c = cyl(0.011, r, MAT.scarf, trunkG);
        seg(c, kn, V(ex, ey, ez));
        c.scale.z = 0.4;
      }
    }
    if (STYLE.cape) {
      // rows: [height, half-width, half-depth, forward offset]; an open front between the angles ±PH0
      const ROWS = [
        [0.506, 0.07, 0.056, -0.03],
        [0.488, 0.124, 0.076, -0.022],
        [0.468, 0.186, 0.095, -0.012],
        [0.444, 0.222, 0.11, -0.006],
        [0.414, 0.238, 0.124, 0],
        [0.376, 0.248, 0.134, 0],
        [0.338, 0.254, 0.14, 0],
        [0.3, 0.258, 0.145, 0],
        [0.262, 0.261, 0.149, 0], // hangs to mid-chest, like the official short cape
      ];
      const PH0 = 0.56,
        NC = 49,
        NR = ROWS.length;
      const base = new Float32Array(NC * NR * 3),
        pos = new Float32Array(NC * NR * 3),
        idx = [];
      for (let i = 0; i < NR; i++)
        for (let j = 0; j < NC; j++) {
          const phi = PH0 + ((Math.PI * 2 - 2 * PH0) * j) / (NC - 1),
            R = ROWS[i];
          let y = R[0];
          const front = Math.abs(Math.cos(phi)); // the front edges are a little shorter
          // ragged hem: pointed tatters (every fourth column a long point), not a rounded edge
          if (i === NR - 1) y += 0.03 * Math.max(0, Math.cos(phi)) - (j % 4 === 2 ? 0.052 : j % 4 === 0 ? 0 : 0.02) - rand() * 0.01;
          else if (i === NR - 2) y += 0.02 * Math.max(0, Math.cos(phi)) * front;
          base.set([R[1] * Math.sin(phi), y, R[3] + R[2] * Math.cos(phi)], (i * NC + j) * 3);
          if (i < NR - 1 && j < NC - 1) {
            const a = i * NC + j;
            idx.push(a, a + NC, a + 1, a + 1, a + NC, a + NC + 1);
          }
        }
      pos.set(base);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = mesh(g, MAT.cape);
      m.frustumCulled = false;
      trunkG.add(m);
      CH.cape = { g, base, pos, n: NC * NR };
    }
  }
  // the cape keeps clear of the arms and of the tops of the sleeves: every vertex is pushed out of a few capsules
  const _cq = new THREE.Quaternion(),
    _ca = V(),
    _cb = V(),
    _cp = V(),
    _cd = V();
  const caps = [];
  function capeUpdate(S) {
    const C = CH.cape;
    if (!C) return;
    _cq.copy(S.torsoQ).invert();
    const toLocal = (p, out) => out.copy(p).sub(S.hip).applyQuaternion(_cq);
    let n = 0;
    const cap = (a, b, r) => {
      const c = caps[n] || (caps[n] = { a: V(), b: V(), r: 0 });
      toLocal(a, c.a);
      toLocal(b, c.b);
      c.r = r;
      n++;
    };
    for (const s of [1, -1]) {
      const a = S.arms[s],
        A = ARM[s];
      cap(a.shoulder, a.elbow, 0.066);
      cap(a.elbow, tF.lerpVectors(a.elbow, a.wrist, 0.6), 0.06);
      for (const R of A.rings) cap(R.top, R.bot, R.r);
    }
    const P = C.pos,
      B = C.base;
    for (let v = 0; v < C.n; v++) {
      _cp.set(B[v * 3], B[v * 3 + 1], B[v * 3 + 2]);
      for (let pass = 0; pass < 2; pass++)
        for (let k = 0; k < n; k++) {
          const c = caps[k];
          _cd.subVectors(c.b, c.a);
          const L2 = _cd.lengthSq(),
            u = L2 > 1e-8 ? Math.max(0, Math.min(1, _ca.subVectors(_cp, c.a).dot(_cd) / L2)) : 0;
          _cb.copy(c.a).addScaledVector(_cd, u);
          _ca.subVectors(_cp, _cb);
          const d = _ca.length();
          if (d < c.r) {
            if (d < 1e-5) _ca.set(_cp.x, 0.5, 0);
            // out of the capsule, and never back toward the body: the push keeps the vertex's own outward side
            _cp.copy(_cb).addScaledVector(_ca.normalize(), c.r);
          }
        }
      P[v * 3] = _cp.x;
      P[v * 3 + 1] = _cp.y;
      P[v * 3 + 2] = _cp.z;
    }
    C.g.attributes.position.needsUpdate = true;
    C.g.computeVertexNormals();
  }
  // head: fur tufts (sides, back, crown, cheek ruffs), ear tufts, the leather beak mask with brass ring lenses
  function chimeraHead(rAt) {
    const N = FACE.halfWidths.length - 1;
    const rY = (y) => rAt(FACE.topY + (HEAD_TOP - y) / K);
    const surf = (a, y, off, out) => {
      const r = rY(y) + off;
      return out.set(r * Math.sin(a), y, HEAD_Z + r * Math.cos(a) * HEAD_DEEP);
    };
    const normal = (a, y) => {
      const p0 = surf(a, y, 0, V()),
        pa = surf(a + 0.01, y, 0, V()).sub(p0),
        py = surf(a, y + 0.002, 0, V()).sub(p0);
      const n = V().crossVectors(py, pa).normalize();
      if (y > HEAD_TOP - 0.01) n.lerp(V(0, 1, 0), 0.6).normalize();
      return n;
    };
    const yMaskB = yOf(FACE.chinY - 22),
      yMaskT = yOf(FACE.browY - 26),
      A_M = 1.28;
    // --- fur: many small tufts, combed back and down ---
    const parts = [];
    const g1 = tuftGeo(0.012, 0.03);
    for (let k = 0; k < 150; k++) {
      const y = yMaskB - 0.02 + rand() * (HEAD_TOP - yMaskB + 0.012),
        top = y > yMaskT - 0.004;
      const a = top ? (rand() * 2 - 1) * Math.PI : (rand() < 0.5 ? 1 : -1) * (A_M + 0.05 + rand() * (Math.PI - A_M - 0.05));
      if (y > HEAD_TOP - 0.004) continue;
      const n = normal(a, y),
        p = surf(a, y, -0.004, V());
      const dir = n.clone().multiplyScalar(0.55).add(V(0, -0.6, -0.55)).add(V(Math.sin(a) * 0.15, 0, 0)).normalize();
      parts.push([g1, aim(p, dir, (y > HEAD_TOP - 0.035 ? 0.45 : 0.6) + rand() * 0.4)]); // shorter on the crown: soft, not spiky
    }
    // cheek ruffs: longer tufts sticking out from under the sides of the mask, and a fringe under its chin
    const g2 = tuftGeo(0.014, 0.042);
    for (let k = 0; k < 26; k++) {
      const s = k % 2 ? 1 : -1,
        a = s * (A_M - 0.08 + rand() * 0.3),
        y = yMaskB - 0.012 + rand() * 0.07;
      const n = normal(a, y);
      parts.push([g2, aim(surf(a, y, -0.003, V()), n.clone().add(V(0, -0.5, -0.15)).normalize(), 0.8 + rand() * 0.5)]);
    }
    for (let k = 0; k < 14; k++) {
      const a = (rand() * 2 - 1) * 1.2,
        y = yMaskB - 0.004;
      parts.push([g2, aim(surf(a, y, -0.006, V()), V(Math.sin(a) * 0.3, -1, 0.25).normalize(), 0.7 + rand() * 0.4)]);
    }
    merged(parts, MAT.fur, headG);
    // ear tufts: two pointed tufts at the top sides, turned up and out, darker at the tips
    if (STYLE.earTufts)
      for (const s of [1, -1]) {
        // soft fur tufts swept out and back (short and blunt, so they never read as horns)
        const a = s * 1.42,
          y = HEAD_TOP - 0.05;
        const p = surf(a, y, -0.01, V()),
          d1 = V(s * 0.85, 0.32, -0.45).normalize(),
          e1 = mesh(tuftGeo(0.021, 0.028), MAT.fur);
        e1.applyMatrix4(aim(p, d1));
        const p2 = p.clone().addScaledVector(d1, 0.02),
          e2 = mesh(tuftGeo(0.01, 0.014), MAT.furShade);
        e2.applyMatrix4(aim(p2, V(s * 0.9, 0.2, -0.5)));
        headG.add(e1, e2);
      }
    // --- the mask: a leather shell over the face, from the brow to above the chin ---
    {
      const NA = 28,
        NY = 12,
        pos = [],
        idx = [];
      for (let i = 0; i < NY; i++) {
        const y = yMaskB + ((yMaskT - yMaskB) * i) / (NY - 1);
        for (let j = 0; j < NA; j++) {
          const a = -A_M + (2 * A_M * j) / (NA - 1);
          // it stands a little proud of the face in the middle (a hard leather shell), closer at the edges
          const off = 0.0045 + 0.006 * Math.cos(a * 1.1) * Math.sin((Math.PI * i) / (NY - 1));
          surf(a, y, off, tA);
          pos.push(tA.x, tA.y, tA.z);
          if (i < NY - 1 && j < NA - 1) {
            const q = i * NA + j;
            idx.push(q, q + 1, q + NA, q + 1, q + NA + 1, q + NA);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      headG.add(mesh(g, MAT.leather)); // (taps go through to the head behind it, which carries the host's info)
      // a darker rolled edge round the shell
      const edge = [];
      for (let j = 0; j < NA; j++) edge.push(surf(-A_M + (2 * A_M * j) / (NA - 1), yMaskT, 0.005, V()));
      for (let i = NY - 2; i > 0; i--) edge.push(surf(A_M, yMaskB + ((yMaskT - yMaskB) * i) / (NY - 1), 0.005, V()));
      for (let j = NA - 1; j >= 0; j--) edge.push(surf(-A_M + (2 * A_M * j) / (NA - 1), yMaskB, 0.005, V()));
      for (let i = 1; i < NY - 1; i++) edge.push(surf(-A_M, yMaskB + ((yMaskT - yMaskB) * i) / (NY - 1), 0.005, V()));
      headG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true), 120, 0.0028, 6, true), MAT.leatherDark, { shadow: false }));
      // a stitched seam down the middle of the brow
      const seam = [];
      for (let i = 0; i < 5; i++) seam.push(surf(0, yMaskT - 0.004 - i * 0.008, 0.0045 + 0.006 * Math.sin((Math.PI * (NY - 1 - i * 0.7)) / (NY - 1)) + 0.0008, V()));
      seam.forEach((p) => {
        const st = mesh(new THREE.BoxGeometry(0.008, 0.0016, 0.0016), MAT.stitch, { shadow: false });
        st.position.copy(p);
        headG.add(st);
      });
    }
    // --- the beak: a long curved cone of leather, pointing down and forward ---
    {
      const y0 = yOf(FACE.noseY - 30),
        z0 = surf(0, y0, 0, V()).z;
      const curve = new THREE.CatmullRomCurve3([V(0, y0 + 0.006, z0 - 0.022), V(0, y0 - 0.002, z0 + 0.03), V(0, y0 - 0.022, z0 + 0.078), V(0, y0 - 0.055, z0 + 0.118), V(0, y0 - 0.094, z0 + 0.142)]);
      const NR = 18,
        L = Loft(NR, 18, MAT.beak);
      const ridge = [];
      for (let i = 0; i < NR; i++) {
        const t = i / (NR - 1),
          c = curve.getPointAt(t),
          T = curve.getTangentAt(t);
        const up = V().crossVectors(T, V(1, 0, 0)).normalize();
        const hh = 0.043 * Math.pow(1 - t, 0.75) + 0.0016,
          hw = 0.034 * Math.pow(1 - t, 0.85) + 0.0014;
        L.ring(i, c.x, c.y - hh * 0.08, c.z, hw, 0, 0, up.x * hh, up.y * hh, up.z * hh);
        if (t > 0.08 && t < 0.92) ridge.push(c.clone().addScaledVector(up, hh * 0.92 + 0.0012));
      }
      L.caps(0, y0 + 0.006, z0 - 0.026, 0, y0 - 0.0955, z0 + 0.1435);
      L.done();
      headG.add(L.mesh);
      // stitches along the top of the beak
      ridge.forEach((p, i) => {
        if (i % 1) return;
        const st = mesh(new THREE.BoxGeometry(0.0055, 0.0015, 0.0016), MAT.stitch, { shadow: false });
        st.position.copy(p);
        headG.add(st);
      });
      // the seam where beak meets mask
      const ringT = mesh(new THREE.TorusGeometry(1, 0.06, 6, 28), MAT.leatherDark, { shadow: false });
      const c0 = curve.getPointAt(0.12);
      ringT.position.copy(c0);
      ringT.scale.set(0.031, 0.039, 0.031);
      ringT.quaternion.setFromUnitVectors(ZV, curve.getTangentAt(0.12));
      headG.add(ringT);
    }
    // --- one brass ring lens at the side of the mask (as in the official art), with a glint that brightens while he talks ---
    for (const s of [1]) {
      const a = s * 0.8,
        y = yOf(FACE.eyeY) + 0.006;
      const n = normal(a, y),
        p = surf(a, y, 0.0105, V());
      const q = new THREE.Quaternion().setFromUnitVectors(ZV, n);
      const ring = mesh(new THREE.TorusGeometry(0.021, 0.0052, 10, 30), MAT.brass, { shadow: false });
      ring.position.copy(p);
      ring.quaternion.copy(q);
      const glass = mesh(new THREE.CircleGeometry(0.0196, 28), MAT.lens, { shadow: false });
      glass.position.copy(p).addScaledVector(n, -0.001);
      glass.quaternion.copy(q);
      const gl = mesh(new THREE.CircleGeometry(0.0045, 12), MAT.glint, { shadow: false });
      gl.position.copy(p).addScaledVector(n, 0.0005).add(V(-s * 0.004, 0.007, 0));
      gl.quaternion.copy(q);
      headG.add(ring, glass, gl);
      // rivets on the brass
      for (let k = 0; k < 4; k++) {
        const r = ball(0.0022, MAT.brass, headG);
        const ang = (k * Math.PI) / 2 + 0.6;
        r.position.set(Math.cos(ang) * 0.021, Math.sin(ang) * 0.021, 0.004).applyQuaternion(q).add(p);
      }
    }
  }
  // ---- the lion tail lying behind him on the tatami (its root follows the hips) ----
  const TAIL_N = 26;
  if (STYLE.tail === 'lion') {
    CH.tail = Loft(TAIL_N, 10, MAT.fur, true);
    root.add(CH.tail.mesh);
    // the tuft at the end: a fan of cream-tan tufts, built once around the end point
    CH.tuftG = new THREE.Group();
    root.add(CH.tuftG);
    const parts = [],
      g = tuftGeo(0.016, 0.07);
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const d = V(Math.cos(ang) * 0.45, Math.sin(ang) * 0.3, 1).normalize();
      parts.push([g, aim(V(Math.cos(ang) * 0.006, Math.sin(ang) * 0.004, -0.01), V(d.x, d.y, d.z), 0.75 + rand() * 0.5)]);
    }
    const tuftMesh = merged(parts, MAT.tuft, CH.tuftG);
    tuftMesh.rotation.x = -Math.PI / 2; // the fan points along the group's +z... (aim() points +y; turn it to +z)
    ball(0.02, MAT.tuft, CH.tuftG, 1, 0.85, 1.4).position.set(0, 0, 0.012);
    CH.tuftMesh = tuftMesh;
  }
  const TAIL_FIXED = [V(0.13, 0.017, -0.4), V(0.27, 0.016, -0.45), V(0.38, 0.017, -0.41), V(0.45, 0.02, -0.33)];
  function tailUpdate(S) {
    const T = CH.tail;
    if (!T) return;
    const hy = S.hip.y,
      hz = S.hip.z;
    const curve = new THREE.CatmullRomCurve3([V(0, Math.max(0.05, hy - 0.08), hz - 0.1), V(0.03, 0.03, hz - 0.22), ...TAIL_FIXED]);
    for (let i = 0; i < TAIL_N; i++) {
      const t = i / (TAIL_N - 1),
        c = curve.getPointAt(t),
        Tg = curve.getTangentAt(t);
      const side = V().crossVectors(Tg, UPV).normalize(),
        up = V().crossVectors(side, Tg).normalize();
      const r = 0.0155 - 0.005 * t;
      T.ring(i, c.x, c.y, c.z, side.x * r, side.y * r, side.z * r, up.x * r * 0.9, up.y * r * 0.9, up.z * r * 0.9);
    }
    T.done();
    const end = curve.getPointAt(1),
      dir = curve.getTangentAt(1);
    CH.tuftG.position.copy(end);
    CH.tuftG.quaternion.setFromUnitVectors(ZV, dir);
    CH.tailCurve = curve;
  }
  // ---- the hat, taken off indoors: it rests brim-down on the tatami behind him at his right side ----
  if (STYLE.hat === 'floor') {
    const H = new THREE.Group();
    H.position.set(-0.62, 0.003, -0.4); // out and back, so from the guest seat it never sits on the water jar's lid
    H.rotation.y = 0.5;
    root.add(H);
    const prof = [
      [0.001, 0.13],
      [0.04, 0.132],
      [0.07, 0.126],
      [0.086, 0.112],
      [0.092, 0.07],
      [0.097, 0.02],
      [0.1, 0.012],
      [0.14, 0.008],
      [0.172, 0.007],
      [0.186, 0.019],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const hat = mesh(new THREE.LatheGeometry(prof, 40), MAT.hat);
    hat.scale.set(1, 1, 0.9);
    H.add(hat);
    const band = mesh(new THREE.CylinderGeometry(0.0948, 0.0985, 0.032, 40, 1, true), MAT.hatBand);
    band.position.y = 0.034;
    band.scale.set(1.012, 1, 0.9 * 1.012);
    H.add(band);
    // a dark feather tucked into the band, pointing back and up
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.quadraticCurveTo(0.02, 0.06, 0.004, 0.13);
    sh.quadraticCurveTo(-0.012, 0.06, 0, 0);
    const f = mesh(new THREE.ShapeGeometry(sh, 8), MAT.hatFeather, { shadow: false });
    f.position.set(0.094, 0.03, -0.02);
    f.rotation.set(0.2, 0.25, -1.05);
    H.add(f);
    // a small patch sewn on the crown
    const pa = mesh(new THREE.PlaneGeometry(0.034, 0.03), MAT.hatPatch, { shadow: false });
    pa.position.set(-0.066, 0.085, 0.058);
    pa.lookAt(H.localToWorld(V(-0.2, 0.09, 0.18)));
    pa.position.set(-0.064, 0.086, 0.06);
    pa.quaternion.setFromUnitVectors(ZV, V(-0.7, 0.1, 0.7).normalize());
    H.add(pa);
    CH.hat = H;
  }

  function update(S, st, dt) {
    trunkG.position.copy(S.hip);
    trunkG.quaternion.copy(S.torsoQ);
    headG.position.set(BODY.headPivot[0], BODY.headPivot[1], BODY.headPivot[2]).applyQuaternion(S.torsoQ).add(S.hip);
    headG.quaternion.copy(S.torsoQ).multiply(S.headQ);
    if (BEAST) {
      // the beak never opens: while he talks the head nods a little, and the lenses catch the light
      const now = performance.now() / 1000,
        talking = now < (st.talkUntil || 0);
      CH.nod += ((talking ? 1 : 0) - CH.nod) * Math.min(1, (dt || 0.016) * 6);
      CH.clock += dt || 0;
      const w = CH.clock * Math.PI * 2 * 1.6;
      headG.quaternion.multiply(q1.setFromAxisAngle(tX.set(1, 0, 0), CH.nod * 0.065 * (0.5 - 0.5 * Math.cos(w))));
      MAT.lens.emissiveIntensity = CH.nod * (0.18 + 0.22 * Math.max(0, Math.sin(w * 0.5)));
      MAT.glint.opacity = 0.45 + 0.5 * CH.nod * Math.max(0, Math.sin(w * 0.5));
    }
    headG.updateWorldMatrix(true, false);
    hairCut.world.copy(hairCut.local).applyMatrix4(headG.matrixWorld);
    const key = st.eyes + '|' + st.mouth;
    if (key !== faceKey && faceTex[key]) {
      const first = !MAT.face.map;
      MAT.face.map = faceTex[key];
      MAT.face.color.set(0xffffff);
      if (first) MAT.face.needsUpdate = true;
      faceKey = key;
    }
    refreshUtensilBoxes();
    placeArm(S.arms[1], ARM[1], 1);
    placeArm(S.arms[-1], ARM[-1], -1);
    placeLegs(S);
    capeUpdate(S);
    tailUpdate(S);
    if (pixels.length) {
      clock += dt || 0;
      for (const p of pixels) {
        const b = p.userData;
        if (b.arm) {
          const h = ARM[b.arm].hem;
          p.position.set(h.x + h.ux * b.u, h.y + 0.006 + b.lift, h.z + h.uz * b.u);
        } else p.position.copy(b.base);
        p.position.y += Math.sin(clock * 1.3 + b.ph) * (b.drift || 0.003); // drifting a little, like bits that have not quite settled
        p.rotation.set(b.ph + clock * 0.4, b.ph * 2 + clock * 0.3, 0);
      }
    }
  }
  // ---- data: a few tiny square fragments at the hair tips (nape and temple) and at the sleeve hems ----
  const pixels = [];
  let clock = 0;
  if (STYLE.pixels) {
    const pm = std(PAL.accent || '#d29a2e', 0.5, { emissive: new THREE.Color(PAL.accent || '#d29a2e').multiplyScalar(0.35) }),
      pm2 = std(PAL.hairLight, 0.5, { emissive: new THREE.Color(PAL.hairLight).multiplyScalar(0.25) }),
      box = new THREE.BoxGeometry(1, 1, 1);
    const add = (parent, size, mat, data) => {
      const m = mesh(box, mat, { shadow: false });
      m.scale.setScalar(size);
      m.userData = data;
      parent.add(m);
      pixels.push(m);
      return m;
    };
    // every fragment on the head sits ON the hair (half sunk into it), so none floats free of the head
    const N = FACE.halfWidths.length - 1;
    const capR = (y) => FACE.halfWidths[Math.max(0, Math.min(N, Math.round(((HEAD_TOP - y) / HEAD_H) * N)))] * K + 0.006;
    const above = (p) => {
      while (hairCut.local.distanceToPoint(p) < 0.004) p.y += 0.002; // keep it above where the hair is cut
      return p;
    };
    if (STYLE.hair === 'short') {
      // at the tips of the nape hair: on the back of the hair cap, just above the cut
      [[-0.03, 0.007], [0.008, 0.006], [0.034, 0.0055], [-0.012, 0.0045]].forEach(([x, sz], k) => {
        const y = BODY.headCentre - NAPE_SHORT.y + 0.004 + (k % 2) * 0.008,
          r = capR(y);
        const pt = above(V(x, y, HEAD_Z - 0.002 - Math.sqrt(Math.max(0, r * r - x * x)) * (HEAD_DEEP + 0.03) - sz * 0.2));
        add(headG, sz, k % 2 ? pm2 : pm, { base: pt, ph: k * 1.7, lift: 0, drift: 0.0012 });
      });
    } else {
      const napeY = BODY.headCentre - 0.07,
        napeZ = HEAD_Z - 0.085;
      [[-0.035, 0.0, 0.007], [0.012, -0.012, 0.006], [0.044, 0.004, 0.0055], [-0.008, -0.026, 0.0045]].forEach(([x, dy, sz], k) =>
        add(headG, sz, k % 2 ? pm2 : pm, { base: V(x, napeY + dy, napeZ - 0.012 + Math.abs(x) * 0.25), ph: k * 1.7, lift: 0 }),
      );
    }
    // on the side of the hair cap just above the ear, by the feathers: the cap's own surface at that height and depth
    const onCap = (y, z, sz) => {
      const r = capR(y),
        dz = (z - HEAD_Z + 0.002) / (HEAD_DEEP + 0.03);
      return above(V(Math.sqrt(Math.max(0, r * r - dz * dz)) + sz * 0.2, y, z));
    };
    const ey = yOf(FACE.earBox[1]);
    [[0.006, 0.004, 0.006], [0.017, -0.004, 0.0045]].forEach(([up, dz, sz], k) =>
      add(headG, sz, k ? pm2 : pm, { base: onCap(ey + up, HEAD_Z - 0.03 + dz, sz), ph: 4 + k, lift: 0, drift: 0.0012 }),
    );
    for (const s of [1, -1]) {
      ARM[s].hem = { x: 0, y: 0, z: 0, ux: 0, uz: 0, set(x, y, z, ux, uz) { Object.assign(this, { x, y, z, ux, uz }); } };
      [[-0.8, 0.006, 0.006], [0.1, 0.012, 0.0045], [0.9, 0.003, 0.0055]].forEach(([u, lift, sz], k) => add(root, sz, k % 2 ? pm2 : pm, { arm: s, u, lift, ph: s + k * 2.1 }));
    }
  }
  // ---- nue: an optional slim tail lying behind on the tatami ----
  if (STYLE.tail && STYLE.tail !== 'lion') {
    const curve = new THREE.CatmullRomCurve3([V(0.04, 0.035, -0.17), V(0.14, 0.018, -0.3), V(0.27, 0.014, -0.36), V(0.36, 0.02, -0.31)]);
    const tail = mesh(new THREE.TubeGeometry(curve, 40, 0.011, 8, false), MAT.stripe || std(PAL.stripe || PAL.hairDark, 0.8));
    root.add(tail);
  }
  function dispose() {
    // take down everything this avatar added: meshes, geometries, materials, textures, and the head's tap info
    disposed = true;
    hostRoot.remove(root);
    const mats = new Set(Object.values(MAT)),
      geos = new Set();
    root.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) mats.add(o.material);
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    const i = clickable.indexOf(headMesh);
    if (i >= 0) clickable.splice(i, 1);
  }
  // parts: for the tools' clearance checks (sleeves, cape, tail, hat against the utensils)
  const parts = () => ({ sleeves: [ARM[1].sleeve.mesh, ARM[-1].sleeve.mesh], hands: [ARM[1].palm, ARM[-1].palm], cape: CH.cape ? trunkG.children.find((c) => c.geometry === CH.cape.g) : null, tail: CH.tail ? CH.tail.mesh : null, tuft: CH.tuftG || null, hat: CH.hat || null });
  return { update, portraitURL: () => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PORTRAIT_SVG), trunkG, headG, dispose, style: STYLE, parts };
}
let AVATAR = makeAvatar(performerOf(TEACHER)); // a navigator's lesson is performed by shizue
window.__sadoAvatar = () => AVATAR; // tools only (clearance checks)
