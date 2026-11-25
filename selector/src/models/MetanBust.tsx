// Shikoku Metan: pink hair in two large drill twin-tails tied with black ribbons, golden eyes,
// a dark gothic-lolita dress with a white frilled collar and a rose-pink brooch ribbon.
import * as THREE from 'three';
import { add, bow, buildHead, buildTorso, curtainGeo, drillGeo, hairMat, hairShell, HEAD_R, HEAD_Y, lockGeo, neck, place, toon, torsoProfile, useBust } from './kit';

const PAL = {
  skin: '#f8e6dc',
  hair: '#ec86ab',
  hairDark: '#c5577f',
  hairLight: '#ffcfe0',
  dress: '#24212c',
  dress2: '#3a3446',
  frill: '#f7f4f1',
  rose: '#c23d6c',
};

function build() {
  const root = new THREE.Group();
  const R = HEAD_R;
  const { mesh: torso } = buildTorso(torsoProfile(0.29, 0.068), 0.72, (g, m) => {
    g.fillStyle = PAL.dress;
    g.fillRect(0, 0, m.W, m.H);
    // laced bodice panel with crossed lacing
    g.fillStyle = PAL.dress2;
    m.poly(g, [[-0.07, 0.3], [0.07, 0.3], [0.05, -0.05], [-0.05, -0.05]]);
    g.fill();
    g.strokeStyle = PAL.rose;
    g.lineWidth = 2.5;
    for (let y = 0.25; y > -0.02; y -= 0.06) {
      m.poly(g, [[-0.035, y], [0.035, y - 0.04]], false);
      g.stroke();
      m.poly(g, [[0.035, y], [-0.035, y - 0.04]], false);
      g.stroke();
    }
    // white frilled collar: scalloped outer edge
    const pts: [number, number][] = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI;
      const sc = 0.012 * Math.abs(Math.sin(i * Math.PI * 0.5));
      pts.push([(0.2 + sc) * Math.sin(a), 0.385 - (0.085 + sc) * Math.cos(a)]);
    }
    for (let i = N; i >= 0; i--) {
      const a = -Math.PI / 2 + (i / N) * Math.PI;
      pts.push([0.08 * Math.sin(a), 0.415 - 0.012 * Math.cos(a)]);
    }
    g.fillStyle = PAL.frill;
    m.poly(g, pts);
    g.fill();
    g.strokeStyle = 'rgba(60,40,60,0.35)';
    g.lineWidth = 1.5;
    for (let i = -6; i <= 6; i++) {
      const a = (i / 7) * (Math.PI / 2);
      m.poly(g, [[0.09 * Math.sin(a), 0.41 - 0.01 * Math.cos(a)], [0.2 * Math.sin(a), 0.385 - 0.085 * Math.cos(a)]], false);
      g.stroke();
    }
  });
  root.add(torso);
  neck(root, PAL.skin, 0.05);
  // black choker and the rose ribbon at the collar
  add(root, new THREE.TorusGeometry(0.053, 0.009, 8, 24), toon('#1a1720'), [0, 0.455, -0.005], [Math.PI / 2, 0, 0]);
  const rib = bow(toon(PAL.rose), 0.12);
  rib.position.set(0, 0.37, 0.125);
  rib.rotation.x = -0.35;
  root.add(rib);
  add(root, new THREE.SphereGeometry(0.018, 12, 10), toon('#e9c46a'), [0, 0.37, 0.142]);

  const head = buildHead(
    { skin: PAL.skin, iris: '#f0c040', irisDeep: '#8a5a12', lash: '#2a1a22', brow: PAL.hairDark, eyeY: 0.5, eyeSpan: 0.17, eyeW: 0.135, eyeH: 0.155, browY: 1.05, browTilt: 0.16, blush: 0.22, mouthTheta: 0.73, mouthW: 0.85 },
    R,
  );
  head.group.position.set(0, HEAD_Y, 0);
  root.add(head.group);
  const hair = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  const shell = hairShell(R * 1.06, hair, { front: 0.36, side: 0.6, back: 0.64, fringe: 0.11, strands: 9, fringeSpan: 1.3 });
  shell.scale.set(1.02, 1.04, 1.02);
  shell.position.y = 0.006;
  head.group.add(shell);
  // hair down to the shoulders behind
  add(head.group, curtainGeo(R * 1.04, 0.2, 0.38, Math.PI * 1.15, 9, 0.04), hair, [0, 0, -0.02], [0, 0, 0], [1, 1, 0.85]);
  for (const sx of [-1, 1]) {
    const lk = new THREE.Mesh(lockGeo(0.26, 0.06, 0.026, 0.03, 0.2), hair);
    place(lk, R * 1.02, sx * 1.2, -0.05, -0.03);
    head.group.add(lk);
  }
  // the twin drills, tied high at the back of the head with black ribbons
  const ribbonMat = toon('#1c1922');
  for (const sx of [-1, 1]) {
    const base = new THREE.Group();
    base.position.set(sx * R * 0.82, R * 0.42, -R * 0.42);
    head.group.add(base);
    add(base, new THREE.SphereGeometry(0.05, 14, 12), hair, [0, 0, 0], [0, 0, 0], [1, 1.1, 1]);
    const d = add(base, drillGeo(0.66, 0.1, 6), hair, [sx * 0.05, -0.02, 0], [0, 0, sx * 0.14]);
    d.rotation.y = sx * 0.3;
    const b = bow(ribbonMat, 0.12, true);
    b.position.set(sx * 0.03, 0.03, 0.02);
    b.rotation.set(0, sx * 1.1, sx * 0.2);
    base.add(b);
  }
  return { root, head };
}

export function MetanBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
