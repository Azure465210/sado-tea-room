// Kasukabe Tsumugi: a bright gal high-school girl – golden hair with a high side ponytail and a yellow scrunchie,
// slightly tanned skin, a white shirt with a loose red ribbon under an open yellow cardigan.
import * as THREE from 'three';
import { add, bow, buildHead, buildTorso, hairMat, hairShell, HEAD_R, HEAD_Y, lockGeo, neck, place, toon, torsoProfile, useBust, curtainGeo } from './kit';

const PAL = {
  skin: '#e9b98f',
  hair: '#f3c44e',
  hairDark: '#c98f22',
  hairLight: '#fff0b8',
  cardigan: '#f5d36e',
  shirt: '#fbfaf6',
  ribbon: '#e2504a',
  scrunchie: '#ffd23c',
};

/** A tube along curve whose radius swells from the tie and tapers to a soft point. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, r: number): THREE.BufferGeometry {
  const N = 48;
  const g = new THREE.TubeGeometry(curve, N, 1, 14, false);
  const p = g.attributes.position as THREE.BufferAttribute,
    uv = g.attributes.uv as THREE.BufferAttribute;
  const c = new THREE.Vector3(),
    v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const t = uv.getX(i);
    curve.getPointAt(t, c);
    const k = t < 0.12 ? 0.62 + (t / 0.12) * 0.38 : 1 - 0.92 * Math.pow((t - 0.12) / 0.88, 1.6);
    v.fromBufferAttribute(p, i).sub(c).multiplyScalar(r * Math.max(0.04, k)).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function build() {
  const root = new THREE.Group();
  const R = HEAD_R,
    hair = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  const { mesh: torso } = buildTorso(torsoProfile(0.3, 0.07), 0.72, (g, m) => {
    g.fillStyle = PAL.cardigan;
    g.fillRect(0, 0, m.W, m.H);
    // knit ribbing
    g.strokeStyle = 'rgba(160,110,20,0.12)';
    g.lineWidth = 2;
    for (let x = -0.4; x <= 0.4; x += 0.03) {
      m.poly(g, [[x, 0.34], [x, -0.06]], false);
      g.stroke();
    }
    // white shirt in the open front
    g.fillStyle = PAL.shirt;
    m.poly(g, [[-0.1, 0.415], [0.1, 0.415], [0.045, -0.06], [-0.045, -0.06]]);
    g.fill();
    // cardigan front edges with buttons
    g.strokeStyle = 'rgba(150,100,20,0.45)';
    g.lineWidth = 4;
    for (const sx of [-1, 1]) {
      m.poly(g, [[sx * 0.1, 0.4], [sx * 0.045, -0.06]], false);
      g.stroke();
    }
    g.fillStyle = '#fff6d8';
    for (const y of [0.1, 0.0]) {
      const [u, v] = m.uv(-0.065 + (0.1 - y) * -0.1, y);
      g.beginPath();
      g.arc(u, v, 5, 0, Math.PI * 2);
      g.fill();
    }
    // pointed shirt collar
    for (const sx of [-1, 1]) {
      const pts: [number, number][] = [[sx * 0.012, 0.415], [sx * 0.085, 0.405], [sx * 0.07, 0.33]];
      g.fillStyle = '#ffffff';
      m.poly(g, pts);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 2;
      m.poly(g, pts);
      g.stroke();
    }
  });
  root.add(torso);
  neck(root, PAL.skin, 0.05);
  const rib = bow(toon(PAL.ribbon), 0.12);
  rib.position.set(0, 0.36, 0.13);
  rib.rotation.x = -0.35;
  root.add(rib);

  const head = buildHead(
    { skin: PAL.skin, iris: '#3c9fcf', irisDeep: '#164a6e', lash: '#2a1c14', brow: PAL.hairDark, eyeY: 0.5, eyeSpan: 0.17, eyeW: 0.14, eyeH: 0.17, browY: 1.02, browTilt: 0.12, blush: 0.36, mouthTheta: 0.73 },
    R,
  );
  head.group.position.set(0, HEAD_Y, 0);
  root.add(head.group);
  const shell = hairShell(R * 1.06, hair, { front: 0.34, side: 0.58, back: 0.6, fringe: 0.15, strands: 8, fringeSpan: 1.3, part: -0.25 });
  shell.scale.set(1.0, 1.04, 1.02);
  shell.position.set(0, 0.008, -0.004);
  head.group.add(shell);
  // shoulder-length hair at the back
  add(head.group, curtainGeo(R * 1.04, 0.22, 0.42, Math.PI * 1.2, 9, 0.05), hair, [0, 0, -0.02], [0, 0, 0], [1, 1, 0.82]);
  // cheek locks
  for (const sx of [-1, 1]) {
    const lk = new THREE.Mesh(lockGeo(0.3, 0.07, 0.028, 0.03, 0.18), hair);
    place(lk, R * 1.02, sx * 1.18, -0.05, -0.06, sx * 0.05);
    head.group.add(lk);
  }
  // the high side ponytail on her left (viewer's right), tied with a scrunchie
  const ptMat = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  if (ptMat.map) {
    ptMat.map.center.set(0.5, 0.5);
    ptMat.map.rotation = Math.PI / 2; // strands run along the tail
  }
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(R * 0.78, R * 0.62, -0.06),
    new THREE.Vector3(R * 1.12, R * 0.62, -0.09),
    new THREE.Vector3(R * 1.42, R * 0.05, -0.1),
    new THREE.Vector3(R * 1.4, -R * 0.75, -0.08),
    new THREE.Vector3(R * 1.2, -R * 1.5, -0.02),
  ]);
  head.group.add(new THREE.Mesh(taperedTube(curve, 0.09), ptMat));
  const tie = add(head.group, new THREE.TorusGeometry(0.05, 0.026, 10, 20), toon(PAL.scrunchie), curve.getPointAt(0.06).toArray() as [number, number, number]);
  tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(0.06));
  return { root, head };
}

export function TsumugiBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
