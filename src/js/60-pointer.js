// ---------- pointer: orbit, tap-to-identify, whisk game ----------
const ray = new THREE.Raycaster(),
  ndc = new THREE.Vector2(),
  tip = document.getElementById('tip');
let drag = null,
  pinch = null,
  moved = 0;
function pointerNDC(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
  moved = 0;
  canvas.classList.add('grabbing');
  tip.hidden = true;
});
canvas.addEventListener('pointermove', (e) => {
  if (STEPS[step].interactive && phase === 2 && !game.done) whiskInput(e);
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  moved += Math.abs(dx) + Math.abs(dy);
  drag.x = e.clientX;
  drag.y = e.clientY;
  if (STEPS[step].interactive && phase === 2 && !game.done) return;
  if (typeof drinkView !== 'undefined' && drinkView) {
    stopDrinkView();
  }
  cam.goal = null;
  cam.theta -= dx * 0.005;
  cam.phi = Math.max(0.2, Math.min(1.45, cam.phi - dy * 0.005));
});
canvas.addEventListener('pointerup', (e) => {
  canvas.classList.remove('grabbing');
  if (drag && moved < 6) {
    pointerNDC(e);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(clickable, false)[0];
    if (hit && STEPS[step].interactive && guestClick(hit.object)) {
      drag = null;
      return;
    }
    if (hit) {
      const u = hit.object.userData;
      tip.innerHTML = `<b>${u.name} <span style="font-weight:400">${u.jp}</span></b><small>${u.desc}</small>`;
      tip.style.left = e.clientX + 'px';
      tip.style.top = e.clientY + 'px';
      tip.hidden = false;
      speak(u.name + '. ' + u.desc);
    }
  }
  drag = null;
});
canvas.addEventListener('pointercancel', () => {
  drag = null;
  canvas.classList.remove('grabbing');
});
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    stopDrinkView();
    cam.goal = null;
    cam.r = Math.max(0.4, Math.min(3.5, cam.r * (1 + e.deltaY * 0.001)));
  },
  { passive: false },
);
canvas.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length === 2) {
      pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  },
  { passive: true },
);
canvas.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length === 2 && pinch) {
      stopDrinkView();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      cam.goal = null;
      cam.r = Math.max(0.4, Math.min(3.5, cam.r * (pinch / d)));
      pinch = d;
      drag = null;
    }
  },
  { passive: true },
);
canvas.addEventListener(
  'touchend',
  () => {
    pinch = null;
  },
  { passive: true },
);
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05),
  hitP = new THREE.Vector3();
// The guest whisks: with the pointer over the bowl, or with the left and right arrow keys pressed in turn.
function whiskAt(dx, dz, gain) {
  const cx = O.bowl.position.x,
    cz = O.bowl.position.z;
  O.chasen.position.set(cx + dx, 0.127, cz + dz); // tines down in the tea
  O.chasen.rotation.x = Math.PI;
  if (gain > 0 && !game.t0) game.t0 = performance.now();
  game.meter = Math.min(1, game.meter + gain);
  ui.meterFill.style.width = (game.meter * 100).toFixed(0) + '%';
  O.froth.visible = game.meter > 0.08;
  O.froth.scale.set(Math.min(1, game.meter * 1.1), 1, Math.min(1, game.meter * 1.1));
  if (game.meter >= 1 && !game.done) {
    game.done = true;
    ui.meterText.textContent = `Beautiful foam in ${((performance.now() - game.t0) / 1000).toFixed(1)} seconds. Now drink it as a guest.`;
    const said = teacherSays('whiskDone', 0, 'Well done. Now receive the bowl as a guest: press Drink and follow the steps.');
    showLine(said);
    speak(said);
    lineTalk(said);
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = 'Drink';
    b.id = 'drink';
    b.addEventListener('click', () => {
      startDrinkSeq();
    });
    document.querySelector('.ctrl').prepend(b);
    b.focus({ preventScroll: true });
  }
}
function whiskInput(e) {
  pointerNDC(e);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, hitP)) return;
  hitP.x *= MX; // the stage is mirrored
  let dx = hitP.x - O.bowl.position.x,
    dz = hitP.z - O.bowl.position.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.045) {
    dx *= 0.045 / d;
    dz *= 0.045 / d;
  }
  // foam comes from quick changes of direction (the strokes of the letter M), not from distance alone
  let gain = 0;
  if (game.lastP && d < 0.07) {
    const mx = hitP.x - game.lastP.x;
    gain = Math.hypot(mx, hitP.z - game.lastP.z) * 0.3;
    const sgn = Math.sign(mx);
    if (Math.abs(mx) > 0.002) {
      if (game.dir && sgn !== game.dir && game.run > 0.012) gain += 0.035;
      if (sgn !== game.dir) game.run = 0;
      game.dir = sgn;
      game.run += Math.abs(mx);
    }
  }
  game.lastP = hitP.clone();
  whiskAt(dx, dz, gain);
}
let whiskKeyLast = 0;
function whiskKey(dir) {
  const gain = dir !== whiskKeyLast ? 0.04 : 0.004; // only alternating strokes build foam
  whiskKeyLast = dir;
  whiskAt(dir * 0.03, (Math.random() - 0.5) * 0.02, gain);
}
