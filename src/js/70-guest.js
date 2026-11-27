// ---------- guest phases: fan greeting → sweet → whisk → drink ----------
const tweens = [];
function tween(o, to, dur, done) {
  const from = { pos: o.position.clone(), rot: o.rotation.clone(), scale: o.scale.clone() };
  tweens.push({ o, from, to, dur, t: 0, done });
}
function runTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i];
    w.t = Math.min(1, w.t + dt / w.dur);
    const u = ease(w.t);
    const o = w.o;
    if (w.update) w.update(u);
    else if (w.to.pos) {
      o.position.lerpVectors(w.from.pos, new THREE.Vector3(...w.to.pos), u);
      if (w.to.arc) o.position.y += Math.sin(u * Math.PI) * w.to.arc;
    }
    if (w.to?.rot) {
      o.rotation.set(
        w.from.rot.x + (w.to.rot[0] - w.from.rot.x) * u,
        w.from.rot.y + (w.to.rot[1] - w.from.rot.y) * u,
        w.from.rot.z + (w.to.rot[2] - w.from.rot.z) * u,
      );
    }
    if (w.to?.scale) {
      o.scale.set(
        w.from.scale.x + (w.to.scale[0] - w.from.scale.x) * u,
        w.from.scale.y + (w.to.scale[1] - w.from.scale.y) * u,
        w.from.scale.z + (w.to.scale[2] - w.from.scale.z) * u,
      );
    }
    if (w.t >= 1) {
      tweens.splice(i, 1);
      if (w.done) w.done();
    }
  }
}
const GUEST_HOME = {};
let phase = -1,
  phaseBtn = null,
  glow = null,
  guestBow = null;
