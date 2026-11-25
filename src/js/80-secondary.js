// ---------- secondary motion: pouring and liquids (gaze, lean and hands are part of the host) ----------
const _kettleTop = new THREE.Vector3(KAMA[0], 0.26, KAMA[2]);
function secondary(dt) {
  const s = STEPS[step];
  // pour stream: while the ladle is tilted over something, water falls from the cup
  const h = O.hishaku,
    tilt = Math.abs(h.rotation.z);
  const st = O.stream;
  // water falls only while the cup is tipped over the bowl or the kettle (not while the ladle is simply held upright)
  const overBowl = Math.hypot(h.position.x - O.bowl.position.x, h.position.z - O.bowl.position.z) < 0.09,
    overKettle = Math.hypot(h.position.x - KAMA[0], h.position.z - KAMA[2]) < 0.09;
  if (tilt > 0.3 && tilt < 1.2 && (overBowl || overKettle) && !s.interactive) {
    const over = overBowl ? O.bowl.position : _kettleTop;
    const top = h.position.y - 0.02,
      bottom = Math.max(over.y + 0.03, top - 0.25);
    st.visible = true;
    st.position.set(h.position.x - 0.015, (top + bottom) / 2, h.position.z);
    st.scale.set(1, Math.max(0.01, top - bottom), 1);
    st.material.opacity = 0.7 * Math.min(1, (tilt - 0.3) / 0.15);
  } else st.visible = false;
  // liquids rise instead of appearing
  for (const o of [O.water, O.tea]) {
    if (o.visible) {
      o.userData.r = Math.min(1, (o.userData.r || 0.1) + dt * 1.6);
      o.scale.set(1, o.userData.r, 1);
      o.position.y = 0.024 + 0.006 * o.userData.r;
    } else o.userData.r = 0.1;
  }
}
