// Material coordinates are measured from the centre of the 27 × 30 cm silk,
// with x to the master's right and z towards the far edge.
const FUK_HALF_WIDTH = 0.135;
const FUK_HALF_LENGTH = 0.15;
const FUK_A = [-FUK_HALF_WIDTH, -FUK_HALF_LENGTH];
const FUK_B = [FUK_HALF_WIDTH, FUK_HALF_LENGTH];
const FUK_RIGHT_PINCH = [FUK_B[0] - 0.03, FUK_B[1]];
const FUK_FREE_CORNER = [FUK_HALF_WIDTH, -FUK_HALF_LENGTH];
const FUK_DIAGONAL = Math.hypot(...FUK_B);
const FUK_UX = FUK_B[0] / FUK_DIAGONAL;
const FUK_UZ = FUK_B[1] / FUK_DIAGONAL;
const FUK_CORNER_U = FUK_FREE_CORNER[0] * FUK_UX + FUK_FREE_CORNER[1] * FUK_UZ;
const FUK_CORNER_V = FUK_FREE_CORNER[0] * FUK_UZ - FUK_FREE_CORNER[1] * FUK_UX;
const FUK_HALF_AXIS_U = FUK_CORNER_U / FUK_DIAGONAL;
const FUK_HALF_AXIS_V = FUK_CORNER_V / FUK_DIAGONAL;
const FUK_TUCK_HINGE = FUK_CORNER_V * 2 / 3;
const FUK_TAIL_HINGE = -FUK_DIAGONAL * 0.46;
const FUK_HOLD_ANGLE = Math.PI / 12;
const fukusaGeometry = new THREE.BufferGeometry();
// Four folds split the rectangle into at most 16 convex panels. Each panel
// can gain one vertex per split, so 384 vertices cover the fan triangles.
const fukusaPositions = new THREE.BufferAttribute(new Float32Array(384 * 3), 3).setUsage(THREE.DynamicDrawUsage);
const fukusaBuffersNormals = new THREE.BufferAttribute(new Float32Array(384 * 3), 3).setUsage(THREE.DynamicDrawUsage);
fukusaGeometry.setAttribute('position', fukusaPositions);
fukusaGeometry.setAttribute('normal', fukusaBuffersNormals);
O.fukusa.geometry.dispose();
O.fukusa.geometry = fukusaGeometry;
O.fukusa.material.side = THREE.DoubleSide;
const fukusaVertex = new THREE.Vector3();
const fukusaEuler = new THREE.Euler(0, 0, 0, 'YZX');
const fukusaRotation = new THREE.Quaternion();
const fukusaCentre = new THREE.Vector3();
const fukusaKnee = new THREE.Vector3();
const fukusaHandEnd = new THREE.Vector3();
const fukusaFolds = [1, 1, 1, 1];
const fukusaCos = new Float64Array(4), fukusaSin = new Float64Array(4);
const previousFolds = [NaN, NaN, NaN, NaN];
let fukusaHandling = false, fukusaPadTurn = 0, previousPadTurn = NaN;
let fukusaTurnCos = 1, fukusaTurnSin = 0;

function fukusaPhase(time, start, end) {
  return ease((time - start) / (end - start));
}

function silkCoordinates(x, z, out) {
  // The local x axis follows A–B, and z is signed distance from that edge.
  return out.set(FUK_UX * x + FUK_UZ * z, 0, FUK_UZ * x - FUK_UX * z);
}

