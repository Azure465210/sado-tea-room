// End-to-end click-through: every step with Next, motion toggle, camera presets, pose pictures, then the guest part to the end card.
//   node tools/flow-test.js <html> [--teacher <id>[,<id>...]]   (any teacher id of 05-teachers: shizue, ifu or a navigator such as
//   zundamon; default: shizue and ifu, one after the other; each run ends with a teacher switch)
const { chromium } = require('playwright');
const path = require('path');
const argv = process.argv.slice(2), ti = argv.indexOf('--teacher');
const html = argv[0], only = ti < 0 ? null : argv[ti + 1];
async function run(b, teacher) {
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errs = [];
  const say = (...a) => console.log(...a);
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.route(/three(\.min)?\.js/, r => r.fulfill({ path: path.resolve(__dirname, '../vendor/three.min.js'), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(html) + '#teacher=' + teacher);
  await p.waitForTimeout(1000);
  await p.waitForSelector('#teacherCards [data-id]');
  say('=== teacher:', teacher, '| intro cards:', await p.$$eval('#teacherCards [data-id]', (c) => c.map((x) => x.dataset.id + (x.classList.contains('on') || x.getAttribute('aria-checked') === 'true' ? '*' : '')).join(' ')));
  await p.click('#start');
  say('teacher in charge:', await p.evaluate(() => window.__sado.teacher()), '| fukusa colour:', await p.evaluate(() => '#' + window.__sado.O.fukusa.material.color.getHexString()), '| navigator window:', await p.evaluate(() => { const n = document.getElementById('navWin'); return n.hidden ? 'hidden' : (n.querySelector('.sado-nav') || {}).getAttribute?.('aria-label') || 'empty'; }));
  const title = () => p.textContent('#stepTitle');
  const tick = s => p.evaluate(s => window.__sado.tick(s), s);
  const names = [];
  for (let i = 0; i < 8; i++) {
    names.push(await title());
    await tick(i % 2 ? 60 : 3); // play some steps to the end, leave others half-way
    if (i === 2) await p.click('#motionBtn'); if (i === 3) await p.click('#camClose'); if (i === 4) await p.click('#camTop'); if (i === 5) { await p.click('#camGuest'); await p.click('#motionBtn'); }
    await p.click('#next');
  }
  names.push(await title()); say('steps:', names.join(' | '));
  for (const n of [3, 1, 7, 4, 9, 2]) { await p.click(`#pills .pill:nth-child(${n})`); await tick(0.4); }
  say('after quick jumps:', await title());
  await p.click('#pills .pill:nth-child(1)'); await tick(1); await p.waitForTimeout(700);
  await p.click('#poses .pose:nth-child(3)'); await tick(0.6);
  say('pose picture 3 -> lean (deg):', await p.evaluate(() => Math.round(window.__sado.body().pitch * 57.3)), '| line:', await p.textContent('#line'), '| en:', await p.textContent('#lineEn'));
  await p.click('#pills .pill:nth-child(9)'); await tick(1);
  await p.click('#drink'); await tick(3); await p.waitForTimeout(1500); await tick(1);
  // the fan bow ends on a real-time timer (70-guest: a 40 ms interval after the fan tween): keep the scene running until the
  // phase really is 1, so the value printed is deterministic (it used to read 0 or 1 depending on the machine's load)
  for (let k = 0; k < 120 && (await p.evaluate(() => window.__sado.dbg().phase)) < 1; k++) { await tick(0.2); await p.waitForTimeout(150); }
  say('phase after the fan greeting:', await p.evaluate(() => window.__sado.dbg().phase));
  // the navigator window must talk while a line is said and stop afterwards (52-navigator; voice off: the caption timer)
  if (await p.evaluate(() => window.__sadoNav && window.__sadoNav().on)) {
    const nt = await p.evaluate(async () => {
      const seq = [], N = window.__sadoNav, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      N.line({ ja: 'テストなのだ。', en: 'A test.', yomi: 'てすとなのだ。' });
      for (let i = 0; i < 80; i++) { seq.push(N().talking ? 1 : 0); if (i > 3 && !N().talking && seq.includes(1)) break; await wait(100); }
      return seq.join('') + (N().voiced ? ' (voice on: speech or the 1.5 s fallback)' : ' (voice off: caption timer)');
    });
    say('navigator window talking during a line (0 = still, 1 = talking):', nt, /^0*1+0+ /.test(nt) ? 'ok' : '!! expected 0..1..0');
  }
  await p.click('#drink'); await tick(14); await p.waitForTimeout(300);
  say('phase after the sweet:', await p.evaluate(() => window.__sado.dbg().phase));
  let presses = 0;
  for (; presses < 200; presses++) { await p.keyboard.press(presses % 2 ? 'ArrowLeft' : 'ArrowRight'); if (presses % 5 === 4) await tick(0.3); if (await p.$('#drink')) break; }
  say('alternating key presses until the foam is ready:', presses + 1, '|', await p.textContent('#meterText'));
  for (let i = 0; i < 16; i++) { const d = await p.$('#drink'); if (!d) break; say('  button:', (await d.textContent()).padEnd(18), '|', (await p.textContent('#line')).slice(0, 78)); await d.click(); await tick(1.2); }
  say('end card visible:', await p.evaluate(() => !document.getElementById('endCard').hidden), '| bowl yaw at the end:', await p.evaluate(() => +window.__sado.O.bowl.rotation.y.toFixed(2)));
  await p.screenshot({ path: path.resolve(__dirname, '../shots/flow-end.png') });
  await p.click('#endAgain'); await tick(0.5);
  say('after "Watch again":', await title(), '| end card hidden:', await p.evaluate(() => document.getElementById('endCard').hidden));
  // switch teacher through the header button and the cards, then back with the tool hook
  const other = teacher === 'ifu' ? 'shizue' : 'ifu';
  await p.click('#teacherBtn');
  await p.click(`#teacherCards [data-id="${other}"]`);
  await p.click('#start'); await tick(2);
  say('after choosing', other, 'in the header:', await p.evaluate(() => window.__sado.teacher()), '|', await title(), '| line:', (await p.textContent('#line')).slice(0, 60));
  await p.evaluate((t) => window.__sado.setTeacher(t), teacher); await tick(1);
  say('back with __sado.setTeacher:', await p.evaluate(() => window.__sado.teacher()), '| clickable count:', await p.evaluate(() => window.__sado.clickableCount()));
  say('ERRORS', JSON.stringify(errs));
  await p.close();
  return errs.length;
}
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let n = 0;
  for (const t of only ? only.split(',') : ['shizue', 'ifu']) n += await run(b, t);
  await b.close();
  if (n) process.exit(2);
})().catch(e => { console.error(String(e).slice(0, 600)); process.exit(1); });
