// Tohoku Kiritan: the small youngest sister – long brown hair in a blunt hime cut, calm half-lidded eyes,
// a red-and-white shrine-maiden-like top, and a big kiritanpo (toasted rice stick) slung across her back.
import * as THREE from 'three';
import { add, buildHead, buildTorso, canvasTex, curtainGeo, hairMat, hairShell, HEAD_R, HEAD_Y, lockGeo, neck, place, toon, torsoProfile, useBust } from './kit';
import { paintKimono } from './ZunkoBust';

const PAL = {
  skin: '#f9e7da',
  hair: '#7a4a32',
  hairDark: '#4a2a1b',
  hairLight: '#b98a6a',
  red: '#c8323a',
};

/** A kiritanpo: toasted rice wrapped round a cedar stick, centred at the origin along +y. */
function kiritanpo(len: number, r: number) {
  const g = new THREE.Group();
  const tex = canvasTex(256, 128, (c, W, H) => {
    c.fillStyle = '#efd9a6';
    c.fillRect(0, 0, W, H);
    // grilled patches and grain
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % W,
        y = (i * 53) % H;
      c.fillStyle = i % 3 ? 'rgba(190,112,40,0.8)' : 'rgba(128,66,22,0.85)';
      c.beginPath();
      c.ellipse(x, y, 14 + (i % 4) * 5, 6 + (i % 3) * 3, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 60; i++) c.fillRect((i * 41) % W, (i * 29) % H, 3, 2);
  });
  tex.wrapS = THREE.RepeatWrapping;
  add(g, new THREE.CapsuleGeometry(r, len, 6, 16), toon(0xffffff, { map: tex }));
  const stick = toon('#c9a477');
  add(g, new THREE.CylinderGeometry(r * 0.28, r * 0.3, len * 0.42, 10), stick, [0, -(len / 2 + r + len * 0.18), 0]);
  add(g, new THREE.CylinderGeometry(r * 0.24, r * 0.26, len * 0.12, 10), stick, [0, len / 2 + r + len * 0.03, 0]);
  return g;
}

function build() {
  const root = new THREE.Group();
  const R = HEAD_R * 1.04,
    hair = hairMat(PAL.hair, PAL.hairDark, PAL.hairLight);
  // the kiritanpo across her back: top behind her left shoulder (viewer's right), grip behind the right hip
  const kp = kiritanpo(0.56, 0.072);
  kp.position.set(0.2, 0.62, -0.24);
  kp.rotation.set(0.1, 0, -0.62);
  root.add(kp);

  const { mesh: torso } = buildTorso(torsoProfile(0.27, 0.065), 0.74, (g, m) => paintKimono(g, m, { body: '#fbfaf6', inner: '#ffffff', collar: PAL.red, sash: PAL.red, sashLine: '#f3c2c2' }));
  root.add(torso);
  neck(root, PAL.skin, 0.047);

  const head = buildHead(
    { skin: PAL.skin, iris: '#d26a3a', irisDeep: '#6e2a12', lash: '#2a1a14', brow: PAL.hairDark, eyeY: 0.52, eyeSpan: 0.17, eyeW: 0.14, eyeH: 0.135, browY: 1.15, browTilt: -0.05, blush: 0.2, lashWing: false, mouthTheta: 0.735, mouthW: 0.8 },
    R,
  );
  head.group.position.set(0, HEAD_Y - 0.01, 0);
  root.add(head.group);
  // blunt straight fringe
  const shell = hairShell(R * 1.06, hair, { front: 0.36, side: 0.58, back: 0.62, fringe: 0.04, strands: 14, fringeSpan: 1.25 });
  shell.scale.set(1.0, 1.04, 1.02);
  shell.position.set(0, 0.008, -0.004);
  head.group.add(shell);
  // long straight hair down the back
  add(head.group, curtainGeo(R * 1.04, 0.27, 0.66, Math.PI * 1.3, 14, 0.025), hair, [0, 0, -0.02], [0, 0, 0], [1, 1, 0.8]);
  // hime-cut sidelocks: straight, cut bluntly at the jaw
  for (const sx of [-1, 1]) {
    const lk = new THREE.Mesh(lockGeo(0.27, 0.085, 0.032, 0.015, 0.5), hair);
    place(lk, R * 1.02, sx * 1.12, 0.0, -0.08, sx * 0.03);
    head.group.add(lk);
  }
  return { root, head };
}

export function KiritanBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return (
    <group>
      <primitive object={root} />
    </group>
  );
}