const PHASES = [
  {
    text: 'You are the guest now. First the greeting: lay your closed fan in front of your knees and bow to the host.',
    btn: 'Greet with the fan',
    item: 'sensu',
    say: 'Yoroshiku onegai itashimasu.',
    sayJa: 'よろしくお願いいたします。',
  },
  {
    text: 'Now the sweet. Take one nerikiri from the dish onto your kaishi, cut it with the kuromoji and eat it in three bites.',
    btn: 'Take the sweet',
    item: 'sweet',
  },
  { text: 'In a real gathering only the host whisks. Here you may try it: move your pointer quickly from side to side over the bowl until the foam is smooth.', btn: null, item: null },
];
function resetGuestProps() {
  clearInterval(guestBow);
  document.documentElement.classList.remove('sweet-cut');
  for (const k of ['sensu', 'kaishi', 'kuromoji', 'kobukusa'])
    if (!GUEST_HOME[k]) GUEST_HOME[k] = { pos: O[k].position.clone(), rot: O[k].rotation.clone() };
  for (const k in GUEST_HOME) {
    O[k].position.copy(GUEST_HOME[k].pos);
    O[k].rotation.copy(GUEST_HOME[k].rot);
  }
  O.sweets.forEach((sw) => {
    if (sw.parent !== O.kashiki) O.kashiki.add(sw);
    sw.visible = true;
    sw.position.copy(sw.userData.home);
    sw.rotation.set(0, 0, 0);
  });
  resetSweetPieces();
  tweens.length = 0;
  busy = false;
}
let busy = false;
function setGlow(o) {
  if (glow) {
    glow.material.emissive.setHex(0);
    glow = null;
  }
  if (o) {
    if (!o.userData.ownMat) {
      o.material = o.material.clone();
      o.userData.ownMat = true;
    }
    o.material.emissive.setHex(0x3a6a2a);
    glow = o;
  }
}
function setPhase(i) {
  phase = i;
  const ph = PHASES[i];
  const old = document.getElementById('drink');
  if (old) old.remove();
  phaseBtn = null;
  const said = teacherSays('guestIntro', i, ph.text);
  showLine(said);
  speak(said);
  lineTalk(said);
  ui.meter.querySelector('.bar').style.display = i === 2 ? '' : 'none';
  ui.meterText.textContent = i === 2 ? 'Move your pointer quickly over the bowl to whisk, or press the left and right arrow keys in turn.' : 'Tap the glowing item, or use the button.';
  if (ph.btn) {
    phaseBtn = document.createElement('button');
    phaseBtn.className = 'btn primary';
    phaseBtn.id = 'drink';
    phaseBtn.textContent = ph.btn;
    phaseBtn.addEventListener('click', () => doPhase());
    document.querySelector('.ctrl').prepend(phaseBtn);
  }
  setGlow(i === 0 ? O.sensu : i === 1 ? O.sweets[0] : null);
  if (i === 2) {
    cam.goal = { target: new THREE.Vector3(-0.05 * MX, 0.05, 0.62), theta: 0.4 * MX, phi: 0.9, r: 0.7 };
  }
}
function guestClick(obj) {
  if (busy) return false;
  if (phase === 0 && obj === O.sensu) {
    doPhase();
    return true;
  }
  if (phase === 1 && (obj === O.kaishi || obj === O.kuromoji || O.sweets.includes(obj) || obj.userData.name === 'Kashiki')) {
    doPhase();
    return true;
  }
  return false;
}
function doPhase() {
  if (busy) return;
  busy = true;
  if (phaseBtn) phaseBtn.disabled = true;
  if (phase === 0) {
    const ph = PHASES[0];
    cam.goal = { target: new THREE.Vector3(0, 0.1, 0.85), theta: 0, phi: 1.0, r: 0.9 };
    tween(O.sensu, { pos: [0, 0.006, 0.98], rot: [0, 0, 0], arc: 0.08 }, 1.2, () => {
      speak(ph.say, ph.sayJa);
      let b = 0;
      guestBow = setInterval(() => {
        b += 0.05;
        cam.goal = null;
        cam.phi = 1.0 + Math.sin(Math.min(1, b) * Math.PI) * 0.3;
        if (b >= 1) {
          clearInterval(guestBow);
          if (phase === 0) {
            busy = false;
            setPhase(1);
          }
        }
      }, 40);
    });
  } else if (phase === 1) {
    animateSweetCut(() => {
      busy = false;
      setPhase(2);
    });
  }
}
// guided guest sequence: each stage = prompt text, button label, and a bowl pose (y lift, x tilt toward guest, extra y rotation)
const DRINK = [
  {
    text: 'First, bow to the host and say: “Otemae chōdai itashimasu” – I gratefully receive your tea.',
    btn: 'Bow',
    pose: [0, 0, 0],
    say: 'Otemae chōdai itashimasu.',
    sayJa: 'お点前頂戴いたします。',
  },
  {
    text: 'Pick the bowl up with your right hand, rest it on your left palm, and raise it a little in thanks.',
    btn: 'Lift the bowl',
    pose: [0.18, 0, 0],
  },
  // the stage is mirrored, so a positive turn here is clockwise as seen from above
  { text: 'Turn the bowl clockwise, two small turns, so that you do not drink from its front.', btn: 'Turn it', pose: [0.18, 0, 1.2] },
  {
    text: 'Drink in about three sips. On the last sip, a small slurp tells the host you have finished.',
    btn: 'Sip',
    pose: [0.24, -0.5, 1.2],
    sips: 3,
  },
  {
    text: 'Wipe the rim where your lips touched with your thumb and finger, then wipe your fingers on your kaishi.',
    btn: 'Wipe the rim',
    pose: [0.18, 0, 1.2],
  },
  { text: 'Turn the bowl back, so that its front faces you again.', btn: 'Turn it back', pose: [0.18, 0, 0] },
  {
    text: 'Set it down outside the edge of your mat and look at it closely: the shape, the glaze, the foot. This is called haiken.',
    btn: 'Place and admire',
    pose: [0, 0, 0],
  },
  {
    text: 'When you hand the bowl back, turn its front to the host and say “Gochisōsama deshita”: thank you for the tea.',
    btn: 'Thank the host',
    pose: [0, 0, 3.14],
    say: 'Gochisōsama deshita.',
    sayJa: 'ごちそうさまでした。',
  },
  { text: 'That is the end of the ceremony. Thank you for being my guest.', btn: null, pose: [0, 0, 3.14] },
];
let seqI = -1,
  seqBtn = null,
  sipN = 0,
  pose = [0, 0, 0],
  poseFrom = [0, 0, 0],
  poseT = 1,
  sipFillFrom = 1,
  sipFillTo = 1,
  drinkView = false;
