// Numeric audit of the host skeleton over the whole choreography.
//   node tools/audit.js <html> [--teacher shizue|ifu] [--motion pictures|smooth] [--dt 0.2] [--json out.json]
// Reports, per step: bone-length range (must be constant), the worst "short" (a hand that could not reach its grip point, metres),
// the worst "cut" (an arm passing through the trunk, lap or an obstacle, metres), the largest lean, and the moments they happen.
// For an avatar with the big wing sleeves (ifu) also the worst "sleeve-bowl": how deep a bowl vertex sits inside a sleeve (metres).
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const a = process.argv.slice(2);
  const opt = (n, d) => { const i = a.indexOf('--' + n); return i < 0 ? d : a[i + 1]; };
  const html = a[0], teacher = opt('teacher', 'shizue'), motion = opt('motion', 'pictures'), dt = +opt('dt', 0.2), json = opt('json', null);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.route(/three(\.min)?\.js/, r => r.fulfill({ path: path.resolve(__dirname, '../vendor/three.min.js'), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(html) + '#teacher=' + teacher);
  await p.waitForTimeout(800);
  await p.click('#start').catch(() => {});
  const res = await p.evaluate(({ motion, dt }) => {
    const S = window.__sado; S.setMotion(motion);
    const out = [];
    const AV = window.__sadoAvatar && window.__sadoAvatar(), wing = !!(AV && AV.style && AV.style.sleeves === 'wing' && AV.parts);
    const V3 = () => new THREE.Vector3();
    // a sleeve is a loft of elliptical rings (23-avatar Loft: 24 points a ring, point 0 = top, 6 = side, 12 = bottom); a point is
    // inside when it lies in one of the slices interpolated between neighbouring rings
    function sleeveDepth(sl, pts) {
      sl.updateMatrixWorld(true);
      const pos = sl.geometry.attributes.position.array, segs = 24, n = (pos.length / 3 - 2) / segs, R = [];
      for (let i = 0; i < n; i++) {
        const g = (j) => V3().fromArray(pos, (i * segs + j) * 3).applyMatrix4(sl.matrixWorld);
        const top = g(0), c = top.clone().add(g(segs / 2)).multiplyScalar(0.5);
        R.push({ c, U: top.sub(c), W: g(segs / 4).sub(c) });
      }
      let worst = 0;
      for (let i = 0; i < n - 1; i++) for (let s = 0; s <= 1.0001; s += 0.1) {
        const c = R[i].c.clone().lerp(R[i + 1].c, s), U = R[i].U.clone().lerp(R[i + 1].U, s), W = R[i].W.clone().lerp(R[i + 1].W, s);
        const lu = U.length(), lw = W.length(); if (lu < 1e-4 || lw < 1e-4) continue;
        const nrm = V3().crossVectors(U, W).normalize(), slab = R[i].c.distanceTo(R[i + 1].c) * 0.06 + 0.004;
        U.normalize(); W.normalize();
        for (const q of pts) {
          const d = V3().subVectors(q, c);
          if (Math.abs(d.dot(nrm)) > slab) continue;
          const e = Math.hypot(d.dot(U) / lu, d.dot(W) / lw);
          if (e < 1) worst = Math.max(worst, (1 - e) * Math.min(lu, lw));
        }
      }
      return worst;
    }
    function bowlPts() {
      const pts = [];
      S.O.bowl.updateMatrixWorld(true);
      S.O.bowl.traverse((o) => { if (o.isMesh && o.visible) { const a = o.geometry.attributes.position; for (let k = 0; k < a.count; k += 2) pts.push(V3().fromBufferAttribute(a, k).applyMatrix4(o.matrixWorld)); } });
      return pts;
    }
    S.STEPS.forEach((st, i) => {
      if (st.interactive) return;
      const r = { step: i + 1, title: st.title, dur: st.dur, n: 0, upper: [9, 0], fore: [9, 0], thigh: [9, 0], shin: [9, 0], maxShort: 0, shortAt: null, maxCut: 0, cutAt: null, maxPitch: 0, pitchAt: 0, shortMoments: [], cutMoments: [], maxSleeve: 0, sleeveAt: null, sleeveMoments: [] };
      for (let t = 0; t <= st.dur + 1e-6; t += dt) {
        const b = S.sample(i, +t.toFixed(3), motion === 'smooth' ? dt : 0); r.n++;
        for (const k of ['L', 'R']) {
          const h = b[k];
          for (const f of ['upper', 'fore', 'thigh', 'shin']) { r[f][0] = Math.min(r[f][0], h[f]); r[f][1] = Math.max(r[f][1], h[f]); }
          if (h.short > r.maxShort) { r.maxShort = h.short; r.shortAt = [k, +t.toFixed(2)]; }
          if (h.cut > r.maxCut) { r.maxCut = h.cut; r.cutAt = [k, +t.toFixed(2)]; }
          if (h.short > 0.015) r.shortMoments.push([k, +t.toFixed(2), h.short]);
          if (h.cut > 0.006) r.cutMoments.push([k, +t.toFixed(2), h.cut]);
        }
        if (b.pitch > r.maxPitch) { r.maxPitch = b.pitch; r.pitchAt = +t.toFixed(2); }
        if (wing) {
          const pts = bowlPts(), sl = AV.parts().sleeves;
          [['R', sl[0]], ['L', sl[1]]].forEach(([k, m]) => {
            const d = sleeveDepth(m, pts);
            if (d > r.maxSleeve) { r.maxSleeve = d; r.sleeveAt = [k, +t.toFixed(2)]; }
            if (d > 0.006) r.sleeveMoments.push([k, +t.toFixed(2), d]);
          });
        }
      }
      out.push(r);
    });
    return out;
  }, { motion, dt });
  for (const r of res) {
    const rng = v => v[0].toFixed(4) + (v[1] - v[0] > 1e-4 ? '..' + v[1].toFixed(4) + ' !!' : '');
    console.log(`step ${r.step} ${r.title} (${r.n} samples): upper ${rng(r.upper)} fore ${rng(r.fore)} thigh ${rng(r.thigh)} shin ${rng(r.shin)} | worst short ${(r.maxShort * 100).toFixed(1)} cm ${r.shortAt ? '@' + r.shortAt.join(' ') : ''} | worst cut ${(r.maxCut * 100).toFixed(1)} cm ${r.cutAt ? '@' + r.cutAt.join(' ') : ''} | max lean ${(r.maxPitch * 57.3).toFixed(0)} deg @${r.pitchAt}`);
    const grp = (m) => { const o = []; for (const x of m) { const l = o[o.length - 1]; if (l && l[0] === x[0] && x[1] - l[2] <= dt * 1.5) { l[2] = x[1]; l[3] = Math.max(l[3], x[2]); } else o.push([x[0], x[1], x[1], x[2]]); } return o.map(x => `${x[0]} ${x[1]}-${x[2]}s (${(x[3] * 100).toFixed(1)} cm)`).join(', '); };
    if (r.shortMoments.length) console.log('   short > 1.5 cm: ' + grp(r.shortMoments));
    if (r.cutMoments.length) console.log('   cut > 0.6 cm: ' + grp(r.cutMoments));
    if (r.sleeveAt || r.sleeveMoments.length) console.log(`   sleeve-bowl worst ${(r.maxSleeve * 100).toFixed(1)} cm @${r.sleeveAt.join(' ')}` + (r.sleeveMoments.length ? ' | > 0.6 cm: ' + grp(r.sleeveMoments) : ''));
  }
  if (json) fs.writeFileSync(json, JSON.stringify(res, null, 1));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
