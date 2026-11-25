// UI screenshots: intro card, a step with the pose strip, the end card. node tools/ui-shot.js <html> <outPrefix> [WxH] [mobile]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [html, out, size = '1280x800', mobile] = process.argv.slice(2);
  const [w, h] = size.split('x').map(Number);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.route(/three(\.min)?\.js/, r => r.fulfill({ path: path.resolve(__dirname, '../vendor/three.min.js'), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(html) + (process.env.SADO_TEACHER ? '#teacher=' + process.env.SADO_TEACHER : '')); // SADO_TEACHER=ifu picks him
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}-intro.png` });
  await p.click('#start');
  await p.waitForTimeout(6600);
  await p.screenshot({ path: `${out}-step1.png` });
  await p.evaluate(() => window.__sado.go(6, 7)); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}-step7.png` });
  await p.evaluate(() => window.__sado.go(8, 0)); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}-step9.png` });
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
  console.log('overflow', JSON.stringify(ov), 'ERRORS', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
