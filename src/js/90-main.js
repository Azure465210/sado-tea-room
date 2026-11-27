// ---------- main loop ----------
const clock = new THREE.Clock();
// Motion: 'pictures' = the host holds each key pose like a picture and switches to the next one in a blink;
// 'smooth' = continuous movement. Both play the same choreography; pictures only changes how time runs between its keys.
let motion = 'pictures',
  paused = false;
const SWITCH = 0.3; // seconds one picture takes to change into the next
function keyTimes(s) {
  if (s._kt) return s._kt;
  const set = new Set([0, s.dur]);
  for (const tr of s.tracks) {
    if (tr.osc) set.add(tr.osc.t0).add(tr.osc.t1);
    else for (const k of tr.k) set.add(k[0]);
  }
  for (const h of s.holds) set.add(h.t0).add(h.t1).add(h.t0 - BLEND_T).add(h.t1 + BLEND_T);
  return (s._kt = [...set].filter((x) => x >= 0 && x <= s.dur).sort((a, b) => a - b));
}
function poseTime(s, time) {
  if (s === STEPS[2] && time >= 9.1 && time <= 29) return time;
  if (motion !== 'pictures' || s.interactive) return time;
  const K = keyTimes(s);
  let i = 0;
  while (i < K.length - 1 && K[i + 1] <= time) i++;
  if (i >= K.length - 1) return time;
  const a = K[i],
    b = K[i + 1],
    w = Math.min(SWITCH, b - a);
  return time < b - w ? a : a + (b - a) * ease((time - (b - w)) / w);
}
function frame() {
  advance(Math.min(clock.getDelta(), 0.05));
  // In first person, the viewer sees their hands, not the inside of their own head.
  const hideBody = masterView && AVATAR;
  if (hideBody) { AVATAR.headG.visible=false; AVATAR.trunkG.visible=false; }
  renderer.render(scene, camera);
  if (hideBody) { AVATAR.headG.visible=true; AVATAR.trunkG.visible=true; }
  requestAnimationFrame(frame);
}
// one tick of everything except drawing
function advance(dt) {
  const s = STEPS[step];
  if (playing && !paused) {
    const d = s.dur;
    // Do not let a scheduled cue cancel a line still being synthesised or spoken.
    // Hold the lesson at the next cue (or its end) until the whole speech job ends.
    const boundary = lineIdx < s.lines.length ? s.lines[lineIdx][0] : d;
    t = voiceOn ? Math.min(t + dt, Math.max(t, boundary)) : t + dt;
    ui.prog.style.width = Math.min(100, (t / d) * 100) + '%';
    while (lineIdx < s.lines.length && t >= s.lines[lineIdx][0] && !(voiceOn && TTS.busy)) {
      const tl = teacherLines(step),
        u = tl[lineIdx][1]; // the teacher's words, at the times written in STEPS
      showLine(u);
      speak(u);
      // a PC engine (VOICEVOX / COEIROINK) makes the next line while this one plays, so it starts on time (06-tts cache)
      if (voiceOn && TTS.prefetch && tl[lineIdx + 1]) TTS.prefetch(tl[lineIdx + 1][1]);
      lineTalk(u);
      lineIdx++;
    }
    if (t >= d && lineIdx >= s.lines.length && !(voiceOn && TTS.busy)) {
      playing = false;
      finished = true;
      if (step < STEPS.length - 1) ui.next.classList.add('pulse');
      ui.hint.textContent = step < STEPS.length - 1 ? 'Press Next for the next step, or Repeat to watch again.' : '';
    }
  }
  const tt = Math.min(t, s.dur),
    tp = poseTime(s, tt),
    pictures = motion === 'pictures';
  poseTick(s, tt); // may draw one pose picture; it must come before the live scene is laid out below
  if (!s.interactive) {
    resetRest();
    applyInit(s);
    applyTracks(s.tracks, tp, pictures ? Math.floor(tt * 8) / 8 : tt);
    chasenTurn(s, tp, 0); // turn the whisk before the hand looks for its handle
  } else {
    armL.pos.set(...HL);
    armR.pos.set(...HR);
    torso.rotation.set(0, 0, 0);
    legsObj.position.x = 0;
  }
  hostUpdate(s, tp, dt, pictures || poseUI.snapOnce);
  poseUI.snapOnce = false;
  if (!s.interactive) {
    applyShortfall(s, tp);
    chasenTurn(s, tp, 1);
  }
  if (s.interactive && seqI >= 0) {
    poseT = Math.min(1, poseT + dt / 0.9);
    const u = ease(poseT);
    setTeaFill(sipFillFrom + (sipFillTo - sipFillFrom) * u);
    const L = (a, b) => a + (b - a) * u;
    O.bowl.position.y = L(poseFrom[0], pose[0]);
    O.bowl.rotation.x = L(poseFrom[1], pose[1]);
    O.bowl.rotation.y = Math.PI + L(poseFrom[2], pose[2]);
    if (DRINK[seqI] && DRINK[seqI].btn === 'Bow') {
      const bowU = Math.sin(Math.min(1, poseT) * Math.PI);
      cam.phi = Math.min(1.45, 1.3 + bowU * 0.12);
    }
  }
  runTweens(dt);
  O.kamaWater.scale.set(1 + Math.sin(performance.now() / 400) * 0.01, 1, 1 - Math.sin(performance.now() / 400) * 0.01);
  O.steam.children.forEach((p, i) => {
    const k = ((performance.now() / 1000) * 0.5 + p.userData.o) % 1;
    p.position.set(Math.sin(k * 6 + i) * 0.02, k * 0.25, 0);
    p.material.opacity = 0.25 * (1 - k);
    p.scale.setScalar(0.6 + k);
  });
  followDrinkBowl();
  if (cam.goal) {
    const g = cam.goal,
      k = 1 - Math.pow(0.001, dt);
    cam.target.lerp(g.target, k);
    cam.theta += (g.theta - cam.theta) * k;
    cam.phi += (g.phi - cam.phi) * k;
    cam.r += (g.r - cam.r) * k;
    if (Math.abs(cam.r - g.r) < 0.002 && cam.target.distanceTo(g.target) < 0.002) cam.goal = null;
  }
  applyCam();
  // foam slowly settles while the guest is whisking, so it takes real strokes to finish
  if (s.interactive && phase === 2 && !game.done && game.meter > 0) {
    game.meter = Math.max(0, game.meter - dt * 0.025);
    ui.meterFill.style.width = (game.meter * 100).toFixed(0) + '%';
  }
  secondary(dt);
}
applyTeacher();
openIntro(); // the page opens on the choice of teacher
resize();
resetRest();
hostObstacles();
applyCam();
loadStep(0);
playing = false;
frame();
window.__sado = {
  // tools: choose the teacher (rebuilds the avatar, restarts at step 1). The address can also say #teacher=ifu.
  setTeacher: (id) => {
    setTeacher(id);
    if (!intro.el.hidden) pickTeacher(id);
    loadStep(0);
    return TEACHER.id;
  },
  teacher: () => TEACHER.id,
  tts: TTS,
  clickableCount: () => clickable.length, // stays the same across teacher changes (dispose() removes the old head)
  go: (i, time) => {
    paused = false;
    loadStep(i);
    if (time != null) {
      t = time;
      lineIdx = STEPS[step].lines.filter((l) => l[0] < time).length;
      if (lineIdx) showLine(teacherLines(step)[lineIdx - 1][1]);
    }
  },
  // freeze the scene at an exact moment (for screenshots and checks)
  hold: (i, time) => {
    if (step !== i) loadStep(i);
    t = time;
    paused = true;
    playing = !STEPS[step].interactive;
    finished = false;
  },
  setMotion: (m) => (motion = m),
  // run the scene forward without drawing (tests use this: software rendering is slow)
  tick: (seconds) => {
    for (let i = 0; i < seconds / 0.05; i++) advance(0.05);
  },
  // compute the scene at an exact moment without waiting for a frame, and return the skeleton numbers
  sample: (i, time, dt) => {
    if (step !== i) loadStep(i);
    t = time;
    paused = true;
    playing = !STEPS[step].interactive;
    finished = false;
    advance(dt || 0);
    return window.__sado.body();
  },
  cam,
  dbg: () => ({ phase, busy, tw: tweens.length, sw: O.sweets[0].position.toArray(), ka: O.kaishi.position.toArray() }),
  rig: RIG,
  O,
  STEPS,
  // skeleton numbers for the current frame: bone lengths, how far each hand is from where it should be, how deep an arm cuts into the body
  body: () => {
    const S = RIG.S,
      r = (v) => +v.toFixed(4),
      out = { legs: S.legs, pitch: r(S.pitch || 0), lean: S.lean.toArray().map(r) };
    for (const side of [1, -1]) {
      const a = S.arms[side],
        g = S.legsOut[side],
        k = side > 0 ? 'L' : 'R';
      out[k] = { upper: r(a.shoulder.distanceTo(a.elbow)), fore: r(a.elbow.distanceTo(a.wrist)), short: r(a.clamp), cut: r(a.pen || 0), swivel: r(a.swivel), thigh: r(g.hip.distanceTo(g.knee)), shin: r(g.knee.distanceTo(g.ankle)), grip: a.grip.toArray().map(r), wrist: a.wrist.toArray().map(r), elbow: a.elbow.toArray().map(r) };
    }
    return out;
  },
};
