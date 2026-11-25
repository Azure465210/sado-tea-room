// Shizue-sensei: the tea-room host. Silver hair combed back into a low chignon, grey-green iromuji with a white han-eri,
// collar worn left over right (her left panel on top).
import * as THREE from 'three';
import { add, buildHead, buildTorso, hairMat, hairShell, HEAD_R, HEAD_Y, neck, toon, torsoProfile, useBust } from './kit';

const PAL = {
  skin: '#efdcc8',
  lip: '#b98178',
  hair: '#a4a8ac',
  hairDark: '#7c8288',
  hairLight: '#dfe1e2',
  kimono: '#6c7c72',
  kimonoShade: '#55645b',
  haneri: '#f5f2ea',
};

function build() {
  const root = new THREE.Group();
  const R = HEAD_R;
  // kimono: V collar, han-eri inside, left panel (model +x) over right
  const { mesh: torso } = buildTorso(torsoProfile(0.3, 0.075), 0.72, (g, m) => {
    g.fillStyle = PAL.kimono;
    g.fillRect(0, 0, m.W, m.H);
    // soft folds
    g.strokeStyle = 'rgba(40,55,48,0.25)';
    g.lineWidth = 3;
    for (const [x0, x1] of [[-0.2, -0.17], [0.19, 0.16], [-0.12, -0.14]] as const) {
      m.poly(g, [[x0, 0.3], [x1, 0.02]], false);
      g.stroke();
    }
    // throat skin inside the V
    g.fillStyle = PAL.skin;
    m.poly(g, [[-0.08, 0.425], [0.08, 0.425], [0.0, 0.17]]);
    g.fill();
    const band = (a: [number, number], b: [number, number], o0: number, o1: number, col: string) => {
      // band beside the edge a→b, between perpendicular offsets o0 and o1 (sign picks the side)
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        L = Math.hypot(dx, dy),
        nx = dy / L,
        ny = -dx / L;
      g.fillStyle = col;
      m.poly(g, [
        [a[0] + nx * o0, a[1] + ny * o0],
        [b[0] + nx * o0, b[1] + ny * o0],
        [b[0] + nx * o1, b[1] + ny * o1],
        [a[0] + nx * o1, a[1] + ny * o1],
      ]);
      g.fill();
    };
    // under panel (her right, model -x): edge from the left of the neck down to the crossing
    band([-0.075, 0.43], [0.02, 0.13], 0, 0.02, PAL.haneri);
    band([-0.075, 0.43], [0.02, 0.13], 0.02, 0.06, PAL.kimonoShade);
    // top panel (her left, model +x): edge from the right of the neck down across to her right side
    band([0.075, 0.43], [-0.11, -0.06], 0, -0.02, PAL.haneri);
    band([0.075, 0.43], [-0.11, -0.06], -0.02, -0.062, PAL.kimonoShade);
    // the top panel's cloth covers the under collar below the crossing
    g.fillStyle = PAL.kimono;
    m.poly(g, [[0.02, 0.13], [-0.11, -0.06], [0.2, -0.06], [0.2, 0.13]]);
    g.fill();
    band([0.075, 0.43], [-0.11, -0.06], -0.02, -0.062, PAL.kimonoShade);
    band([0.075, 0.43], [-0.11, -0.06], 0, -0.02, PAL.haneri);
    // a thin shadow line under the top collar
    g.strokeStyle = 'rgba(30,40,35,0.35)';
    g.lineWidth = 2;
    m.poly(g, [[0.075, 0.43], [-0.11, -0.06]], false);
    g.stroke();
  });
  root.add(torso);
  // the collar stands a little off the neck behind (han-eri inside)
  const back = new THREE.CylinderGeometry(0.083, 0.095, 0.07, 24, 1, true, Math.PI * 0.62, Math.PI * 0.76);
  add(root, back, toon(PAL.kimonoShade, { side: THREE.DoubleSide }), [0, 0.425, -0.012]);
  add(root, new THREE.CylinderGeometry(0.075, 0.087, 0.075, 24, 1, true, Math.PI * 0.64, Math.PI * 0.72), toon(PAL.haneri, { side: THREE.DoubleSide }), [0, 0.43, -0.012]);
  neck(root, PAL.skin, 0.052);

  const head = buildHead(
    {
      skin: PAL.skin,
      iris: '#7a6458',
      irisDeep: '#3b2c27',
      lash: '#3a2c2a',
      brow: '#8a8f95',
      lip: PAL.lip,
      eyeY: 0.475,
      eyeSpan: 0.165,
      eyeW: 0.115,
      eyeH: 0.115,
      browY: 1.2,
      browTilt: -0.02,
      lashWing: true,
      blush: 0.16,
      nose: true,
      mouthW: 0.85,
      mouthTheta: 0.715,
    },
    R,
  );
  head.group.position.set(0, HEAD_Y, 0);
  root.add(head.group);
  const hair = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  // combed back from a soft side part: a high, smooth hairline
  const shell = hairShell(R * 1.045, hair, { front: 0.3, side: 0.6, back: 0.8, fringe: 0.07, strands: 1, fringeSpan: 0.75, part: -0.35 });
  shell.position.set(0, 0.006, -0.004);
  head.group.add(shell);
  // a little volume combed back above the temples
  shell.scale.set(1.02, 1.05, 1.04);
  // low chignon at the nape, with a dark band and a plain comb
  const bunMat = toon(PAL.hair);
  add(head.group, new THREE.SphereGeometry(0.11, 24, 18), bunMat, [0, -0.075, -0.225], [0.3, 0, 0], [1.3, 0.85, 0.9]);
  add(head.group, new THREE.TorusGeometry(0.09, 0.012, 8, 24), toon(PAL.hairDark), [0, -0.075, -0.2], [0.25, 0, 0], [1.3, 0.83, 1]);
  add(head.group, new THREE.BoxGeometry(0.15, 0.03, 0.02), toon('#6e5a48'), [0, -0.012, -0.24], [-0.5, 0, 0]);
  return { root, head };
}

export function ShizueBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
