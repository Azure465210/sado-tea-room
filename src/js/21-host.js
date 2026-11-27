// ---------- host: connects the choreography (stage space) to the rig (host space) ----------
// Host space: origin at her seat, +z in front of her, +x to her LEFT. The stage is mirrored in x and she sits HOST_Z behind
// the stage origin, so that the bowl and the tea container stand in front of her knees instead of inside them.
const HOST_Z = -0.17;
const hostRoot = new THREE.Group();
hostRoot.position.set(0, 0, HOST_Z);
scene.add(hostRoot);
const h2s = (x, y, z) => [x * MX, y, z + HOST_Z]; // host-space point -> stage coordinates (array, for the tracks)
function s2h(p, out) {
  return out.set(p.x * MX, p.y, p.z - HOST_Z);
}
// stand-ins the tracks write to. handL / handR are the GRIP POINTS of her left / right hand (palm or fingertips), in stage space.
const armL = { key: 'L', side: 1, pos: new THREE.Vector3(), palm: 'down', prev: new THREE.Vector3(), vel: 0 };
const armR = { key: 'R', side: -1, pos: new THREE.Vector3(), palm: 'down', prev: new THREE.Vector3(), vel: 0 };
const torso = new THREE.Object3D(); // only .rotation is used: the bow / turn written by the tracks
const legsObj = { position: new THREE.Vector3() }; // .x = 0 seiza, 1 kiza, 2 standing

// body-relative places, in host space
const LAP_Y = RIG.lapHeight(0.105, 0.27) + 0.012;
const HAND = {
  rest: (s) => [s * 0.105, LAP_Y, 0.27], // palms on the lap
  knee: (s) => [s * 0.1, RIG.lapHeight(0.1, 0.395) + 0.012, 0.395], // palms on the knees
  floor: (s) => [s * 0.03, 0.024, 0.565], // fingertips on the tatami in front of the knees, index fingers touching
  flat: (s) => [s * 0.043, 0.017, 0.545], // palms flat on the tatami, index fingers touching: the formal bow
  tips: (s) => [s * 0.132, 0.006, 0.478], // fingertips only, each hand by its own knee: the light bow
  kiza: (s) => [s * 0.1, 0.4, 0.5], // on the thighs, up on the knees
  stand: (s) => [s * 0.085, 0.7, 0.33], // standing, hands resting on the front of the thighs
  hip: (s) => [s * 0.135, 0.44, 0.114], // where the fukusa hangs from the obi
};
for (const s of [1, -1]) for (const n of ['rest', 'knee', 'floor', 'flat', 'tips']) RIG.setAnchors(s, n, HAND[n](s));

