// Zundamon, the edamame fairy: small and round-faced, light-green hair with two edamame pods on the head,
// a simple cream top with a green collar and a green bow.
import * as THREE from 'three';
import { add, bow, buildHead, buildTorso, hairMat, hairShell, HEAD_R, HEAD_Y, lockGeo, neck, place, toon, torsoProfile, useBust } from './kit';

const PAL = {
  skin: '#fbe9dc',
  hair: '#a9d98a',
  hairDark: '#77b45a',
  hairLight: '#dcf3c8',
  pod: '#6aa84f',
  bean: '#a6d87f',
  top: '#f2ecd2',
  green: '#5f9e47',
};

/** An edamame pod: a flattened capsule with three beans bulging on its face; base at the origin, pointing +y. */
function pod(parent: THREE.Object3D, len: number) {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.034, len, 6, 14), toon(PAL.pod), [0, len / 2 + 0.03, 0], [0, 0, 0], [1, 1, 0.62]);
  const bean = toon(PAL.bean);
  for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.027, 14, 10), bean, [0, 0.035 + (i + 0.5) * (len / 3), 0.012], [0, 0, 0], [1, 0.95, 0.75]);
  parent.add(g);
  return g;
}

function build() {
  const root = new THREE.Group();
  const R = HEAD_R * 1.04;
  const { mesh: torso } = buildTorso(torsoProfile(0.27, 0.065), 0.74, (g, m) => {
    g.fillStyle = PAL.top;
    g.fillRect(0, 0, m.W, m.H);
    // a soft green band at the hem of the yoke and a wide rounded green collar
    g.fillStyle = PAL.green;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + (i / 24) * Math.PI;
      pts.push([0.2 * Math.sin(a), 0.395 - 0.1 * Math.cos(a) * Math.cos(a * 0.5)]);
    }
    for (let i = 24; i >= 0; i--) {
      const a = -Math.PI / 2 + (i / 24) * Math.PI;
      pts.push([0.08 * Math.sin(a), 0.41 - 0.012 * Math.cos(a)]);
    }
    m.poly(g, pts);
    g.fill();
    // soft folds and a green-edged front opening
    g.strokeStyle = 'rgba(120,140,90,0.35)';
    g.lineWidth = 3;
    for (const x of [-0.17, 0.17, -0.09, 0.09]) {
      m.poly(g, [[x, 0.27], [x * 1.2, -0.04]], false);
      g.stroke();
    }
    g.strokeStyle = PAL.green;
    g.lineWidth = 5;
    m.poly(g, [[0, 0.3], [0, -0.05]], false);
    g.stroke();
  });
  root.add(torso);
  neck(root, PAL.skin, 0.048);
  const rib = bow(toon('#4e8f39'), 0.11);
  rib.position.set(0, 0.35, 0.145);
  rib.rotation.x = -0.4;
  root.add(rib);

  const head = buildHead(
    { skin: PAL.skin, iris: '#e9a93a', irisDeep: '#8a4d14', lash: '#3a2a1c', brow: PAL.hairDark, eyeY: 0.51, eyeSpan: 0.175, eyeW: 0.15, eyeH: 0.18, browY: 0.95, browTilt: 0.04, blush: 0.38, mouthTheta: 0.725, mouthW: 0.9 },
    R,
  );
  head.group.position.set(0, HEAD_Y - 0.01, 0);
  root.add(head.group);
  const hair = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  const shell = hairShell(R * 1.06, hair, { front: 0.34, side: 0.62, back: 0.74, fringe: 0.16, strands: 7, fringeSpan: 1.35 });
  shell.scale.set(1.03, 1.03, 1.03);
  shell.position.y = 0.006;
  head.group.add(shell);
  // short locks curling in at the cheeks and a few at the nape
  for (const sx of [-1, 1]) {
    const lk = new THREE.Mesh(lockGeo(0.2, 0.06, 0.026, 0.02, 0.15), hair);
    place(lk, R * 1.0, sx * 1.12, -0.05, -0.12, sx * 0.06);
    head.group.add(lk);
  }
  for (const az of [2.5, 3.14, -2.5]) {
    const lk = new THREE.Mesh(lockGeo(0.12, 0.09, 0.03, 0.02, 0.2), hair);
    place(lk, R * 1.03, az, -0.55, 0.15);
    head.group.add(lk);
  }
  // a little tuft on top
  const t = new THREE.Mesh(lockGeo(0.11, 0.035, 0.018, 0.05, 0.1), hair);
  t.position.set(0, R * 1.08, 0.02);
  t.rotation.set(Math.PI - 0.35, -0.4, 0);
  head.group.add(t);
  // the two edamame pods standing up from the head like ears
  for (const sx of [-1, 1]) {
    const p = pod(head.group, 0.15);
    p.position.set(sx * R * 0.62, R * 0.78, -0.01);
    p.rotation.set(0, sx * 0.25, -sx * 0.55);
  }
  return { root, head };
}

export function ZundamonBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
