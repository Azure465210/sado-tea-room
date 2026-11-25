// Kotonoha Akane (elder twin): long pink hair parted to her right with a lively tuft on top, red-pink eyes,
// dark dress with a white collar and a pink ribbon. buildKotonoha() is shared with the mirrored younger twin (AoiBust).
import * as THREE from 'three';
import { add, bow, buildHead, buildTorso, curtainGeo, hairMat, hairShell, HEAD_R, HEAD_Y, lockGeo, neck, place, toon, torsoProfile, useBust } from './kit';

export interface TwinLook {
  hair: string;
  hairDark: string;
  hairLight: string;
  iris: string;
  irisDeep: string;
  accent: string;
  dress: string;
  /** +1 = parted / clipped on the model's +x side, -1 = mirrored */
  side: 1 | -1;
  tuft: boolean;
  browTilt: number;
}

export function buildKotonoha(L: TwinLook) {
  const root = new THREE.Group();
  const R = HEAD_R,
    skin = '#f6e3d6';
  const { mesh: torso } = buildTorso(torsoProfile(0.29, 0.07), 0.72, (g, m) => {
    g.fillStyle = L.dress;
    g.fillRect(0, 0, m.W, m.H);
    // centre placket with buttons
    g.fillStyle = 'rgba(255,255,255,0.08)';
    m.poly(g, [[-0.025, 0.33], [0.025, 0.33], [0.025, -0.05], [-0.025, -0.05]]);
    g.fill();
    // coloured piping down the front panels
    g.strokeStyle = L.accent;
    g.lineWidth = 4;
    for (const sx of [-1, 1]) {
      m.poly(g, [[sx * 0.1, 0.31], [sx * 0.12, -0.05]], false);
      g.stroke();
    }
    // round white collar, two lobes, thin coloured edge
    for (const sx of [-1, 1]) {
      const pts: [number, number][] = [[0, 0.405]];
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI;
        pts.push([sx * (0.012 + 0.085 * (1 - Math.cos(a)) * 0.5 + 0.075 * Math.sin(a)), 0.39 - 0.11 * (1 - Math.cos(a)) * 0.5 - 0.02 * Math.sin(a)]);
      }
      pts.push([sx * 0.006, 0.3]);
      g.fillStyle = '#fbfaf7';
      m.poly(g, pts);
      g.fill();
      g.strokeStyle = L.accent;
      g.lineWidth = 3;
      m.poly(g, pts.slice(1, -1), false);
      g.stroke();
    }
    g.fillStyle = '#fbfaf7';
    for (const y of [0.22, 0.13, 0.04]) {
      const [u, v] = m.uv(0, y);
      g.beginPath();
      g.arc(u, v, 5, 0, Math.PI * 2);
      g.fill();
    }
  });
  root.add(torso);
  neck(root, skin, 0.05);
  const ribbon = bow(toon(L.accent), 0.13);
  ribbon.position.set(0, 0.375, 0.115);
  ribbon.rotation.x = -0.35;
  root.add(ribbon);

  const head = buildHead(
    { skin, iris: L.iris, irisDeep: L.irisDeep, lash: '#2b1f24', brow: L.hairDark, eyeY: 0.5, eyeSpan: 0.17, eyeW: 0.135, eyeH: 0.165, browY: 1.0, browTilt: L.browTilt, blush: 0.3, mouthTheta: 0.73 },
    R,
  );
  head.group.position.set(0, HEAD_Y, 0);
  root.add(head.group);
  const hair = hairMat(L.hair, L.hairDark, L.hairLight);
  const shell = hairShell(R * 1.06, hair, { front: 0.34, side: 0.6, back: 0.62, fringe: 0.15, strands: 8, fringeSpan: 1.3, part: L.side * 0.25 });
  shell.scale.set(1.0, 1.04, 1.02);
  shell.position.set(0, 0.008, -0.004);
  head.group.add(shell);
  // long straight hair down the back, framing the face at the sides
  add(head.group, curtainGeo(R * 1.04, 0.25, 0.66, Math.PI * 1.3, 11, 0.05), hair, [0, 0, -0.02], [0, 0, 0], [1, 1, 0.82]);
  // side locks falling in front of the shoulders
  for (const sx of [-1, 1]) {
    const lk = new THREE.Mesh(lockGeo(0.46, 0.075, 0.03, 0.04, 0.25), hair);
    place(lk, R * 1.02, sx * 1.22, -0.05, -0.05, sx * 0.05);
    head.group.add(lk);
  }
  // a hair clip on the parted side
  const clip = toon(L.accent);
  for (const k of [0, 1]) {
    const c = add(head.group, new THREE.CapsuleGeometry(0.009, 0.05, 4, 8), clip);
    place(c, R * 1.09, L.side * (0.62 + k * 0.1), 0.42 - k * 0.04, 0, L.side * 0.9);
  }
  if (L.tuft) {
    const t = new THREE.Mesh(lockGeo(0.14, 0.04, 0.02, 0.07, 0.1), hair);
    t.position.set(0.01, R * 1.07, 0.03);
    t.rotation.set(Math.PI - 0.5, 0.3, 0);
    head.group.add(t);
  }
  return { root, head };
}

const AKANE: TwinLook = {
  hair: '#f093b0',
  hairDark: '#c96b8c',
  hairLight: '#ffd1de',
  iris: '#e2577a',
  irisDeep: '#7b2338',
  accent: '#ee6f95',
  dress: '#2f2a3b',
  side: -1,
  tuft: true,
  browTilt: 0.12,
};

export function AkaneBust(props: { talking: boolean }) {
  const root = useBust(() => buildKotonoha(AKANE), props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