// how each utensil is taken: `at` = where the hand's grip point goes, in the utensil's own frame (x is mirrored for the other hand)
const GRIP = {
  bowl: { at: [0.012, -0.012, -0.01], mode: 'up', gd: 0.085, curl: 0.32, thumb: 0.1, followYaw: false },
  natsume: { at: [0, -0.01, 0], mode: 'up', gd: 0.085, curl: 0.4, thumb: 0.3 },
  lid: { at: [0, 0.03, 0], mode: 'pinch' },
  kamaLid: { at: [0, 0.04, 0], mode: 'pinch' },
  chashaku: { at: [0, 0.004, 0.07], mode: 'in', gd: 0.085, curl: 0.72, thumb: 0.85, aimLocal: [0, 0, -0.085] },
  hishaku: { at: [0.34, 0.004, 0], fixed: true, mode: 'in', gd: 0.07, curl: 0.78, thumb: 0.85, aimLocal: [0, 0, 0] },
  hishakuKagami: { at: [0.15, 0, 0], fixed: true, mode: 'in', gd: 0.065, curl: 0.85, thumb: 0.85, body: true }, // upright in the left hand, held a little above the node
  chasen: { at: [0, 0.03, 0], mode: 'pinch', gd: 0.115, curl: 0.5, thumb: 0.8 },
  fukusa: { at: [0, 0.02, 0.025], mode: 'down', curl: 0.02 }, // palm down, fingers flat on the pad, toward its far edge
  fukusaWipe: { at: [0, 0.02, -0.02], mode: 'down', curl: 0.02, aimLocal: [0, 0.014, 0.08] }, // the same with the fingers along the pad (step 2's wiping pose W0)
  fukusaPalm: { at: [0, 0.022, 0], mode: 'up', gd: 0.085, curl: 0.05, thumb: 0.2, aimLocal: [0, 0.02, 0.08] }, // the pad (stack top up, so local +y is down) resting on the flat left palm
  fukusaObi: { at: [0, 0, 0], mode: 'in', curl: 0.4 }, // scissor clamp at P_L (the point moves with the cloth: see gripPoint)
  chakin: { at: [0, 0.012, 0], mode: 'down', curl: 0.22 },
  kashiki: { at: [0.085, 0.01, 0], mode: 'up', gd: 0.08, curl: 0.25 },
  // assists: a hand that steadies something without carrying it
  // on the OUTSIDE of the bowl: fingers lie along the outer wall, thumb at the rim, nothing dips into the tea
  bowlSide: { at: [0.083, 0.05, -0.02], mode: 'in', gd: 0.075, curl: 0.22, thumb: 0.45, aimLocal: [0.083, 0.02, 0.07], followYaw: false },
  natsumeSide: { at: [0.036, 0.03, -0.01], mode: 'in', gd: 0.075, curl: 0.5, thumb: 0.6 },
};
const hostState = { eyes: 'open', mouth: 'rest', focus: new THREE.Vector3(0, 0.2, 0.6), talkUntil: 0, talkT: 0 };
const _hv = { L: new THREE.Vector3(), R: new THREE.Vector3(), aimL: new THREE.Vector3(), aimR: new THREE.Vector3(), adj: new THREE.Vector3(), q: new THREE.Quaternion(), f: new THREE.Vector3(), bp: new THREE.Vector3(), bq: new THREE.Quaternion(), bQ: new THREE.Quaternion(), acc: new THREE.Vector3(), aimL2: new THREE.Vector3() };
const gripTilt = new THREE.Euler();
function gripRotation(object, config) {
  // The bowl turns within the palm. Each hand keeps its side of the bowl.
  return config.followYaw === false
    ? _hv.q.setFromEuler(gripTilt.set(object.rotation.x, 0, object.rotation.z))
    : object.quaternion;
}
const _inp = { legs: 0, torso: [0, 0, 0], L: { grip: _hv.L }, R: { grip: _hv.R }, focus: hostState.focus, dt: 0, snap: false };
const BLEND_T = 0.4; // seconds a hand takes to settle onto / let go of a utensil
let hostTime = 0;
// The whisk rests with its tines up and works with its tines down. While it is in the hand it turns over about the middle of its handle.
const CHASEN_PIVOT = 0.03,
  CHASEN_LIFT = 0.03;
