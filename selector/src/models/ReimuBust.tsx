// Yukkuri Reimu: the head-only manju of the shrine maiden. Black hair with a straight fringe, a big red bow with white
// frilled edges on top, and a sidelock on each cheek held by a red-and-white hair tube. Talking = a gentle squash-bounce.
import * as THREE from 'three';
import { add, canvasTex, lockGeo, toon, useBust } from './kit';
import { buildYukkuri, scallop } from './yukkuri';

const PAL = {
  skin: '#fbe6d4',
  hair: '#2a2630',
  hairDark: '#0d0b10',
  hairLight: '#5b5668',
  red: '#d4202e',
  redDark: '#9c1220',
  white: '#fbf8f4',
};

/** One wing of the bow, from the knot (origin) out to +x. */
function wingOutline(): THREE.Vector2[] {
  const s = new THREE.Shape();
  s.moveTo(0, 0.035);
  s.bezierCurveTo(0.08, 0.1, 0.2, 0.2, 0.29, 0.16);
  s.bezierCurveTo(0.35, 0.12, 0.35, -0.06, 0.3, -0.1);
  s.bezierCurveTo(0.22, -0.15, 0.09, -0.07, 0, -0.035);
  s.closePath();
  return s.getSpacedPoints(90);
}

function bigBow(): THREE.Group {
  const g = new THREE.Group();
  const red = toon(PAL.red, { side: THREE.DoubleSide, emissive: PAL.red, emissiveIntensity: 0.12 });
  const white = toon(PAL.white, { side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.1 });
  const outline = wingOutline();
  const redGeo = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
  const frillGeo = new THREE.ExtrudeGeometry(scallop(outline, 0.022, 13, 0.012), { depth: 0.012, bevelEnabled: false, curveSegments: 4 });
  // a soft fold so the wing is not a flat plate
  for (const geo of [redGeo, frillGeo]) {
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setZ(i, p.getZ(i) - 0.5 * x * x + 0.05 * Math.abs(p.getY(i)));
    }
    geo.computeVertexNormals();
  }
  for (const d of [-1, 1]) {
    const w = new THREE.Group();
    w.scale.x = d;
    w.rotation.z = d * 0.16;
    add(w, redGeo, red, [0, 0, 0]);
    add(w, frillGeo, white, [0, 0, -0.006]);
    // a fold line across the wing
    add(w, new THREE.TorusGeometry(0.1, 0.006, 6, 20, 1.1), toon(PAL.redDark), [0.12, 0.0, 0.04], [0, 0, -0.55]);
    g.add(w);
  }
  // the knot and two short tails behind it
  add(g, new THREE.SphereGeometry(1, 18, 14), red, [0, 0, 0.03], [0, 0, 0], [0.055, 0.06, 0.045]);
  for (const d of [-1, 1]) {
    const t = add(g, lockGeo(0.16, 0.07, 0.014, -0.02, 0.45), red, [d * 0.02, -0.02, -0.01], [0, 0, d * 0.5]);
    add(t, lockGeo(0.165, 0.085, 0.006, -0.02, 0.5), white, [0, 0.008, -0.012]);
  }
  return g;
}

function tubeTex(): THREE.CanvasTexture {
  return canvasTex(64, 128, (g, W, H) => {
    g.fillStyle = PAL.white;
    g.fillRect(0, 0, W, H);
    g.fillStyle = PAL.red;
    g.fillRect(0, 0, W, H * 0.2);
    g.fillRect(0, H * 0.8, W, H * 0.2);
    g.fillRect(0, H * 0.42, W, H * 0.16);
  });
}

function build() {
  const y = buildYukkuri({
    skin: PAL.skin,
    eye: '#8e2b2b',
    hair: PAL.hair,
    hairDark: PAL.hairDark,
    hairLight: PAL.hairLight,
    size: [0.47, 0.455, 0.44],
    hairEnds: { front: 0.3, side: 0.6, back: 0.93, fringe: 0.11, strands: 9 },
    blush: 0.35,
  });
  const { body, surf, hair } = y;

  // sidelocks on the cheeks, each through a red-white tube
  const tex = tubeTex();
  const tubeMat = toon(0xffffff, { map: tex });
  for (const d of [-1, 1]) {
    const top = surf(d * 0.7, 0.15, 1.1);
    const lk = add(body, lockGeo(0.38, 0.1, 0.04, 0.06, 0.18), hair, [top.x, top.y, top.z]);
    lk.rotation.order = 'YXZ';
    lk.rotation.set(-0.2, d * 0.7, d * 0.04);
    const tube = add(lk, new THREE.CylinderGeometry(0.05, 0.054, 0.11, 18), tubeMat, [0, -0.22, 0.03]);
    tube.rotation.x = -0.1;
    // the lock's tip flares out under the tube
    add(lk, lockGeo(0.11, 0.075, 0.03, 0.03, 0.2), hair, [0, -0.25, 0.022]);
  }
  // a few strands at the back so the silhouette is not a perfect dome
  for (const az of [2.3, 2.75, -2.75, -2.3]) {
    const p = surf(az, 0.15, 1.04);
    const lk = add(body, lockGeo(0.2, 0.13, 0.03, 0.04, 0.2), hair, [p.x, p.y, p.z]);
    lk.rotation.order = 'YXZ';
    lk.rotation.set(-0.15, az, 0);
  }

  const b = bigBow();
  const bp = surf(0, 1.02, 1.0);
  b.position.set(0, bp.y + 0.05, bp.z - 0.13);
  b.rotation.x = -0.32;
  body.add(b);
  y.root.userData.textures.push(tex);
  return y;
}

export function ReimuBust(props: { talking: boolean }) {
  const root = useBust(build, props.talking);
  return <primitive object={root} />;
}
