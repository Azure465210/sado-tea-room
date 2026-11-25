// Tohoku Zunko: long green hair with an edamame hair band, golden eyes, a white kimono-like top with green crossed collar
// bands and a dark-green sash. paintKimono() is shared with her sisters (KiritanBust, ItakoBust).
import * as THREE from 'three';
import { add, buildHead, buildTorso, curtainGeo, hairMat, hairShell, HEAD_R, HEAD_Y, lockGeo, neck, place, toon, torsoProfile, useBust, type TorsoMap } from './kit';

export interface KimonoLook {
  body: string;
  inner: string;
  collar: string;
  sash: string;
  /** optional thin line on the sash */
  sashLine?: string;
}

/** Paints a kimono-style top: inner collar V, two crossed collar bands (wearer's left over right) and a sash at the hem. */
export function paintKimono(g: CanvasRenderingContext2D, m: TorsoMap, k: KimonoLook) {
  g.fillStyle = k.body;
  g.fillRect(0, 0, m.W, m.H);
  // soft folds
  g.strokeStyle = 'rgba(0,0,0,0.07)';
  g.lineWidth = 3;
  for (const x of [-0.2, -0.13, 0.13, 0.2]) {
    m.poly(g, [[x, 0.28], [x * 1.15, 0.05]], false);
    g.stroke();
  }
  // inner collar (han-eri) showing in the V
  g.fillStyle = k.inner;
  m.poly(g, [[-0.085, 0.418], [0.085, 0.418], [0.0, 0.13]]);
  g.fill();
  const band = (x0: number, y0: number, x1: number, y1: number, w: number) => {
    m.poly(g, [[x0 - w / 2, y0], [x0 + w / 2, y0], [x1 + w / 2, y1], [x1 - w / 2, y1]]);
  };
  g.fillStyle = k.collar;
  // under panel (wearer's right = viewer's left), then the top panel crossing over it
  band(-0.07, 0.418, 0.02, 0.16, 0.05);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 2;
  band(0.07, 0.418, -0.06, 0.07, 0.055);
  g.fill();
  g.stroke();
  // the top panel's edge continuing to the hem
  g.strokeStyle = 'rgba(0,0,0,0.16)';
  g.lineWidth = 3;
  m.poly(g, [[-0.085, 0.07], [-0.11, -0.05]], false);
  g.stroke();
  // sash
  g.fillStyle = k.sash;
  m.poly(g, [[-0.4, 0.07], [0.4, 0.07], [0.4, -0.06], [-0.4, -0.06]]);
  g.fill();
  if (k.sashLine) {
    g.strokeStyle = k.sashLine;
    g.lineWidth = 4;
    m.poly(g, [[-0.4, 0.02], [0.4, 0.02]], false);
    g.stroke();
  }
}

const PAL = {
  skin: '#f8e6d8',
  hair: '#7fbf6a',
  hairDark: '#4e8c42',
  hairLight: '#d2efc4',
  band: '#3f7a35',
  pod: '#5f9f45',
  bean: '#a8d97e',
};

/** An edamame pod lying along +x: a flattened capsule with three beans bulging on its +z face. */
function pod(len: number) {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.03, len, 6, 12), toon(PAL.pod), [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.6]);
  const bean = toon(PAL.bean);
  for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.025, 12, 10), bean, [(i - 1) * (len / 3), 0, 0.01], [0, 0, 0], [1, 0.95, 0.7]);
  return g;
}

function build() {
  const root = new THREE.Group();
  const R = HEAD_R,
    hair = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  // long hair behind the shoulders (added first, at the root, so it falls behind the torso)
  const { mesh: torso } = buildTorso(torsoProfile(0.3, 0.07), 0.72, (g, m) => paintKimono(g, m, { body: '#f7f6ef', inner: '#ffffff', collar: '#5c9e4a', sash: '#2f5f2c', sashLine: '#a9d98a' }));
  root.add(torso);
  neck(root, PAL.skin, 0.05);

  const head = buildHead(
    { skin: PAL.skin, iris: '#e6a83a', irisDeep: '#7d4a12', lash: '#2d2219', brow: PAL.hairDark, eyeY: 0.5, eyeSpan: 0.17, eyeW: 0.135, eyeH: 0.165, browY: 1.02, browTilt: 0.0, blush: 0.3, mouthTheta: 0.73 },
    R,
  );
  head.group.position.set(0, HEAD_Y, 0);
  root.add(head.group);
  const shell = hairShell(R * 1.06, hair, { front: 0.33, side: 0.6, back: 0.62, fringe: 0.15, strands: 9, fringeSpan: 1.3, part: 0 });
  shell.scale.set(1.0, 1.04, 1.02);
  shell.position.set(0, 0.008, -0.004);
  head.group.add(shell);
  // very long straight hair down the back
  add(head.group, curtainGeo(R * 1.04, 0.29, 0.67, Math.PI * 1.32, 12, 0.05), hair, [0, 0, -0.02], [0, 0, 0], [1, 1, 0.8]);
  // side locks in front of the shoulders
  for (const sx of [-1, 1]) {
    const lk = new THREE.Mesh(lockGeo(0.5, 0.08, 0.03, 0.05, 0.22), hair);
    place(lk, R * 1.02, sx * 1.2, -0.05, -0.05, sx * 0.05);
    head.group.add(lk);
  }
  // the hair band over the crown, tilted slightly forward
  const bandGrp = new THREE.Group();
  bandGrp.rotation.x = -0.32;
  head.group.add(bandGrp);
  add(bandGrp, new THREE.TorusGeometry(R * 1.1, 0.014, 8, 48, Math.PI), toon(PAL.band), [0, 0.006, 0], [0, 0, 0], [1, 1.04, 1.4]);
  // edamame pods on the band, one cluster each side of the crown
  for (const sx of [-1, 1]) {
    for (const [a, len, out] of [
      [0.55, 0.14, 0.0],
      [0.9, 0.11, 0.0],
    ] as const) {
      const ang = Math.PI / 2 - sx * a;
      const p = pod(len);
      p.position.set(Math.cos(ang) * R * 1.16, Math.sin(ang) * R * 1.16 * 1.04 + out, 0.02);
      p.rotation.set(0, 0, ang - Math.PI / 2 + sx * 0.15);
      bandGrp.add(p);
    }
  }
  return { root, head };
}

export function ZunkoBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
