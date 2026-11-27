// ---------- host rig (skeleton of the tea master) ----------
// A real skeleton for a 158 cm adult. Bones never change length: when something is out of reach the body leans,
// as a person does, and if it is still out of reach the hand stops short (and whatever it holds stops with it).
// The rig works in WORLD space: the host kneels at the origin and faces +z, so her LEFT is +x and her RIGHT is -x.
// The utensils and the choreography live in `stage`, which is mirrored in x (see 00-setup), so that the track
// names handL / handR and the narration ("my left hand") are anatomically true.
const BODY = {
  height: 1.58,
  upperArm: 0.29, // shoulder joint -> elbow
  foreArm: 0.232, // elbow -> wrist
  hand: 0.17, // wrist -> tip of the middle finger (palm 0.095 + finger 0.075)
  palm: 0.095,
  thigh: 0.385,
  shin: 0.385,
  foot: 0.225,
  hipHalf: 0.085, // hip joints are 17 cm apart
  shoulder: [0.158, 0.425, 0.0], // shoulder joint in the torso frame (origin = midpoint of the hip joints)
  neckBase: [0, 0.475, -0.008],
  headPivot: [0, 0.578, -0.008], // where the skull sits on the spine
  headCentre: 0.078, // head centre above the pivot; the head is 20.5 cm tall
  hipSeiza: 0.21, // height of the hip joints when sitting on the heels
  // [across the palm (+ = thumb side), knuckle set-back, first bone, second bone, radius]: index, middle, ring, little
  fingers: [
    [0.0275, 0.003, 0.04, 0.033, 0.0078],
    [0.0092, 0, 0.043, 0.035, 0.008],
    [-0.0092, 0.003, 0.04, 0.033, 0.0076],
    [-0.0275, 0.011, 0.032, 0.027, 0.0068],
  ],
  thumb: [0.042, 0.032, 0.0072], // two bones and the tip radius
};
const RIG = (function () {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const U = BODY.upperArm,
    F = BODY.foreArm,
    REACH = U + F;
  // body volumes used for collision, in the torso frame: an elliptical column for the trunk
  const TRUNK = { a: 0.165, b: 0.125, y0: -0.06, y1: 0.44 };
  const ARM_R = 0.046; // radius of the arm inside its sleeve
  // legs: v = 0 seiza (sitting on the heels), 1 kiza (up on the knees), 2 standing.
  // While kneeling the knees stay on the floor and the thigh turns about them, so thigh and shin keep their length.
  const KNEE = [0.06, 0.382]; // knee joint (y, z) on the floor
  const THIGH_A = [0.393, Math.PI / 2]; // thigh angle above the floor: seiza, kiza
  const SHIN_A = [-0.02, 0.065]; // shin angle above the floor: seiza (flat), kiza (toes tucked)
  const STAND = { hip: [0.828, 0.2], ankle: [0.06, 0.2] };
  const S = {
    legs: 0,
    hip: V(0, BODY.hipSeiza, 0.026), // midpoint of the hip joints, world
    torsoQ: new THREE.Quaternion(), // trunk orientation including the automatic lean
    torsoQ0: new THREE.Quaternion(), // trunk orientation as authored (bow / turn from the choreography)
    lean: V(0, 0, 0), // automatic lean added to the authored torso rotation: x pitch, y yaw, z roll
    headQ: new THREE.Quaternion(), // head orientation relative to the torso
    arms: {},
    legsOut: {},
    diag: { clampL: 0, clampR: 0, pen: 0 },
  };
  for (const side of [1, -1]) {
    S.arms[side] = {
      side,
      shoulder: V(),
      elbow: V(),
      wrist: V(),
      target: V(),
      swivel: 0,
      grip: V(), // where the palm / fingertips are (what the choreography steers)
      fwd: V(0, 0, 1), // hand: wrist -> knuckles
      up: V(0, 1, 0), // hand: out of the back of the hand
      fwdT: V(0, 0, 1),
      upT: V(0, 1, 0),
      gd: 0.08, // distance wrist -> grip point
      curl: 0.2, // finger curl 0 (flat) .. 1 (fist)
      thumb: 0.3, // thumb opposition 0 (beside the palm) .. 1 (across it)
      curlT: 0.2,
      thumbT: 0.3,
      clear: 0.028,
      pen: 0,
      clamp: 0,
      cw: 0, // weight of a planned contact (cLocal: the contact in the hand's frame (X, up, fwd); cGoal: where it must go)
      cLocal: V(),
      cGoal: V(),
    };
    S.legsOut[side] = { hip: V(), knee: V(), ankle: V(), toe: V() };
  }
  const t1 = V(),
    t2 = V(),
    t3 = V(),
    t4 = V(),
    e1 = new THREE.Euler(),
    q1 = new THREE.Quaternion(),
    q2 = new THREE.Quaternion(),
    m1 = new THREE.Matrix4();
  const DOWN = V(0, -1, 0);
  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

  // ---- lap: the top surface of the kimono over the thighs, as a height above the floor (world x, z) ----
  // a teacher who sits with the knees apart (avatar style kneeGap) has a lap that widens toward the knees
  let lapWide = 0;
  function lapHeight(x, z) {
    if (S.legs > 0.5) return 0;
    const k = 1 - S.legs * 2; // fades out as she rises
    const zk = 0.385, // knees
      z0 = -0.02;
    const ax = Math.abs(x);
    let u = clamp((z - z0) / (zk - z0), 0, 1);
    const half = 0.18 + lapWide * clamp((u - 0.3) / 0.7, 0, 1);
    if (ax > half || z < z0 - 0.1 || z > zk + 0.075) return 0;
    let top = lerp(0.3, 0.135, u); // hips -> knees
    if (z > zk) top = 0.135 * Math.sqrt(Math.max(0, 1 - Math.pow((z - zk) / 0.075, 2))); // rounded knees
    if (z < z0) top *= Math.sqrt(Math.max(0, 1 - Math.pow((z0 - z) / 0.1, 2)));
    const r = Math.min(0.09, top);
    if (ax > half - r) top = top - r + Math.sqrt(Math.max(0, r * r - Math.pow(ax - (half - r), 2)));
    return top * k;
  }
  // ---- trunk: signed distance-like penetration of a world point (with radius) into the trunk column ----
  const invQ = new THREE.Quaternion();
  function trunkPush(p, radius, out) {
    // returns penetration depth (>0 when inside) and, in `out`, the world-space direction to push the point out
    t1.copy(p).sub(S.hip).applyQuaternion(invQ);
    if (t1.y < TRUNK.y0 - radius || t1.y > TRUNK.y1 + radius) return 0;
    const a = TRUNK.a + radius,
      b = TRUNK.b + radius;
    const k = Math.sqrt((t1.x * t1.x) / (a * a) + (t1.z * t1.z) / (b * b));
    if (k >= 1) return 0;
    // approximate outward normal of the ellipse
    out.set(t1.x / (a * a), 0, t1.z / (b * b));
    if (out.lengthSq() < 1e-9) out.set(0, 0, 1);
    out.normalize();
    const depth = (1 - k) * Math.min(a, b);
    out.applyQuaternion(S.torsoQ);
    return depth;
  }
  // obstacles in world space that arms must not pass through (set by the scene: kettle, water jar)
  const obstacles = [];
  function obstaclePen(p, radius) {
    let pen = 0;
    for (const o of obstacles) {
      const d = Math.hypot(p.x - o.x, p.z - o.z);
      if (o.ball) {
        // flattened ball: centre height y0, vertical radius ry
        const k = Math.hypot(d / (o.r + radius), (p.y - o.y0) / (o.ry + radius));
        if (k < 1) pen = Math.max(pen, (1 - k) * (o.r + radius));
        continue;
      }
      if (p.y > o.y1 + radius || p.y < o.y0 - radius) continue;
      if (d < o.r + radius) pen = Math.max(pen, o.r + radius - d);
    }
    return pen;
  }

  // ---- shoulders for a given total torso rotation ----
  function shoulderAt(side, q, out) {
    return out.set(side * BODY.shoulder[0], BODY.shoulder[1], BODY.shoulder[2]).applyQuaternion(q).add(S.hip);
  }
  function torsoQuat(rx, ry, rz, out) {
    // pitch about the hip axis first (a bow), then turn and tilt inside that
    e1.set(rx, ry, rz, 'XYZ');
    return out.setFromEuler(e1);
  }

  // ---- legs: hip -> knee -> ankle with fixed thigh and shin ----
  function solveLegs(v) {
    v = clamp(v, 0, 2);
    S.legs = v;
    const T = BODY.thigh,
      Sh = BODY.shin;
    const kiza = (u, out) => {
      // hip and ankle (y, z) for a kneeling pose, u = 0 seiza .. 1 kiza
      const a = lerp(THIGH_A[0], THIGH_A[1], u),
        b = lerp(SHIN_A[0], SHIN_A[1], u);
      out.hy = KNEE[0] + T * Math.sin(a);
      out.hz = KNEE[1] - T * Math.cos(a);
      out.ay = KNEE[0] + Sh * Math.sin(b);
      out.az = KNEE[1] - Sh * Math.cos(b);
      return out;
    };
    const P = kiza(sm(Math.min(v, 1)), {});
    let kneeFixed = true;
    if (v > 1) {
      const u = sm(v - 1);
      P.hy = lerp(P.hy, STAND.hip[0], u);
      P.hz = lerp(P.hz, STAND.hip[1], u);
      P.ay = lerp(P.ay, STAND.ankle[0], u);
      P.az = lerp(P.az, STAND.ankle[1], u);
      kneeFixed = false;
    }
    S.hip.set(0, P.hy, P.hz);
    for (const side of [1, -1]) {
      const L = S.legsOut[side];
      L.hip.set(side * BODY.hipHalf, P.hy, P.hz);
      L.ankle.set(side * 0.075, P.ay, P.az);
      if (kneeFixed) L.knee.set(side * 0.085, KNEE[0], KNEE[1]);
      else {
        // two-bone IK, knee forward
        t1.subVectors(L.ankle, L.hip);
        t1.x = 0;
        let d = t1.length();
        const max = T + Sh - 0.001;
        if (d > max) {
          t1.multiplyScalar(max / d);
          L.ankle.set(side * 0.075, L.hip.y + t1.y, L.hip.z + t1.z);
          d = max;
        }
        t1.normalize();
        const a = d / 2,
          h = Math.sqrt(Math.max(0, T * T - a * a));
        t2.set(0, 0, 1).addScaledVector(t1, -t1.z);
        if (t2.lengthSq() < 1e-6) t2.set(0, 1, 0);
        t2.normalize();
        L.knee.set(side * 0.085, L.hip.y + t1.y * a + t2.y * h, L.hip.z + t1.z * a + t2.z * h);
      }
      // foot: sole up behind her when sitting, toes tucked in kiza, flat when standing
      const st = clamp(v - 1, 0, 1),
        kz = clamp(v, 0, 1);
      const dy = lerp(lerp(-0.1, -0.75, kz), -0.25, st),
        dz = lerp(lerp(-0.995, -0.66, kz), 0.968, st);
      const n = Math.hypot(dy, dz);
      L.toe.set(side * 0.075, Math.max(0.012, L.ankle.y + (dy / n) * BODY.foot * 0.8), L.ankle.z + (dz / n) * BODY.foot * 0.8);
    }
  }

  // ---- arms ----
  function armPenalty(arm, E) {
    // the deepest cut of the upper arm or forearm (not the hand) into the trunk, the lap, the floor or an obstacle, in metres
    let pen = 0;
    for (let i = 1; i <= 5; i++) {
      const u = i / 5;
      t3.lerpVectors(arm.shoulder, E, 0.35 + 0.65 * u); // the top of the upper arm lives inside the shoulder
      pen = Math.max(pen, trunkPush(t3, ARM_R * 0.8, t4), lapHeight(t3.x, t3.z) + ARM_R * 0.6 - t3.y, obstaclePen(t3, ARM_R));
      if (i < 5) {
        t3.lerpVectors(E, arm.wrist, u * 0.8);
        pen = Math.max(pen, trunkPush(t3, ARM_R * 0.8, t4), lapHeight(t3.x, t3.z) + ARM_R * 0.5 - t3.y, obstaclePen(t3, ARM_R * 0.9));
      }
    }
    return Math.max(pen, 0.05 - E.y); // the elbow stays off the floor
  }
  const Etry = V(),
    Ebest = V();
  function solveArm(arm, dt) {
    const side = arm.side;
    // shoulder girdle: the joint slides a little toward what is being reached for
    shoulderAt(side, S.torsoQ, arm.shoulder);
    t1.subVectors(arm.target, arm.shoulder);
    const d0 = t1.length();
    const girdle = clamp((d0 - 0.4) * 0.45, 0, 0.035);
    arm.shoulder.addScaledVector(t1.normalize(), girdle);
    // wrist: clamp to reach
    t1.subVectors(arm.target, arm.shoulder);
    let d = t1.length();
    const max = REACH - 0.004,
      min = 0.12;
    arm.wrist.copy(arm.target);
    if (d > max) {
      arm.wrist.copy(arm.shoulder).addScaledVector(t1, max / d);
      d = max;
    } else if (d < min) {
      arm.wrist.copy(arm.shoulder).addScaledVector(d > 1e-5 ? t1.normalize() : t1.set(0, -1, 0), min);
      d = min;
    }
    arm.clamp = arm.wrist.distanceTo(arm.target);
    // elbow circle
    const dir = t1.subVectors(arm.wrist, arm.shoulder).normalize();
    const a = (U * U - F * F + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, U * U - a * a));
    const C = t2.copy(arm.shoulder).addScaledVector(dir, a);
    // reference pole: down, a little back and outward; swivel 0 puts the elbow there
    const pole = t3.set(side * 0.38, -0.8, -0.45);
    const u = pole.addScaledVector(dir, -pole.dot(dir));
    if (u.lengthSq() < 1e-6) u.set(side, 0, 0);
    u.normalize();
    const vdir = t4.crossVectors(dir, u).multiplyScalar(side); // +swivel lifts the elbow outward
    const ux = u.x,
      uy = u.y,
      uz = u.z,
      vx = vdir.x,
      vy = vdir.y,
      vz = vdir.z,
      cx = C.x,
      cy = C.y,
      cz = C.z;
    let best = 1e9,
      bestS = 0;
    const wide = arm.level || arm.dirCost;
    for (let k = 0; k < (wide ? 65 : 31); k++) {
      // candidates: 0, then alternating outward / inward steps
      const sw = k === 0 ? 0 : (k % 2 ? 1 : -0.5) * Math.ceil(k / 2) * 0.1;
      if (sw < -0.6 || sw > (wide ? 3.2 : 1.5)) continue;
      const cs = Math.cos(sw),
        sn = Math.sin(sw);
      Etry.set(cx + h * (cs * ux + sn * vx), cy + h * (cs * uy + sn * vy), cz + h * (cs * uz + sn * vz));
      const pen = armPenalty(arm, Etry);
      const levelCost = arm.level ? Math.pow(Etry.y-arm.wrist.y,2)*350*arm.level : 0;
      // a hand that must point a given way (it is handling cloth) needs an elbow from which the wrist can bend there
      let bendCost = 0;
      if (arm.dirCost) {
        t4.subVectors(arm.wrist, Etry).normalize();
        const over = 0.5 - t4.dot(arm.fwdT);
        if (over > 0) bendCost = over * over * 3 * arm.dirCost;
      }
      const cost = pen * 60 + sw * sw * 0.35 + levelCost + bendCost + Math.abs(sw - arm.swivel) * (dt > 0 ? 0.25 : 0);
      if (cost < best) {
        best = cost;
        bestS = sw;
        Ebest.copy(Etry);
        arm.pen = pen;
      }
      if (k === 0 && pen < 1e-4 && !arm.level && bendCost === 0) break; // the natural pose is free: take it
    }
    arm.swivel = dt > 0 ? lerp(arm.swivel, bestS, 1 - Math.exp(-dt * 10)) : bestS;
    const cs = Math.cos(arm.swivel),
      sn = Math.sin(arm.swivel);
    arm.elbow.set(cx + h * (cs * ux + sn * vx), cy + h * (cs * uy + sn * vy), cz + h * (cs * uz + sn * vz));
  }
  // keep a wrist target out of the body: lap, floor, trunk
  function freeTarget(p, clear) {
    const lap = lapHeight(p.x, p.z);
    const floor = Math.max(lap + clear, 0.018);
    if (p.y < floor) p.y = floor;
    const pen = trunkPush(p, 0.04, t4);
    if (pen > 0) p.addScaledVector(t4, pen + 0.004);
    return p;
  }

  // ---- hands ----
  // The caller gives each hand a GRIP POINT: where the palm (or the fingertips, for a pinch) should be.
  // The wrist is placed behind it along the direction the hand points, so hands arrive at things the way a hand does.
  // mode: 'down' palm down · 'in' palm toward the midline (around a handle) · 'up' palm up (under a bowl)
  //       'pinch' fingers down onto something · near the anchors below the hand blends to 'rest' / 'floor' / 'side'
  const ANCHOR = {
    rest: { fwd: [-0.42, -0.2, 0.9], up: [0, 1, 0.25], gd: 0.08, curl: 0.16, thumb: 0.2 }, // palm on the lap
    knee: { fwd: [-0.3, -0.34, 0.9], up: [0, 1, 0.3], gd: 0.08, curl: 0.2, thumb: 0.2 }, // palm on the knee
    floor: { fwd: [-0.55, -0.5, 0.67], up: [0, 1, 0.5], gd: 0.16, curl: 0.03, thumb: 0.05 }, // fingertips on the tatami in front of the knees, index fingers meeting
    flat: { fwd: [-0.62, -0.05, 0.78], up: [0, 1, 0.04], gd: 0.08, curl: 0.0, thumb: 0.05 }, // palms flat on the tatami, index fingers meeting (formal bow)
    tips: { fwd: [-0.06, -0.82, 0.57], up: [0, 0.6, 0.8], gd: 0.16, curl: 0.06, thumb: 0.1 }, // fingertips only, each hand by its own knee (light bow)
  };
  const anchors = { 1: {}, '-1': {} }; // filled by setAnchors(): host-space points per side
  function setAnchors(side, name, p) {
    anchors[side][name] = V(p[0], p[1], p[2]);
  }
  const fT = V(),
    nT = V(),
    a3 = V(),
    aw = {};
  const fbX = V(),
    fbQ0 = new THREE.Quaternion(),
    fbQ1 = new THREE.Quaternion(),
    fbM = new THREE.Matrix4();
  function frameQ(f, n, q) {
    // orthonormal hand frame (X = n × f, n, f) as a quaternion; f and n are normalised in place
    f.normalize();
    n.addScaledVector(f, -n.dot(f));
    if (n.lengthSq() < 1e-8) n.set(0, 1, 0).addScaledVector(f, -f.y);
    if (n.lengthSq() < 1e-8) n.set(1, 0, 0).addScaledVector(f, -f.x);
    n.normalize();
    fbX.crossVectors(n, f);
    return q.setFromRotationMatrix(fbM.makeBasis(fbX, n, f));
  }
  const fbF = V(),
    fbN = V();
  function frameBlend(f, n, f1, n1, w) {
    // turn the hand frame (f, n) toward (f1, n1) by w along the shortest rotation
    frameQ(f, n, fbQ0);
    frameQ(fbF.copy(f1), fbN.copy(n1), fbQ1);
    if (w < 1) fbQ0.slerp(fbQ1, w);
    else fbQ0.copy(fbQ1);
    f.set(0, 0, 1).applyQuaternion(fbQ0);
    n.set(0, 1, 0).applyQuaternion(fbQ0);
  }
  // the hand pose a grip mode gives (f, n, and [gd, curl, thumb] in mf), for a grip point G whose horizontal direction from the
  // shoulder is a3
  const mfF = V(),
    mfN = V(),
    mf = [0, 0, 0];
  function modeFrame(side, G, mode, aim, f, n) {
    if (mode === 'up') {
      f.copy(a3).add(t2.set(-side * 0.25, -0.05, 0.1));
      n.set(0, -1, 0);
      mf[0] = 0.085;
      mf[1] = 0.3;
      mf[2] = 0.15;
    } else if (mode === 'in') {
      f.copy(a3).add(t2.set(-side * 0.1, -0.25, 0.1));
      n.set(side, 0.3, 0);
      mf[0] = 0.072;
      mf[1] = 0.8;
      mf[2] = 0.8;
    } else if (mode === 'pinch') {
      f.copy(a3).multiplyScalar(0.5).add(t2.set(-side * 0.08, -0.85, 0));
      n.copy(a3).add(t2.set(0, 0.35, 0));
      mf[0] = 0.125;
      mf[1] = 0.42;
      mf[2] = 0.75;
    } else {
      f.copy(a3).add(t2.set(-side * 0.15, -0.38, 0));
      n.set(0, 1, 0);
      mf[0] = 0.08;
      mf[1] = 0.18;
      mf[2] = 0.25;
    }
    if (aim) {
      t2.subVectors(aim, G);
      if (t2.lengthSq() > 1e-4) f.copy(t2);
    }
    f.normalize();
    n.normalize();
  }
  function handIntent(arm, I) {
    // desired hand direction (fT), back-of-hand normal (nT), grip distance, finger pose: from the mode, blended toward anchors
    const side = arm.side,
      G = I.grip,
      mode = I.mode || 'down';
    shoulderAt(side, S.torsoQ0, t1);
    a3.subVectors(G, t1);
    a3.y = 0;
    if (a3.lengthSq() < 1e-4) a3.set(0, 0, 1);
    a3.normalize();
    let gd = 0.08,
      curl = 0.2,
      thumb = 0.25;
    if (mode === 'up') {
      fT.copy(a3).add(t2.set(-side * 0.25, -0.05, 0.1));
      nT.set(0, -1, 0);
      gd = 0.085;
      curl = 0.3;
      thumb = 0.15;
    } else if (mode === 'in') {
      fT.copy(a3).add(t2.set(-side * 0.1, -0.25, 0.1));
      nT.set(side, 0.3, 0);
      gd = 0.072;
      curl = 0.8;
      thumb = 0.8;
    } else if (mode === 'pinch') {
      fT.copy(a3).multiplyScalar(0.5).add(t2.set(-side * 0.08, -0.85, 0));
      nT.copy(a3).add(t2.set(0, 0.35, 0));
      gd = 0.125;
      curl = 0.42;
      thumb = 0.75;
    } else {
      fT.copy(a3).add(t2.set(-side * 0.15, -0.38, 0));
      nT.set(0, 1, 0);
      gd = 0.08;
      curl = 0.18;
      thumb = 0.25;
    }
    if (I.aim) {
      t2.subVectors(I.aim, G);
      if (t2.lengthSq() > 1e-4) fT.copy(t2);
    }
    if (I.gd != null) gd = I.gd;
    if (I.curl != null) curl = I.curl;
    if (I.thumb != null) thumb = I.thumb;
    if (I.handNormal) nT.copy(I.handNormal);
    if (I.handForward) fT.copy(I.handForward);
    arm.level = I.level || 0;
    arm.fingers = I.fingers || null;
    arm.pinch = I.pinch == null ? null : I.pinch; // thumb closes onto the index pad, leaving this gap (m)
    arm.pinchW = 1;
    arm.pinchLat = false;
    arm.dirCost = !!I.handForward; // the hand's direction is prescribed: choose the elbow so the wrist can bend there
    arm.dirSnap = 0;
    arm.cw = 0;
    fT.normalize();
    nT.normalize();
    if (I.modeBW > 0) {
      // a hold easing in or out (or one hold handing over to the next): the hand turns gradually between the two poses
      modeFrame(side, G, I.modeB, I.aimB, mfF, mfN);
      const w = I.modeBW;
      frameBlend(fT, nT, mfF, mfN, w);
      gd = lerp(gd, I.gdB != null ? I.gdB : mf[0], w);
      curl = lerp(curl, I.curlB != null ? I.curlB : mf[1], w);
      thumb = lerp(thumb, I.thumbB != null ? I.thumbB : mf[2], w);
    }
    const K = I.fk;
    if (K && K.w > 0) {
      // a planned hand (the fukusa): blend from the pose the mode above gives to the planned one, so that taking over and
      // handing back are continuous; while it is fully planned the hand follows the plan without lag (seek = play)
      const w = K.w;
      frameBlend(fT, nT, K.F, K.N, w);
      gd = lerp(gd, K.gd, w);
      thumb = lerp(thumb, K.thumb, w);
      const fo = arm.fingersBuf || (arm.fingersBuf = [0, 0, 0, 0]);
      let cs = 0;
      for (let i = 0; i < 4; i++) {
        fo[i] = lerp(arm.fingers ? arm.fingers[i] : curl, K.fingers[i], w);
        cs += fo[i];
      }
      arm.fingers = fo;
      curl = cs / 4;
      arm.pinch = K.pinch == null ? null : K.pinch;
      arm.pinchW = K.pinch == null ? 0 : w * (K.pinchW == null ? 1 : K.pinchW);
      arm.pinchLat = !!K.lat;
      arm.level = K.level || 0;
      arm.dirCost = w;
      arm.dirSnap = w;
      if (K.cLocal) {
        // the contact (a fingertip, the pinch, the clamp) must land on its goal even where the wrist cannot turn the hand
        // as far as planned: solve() moves the wrist after the hand has been turned (see contactFix)
        arm.cw = sm((w - 0.5) / 0.5); // only once the plan leads the hand (while it is still coming, its goal is a blend)
        arm.cLocal.copy(K.cLocal);
        arm.cGoal.copy(K.cGoal);
      }
    }
    // near an anchor the hand takes that anchor's pose; weights fade out within about 6 cm
    let total = 0;
    for (const name in ANCHOR) {
      const P = anchors[side][name];
      aw[name] = P ? 1 - sm((G.distanceTo(P) - 0.01) / 0.055) : 0;
      total += aw[name];
    }
    if (total > 1e-4) {
      const scale = total > 1 ? 1 / total : 1,
        keep = Math.max(0, 1 - total);
      fT.multiplyScalar(keep);
      nT.multiplyScalar(keep);
      gd *= keep;
      curl *= keep;
      thumb *= keep;
      for (const name in ANCHOR) {
        const k = aw[name] * scale;
        if (k <= 0) continue;
        const A = ANCHOR[name];
        fT.addScaledVector(t2.set(A.fwd[0] * side, A.fwd[1], A.fwd[2]).normalize(), k);
        nT.addScaledVector(t2.set(A.up[0] * side, A.up[1], A.up[2]).normalize(), k);
        gd += A.gd * k;
        curl += A.curl * k;
        thumb += A.thumb * k;
      }
    }
    fT.normalize();
    arm.gd = gd;
    arm.curlT = curl;
    arm.thumbT = thumb;
    arm.fwdT.copy(fT);
    arm.upT.copy(nT);
    arm.clear = I.clear == null ? 0.028 : I.clear;
    arm.body = !!I.body; // held against the body: the grip point is carried along when the trunk leans
    arm.target.copy(G).addScaledVector(fT, -gd);
  }
  function solveHand(arm, dt) {
    const fore = t1.subVectors(arm.wrist, arm.elbow).normalize();
    fT.copy(arm.fwdT);
    nT.copy(arm.upT);
    // the wrist bends at most about 65 degrees from the forearm
    const cosMax = 0.42;
    const c = fT.dot(fore);
    if (c < cosMax) {
      t2.copy(fT).addScaledVector(fore, -c);
      if (t2.lengthSq() < 1e-6) t2.set(0, 1, 0);
      t2.normalize();
      fT.copy(fore).multiplyScalar(cosMax).addScaledVector(t2, Math.sqrt(1 - cosMax * cosMax));
    }
    nT.addScaledVector(fT, -nT.dot(fT));
    if (nT.lengthSq() < 1e-6) nT.set(0, 1, 0).addScaledVector(fT, -fT.y);
    nT.normalize();
    let k = dt > 0 ? 1 - Math.exp(-dt * 14) : 1;
    if (arm.dirSnap > 0) k = lerp(k, 1, arm.dirSnap);
    arm.fwd.lerp(fT, k).normalize();
    arm.up.lerp(nT, k);
    arm.up.addScaledVector(arm.fwd, -arm.up.dot(arm.fwd)).normalize();
    arm.curl = lerp(arm.curl, arm.curlT, k);
    arm.thumb = lerp(arm.thumb, arm.thumbT, k);
    arm.grip.copy(arm.wrist).addScaledVector(arm.fwd, arm.gd); // where the palm / fingertips really are
  }

  // ---- finger kinematics (shared by the avatar, which draws them, and by the cloth, which is touched by them) ----
  // a = { side, wrist, fwd (wrist -> knuckles), up (out of the back of the hand), curl | fingers[4], thumb, pinch }
  const hq1 = V(),
    hq2 = V(),
    hq3 = V(),
    hq4 = V(),
    hq5 = V();
  function makeHandPoints() {
    const four = () => [V(), V(), V(), V()];
    return { X: V(), palm: V(), base: four(), mid: four(), tip: four(), rad: [0, 0, 0, 0], tipR: [0, 0, 0, 0], padIdx: V(), padN: V(), thumbBase: V(), thumbMid: V(), thumbTip: V(), thumbPad: V(), pinchMid: V(), clamp: V(), idxSide: V() };
  }
  function handPoints(a, out) {
    const f = a.fwd,
      n = a.up,
      W = a.wrist,
      lat = -a.side; // the thumb side along X
    const X = out.X.crossVectors(n, f).normalize();
    out.palm.copy(W).addScaledVector(f, 0.05).addScaledVector(n, -0.002);
    for (let i = 0; i < 4; i++) {
      const F = BODY.fingers[i],
        c = a.fingers ? a.fingers[i] : a.curl;
      const th1 = 0.1 + c * 1.2,
        th2 = th1 + 0.12 + c * 1.35;
      const A = out.base[i].copy(W).addScaledVector(f, BODY.palm - F[1]).addScaledVector(X, lat * F[0]);
      const B = out.mid[i].copy(A).addScaledVector(f, Math.cos(th1) * F[2]).addScaledVector(n, -Math.sin(th1) * F[2]);
      out.tip[i].copy(B).addScaledVector(f, Math.cos(th2) * F[3]).addScaledVector(n, -Math.sin(th2) * F[3]);
      out.rad[i] = F[4];
      out.tipR[i] = F[4] * 0.82;
      if (i === 0) {
        out.padN.copy(f).multiplyScalar(-Math.sin(th2)).addScaledVector(n, -Math.cos(th2)); // out of the index pad
        out.padIdx.copy(out.tip[0]).addScaledVector(out.padN, out.tipR[0]);
      }
    }
    const th = a.thumb,
      L1 = BODY.thumb[0],
      L2 = BODY.thumb[1],
      tr = BODY.thumb[2];
    const D = out.thumbBase.copy(W).addScaledVector(f, 0.03).addScaledVector(X, lat * 0.033).addScaledVector(n, -0.006);
    const lw = a.pinchLat && a.pinch != null ? (a.pinchW == null ? 1 : a.pinchW) : 0;
    if (lw > 0) D.addScaledVector(f, 0.018 * lw).addScaledVector(n, -0.006 * lw); // a key pinch brings the thumb's root forward under the index
    hq1.set(0, 0, 0).addScaledVector(f, 0.78 - 0.1 * th).addScaledVector(X, lat * (0.6 - 0.5 * th)).addScaledVector(n, -(0.12 + 0.62 * th)).normalize();
    out.thumbMid.copy(D).addScaledVector(hq1, L1);
    hq1.addScaledVector(f, 0.35).addScaledVector(X, -lat * 0.25).normalize();
    out.thumbTip.copy(out.thumbMid).addScaledVector(hq1, L2);
    // the index's radial side, a little behind its tip (a key pinch closes the thumb pad onto it)
    out.idxSide.copy(out.mid[0]).lerp(out.tip[0], 0.45).addScaledVector(X, lat * out.rad[0]);
    const pw = a.pinch == null ? 0 : a.pinchW == null ? 1 : a.pinchW;
    if (pw > 0) {
      // two-bone thumb closing onto the index pad (the natural knuckle gives the bending plane), or onto its side
      hq4.copy(out.thumbMid);
      hq5.copy(out.thumbTip);
      if (a.pinchLat) hq2.copy(out.idxSide).addScaledVector(X, lat * (a.pinch + tr)).sub(D);
      else hq2.copy(out.padIdx).addScaledVector(out.padN, a.pinch + tr).sub(D);
      let d = hq2.length();
      const dmax = L1 + L2 - 1e-4;
      if (d > dmax) d = dmax;
      if (d < 0.02) d = 0.02;
      hq2.normalize();
      const along = (L1 * L1 - L2 * L2 + d * d) / (2 * d),
        h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
      hq3.subVectors(out.thumbMid, D);
      hq3.addScaledVector(hq2, -hq3.dot(hq2));
      if (hq3.lengthSq() < 1e-10) hq3.copy(n).negate();
      hq3.normalize();
      out.thumbMid.copy(D).addScaledVector(hq2, along).addScaledVector(hq3, h);
      out.thumbTip.copy(D).addScaledVector(hq2, d);
      if (pw < 1) {
        out.thumbMid.lerp(hq4, 1 - pw);
        out.thumbTip.lerp(hq5, 1 - pw);
      }
    }
    const idxC = a.pinchLat && pw > 0 ? out.idxSide : out.padIdx;
    hq1.subVectors(idxC, out.thumbTip);
    if (hq1.lengthSq() < 1e-10) hq1.copy(out.padN).negate();
    out.thumbPad.copy(out.thumbTip).addScaledVector(hq1.normalize(), tr);
    out.pinchMid.copy(idxC).add(out.thumbPad).multiplyScalar(0.5);
    out.clamp.copy(out.tip[0]).add(out.tip[1]).multiplyScalar(0.5);
    return out;
  }

  // ---- whole body ----
  // input: { legs, torso:[rx,ry,rz], L:{grip:Vector3, mode, aim, gd, curl, thumb, clear}, R:{...}, focus:Vector3|null, dt, snap }
  //        (host space: origin at her seat, +z in front of her, +x to her left)
  const cand = new THREE.Quaternion();
  function reachCost(px, py, pz, base) {
    torsoQuat(base[0] + px, base[1] + py, base[2] + pz, cand);
    let c = 0;
    for (const side of [1, -1]) {
      if (S.arms[side].body) continue;
      shoulderAt(side, cand, t3);
      const need = t3.distanceTo(S.arms[side].target) - REACH * 0.95 - 0.02;
      if (need > 0) c += need * need;
    }
    return c * 60 + px * px * 0.02 + py * py * 0.06 + pz * pz * 0.1;
  }
  // a planned contact: after the hand has been turned (within the wrist's limit), move the wrist so the contact point lands
  // on its goal; up to four passes, each from the same previous pose, so the smoothing still runs once per frame
  const cs0 = { sw: 0, fwd: V(), up: V(), curl: 0, thumb: 0 },
    cfX = V(),
    cfE = V();
  function saveArm(a) {
    cs0.sw = a.swivel;
    cs0.fwd.copy(a.fwd);
    cs0.up.copy(a.up);
    cs0.curl = a.curl;
    cs0.thumb = a.thumb;
  }
  function contactFix(a, dt) {
    for (let it = 0; it < 4; it++) {
      cfX.crossVectors(a.up, a.fwd);
      cfE.copy(a.wrist).addScaledVector(cfX, a.cLocal.x).addScaledVector(a.up, a.cLocal.y).addScaledVector(a.fwd, a.cLocal.z);
      cfE.subVectors(a.cGoal, cfE).multiplyScalar(a.cw);
      if (cfE.lengthSq() < 1e-8) return;
      a.target.add(cfE);
      freeTarget(a.target, a.clear);
      a.swivel = cs0.sw;
      a.fwd.copy(cs0.fwd);
      a.up.copy(cs0.up);
      a.curl = cs0.curl;
      a.thumb = cs0.thumb;
      solveArm(a, dt);
      solveHand(a, dt);
    }
  }
  function solve(inp) {
    const dt = inp.snap ? 0 : inp.dt || 0;
    solveLegs(inp.legs || 0);
    const base = inp.torso;
    torsoQuat(base[0], base[1], base[2], S.torsoQ0);
    S.torsoQ.copy(S.torsoQ0);
    invQ.copy(S.torsoQ).invert();
    // 1. where each wrist wants to be
    for (const side of [1, -1]) {
      const a = S.arms[side];
      handIntent(a, side > 0 ? inp.L : inp.R);
    }
    // 2. how much extra lean do the hands need? (coordinate search; tiny problem)
    let px = 0,
      py = 0,
      pz = 0;
    let c = reachCost(px, py, pz, base);
    if (c > 1e-7) {
      for (let step = 0.24; step > 0.006; step *= 0.5) {
        for (let pass = 0; pass < 2; pass++) {
          for (let ax = 0; ax < 3; ax++) {
            for (const sgn of [1, -1]) {
              const nx = clamp(px + (ax === 0 ? sgn * step : 0), -0.06, Math.max(0, 1.0 - base[0])),
                ny = clamp(py + (ax === 1 ? sgn * step : 0), -0.4, 0.4),
                nz = clamp(pz + (ax === 2 ? sgn * step : 0), -0.26, 0.26);
              const cc = reachCost(nx, ny, nz, base);
              if (cc < c - 1e-9) {
                c = cc;
                px = nx;
                py = ny;
                pz = nz;
              }
            }
          }
        }
      }
    }
    if (dt > 0) {
      const k = 1 - Math.exp(-dt * 9);
      S.lean.x = lerp(S.lean.x, px, k);
      S.lean.y = lerp(S.lean.y, py, k);
      S.lean.z = lerp(S.lean.z, pz, k);
    } else S.lean.set(px, py, pz);
    torsoQuat(base[0] + S.lean.x, base[1] + S.lean.y, base[2] + S.lean.z, S.torsoQ);
    invQ.copy(S.torsoQ).invert();
    S.pitch = base[0] + S.lean.x;
    // 3. arms and hands
    for (const side of [1, -1]) {
      const a = S.arms[side];
      if (a.body) {
        // carry the wrist target and the hand's direction with the lean (relative to the authored trunk pose)
        q2.copy(S.torsoQ0).invert().premultiply(S.torsoQ);
        a.target.sub(S.hip).applyQuaternion(q2).add(S.hip);
        a.fwdT.applyQuaternion(q2);
        a.upT.applyQuaternion(q2);
      }
      freeTarget(a.target, a.clear);
      if (a.cw > 0) saveArm(a);
      solveArm(a, dt);
      solveHand(a, dt);
      if (a.cw > 0) contactFix(a, dt);
    }
    S.diag.clampL = S.arms[1].clamp;
    S.diag.clampR = S.arms[-1].clamp;
    S.diag.pen = (S.arms[1].pen || 0) + (S.arms[-1].pen || 0);
    // 4. head: turn part of the way toward what she is looking at; the eyes do the rest
    if (inp.focus) {
      t1.set(BODY.headPivot[0], BODY.headPivot[1] + BODY.headCentre, BODY.headPivot[2]).applyQuaternion(S.torsoQ).add(S.hip);
      t2.subVectors(inp.focus, t1).applyQuaternion(invQ); // direction in the torso frame
      const yaw = clamp(Math.atan2(t2.x, t2.z), -1.0, 1.0) * 0.6;
      const pitch = clamp(Math.atan2(-t2.y, Math.hypot(t2.x, t2.z)), -0.35, 0.95) * 0.62;
      e1.set(pitch, yaw, 0, 'YXZ');
      q1.setFromEuler(e1);
      if (dt > 0) S.headQ.slerp(q1, 1 - Math.exp(-dt * 6));
      else S.headQ.copy(q1);
    }
    return S;
  }
  return { S, solve, handPoints, makeHandPoints, lapHeight, setLapWide: (w) => (lapWide = w || 0), obstacles, REACH, torsoQuat, shoulderAt, TRUNK, KNEE, trunkPush, freeTarget, setAnchors, ANCHOR };
})();