const drinkLookTarget = new THREE.Vector3();
function stopDrinkView() {
  drinkView = false;
  document.documentElement.classList.remove('bowl-view');
  document.getElementById('camBowl').setAttribute('aria-pressed','false');
}
function setDrinkView(on) {
  drinkView = on;
  document.documentElement.classList.toggle('bowl-view',on);
  document.getElementById('camBowl').setAttribute('aria-pressed',String(on));
  if (on) {
    document.getElementById('ask').classList.remove('open');
    for (const id of ['camGuest','camClose','camTop']) document.getElementById(id).setAttribute('aria-pressed','false');
  } else goCam('guest');
}
document.getElementById('camBowl').addEventListener('click',()=>setDrinkView(!drinkView));
function followDrinkBowl() {
  if (!drinkView || seqI < 0) return;
  // Look down through the rim and follow the liquid as the bowl rises and tilts.
  O.bowl.updateWorldMatrix(true,false);
  drinkLookTarget.set(0,0.04,0);
  O.bowl.localToWorld(drinkLookTarget);
  cam.goal = {target:drinkLookTarget.clone(),theta:0,phi:0.18,r:0.36};
}
function startDrinkSeq() {
  setGlow(null);
  seqI = -1;
  sipN = 0;
  sipFillFrom = sipFillTo = 1;
  setTeaFill(1);
  document.getElementById('camBowl').hidden = false;
  setDrinkView(true);
  // the whisk is put down beside the bowl, tines up, before the guest drinks
  O.chasen.position.set(O.bowl.position.x + 0.13, 0, O.bowl.position.z + 0.04);
  O.chasen.rotation.set(0, 0, 0);
  const d = document.getElementById('drink');
  if (d) d.remove();
  ui.meter.classList.remove('on');
  seqBtn = document.createElement('button');
  seqBtn.className = 'btn primary';
  seqBtn.id = 'drink';
  seqBtn.addEventListener('click', advanceSeq);
  document.querySelector('.ctrl').prepend(seqBtn);
  advanceSeq();
}
function advanceSeq() {
  const cur = DRINK[seqI];
  if (cur && cur.sips && sipN < cur.sips - 1) {
    sipN++;
    sipFillFrom = O.tea.userData.fill;
    sipFillTo = Math.max(0,1 - (sipN + 1) / cur.sips);
    poseFrom = pose.slice();
    pose = [cur.pose[0], cur.pose[1] - 0.05 * sipN, cur.pose[2]];
    poseT = 0;
    seqBtn.textContent = `Sip ${sipN + 1} of ${cur.sips}`;
    if (sipN === cur.sips - 1) seqBtn.textContent = 'Last sip (slurp)';
    return;
  }
  seqI++;
  sipN = 0;
  const st = DRINK[seqI];
  if (!st) return;
  sipFillFrom = O.tea.userData.fill;
  sipFillTo = st.sips ? 1 - 1 / st.sips : seqI > 3 ? 0 : 1;
  const said = teacherSays('guestDrink', seqI, st.text);
  showLine(said);
  if (st.say) speak(st.say, st.sayJa); // the guest's own phrase, in Japanese, as before
  else speak(said);
  lineTalk(said);
  poseFrom = pose.slice();
  pose = st.pose.slice();
  poseT = 0;
  setGlow(st.glow ? O[st.glow] : null);
  if (st.btn) {
    seqBtn.textContent = st.sips ? 'Sip 1 of 3' : st.btn;
  } else {
    seqBtn.remove();
    seqBtn = null;
    game.thanked = true;
    document.getElementById('endCard').hidden = false;
    document.getElementById('endAgain').focus({ preventScroll: true });
    ui.meterText.textContent = '';
    ui.next.classList.add('pulse');
    ui.hint.textContent = 'Press Start again to watch the whole procedure once more.';
  }
}