const fukusaHinges = [
  { nx: 0, nz: -1, offset: 0, side: 1, layerSlope: 0.018 }, // A–B diagonal
  { nx: 0, nz: 1, offset: -FUK_TUCK_HINGE, side: 1, layerSlope: 0.035 }, // outer sail
  { nx: FUK_HALF_AXIS_V, nz: -FUK_HALF_AXIS_U, offset: 0, side: 1, layerSlope: 0.024 }, // free corner to centre
  { nx: -1, nz: 0, offset: FUK_TAIL_HINGE, side: -1, layerSlope: 0.045 }, // tail under the pad
];
function seamDistance(point, hinge) {
  return point.x * hinge.nx + point.z * hinge.nz + hinge.offset;
}
function rotateSilkPanel(point, distance, hinge, index) {
  const sine = fukusaSin[index] * hinge.side, cosine = fukusaCos[index];
  const across = distance * (cosine - 1) - point.y * sine;
  point.x += across * hinge.nx;
  point.z += across * hinge.nz;
  // A small taper gives stacked panels distinct heights without opening
  // each seam. It prevents coplanar layers from flickering.
  point.y = distance * (sine + fukusaFolds[index] * hinge.layerSlope * hinge.side) + point.y * cosine;
  return point;
}
function silkMeshCoordinates(point) {
  const { x, y, z } = point;
  return point.set(x * fukusaTurnCos - z * fukusaTurnSin, y, -x * fukusaTurnSin - z * fukusaTurnCos);
}
function foldSilkPoint(x, z, out) {
  silkCoordinates(x, z, out);
  fukusaHinges.forEach((hinge, i) => {
    const distance = seamDistance(out, hinge);
    if (distance > 0) rotateSilkPanel(out, distance, hinge, i);
  });
  return silkMeshCoordinates(out);
}
function foldPanels(polygons, hinge, index) {
  if (!fukusaFolds[index]) return polygons;
  const panels = [];
  for (const polygon of polygons) {
    const fixed = [], moving = [];
    let last = polygon[polygon.length - 1], lastDistance = seamDistance(last, hinge);
    for (const point of polygon) {
      const distance = seamDistance(point, hinge);
      const crosses = (lastDistance > 1e-8 && distance < -1e-8) || (lastDistance < -1e-8 && distance > 1e-8);
      if (crosses) {
        const seam = last.clone().lerp(point, lastDistance / (lastDistance - distance));
        fixed.push(seam);
        moving.push(rotateSilkPanel(seam.clone(), 0, hinge, index));
      }
      if (distance <= 1e-8) fixed.push(point);
      if (distance >= -1e-8) moving.push(rotateSilkPanel(point.clone(), Math.max(0, distance), hinge, index));
      last = point;
      lastDistance = distance;
    }
    if (fixed.length >= 3) panels.push(fixed);
    if (moving.length >= 3) panels.push(moving);
  }
  return panels;
}
function drawSilkPanels() {
  const corners = [FUK_A, [-FUK_HALF_WIDTH, FUK_HALF_LENGTH], FUK_B, FUK_FREE_CORNER];
  const flat = corners.map(([x,z]) => silkCoordinates(x, z, new THREE.Vector3()));
  const panels = fukusaHinges.reduce(foldPanels, [flat]);
  let count = 0;
  for (const panel of panels) {
    // Keep the panel corners shared until all folds have been applied, then
    // emit their triangles with separate normals at every crease.
    const points = panel.map(point => silkMeshCoordinates(point.clone()));
    for (let index = 1; index + 1 < points.length; index++) {
      for (const point of [points[0], points[index], points[index + 1]]) {
        fukusaPositions.setXYZ(count++, point.x, point.y, point.z);
      }
    }
  }
  fukusaPositions.count = fukusaBuffersNormals.count = count;
  fukusaPositions.needsUpdate = true;
  fukusaGeometry.setDrawRange(0, count);
  fukusaGeometry.computeVertexNormals();
  fukusaGeometry.computeBoundingSphere();
}

function updateFukusa(s, time) {
  fukusaHandling = s === STEPS[2] && time >= 9.5 && time < 29;
  const cloth = O.fukusa;
  fukusaFolds.fill(1);
  fukusaPadTurn = Math.PI;
  if (fukusaHandling) {
    const draw = fukusaPhase(time, 9.5, 11.25);
    const lift = fukusaPhase(time, 12.65, 15.2);
    const level = fukusaPhase(time, 19.55, 21.35);
    const present = fukusaPhase(time, 27.65, 29);
    const open = fukusaPhase(time, 10.45, 12.3) * (1 - lift);
    // The video opens on an existing triangle. Its loose layers spread a
    // little as the corners are taken, then the lift sharpens the crease.
    fukusaFolds[0] = 1 - 0.13 * open;
    fukusaFolds[1] = 1 - draw + fukusaPhase(time, 17.9, 19.55);
    fukusaFolds[2] = 1 - draw + fukusaPhase(time, 21.35, 23.55);
    fukusaFolds[3] = 1 - draw + fukusaPhase(time, 24.7, 26.55);
    fukusaPadTurn = Math.PI * (1 - draw + present);
    const hanging = lift * (1 - level);
    const across = Math.atan2(FUK_B[1], FUK_B[0]);
    fukusaCentre.set(0, 0.46 + 0.035 * lift - 0.025 * level, 0.26 + 0.05 * lift - 0.035 * level);
    fukusaRotation.setFromEuler(fukusaEuler.set(-0.16 - 0.69 * hanging + 0.16 * level, -across * (1 - lift), 0.05 + 0.65 * hanging - 0.05 * level, 'YZX'));
    if (time < 11.25) {
      cloth.position.lerp(fukusaCentre, draw);
      cloth.quaternion.slerp(fukusaRotation, draw);
    } else {
      // Use the normal track pose as the final destination so the wipe
      // continues without a discontinuity at the end of the fold.
      cloth.position.lerp(fukusaCentre, 1 - present);
      cloth.quaternion.slerp(fukusaRotation, 1 - present);
    }
  }
  cloth.scale.set(1, 1, 1);
  if (previousPadTurn === fukusaPadTurn && previousFolds.every((fold, i) => fold === fukusaFolds[i])) return;
  previousPadTurn = fukusaPadTurn;
  fukusaTurnCos = Math.cos(fukusaPadTurn);
  fukusaTurnSin = Math.sin(fukusaPadTurn);
  for (let i = 0; i < fukusaFolds.length; i++) {
    previousFolds[i] = fukusaFolds[i];
    const angle = i === 1 ? Math.PI - FUK_HOLD_ANGLE : Math.PI;
    fukusaCos[i] = Math.cos(fukusaFolds[i] * angle);
    fukusaSin[i] = Math.sin(fukusaFolds[i] * angle);
  }
  drawSilkPanels();
}

