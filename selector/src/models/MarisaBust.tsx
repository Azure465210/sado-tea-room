// Yukkuri Marisa: the head-only manju of the witch. Blonde hair with a single braid on one side tied with a small bow,
// a big black witch hat with a white ribbon band and bow. Talking = a gentle squash-bounce.
import * as THREE from 'three';
import { add, bow, lockGeo, toon, useBust } from './kit';
import { buildYukkuri } from './yukkuri';

const PAL = {
  skin: '#fbe6d4',
  hair: '#f2d26a',
  hairDark: '#c49a2e',
  hairLight: '#fff3bf',
  hat: '#26232c',
  hatInner: '#15131a',
  white: '#f7f5f0',
};

/** Witch hat: wide brim and a cone whose tip bends back and to the side; origin at the brim centre. */
function witchHat(): THREE.Group {
  const g = new THREE.Group();
  const prof: [number, number][] = [
    [0.6, 0.03], [0.55, 0.008], [0.45, 0.0], [0.33, 0.002], [0.265, 0.02], [0.25, 0.08], [0.215, 0.16],
    [0.165, 0.26], [0.11, 0.35], [0.06, 0.43], [0.02, 0.49], [0.001, 0.5],
  ];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const r = Math.hypot(p.getX(i), p.getZ(i));
    const t = Math.max(0, (y - 0.12) / 0.38);
    // bend the tip back and to the viewer's right; let the brim ripple slightly
    p.setZ(i, p.getZ(i) - 0.15 * t * t);
    p.setX(i, p.getX(i) + 0.08 * t * t);
    p.setY(i, y - 0.03 * t * t * t + (r > 0.4 ? 0.012 * Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 5) * (r - 0.4) * 5 : 0));
  }
  geo.computeVertexNormals();
  add(g, geo, toon(PAL.hat, { side: THREE.DoubleSide, emissive: '#3a3550', emissiveIntensity: 0.25 }));
  // a darker underside of the brim
  const under = new THREE.RingGeometry(0.255, 0.585, 48, 1);
  under.rotateX(Math.PI / 2);
  add(g, under, toon(PAL.hatInner, { side: THREE.DoubleSide }), [0, -0.004, 0]);
  // white ribbon band and a big white bow on the front-left
  const white = toon(PAL.white, { emissive: '#ffffff', emissiveIntensity: 0.12 });
  add(g, new THREE.CylinderGeometry(0.247, 0.268, 0.075, 48, 1, true), toon(PAL.white, { side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.12 }), [0, 0.06, 0]);
  const b = bow(white, 0.3);
  b.position.set(-0.09, 0.1, 0.24);
  b.rotation.set(-0.15, -0.38, 0.08);
  g.add(b);
  return g;
}

function build() {
  const y = buildYukkuri({
    skin: PAL.skin,
    eye: '#b8861e',
    hair: PAL.hair,
    hairDark: PAL.hairDark,
    hairLight: PAL.hairLight,
    size: [0.455, 0.42, 0.43],
    hairEnds: { front: 0.31, side: 0.7, back: 0.93, fringe: 0.12, strands: 8 },
    blush: 0.35,
  });
  const { body, surf, hair } = y;

  // the braid on the viewer's right: stacked lobes, a small bow and a tuft
  const braid = new THREE.Group();
  const top = surf(1.0, 0.12, 1.02);
  braid.position.copy(top);
  braid.rotation.order = 'YXZ';
  braid.rotation.set(-0.3, 1.0, 0.05);
  body.add(braid);
  let by = 0;
  for (let i = 0; i < 5; i++) {
    const r = 0.05 - i * 0.004;
    add(braid, new THREE.SphereGeometry(1, 16, 12), hair, [i % 2 ? 0.008 : -0.008, by - r, 0.02 + i * 0.006], [0, 0, i % 2 ? 0.45 : -0.45], [r * 0.95, r * 1.25, r * 0.75]);
    by -= r * 1.6;
  }
  const rib = bow(toon(PAL.white, { emissive: '#ffffff', emissiveIntensity: 0.1 }), 0.085, false);
  rib.position.set(0, by - 0.01, 0.055);
  braid.add(rib);
  add(braid, lockGeo(0.09, 0.06, 0.025, 0.02, 0.25), hair, [0, by - 0.02, 0.045]);
  // a plain sidelock on the other cheek and wavy strands around the back
  {
    const p = surf(-0.95, 0.18, 1.03);
    const lk = add(body, lockGeo(0.3, 0.11, 0.035, 0.05, 0.16), hair, [p.x, p.y, p.z]);
    lk.rotation.order = 'YXZ';
    lk.rotation.set(-0.38, -0.95, -0.05);
  }
  for (const az of [1.9, 2.4, 2.85, -2.85, -2.4, -1.9]) {
    const p = surf(az, 0.12, 1.04);
    const lk = add(body, lockGeo(0.22, 0.14, 0.03, 0.05, 0.22), hair, [p.x, p.y, p.z]);
    lk.rotation.order = 'YXZ';
    lk.rotation.set(-0.2, az, Math.sin(az * 3) * 0.12);
  }

  const hat = witchHat();
  const hp = surf(0, 1.0, 1.0);
  hat.position.set(0, hp.y + 0.01, -0.03);
  hat.rotation.set(0.14, 0, -0.06);
  body.add(hat);
  return y;
}

export function MarisaBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return <primitive object={root} />;
}
