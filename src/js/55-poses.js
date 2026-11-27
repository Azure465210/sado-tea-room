// ---------- pose pictures: each step shows its key poses as small pictures; the host switches from one to the next ----------
// A step's `poses` list is [time, English name, Japanese name, note]. The pictures are rendered from the scene itself, so they
// always show exactly the pose the host takes at that moment. Tap a picture to jump to it.
const poseUI = { box: document.getElementById('poses'), cards: [], queue: [], rt: null, buf: null, cam: null, w: 240, h: 180, current: -1, snapOnce: false };
poseUI.cam = new THREE.PerspectiveCamera(27, poseUI.w / poseUI.h, 0.05, 30);
function buildPoseStrip(stepIndex) {
  const s = STEPS[stepIndex],
    box = poseUI.box;
  box.innerHTML = '';
  poseUI.cards = [];
  poseUI.queue.length = 0;
  poseUI.current = -1;
  const list = s.poses || [];
  box.hidden = !list.length;
  list.forEach((p, n) => {
    const b = document.createElement('button');
    b.className = 'pose';
    b.title = p[3] || '';
    b.setAttribute('aria-label', `Pose ${n + 1}: ${p[1]}${p[3] ? ', ' + p[3] : ''}. Jump to this moment.`);
    const c = document.createElement('canvas');
    c.width = poseUI.w;
    c.height = poseUI.h;
    const cap = document.createElement('span');
    cap.className = 'cap';
    const num = document.createElement('i');
    num.textContent = n + 1;
    const en = document.createElement('b');
    en.textContent = p[1];
    const jp = document.createElement('span');
    jp.lang = 'ja';
    jp.textContent = p[2] || '';
    cap.append(num, en, jp);
    b.append(c, cap);
    b.addEventListener('click', () => seekTo(stepIndex, p[0]));
    box.appendChild(b);
    poseUI.cards.push({ el: b, canvas: c, time: p[0] });
    poseUI.queue.push(n);
  });
}
// draw one waiting picture per frame, so a step never opens with a hitch
function poseTick(s, time) {
  if (poseUI.queue.length && !s.interactive) {
    const n = poseUI.queue.shift(),
      card = poseUI.cards[n];
    if (card) renderPose(s, card);
    poseUI.snapOnce = true; // the live pose is recomputed from scratch right after
  }
  let cur = -1;
  poseUI.cards.forEach((c, i) => {
    if (time >= c.time - 0.35) cur = i;
  });
  if (cur !== poseUI.current) {
    poseUI.current = cur;
    poseUI.cards.forEach((c, i) => {
      c.el.classList.toggle('on', i === cur);
      c.el.classList.toggle('seen', i < cur);
    });
    if (cur >= 0 && poseUI.cards[cur].el.scrollIntoView && (poseUI.box.scrollWidth > poseUI.box.clientWidth + 4 || poseUI.box.scrollHeight > poseUI.box.clientHeight + 4)) {
      poseUI.box.scrollLeft = Math.max(0, poseUI.cards[cur].el.offsetLeft - 40);
      poseUI.box.scrollTop = Math.max(0, poseUI.cards[cur].el.offsetTop - 60);
    }
  }
}
function evalAt(s, time, snap) {
  // put the whole scene in the state it has at `time` of step s (the choreography is a pure function of time)
  resetRest();
  applyInit(s);
  applyTracks(s.tracks, time, time);
  chasenTurn(s, time, 0);
  hostUpdate(s, time, 0, snap);
  applyShortfall(s, time);
  chasenTurn(s, time, 1);
}
function renderPose(s, card) {
  const w = poseUI.w,
    h = poseUI.h;
  if (!poseUI.rt) {
    poseUI.rt = new THREE.WebGLRenderTarget(w, h);
    poseUI.rt.texture.encoding = THREE.sRGBEncoding;
    poseUI.buf = new Uint8Array(w * h * 4);
  }
  evalAt(s, card.time, true);
  // a three-quarter view from the side away from the kettle; further back when she is standing
  const up = Math.max(0, RIG.S.legs - 0.5) / 1.5;
  poseUI.cam.position.set(0.7 * MX, 1.0 + 0.35 * up, 1.75 + 1.3 * up);
  poseUI.cam.lookAt(-0.02 * MX, 0.46 + 0.42 * up, 0.02);
  renderer.setRenderTarget(poseUI.rt);
  renderer.render(scene, poseUI.cam);
  renderer.readRenderTargetPixels(poseUI.rt, 0, 0, w, h, poseUI.buf);
  renderer.setRenderTarget(null);
  const g = card.canvas.getContext('2d'),
    img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(poseUI.buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); // the GPU's rows run bottom-up
  g.putImageData(img, 0, 0);
}
function seekTo(stepIndex, time) {
  if (step !== stepIndex) loadStep(stepIndex);
  if (stepIndex === 2 && ((time >= 9.5 && time <= 29) || (time >= 33.6 && time <= 39.1))) goCam('close');
  const s = STEPS[step];
  t = Math.max(0, Math.min(s.dur, time));
  lineIdx = s.lines.filter((l) => l[0] <= t).length;
  showLine(lineIdx ? teacherLines(step)[lineIdx - 1][1] : '');
  playing = !s.interactive;
  finished = false;
  paused = false;
  ui.next.classList.remove('pulse');
}