function fukusaHandPoint(hand, time, out) {
  const cloth = O.fukusa;
  if (hand === 'L') {
    const release = fukusaPhase(time, 16.35, 16.95) * (1 - fukusaPhase(time, 17.2, 18));
    const regrip = fukusaPhase(time, 16.8, 18);
    const centre = fukusaPhase(time, 19.35, 21.35);
    // The clamp sits inside A so a small length of tail remains visible.
    const nearClamp = 0.93;
    const x = (FUK_A[0] * nearClamp * (1 - regrip) + FUK_HALF_WIDTH * regrip) * (1 - centre);
    const z = FUK_A[1] * nearClamp * (1 - regrip) * (1 - centre);
    foldSilkPoint(x, z, out).applyQuaternion(cloth.quaternion).add(cloth.position);
    out.x -= 0.06 * release + 0.015 * centre;
    // The palm stays below the silk so its raised thumb supports the centre
    // while the right hand lowers the far corner from above.
    out.y += 0.04 * release - 0.028 * centre;
    out.z -= 0.048 * release;
    return out.lerp(fukusaKnee.set(...KNL), fukusaPhase(time, 27, 28.6));
  }
  foldSilkPoint(...FUK_RIGHT_PINCH, out).applyQuaternion(cloth.quaternion).add(cloth.position);
  const sweep = fukusaPhase(time, 23.55, 24.75);
  const curl = fukusaPhase(time, 24.7, 26.55);
  const strokeX = -0.043 + 0.065 * sweep + 0.025 * Math.sin(curl * Math.PI * 1.5);
  const strokeY = 0.035 - 0.019 * sweep - 0.036 * curl;
  const strokeZ = -0.005 - 0.025 * curl;
  out.lerp(fukusaHandEnd.set(strokeX, strokeY, strokeZ).add(cloth.position), fukusaPhase(time, 23.55, 23.9));
  // As the silk lowers, the right palm rolls down above the wiping pad.
  return out.lerp(fukusaHandEnd.set(0.028, 0.012, 0.05).applyQuaternion(cloth.quaternion).add(cloth.position), fukusaPhase(time, 27.65, 29));
}

function poseFukusaHand(arm, time, input, fromBelow) {
  const left = arm.key === 'L';
  const lift = fukusaPhase(time, 12.65, 15.2);
  const palmUp = left ? fukusaPhase(time, 19.55, 21.35) : fukusaPhase(time, 24.7, 26.55);
  const withdraw = left ? fukusaPhase(time, 27, 28.6) : fukusaPhase(time, 27.65, 29);
  const rightPitch = FUK_HOLD_ANGLE * lift * (1 - palmUp);
  const roll = left ? Math.PI * (-0.15 + 0.65 * lift + 0.5 * palmUp) * (1 - withdraw) : Math.PI * palmUp * (1 - withdraw);
  const handWeight = left ? fukusaPhase(time, 9.5, 10.15) : fukusaPhase(time, 11.1, 12.65);
  if (!handWeight) return;
  const leftRegrip = fukusaPhase(time, 17.3, 18.1);
  const sweep = fukusaPhase(time, 23.55, 24.25) * (1 - fukusaPhase(time, 25.35, 26.55));
  const halfReach = fukusaPhase(time, 21.35, 23.35) * (1 - fukusaPhase(time, 23.55, 24.2));
  const release = left ? fukusaPhase(time, 16.35, 16.95) * (1 - fukusaPhase(time, 17.3, 18)) : 0;
  arm.goal.copy(arm.pos).lerp(fukusaHandPoint(arm.key, time, fukusaVertex), handWeight);
  if (left && time < 11.25) {
    const reach = Math.sin(Math.PI * fukusaPhase(time, 9.5, 11.25));
    arm.goal.y += (fromBelow ? -0.035 : 0.035) * reach;
  }
  input.mode = 'pinch';
  input.gd = left ? 0.099 : 0.105 + 0.042 * sweep + 0.016 * halfReach;
  input.thumb = 0.8 * (1 - release);
  input.fingers = left
    ? [0.40 + 0.28 * leftRegrip, 0.54 + 0.15 * leftRegrip, 0.22 + 0.52 * leftRegrip, 0.22 + 0.54 * leftRegrip].map(curl => curl * (1 - release) * (1 - withdraw))
    : [0.50 * (1 - sweep), 0.70, 0.74, 0.78];
  input.handNormal = fukusaNormals[arm.key].set(Math.sin(roll), Math.cos(roll), rightPitch);
  const rightReach = left ? 0 : halfReach;
  input.handForward = fukusaForwards[arm.key].set(-arm.side * (0.7 + 0.38 * rightReach), -0.06 + rightPitch - 0.48 * rightReach, 0.72).normalize();
  input.level = (left ? 0.35 : 1) * handWeight * (1 - fukusaPhase(time, 20.8, 23.55));
}
const fukusaNormals = { L: new THREE.Vector3(), R: new THREE.Vector3() };
const fukusaForwards = { L: new THREE.Vector3(), R: new THREE.Vector3() };