function chasenF(h, time) {
  if (h.noflip || time < h.t0 || time > h.t1) return 0;
  return ease(Math.min(time - h.t0, h.t1 - time) / 1.0);
}
function chasenTurn(s, time, stage2) {
  let f = 0;
  for (const h of s.holds) if (h.o === 'chasen' && !h.assist) f = Math.max(f, chasenF(h, time));
  if (f <= 0) return;
  const c = O.chasen,
    th = Math.PI * f;
  if (!stage2) c.rotation.x += th;
  else {
    c.position.y += CHASEN_PIVOT - CHASEN_PIVOT * Math.cos(th) + CHASEN_LIFT * f;
    c.position.z -= CHASEN_PIVOT * Math.sin(th);
  }
}
// the aim (where the fingers point) of a hold's grip, in host space
function holdAim(h, g, arm, out) {
  out.set(g.aimLocal[0] * (arm.key === 'L' && !g.fixed ? -1 : 1), g.aimLocal[1], g.aimLocal[2]).applyQuaternion(gripRotation(O[h.o], g)).add(O[h.o].position);
  return s2h(out, out);
}
// rig input for the pose of a second hold's grip, which the hand turns toward with weight b (see the fukusa hand-over)
function holdPose(I, h, g, arm, b) {
  I.modeB = g.mode;
  I.gdB = g.gd == null ? null : g.gd;
  I.curlB = g.curl == null ? null : g.curl;
  I.thumbB = g.thumb == null ? null : g.thumb;
  I.aimB = g.aimLocal ? holdAim(h, g, arm, arm.key === 'L' ? _hv.aimL : _hv.aimR) : null;
  I.modeBW = b;
}
function holdBlend(h, time) {
  // 0 away from the hold, 1 while it lasts, eased over BLEND_T just before it starts and just after it ends
  if (time < h.t0 - BLEND_T || time > h.t1 + BLEND_T) return 0;
  if (time < h.t0) return ease((time - (h.t0 - BLEND_T)) / BLEND_T);
  if (time > h.t1) return ease(1 - (time - h.t1) / BLEND_T);
  return 1;
}
function gripPoint(h, arm, time, out) {
  // stage-space place on the utensil where this hand's grip point belongs
  const g = GRIP[h.grip || h.o],
    o = O[h.o];
  if (h.o === 'chasen' && !h.assist) return out.set(0, CHASEN_PIVOT + CHASEN_LIFT * chasenF(h, time), 0).add(o.position); // it turns about the middle of its handle
  if (h.grip === 'fukusaObi') return foldSilkPoint(FUK_LEFT_CLAMP[0], FUK_LEFT_CLAMP[1], out).applyQuaternion(o.quaternion).add(o.position);
  if (h.o === 'fukusa' && !h.grip && !fukusaLowerObi && FST.ang[3] < Math.PI) {
    // the packet is taken from the obi near its top edge (P_L); the hand moves onto the pad as the end is folded under
    const k = ease(FST.ang[3] / Math.PI);
    foldSilkPoint(FUK_LEFT_CLAMP[0], FUK_LEFT_CLAMP[1], _hv.f).applyQuaternion(o.quaternion).add(o.position);
    out.set(g.at[0] * (arm.key === 'L' ? -1 : 1), g.at[1], g.at[2]).applyQuaternion(o.quaternion).add(o.position);
    return out.lerp(_hv.f, 1 - k);
  }
  return out
    .set(g.at[0] * (arm.key === 'L' && !g.fixed ? -1 : 1), g.at[1], g.at[2]) // mirrored for the other hand, unless the place is a fixed part of the utensil
    .applyQuaternion(gripRotation(o, g))
    .add(o.position);
}
// Each frame, after the tracks have placed everything:
//  1. a hand that holds (or steadies) a utensil goes to the proper place ON that utensil, easing in and out around the hold;
//  2. the rig solves the body; 3. if a hand could not reach, the utensil it carries stops short with it (applyShortfall).
// the obi's edge point where the tucked fukusa's clamp point P_L sits (stage), for a trunk pitch and hip (host space)
function fukusaBeltEdge(beltOffset, q, hip, out) {
  const p = HAND.hip(1);
  out.set(p[0], p[1] + beltOffset - BODY.hipSeiza + 0.003, p[2] - 0.026).applyQuaternion(q).add(hip);
  return out.set(out.x * MX, out.y, out.z + HOST_Z);
}
const _beltHip = new THREE.Vector3(0, BODY.hipSeiza, 0.026);
let fukusaBeltW = 0;
const _fukTrackP = new THREE.Vector3(),
  _fukTrackQ = new THREE.Quaternion(); // how far the cloth has eased into its tucked pose at the obi (0 away from it, 1 tucked)
