// Tohoku Itako: the eldest sister, a spirit medium – long silver-white hair with fox-like ears, violet eyes,
// a white miko-style top with blue crossed collar bands and a blue sash.
import * as THREE from 'three';
import { add, buildHead, buildTorso, curtainGeo, hairMat, hairShell, HEAD_R, HEAD_Y, lockGeo, neck, place, toon, torsoProfile, useBust } from './kit';
import { paintKimono } from './ZunkoBust';

const PAL = {
  skin: '#faeae0',
  hair: '#e2e4ef',
  hairDark: '#9aa0c6',
  hairLight: '#ffffff',
  inner: '#f2c9d6',
  blue: '#3f6fc4',
};

/** A fox-like ear: a flattened cone in hair colour with a soft pink inner cone; base at the origin, tip along +y. */
function foxEar(hair: THREE.Material) {
  const g = new THREE.Group();
  add(g, new THREE.ConeGeometry(0.07, 0.17, 4, 1), hair, [0, 0.085, 0], [0, Math.PI / 4, 0], [1, 1, 0.5]);
  add(g, new THREE.ConeGeometry(0.042, 0.11, 4, 1), toon(PAL.inner), [0, 0.065, 0.02], [0, Math.PI / 4, 0], [1, 1, 0.3]);
  return g;
}

function build() {
  const root = new THREE.Group();
  const R = HEAD_R,
    hair = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  const { mesh: torso } = buildTorso(torsoProfile(0.3, 0.07), 0.72, (g, m) => paintKimono(g, m, { body: '#fbfbfd', inner: '#ffffff', collar: PAL.blue, sash: '#2d4f99', sashLine: '#9cb8ea' }));
  root.add(torso);
  neck(root, PAL.skin, 0.05);

  const head = buildHead(
    { skin: PAL.skin, iris: '#9a72d8', irisDeep: '#43286e', lash: '#3a3046', brow: PAL.hairDark, eyeY: 0.5, eyeSpan: 0.17, eyeW: 0.135, eyeH: 0.15, browY: 1.05, browTilt: 0.02, blush: 0.24, mouthTheta: 0.73, mouthW: 0.9 },
    R,
  );
  head.group.position.set(0, HEAD_Y, 0);
  root.add(head.group);
  const shell = hairShell(R * 1.06, hair, { front: 0.34, side: 0.6, back: 0.62, fringe: 0.14, strands: 8, fringeSpan: 1.3, part: 0.2 });
  shell.scale.set(1.0, 1.04, 1.02);
  shell.position.set(0, 0.008, -0.004);
  head.group.add(shell);
  // very long hair down the back
  add(head.group, curtainGeo(R * 1.05, 0.31, 0.68, Math.PI * 1.34, 11, 0.06), hair, [0, 0, -0.02], [0, 0, 0], [1, 1, 0.82]);
  for (const sx of [-1, 1]) {
    const lk = new THREE.Mesh(lockGeo(0.52, 0.085, 0.03, 0.05, 0.2), hair);
    place(lk, R * 1.02, sx * 1.2, -0.05, -0.05, sx * 0.05);
    head.group.add(lk);
    // fox-like ears rising from the hair
    const ear = foxEar(hair);
    ear.position.set(sx * R * 0.55, R * 0.86, -0.01);
    ear.rotation.set(-0.12, 0, -sx * 0.42);
    head.group.add(ear);
  }
  return { root, head };
}

export function ItakoBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
