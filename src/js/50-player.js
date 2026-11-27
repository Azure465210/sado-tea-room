// ---------- step player ----------
const ui = {
  pills: document.getElementById('pills'),
  title: document.getElementById('stepTitle'),
  jp: document.getElementById('stepJp'),
  line: document.getElementById('line'),
  hint: document.getElementById('hint'),
  prog: document.getElementById('prog'),
  next: document.getElementById('next'),
  back: document.getElementById('back'),
  repeat: document.getElementById('repeat'),
  qs: document.getElementById('qs'),
  meter: document.getElementById('meter'),
  meterFill: document.getElementById('meterFill'),
  meterText: document.getElementById('meterText'),
};
let step = 0,
  t = 0,
  playing = false,
  lineIdx = 0,
  voiceOn = false,
  finished = false;
const game = { meter: 0, done: false, lastP: null, drinking: false, drinkT: 0, thanked: false };
STEPS.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'pill';
  b.textContent = i + 1;
  b.title = s.title;
  b.setAttribute('role', 'listitem');
  b.addEventListener('click', () => loadStep(i));
  ui.pills.appendChild(b);
});
// speak(unit): the teacher says it (an English string, or {ja, en, yomi} – see 05-teachers / 06-tts).
// speak(romaji, kana): a guest's Japanese phrase, said by a Japanese voice when the browser has one.
function speak(text, ja) {
  if (!voiceOn) return;
  if (ja) TTS.phrase(text, ja);
  else TTS.say(text);
}
// the caption: English as before; for a Japanese-speaking teacher the Japanese, with the English translation under it
const lineEn = document.getElementById('lineEn');
let displayedLine = '';
function showLine(u = '') {
  displayedLine = u;
  if (typeof u === 'string' || TTS.language === 'en' || !u.ja) {
    ui.line.textContent = typeof u === 'string' ? u : u.en;
    ui.line.lang = 'en';
    lineEn.textContent = '';
    lineEn.hidden = true;
  } else {
    ui.line.textContent = u.ja;
    ui.line.lang = 'ja';
    lineEn.textContent = u.en;
    lineEn.hidden = false;
  }
}
// how long the mouth moves for a line when no voice is speaking it (with a voice, 06-tts keeps it moving while it speaks)
function talkTime(u) {
  if (typeof u === 'string' || TTS.language === 'en' || !u.ja) {
    const text = typeof u === 'string' ? u : u.en;
    return Math.min(4.5, 0.6 + text.length * 0.045);
  }
  return Math.min(6, 0.6 + (u.yomi || u.ja).length * 0.13);
}
function lineTalk(unit) {
  hostState.talkUntil = performance.now() / 1000 + talkTime(unit);
}
function applyInit(s) {
  if (s.init) {
    for (const k in s.init) O[k].visible = !!s.init[k];
  }
  if (s.pose) {
    for (const k in s.pose) {
      const q = s.pose[k];
      if (q.pos) setPos(objs[k], q.pos);
      if (q.rot) objs[k].rotation.set(...q.rot);
    }
  }
}
function loadStep(i) {
  step = Math.max(0, Math.min(STEPS.length - 1, i));
  const s = STEPS[step];
  t = 0;
  lineIdx = 0;
  playing = !s.interactive;
  finished = false;
  const d = document.getElementById('drink');
  if (d) d.remove();
  document.getElementById('endCard').hidden = true;
  seqI = -1;
  drinkView = false;
  document.documentElement.classList.remove('bowl-view');
  document.getElementById('camBowl').hidden = true;
  document.getElementById('camBowl').setAttribute('aria-pressed','false');
  seqBtn = null;
  sipN = 0;
  pose = [0, 0, 0];
  poseFrom = [0, 0, 0];
  poseT = 1;
  phase = -1;
  setGlow(null);
  resetGuestProps();
  resetRest();
  resetTeaContents();
  applyInit(s);
  if (s.interactive) {
    O.kashiki.position.set(...KASHIKI_SERVED);
    O.tea.visible = true;
    O.bowl.position.set(-0.05, 0, 0.62);
    O.bowl.rotation.set(0, Math.PI, 0);
    O.chasen.position.set(0.07, 0, 0.66);
    game.meter = 0;
    game.t0 = 0;
    game.dir = 0;
    game.run = 0;
    game.lastP = null;
    game.done = false;
    game.drinking = false;
    game.thanked = false;
    ui.meter.classList.add('on');
    ui.meterFill.style.width = '0%';
    goCam('close');
    cam.goal.target.set(-0.05 * MX, 0.08, 0.75);
    cam.goal.r = 0.95;
    cam.goal.phi = 1.0;
    ui.next.textContent = 'Start again';
    ui.next.classList.remove('pulse');
  } else {
    ui.meter.classList.remove('on');
    ui.next.textContent = 'Next';
    ui.next.classList.remove('pulse');
  }
  ui.title.textContent = `Step ${step + 1} · ${s.title}`;
  ui.jp.textContent = '';
  const jpb = document.createElement('b');
  jpb.textContent = s.jp;
  ui.jp.append(jpb, s.ro ? `${s.ro} · ${s.gloss}` : '');
  showLine('');
  ui.prog.style.width = '0%';
  ui.hint.textContent = 'Drag to look around · scroll or pinch to zoom';
  [...ui.pills.children].forEach((p, j) => {
    p.toggleAttribute('aria-current', false);
    if (j === step) p.setAttribute('aria-current', 'step');
    p.classList.toggle('done', j < step);
  });
  ui.back.disabled = step === 0;
  buildPoseStrip(step);
  ui.qs.innerHTML = '';
  for (const [q, a] of teacherQs(step)) {
    const dq = document.createElement('div');
    dq.className = 'q';
    const b = document.createElement('button');
    b.textContent = q;
    const ans = document.createElement('div');
    ans.className = 'a';
    if (typeof a === 'string' || !a.ja) ans.textContent = typeof a === 'string' ? a : a.en;
    else {
      // his answer in Japanese, the translation under it
      const ja = document.createElement('div'),
        en = document.createElement('div');
      ja.lang = 'ja';
      ja.textContent = a.ja;
      en.className = 'a-en';
      en.textContent = a.en;
      ans.append(ja, en);
    }
    ans.hidden = true;
    b.addEventListener('click', () => {
      ans.hidden = !ans.hidden;
      if (!ans.hidden) speak(a);
    });
    dq.append(b, ans);
    ui.qs.appendChild(dq);
  }
  TTS.cancel();
  if (s.interactive) {
    setPhase(0);
  }
}
ui.next.addEventListener('click', () => {
  if (STEPS[step].interactive) {
    loadStep(0);
    goCam('guest');
  } else loadStep(step + 1);
});
ui.back.addEventListener('click', () => loadStep(step - 1));
ui.repeat.addEventListener('click', () => loadStep(step));
document.getElementById('camGuest').addEventListener('click', () => goCam('guest'));
document.getElementById('camClose').addEventListener('click', () => goCam('close'));
document.getElementById('camTop').addEventListener('click', () => goCam('top'));
document.getElementById('camMaster').addEventListener('click', () => goCam('master'));
const motionBtn = document.getElementById('motionBtn');
motionBtn.addEventListener('click', () => {
  motion = motion === 'pictures' ? 'smooth' : 'pictures';
  motionBtn.setAttribute('aria-pressed', String(motion === 'pictures'));
  motionBtn.textContent = 'Motion: ' + motion;
});
document.getElementById('endAgain').addEventListener('click', () => {
  loadStep(0);
  goCam('guest');
});
document.getElementById('endWhisk').addEventListener('click', () => loadStep(STEPS.length - 1));
const voiceBtn = document.getElementById('voice');
function setVoice(on) {
  voiceOn = TTS.on = on && TTS.ok;
  voiceBtn.setAttribute('aria-pressed', String(voiceOn));
  voiceBtn.textContent = 'Voice: ' + (voiceOn ? 'on' : 'off');
  if (on && !voiceOn) voiceBtn.textContent = 'Voice: not available';
  if (!voiceOn) TTS.cancel();
}
voiceBtn.addEventListener('click', () => setVoice(!voiceOn));
const guestPanel = document.getElementById('guest');
document.getElementById('guestToggle').addEventListener('click', () => {
  guestPanel.hidden = !guestPanel.hidden;
});
document.getElementById('guestClose').addEventListener('click', () => {
  guestPanel.hidden = true;
});
// ---------- the intro page: choose the teacher ----------
const intro = { el: document.getElementById('intro'), cards: document.getElementById('teacherCards'), pick: TEACHER.id, entered: false, built: false };
const voicePick = document.getElementById('voicePick');
function buildTeacherCards() {
  intro.cards.innerHTML = '';
  for (const id in TEACHERS) {
    const T = TEACHERS[id],
      c = T.card;
    const card = document.createElement('div');
    card.className = 'tcard';
    card.dataset.id = id;
    // a real radio button inside the label gives the radio-group keyboard behaviour (arrow keys) for free
    const lab = document.createElement('label');
    lab.className = 'tpick';
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = 'teacher';
    r.value = id;
    r.className = 'sr';
    r.addEventListener('change', () => r.checked && pickTeacher(id));
    const img = document.createElement('img');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(T.art.svg);
    img.alt = T.alt;
    img.width = 96;
    img.height = 115;
    const nm = document.createElement('span');
    nm.className = 'tname';
    nm.innerHTML = '<b lang="ja"></b><span></span><i></i>';
    nm.children[0].textContent = T.nameJa;
    nm.children[1].textContent = T.romaji;
    nm.children[2].textContent = c.role.en;
    lab.append(r, img, nm);
    const pers = document.createElement('p');
    pers.className = 'pers';
    pers.textContent = c.personality.en;
    const pj = document.createElement('p');
    pj.className = 'pers-ja';
    pj.lang = 'ja';
    pj.textContent = c.personality.ja;
    const chips = document.createElement('ul');
    chips.className = 'chips';
    chips.setAttribute('aria-label', 'Traits');
    for (const tr of c.traits) {
      const li = document.createElement('li');
      li.innerHTML = '<span></span> <span lang="ja"></span>';
      li.children[0].textContent = tr.en;
      li.children[1].textContent = tr.ja;
      chips.appendChild(li);
    }
    const sample = document.createElement('button');
    sample.type = 'button';
    sample.className = 'btn sample';
    sample.textContent = 'Hear a sample';
    sample.setAttribute('aria-label', 'Hear a sample of ' + T.name);
    sample.addEventListener('click', (e) => {
      e.stopPropagation();
      pickTeacher(id);
      TTS.say(T.greeting, { force: true, teacher: T, mouth: false });
      const box = card.querySelector('.say');
      box.hidden = false;
      box.textContent = '';
      const ja = document.createElement('span');
      if (T.greeting.ja) {
        ja.lang = 'ja';
        ja.textContent = T.greeting.ja;
        const en = document.createElement('small');
        en.textContent = T.greeting.en;
        box.append(ja, en);
      } else box.textContent = T.greeting.en;
    });
    const said = document.createElement('p');
    said.className = 'say';
    said.hidden = true;
    said.setAttribute('aria-live', 'polite');
    card.append(lab, pers, pj, chips, sample, said);
    if (T.credit) {
      const cr = document.createElement('small');
      cr.className = 'credit';
      cr.textContent = T.credit;
      card.append(cr);
    }
    // a click anywhere on the card chooses it
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      r.checked = true;
      pickTeacher(id);
    });
    intro.cards.appendChild(card);
  }
  intro.built = true;
}
// the 3D instructor selector (React, inlined by tools/build.js as window.SadoSelector) replaces the two hand-made cards;
// without it (a build without the selector bundle) the hand-made cards above are used for every teacher.
function buildSelector() {
  if (!window.SadoSelector || !window.SadoSelector.mountSelector) return buildTeacherCards();
  intro.cards.removeAttribute('role');
  intro.cards.removeAttribute('aria-labelledby');
  intro.cards.className = 'selector-host';
  const h = document.getElementById('pickH');
  if (h) h.remove(); // the selector brings its own heading
  intro.el.classList.add('has-selector');
  intro.selector = window.SadoSelector.mountSelector(intro.cards, {
    currentId: TEACHER.id,
    onChoose: (id) => {
      if (!TEACHERS[id]) return;
      pickTeacher(id, true);
      if (TTS.showFor) TTS.showFor(id);
    },
    speak: speakGreeting,
    // on a wide screen the dossier sits beside the cards, in view: its own Enter button saves scrolling to the one below
    onEnter: () => document.getElementById('start').click(),
    enterLabel: () => document.getElementById('start').textContent,
  });
  intro.built = true;
}
// the sample greeting when a card is chosen (or "Hear the greeting"), through 06-tts: the character's engine or browser voice.
// Choosing a card is silent when the "Read the explanations aloud" box is unticked; the explicit "Hear the greeting" button
// (o.explicit) always speaks. The promise settles when the voice stops (talking animation).
function speakGreeting(id, o) {
  const T = TEACHERS[id];
  // silent (voice box unticked, or no voice): a settled promise, so the selector card does not mime a greeting nobody hears
  if (!T || !TTS.ok || (!(o && o.explicit) && !document.getElementById('voiceStart').checked)) return Promise.resolve();
  return new Promise((done) => {
    TTS.say(T.greeting, { force: true, teacher: T, mouth: false, onEnd: () => done() });
    setTimeout(done, 20000);
  });
}
function pickTeacher(id, fromSelector) {
  intro.pick = id;
  if (intro.selector) {
    if (!fromSelector) intro.selector.setCurrent(id);
  } else
    for (const card of intro.cards.children) {
      const on = card.dataset.id === id;
      card.classList.toggle('on', on);
      card.querySelector('input').checked = on;
    }
  updateVoiceCopy();
  if (TTS.showFor) TTS.showFor(id);
  fillVoicePick();
}
// the Voice selector: the installed voices of the chosen teacher's language, best first; "Automatic" uses the ranking
function updateVoiceCopy() {
  const T = TEACHERS[intro.pick];
  const english = TTS.language === 'en';
  const description = english ? T.intro.replace(/in Japanese,? with English subtitles/, 'in English') : T.intro;
  document.getElementById('introText').textContent = 'No headset needed. ' + description;
  document.getElementById('voiceLabel').textContent = english ? 'Read the explanations aloud in English' : T.voiceLabel;
}
function fillVoicePick() {
  const T = TEACHERS[intro.pick];
  const list = TTS.voicesFor(T);
  const note = TTS.plan(T).fallback ? ' (English browser fallback)' : '';
  const own = TTS.chosenName(T.id);
  voicePick.innerHTML = '';
  const auto = document.createElement('option');
  auto.value = '';
  auto.textContent = 'Automatic' + note;
  voicePick.appendChild(auto);
  for (const v of list) {
    const o = document.createElement('option');
    o.value = v.name;
    o.textContent = v.name + ' · ' + v.lang;
    voicePick.appendChild(o);
  }
  voicePick.value = list.some((v) => v.name === own) ? own : '';
  voicePick.disabled = !TTS.ok;
}
voicePick.addEventListener('change', () => TTS.setChosen(intro.pick, voicePick.value));
TTS.onVoices(() => intro.built && fillVoicePick());
const languageControls = ['introLanguage', 'lessonLanguage'].map(id => document.getElementById(id));
function syncLanguage() {
  const language = TTS.language;
  document.documentElement.dataset.narration = language;
  for (const control of languageControls) control.value = language;
}
for (const control of languageControls) {
  control.addEventListener('change', () => {
    TTS.setLanguage(control.value);
    syncLanguage();
    updateVoiceCopy();
    fillVoicePick();
    showLine(displayedLine);
    if (intro.el.hidden && voiceOn && playing && displayedLine) {
      speak(displayedLine);
      lineTalk(displayedLine);
    }
  });
}
syncLanguage();
function openIntro() {
  document.getElementById('start').textContent = intro.entered ? 'Back to the tea room' : 'Enter the tea room'; // before the selector renders (it shows the same label)
  if (!intro.built) buildSelector();
  pickTeacher(TEACHER.id);
  if (intro.entered) document.getElementById('voiceStart').checked = voiceOn; // keep the header's Voice setting
  intro.el.hidden = false;
  setBehind(true);
  paused = intro.entered; // the lesson waits behind the page
  TTS.cancel();
  // focus the chosen teacher (the React selector draws its cards a moment after it is mounted)
  const focusCur = (tries) => {
    const cur = intro.cards.querySelector('.tcard.on input, [role="radio"][aria-checked="true"]');
    if (cur) cur.focus({ preventScroll: true });
    else if (tries > 0) setTimeout(() => focusCur(tries - 1), 50);
  };
  focusCur(20);
}
// while the teacher page is open, the room behind it is out of reach (a modal for keyboard and screen-reader users)
function setBehind(off) {
  for (const el of intro.el.parentNode.children) {
    if (el === intro.el || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    if (off) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }
}
// make a teacher the host: rebuild the avatar, recolour the fukusa, retell the texts. Restarts at step 1.
function setTeacher(id) {
  if (!TEACHERS[id]) return false;
  const changed = TEACHER.id !== id;
  TEACHER = TEACHERS[id];
  rememberTeacher(id);
  if (changed) {
    AVATAR.dispose();
    AVATAR = makeAvatar(TEACHER);
  }
  applyTeacher();
  return changed;
}
function applyTeacher() {
  if (!O.fukusa.userData.teacherMat) {
    O.fukusa.material = O.fukusa.material.clone(); // the silk is shared with the flower in the alcove
    O.fukusa.userData.teacherMat = true;
  }
  if (!O.fukusa.material.onBeforeCompile || !/fukusa/.test(String(O.fukusa.material.customProgramCacheKey && O.fukusa.material.customProgramCacheKey()))) fukusaPatchMaterial(O.fukusa.material); // a clone drops the two-sided patch
  O.fukusa.material.color.set(TEACHER.fukusa); // raw hex, like every material here (shizue's stays exactly as it was)
  const tb = document.getElementById('teacherBtn'); // the bare short name so the header stays on one row at 1280px
  const words = TEACHER.name.replace(/-sensei$/, '').split(' '),
    last = words[words.length - 1];
  tb.textContent = last.length > 2 ? last : words.join(' ');
  tb.setAttribute('aria-label', 'Teacher: ' + TEACHER.name + '. Choose another teacher');
  document.getElementById('askTitle').textContent = 'Ask ' + TEACHER.name;
}
document.getElementById('start').addEventListener('click', () => {
  intro.el.hidden = true;
  setBehind(false);
  setVoice(document.getElementById('voiceStart').checked); // this click is the gesture browsers need before they will speak
  paused = false;
  const changed = setTeacher(intro.pick);
  try { history.replaceState(null, '', '#' + new URLSearchParams({ teacher: TEACHER.id })); } catch (e) {}
  if (!intro.entered) loadStep(0);
  else if (changed) {
    loadStep(0);
    goCam('guest');
  }
  const wasEntered = intro.entered;
  intro.entered = true;
  // the page was a modal over the room: give focus back to the header button that reopens it (not to <body>)
  if (wasEntered) document.getElementById('teacherBtn').focus({ preventScroll: true });
});
// Escape closes the teacher page once the lesson has been entered, without changing the teacher
function closeIntro() {
  if (intro.el.hidden || !intro.entered) return;
  intro.el.hidden = true;
  setBehind(false);
  paused = false;
  TTS.cancel(); // a sample greeting must not run on over the lesson
  if (intro.pick !== TEACHER.id) {
    pickTeacher(TEACHER.id); // the page shows the current teacher next time
    if (TTS.showFor) TTS.showFor(TEACHER.id);
  }
  document.getElementById('teacherBtn').focus({ preventScroll: true });
}
document.getElementById('teacherBtn').addEventListener('click', openIntro);
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!intro.el.hidden) {
    // the teacher page is open: the lesson behind it must not move. Enter on a teacher radio enters the room.
    if (e.key === 'Escape') {
      closeIntro();
      return;
    }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.tcard input, #sado-selector [role="radio"]')) {
      e.preventDefault();
      document.getElementById('start').click();
    }
    return;
  }
  const k = e.key.toLowerCase();
  if (STEPS[step].interactive && phase === 2 && !game.done && (k === 'arrowleft' || k === 'arrowright' || k === 'a' || k === 'd')) {
    e.preventDefault();
    whiskKey(k === 'arrowleft' || k === 'a' ? -1 : 1);
    return;
  }
  if (e.target.closest && e.target.closest('input,select,textarea')) return; // radios, the voice checkbox and selector keep their own keys
  if (e.target.tagName === 'BUTTON' && e.key !== 'Escape') return;
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    ui.next.click();
  } else if (e.key === 'ArrowLeft') {
    ui.back.click();
  } else if (e.key.toLowerCase() === 'r') {
    ui.repeat.click();
  }
});
