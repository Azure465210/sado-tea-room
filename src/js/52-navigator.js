// ---------- the navigator window ----------
// With a navigator teacher (05-teachers: teaRole 'navigator'), Shizue-sensei performs silently and the navigator's 3D bust
// talks from a small framed window (window.SadoSelector.mountNavigator, the React bundle). It is placed where it never covers
// the host, the caption or the controls: in the free corner right of the caption on wide screens, else as a compact window
// just above the caption at the right. Talking follows the voice (TTS.onTalk) and, without a voice, the caption's length.
const navEl = document.getElementById('navWin');
const nav = { handle: null, handles: [], ids: [], id: null, talkUntil: 0, voiceTalk: false, on: false };
function navApply() {
  const T = TEACHER,
    on = isNavigatorTeacher(T) && !!(window.SadoSelector && window.SadoSelector.mountNavigator);
  nav.on = on;
  navEl.hidden = !on;
  nav.handles.forEach(h => h.handle.dispose());
  nav.handles = [];
  nav.handle = null;
  navEl.replaceChildren();
  if (!on) return;
  nav.ids = activePair() ? activePair().members : [T.narrator || T.id];
  navEl.classList.toggle('duo', nav.ids.length > 1);
  nav.handles = nav.ids.map(id => {
    const el = document.createElement('div');
    navEl.appendChild(el);
    return {id,handle:window.SadoSelector.mountNavigator(el,{id})};
  });
  nav.handle = nav.handles[0].handle;
  nav.id = T.narrator || T.id;
  nav.talkUntil = 0;
  nav.waitVoice = 0;
  nav.voiceTalk = false;
  nav.talking = false;
  nav.handle.setTalking(false);
  navPlace();
}
// a caption line starts: the host's mouth moves for a performer, the navigator window talks for a navigator
function lineTalk(u) {
  const until = performance.now() / 1000 + talkTime(u);
  if (isNavigatorTeacher(TEACHER)) navLine(u);
  else hostState.talkUntil = until;
}
// the guest-part lines (whisk done, guest prompts) only animate the navigator; the host stays as she always was there
function navTalk(u) {
  if (u && isNavigatorTeacher(TEACHER)) navLine(u);
}
// while the line is voiced, the window talks only while the speech really plays (TTS.onTalk); the caption-length timer
// is used when the voice is off, or when no speech has started within 1.5 s (the engine or the browser voice failed)
function navLine(u) {
  nav.id = u && u.speaker || TEACHER.narrator || TEACHER.id;
  const now = performance.now() / 1000,
    est = now + talkTime(u);
  if (typeof voiceOn !== 'undefined' && voiceOn && TTS.ok && TTS.on) {
    nav.talkUntil = 0;
    nav.lineDur = est - now;
    nav.waitVoice = nav.voiceTalk ? 0 : now + 1.5; // the speech may already have started (speak() runs first)
  } else {
    nav.waitVoice = 0;
    nav.talkUntil = est;
  }
}
TTS.onTalk((on, id) => {
  if (on && nav.ids.includes(id)) nav.id = id;
  nav.voiceTalk = !!on && nav.ids.includes(id);
  if (nav.voiceTalk) nav.waitVoice = 0;
});
nav.talking = false;
setInterval(() => {
  if (!nav.on || !nav.handle) return;
  const now = performance.now() / 1000;
  if (nav.waitVoice && now > nav.waitVoice) {
    nav.waitVoice = 0;
    nav.talkUntil = now + nav.lineDur; // no speech came: fall back to the caption estimate, from now
  }
  nav.talking = nav.voiceTalk || now < nav.talkUntil;
  nav.handles.forEach(h => h.handle.setTalking(nav.talking && h.id === nav.id));
}, 100);
// tools only (flow test): the window's state, and .line(unit) starts a caption line's talking as the lesson does
window.__sadoNav = Object.assign(() => ({ on: nav.on, id: nav.id, talking: nav.talking, voiceTalk: nav.voiceTalk, waiting: !!nav.waitVoice, voiced: typeof voiceOn !== 'undefined' && voiceOn }), { line: (u) => lineTalk(u) });
// placement: measured against the caption box, the Ask drawer and the window size
function navPlace() {
  if (!nav.on) return;
  const W = innerWidth,
    H = innerHeight,
    gut = 16,
    gap = 10;
  const bottom = document.getElementById('bottom'),
    sub = bottom.querySelector('.sub').getBoundingClientRect(),
    ctrl = bottom.querySelector('.ctrl').getBoundingClientRect(),
    meter = document.getElementById('meter'),
    meterR = meter.classList.contains('on') ? meter.getBoundingClientRect() : null;
  const askEl = document.getElementById('ask'),
    askR = getComputedStyle(askEl).display !== 'none' ? askEl.getBoundingClientRect() : null;
  const right = Math.max(gut, parseFloat(getComputedStyle(bottom).paddingRight) || gut);
  if (typeof drinkView !== 'undefined' && drinkView) {
    navEl.style.width = Math.round(nav.ids.length > 1 ? Math.min(220,Math.max(140,W * 0.26)) : Math.min(130,W * 0.22)) + 'px';
    navEl.style.right = right + 'px';
    navEl.style.top = (document.getElementById('top').getBoundingClientRect().bottom + 10) + 'px';
    navEl.style.bottom = 'auto';
    navEl.classList.add('compact');
    return;
  }
  if (nav.ids.length > 1) {
    const sideRoom = W - right - Math.max(sub.right, ctrl.right) - gap;
    const width = sideRoom >= 240 ? Math.min(300,sideRoom) : Math.min(280, W * 0.48);
    const askLow = askR && askR.top > H * 0.4;
    const above = Math.min(sub.top, meterR ? meterR.top : sub.top, askLow ? askR.top : Infinity);
    navEl.style.width = Math.round(width) + 'px';
    navEl.style.right = right + 'px';
    navEl.style.top = 'auto';
    navEl.style.bottom = (sideRoom >= 240 ? gut : Math.round(H - above + gap)) + 'px';
    navEl.classList.add('compact');
    return;
  }
  const plate = 30; // the name plate under the square view
  // 1) the corner right of the caption (and of the buttons and the whisk meter)
  const busyRight = Math.max(sub.right, ctrl.right, meterR ? meterR.right : 0);
  let w = Math.min(220, W - right - busyRight - gap);
  const roomAbove = H - gut - (askR ? askR.bottom + gap : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 92) + gap);
  w = Math.min(w, roomAbove - plate);
  if (w >= 150) {
    navEl.style.width = w + 'px';
    navEl.style.right = right + 'px';
    navEl.style.top = 'auto';
    navEl.style.bottom = gut + 'px';
    navEl.classList.remove('compact');
    return;
  }
  // 2) compact. Phones (no Ask drawer at the side): top right, under the header and the pose strip, so the utensils on the
  // mat stay in view; otherwise just above the caption (and the whisk meter) at the right, under the Ask drawer.
  // on a phone the Ask drawer opens at the bottom, above the caption: then the window must stay above the drawer too
  const askLow = !!askR && askR.top > H * 0.4,
    top = Math.min(sub.top, meterR ? meterR.top : sub.top, askLow ? askR.top : Infinity);
  w = W < 400 ? 96 : W < 520 ? 104 : 140; // narrow phones: a little smaller, clear of the host's elbow at the kettle
  navEl.style.width = w + 'px';
  navEl.style.right = right + 'px';
  navEl.classList.add('compact');
  if (!askR || askLow) {
    const poses = document.getElementById('poses'),
      pr = !poses.hidden && getComputedStyle(poses).display !== 'none' ? poses.getBoundingClientRect() : null,
      topBar = document.getElementById('top').getBoundingClientRect().bottom,
      y = Math.max(topBar, pr && pr.right > W - right - w ? pr.bottom : 0) + 8;
    if (y + w + plate < top - 8) {
      navEl.style.top = Math.round(y) + 'px';
      navEl.style.bottom = 'auto';
      return;
    }
  }
  navEl.style.top = 'auto';
  navEl.style.bottom = Math.round(H - top + 8) + 'px';
}
addEventListener('resize', navPlace);
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => navPlace());
  ro.observe(document.getElementById('bottom'));
  ro.observe(document.getElementById('ask'));
  ro.observe(document.getElementById('top'));
  ro.observe(document.getElementById('poses'));
}