function hostUpdate(s, time, dt, snap) {
  // The narrow obi (under the hakama) presents its lower edge. The wide
  // kimono obi presents its upper edge. This is a costume-dependent pose.
  const lowerObi = AVATAR.style.hakama || AVATAR.style.garment === 'jittoku';
  const beltOffset = lowerObi ? -0.125 : 0.035;
  fukusaLowerObi = !!lowerObi;
  if (s.interactive) O.fukusa.position.set(...HIP_L);
  const distanceToBelt = O.fukusa.position.distanceTo(_hv.f.set(...HIP_L));
  // the belt edge with the authored bow (the exact one, with the automatic lean, is set after the solve)
  fukusaBelt.pitch = torso.rotation.x;
  fukusaBeltEdge(beltOffset, _hv.bQ.setFromAxisAngle(_hv.f.set(1, 0, 0), torso.rotation.x), _beltHip, fukusaBelt.E);
  updateFukusa(s, time);
  fukusaBeltW = 0;
  const nearBelt = !fukusaHandling && distanceToBelt < 0.14;
  if (nearBelt) {
    // near the obi the cloth eases into its tucked pose (here with the authored bow, for the hands; again after the solve
    // with the real trunk, from the same track pose)
    _fukTrackP.copy(O.fukusa.position);
    _fukTrackQ.copy(O.fukusa.quaternion);
    fukusaBeltPose(fukusaBelt.E, fukusaBelt.pitch, _hv.bp, _hv.bq);
    const w = 1 - ease(distanceToBelt / 0.14);
    O.fukusa.position.lerp(_hv.bp, w);
    O.fukusa.quaternion.slerp(_hv.bq, w);
    fukusaBeltW = w;
  }
  const now = performance.now() / 1000;
  for (const arm of [armL, armR]) {
    const I = arm.key === 'L' ? _inp.L : _inp.R;
    I.mode = 'down';
    I.aim = null;
    I.gd = I.curl = I.thumb = null;
    I.body = false;
    I.handNormal = I.handForward = I.fingers = I.pinch = I.fk = I.modeB = I.aimB = null;
    I.modeBW = 0;
    I.level = 0;
    arm.hold = null;
    arm.goal = arm.goal || new THREE.Vector3();
    arm.goal.copy(arm.pos); // stage space: where the track puts the hand
    let best = 0,
      bestH = null;
    if (!s.interactive) {
      for (const h of s.holds) {
        if (h.hand !== arm.key || h.rider) continue; // riders travel with something else that is being carried
        if (h.o === 'fukusa' && fukusaHandling) {
          // while the cloth is being folded its hands are planned by poseFukusaHand
          if (time >= h.t0 && time <= h.t1) arm.hold = h;
          continue;
        }
        const b = holdBlend(h, time);
        if (b <= best) continue;
        best = b;
        bestH = h;
        const g = GRIP[h.grip || h.o];
        arm.goal.copy(arm.pos).lerp(gripPoint(h, arm, time, _hv.adj), b);
        if (b > 0.5) {
          I.aim = null; // a stronger hold replaces the aim of a weaker one
          I.mode = g.mode;
          I.body = !!g.body;
          I.gd = g.gd == null ? null : g.gd;
          I.curl = g.curl == null ? null : g.curl;
          I.thumb = g.thumb == null ? null : g.thumb;
          if (g.aimLocal) I.aim = holdAim(h, g, arm, arm.key === 'L' ? _hv.aimL : _hv.aimR);
        }
        if (time >= h.t0 && time <= h.t1 && !h.assist) arm.hold = h;
      }
      if (bestH && bestH.o === 'fukusa' && !fukusaHandling) {
        // one fukusa hold handing over to the next (palm -> obi clamp): the hand's place moves between the two grips
        let bs = 0;
        _hv.acc.set(0, 0, 0);
        for (const h of s.holds) {
          if (h.hand !== arm.key || h.rider || h.o !== 'fukusa') continue;
          const b = holdBlend(h, time);
          if (b <= 0) continue;
          _hv.acc.addScaledVector(gripPoint(h, arm, time, _hv.adj), b);
          bs += b;
        }
        if (bs > 0) arm.goal.copy(arm.pos).lerp(_hv.acc.multiplyScalar(1 / bs), Math.min(1, bs));
        // and its pose turns from the other hold's to the stronger one's
        for (const h of s.holds) {
          if (h === bestH || h.hand !== arm.key || h.rider || h.o !== 'fukusa') continue;
          const b = holdBlend(h, time);
          if (b <= 0) continue;
          const g = GRIP[h.grip || h.o];
          holdPose(I, bestH, GRIP[bestH.grip || bestH.o], arm, 1);
          I.mode = g.mode;
          I.gd = g.gd == null ? null : g.gd;
          I.curl = g.curl == null ? null : g.curl;
          I.thumb = g.thumb == null ? null : g.thumb;
          I.aim = g.aimLocal ? holdAim(h, g, arm, _hv.aimL2) : null;
          I.modeBW = best / (best + b);
          break;
        }
      }
    }
    if (fukusaHandling) poseFukusaHand(arm, time, I, lowerObi);
    s2h(arm.goal, I.grip);
  }
  _inp.legs = legsObj.position.x;
  _inp.torso[0] = torso.rotation.x;
  _inp.torso[1] = torso.rotation.y * MX;
  _inp.torso[2] = torso.rotation.z * MX;
  _inp.dt = dt;
  _inp.snap = !!snap;
  // where she looks: at the guest while idle, at her hands while working, down in a bow
  for (const a of [armL, armR]) {
    a.vel = dt > 0 ? a.prev.distanceTo(a.pos) / Math.max(dt, 1e-3) : 0;
    a.prev.copy(a.pos);
  }
  const busy = armR.vel > armL.vel ? armR : armL;
  const idle = !armL.hold && !armR.hold && busy.vel < 0.03 && RIG.S.arms[1].grip.y > 0.15 && RIG.S.arms[-1].grip.y > 0.15 && legsObj.position.x < 0.05;
  const bowing = torso.rotation.x > 0.62, // a real bow: head down, eyes closed
    greeting = !bowing && torso.rotation.x > 0.22 && !armL.hold && !armR.hold; // hands going to the tatami: eyes lowered toward the guest's knees
  if (bowing) hostState.focus.set(0, -0.35, 0.8);
  else if (greeting) hostState.focus.set(0, 0.2, 1.5);
  else if (idle || s.interactive) hostState.focus.set(0, 0.82, 1.55 - HOST_Z);
  else s2h(armL.hold && !armR.hold ? armL.goal : armR.hold || busy === armR ? armR.goal : armL.goal, hostState.focus);
  hostState.eyes = bowing ? 'closed' : greeting ? 'lowered' : idle || s.interactive ? 'open' : 'lowered';
  hostState.mouth = now < hostState.talkUntil && Math.floor(now * 6) % 2 === 0 ? 'talk' : 'rest';
  const S = RIG.solve(_inp);
  for (const arm of [armL, armR]) {
    const a = S.arms[arm.side],
      I = arm.key === 'L' ? _inp.L : _inp.R;
    arm.short = arm.short || new THREE.Vector3();
    arm.short.subVectors(a.grip, I.grip); // host space: how far the hand ended up from where it was asked to be
    arm.short.x *= MX; // -> stage space
  }
  // the fukusa hangs from the obi: while it is tucked there it moves with her body (for example when she bows)
  if (nearBelt) {
    if (Math.abs((S.pitch || 0) - fukusaBelt.pitch) > 1e-9) {
      fukusaBelt.pitch = S.pitch || 0; // with the automatic lean: the men's packet bends further over the thigh
      updateFukusa(s, time);
    }
    fukusaBeltEdge(beltOffset, S.torsoQ, S.hip, _hv.bp);
    fukusaBeltPose(_hv.bp, S.pitch || 0, _hv.f, _hv.bq);
    O.fukusa.position.copy(_fukTrackP).lerp(_hv.f, fukusaBeltW);
    O.fukusa.quaternion.copy(_fukTrackQ).slerp(_hv.bq, fukusaBeltW);
  }
  settleFukusa(S, dt, snap);
  AVATAR.update(S, hostState, dt);
  return S;
}
function applyShortfall(s, time) {
  // whatever a hand carries stays in the hand, even if the hand had to stop short
  if (s.interactive) return;
  for (const h of s.holds) {
    if (h.assist || time < h.t0 || time > h.t1) continue;
    // While the cloth is being folded, settleFukusa refits it to the real fingers instead.
    if (h.o === 'fukusa' && fukusaHandling) continue;
    const arm = h.hand === 'L' ? armL : armR;
    // the tucked fukusa belongs to the obi: near it the hand's shortfall fades out, so the packet settles into the obi
    const k = h.o === 'fukusa' ? 1 - fukusaBeltW : 1;
    if (arm.short && arm.short.lengthSq() > 1e-8 && k > 0) O[h.o].position.addScaledVector(arm.short, k);
  }
}
// kettle and water jar are solid for her arms
function hostObstacles() {
  RIG.obstacles.length = 0;
  const v = new THREE.Vector3();
  s2h(v.set(KAMA[0], 0, KAMA[2]), v);
  RIG.obstacles.push({ x: v.x, z: v.z, r: 0.15, y0: 0, y1: 0.1 }); // brazier
  RIG.obstacles.push({ x: v.x, z: v.z, r: 0.122, y0: 0.19, ry: 0.1, ball: true }); // kettle: a flattened ball
  s2h(v.set(MIZU[0], 0, MIZU[2]), v);
  RIG.obstacles.push({ x: v.x, z: v.z, r: 0.097, y0: 0, y1: 0.19 });
}
