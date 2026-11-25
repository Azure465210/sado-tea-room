// Screenshot helper for the built page.
//   node tools/shot.js <html> <outPrefix> "<step>:<t>[:cam[:theta,phi,r[,tx,ty,tz]]]" ...   (cam: guest | close | top | custom values)
//   options: --size 1280x800 --body (print skeleton numbers per shot) --hide-ui --teacher <any teacher id> (shizue, ifu, zundamon, ...)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf('--' + n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
  const size = (opt('size', '1280x800') + '').split('x').map(Number), body = opt('body', false), hideUi = opt('hide-ui', false), wait = +opt('wait', 700), teacher = opt('teacher', null);
  const [html, out, ...shots] = args;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: size[0], height: size[1] } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.route(/three(\.min)?\.js/, r => r.fulfill({ path: path.resolve(__dirname, '../vendor/three.min.js'), contentType: 'application/javascript' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(html) + (teacher ? '#teacher=' + teacher : ''));
  await p.waitForTimeout(1200);
  if (errs.length) { console.log('ERRORS', JSON.stringify(errs)); }
  await p.click('#start').catch(() => {});
  if (hideUi) await p.addStyleTag({ content: '.ui,#intro{display:none!important}' });
  let shotN = 0;
  for (const sh of shots) {
    const [st, tm, camName, custom] = sh.split(':');
    await p.evaluate(([st, tm, camName, custom]) => {
      const S = window.__sado; S.go(+st, +tm);
      document.getElementById('cam' + (camName && camName !== 'custom' ? camName[0].toUpperCase() + camName.slice(1) : 'Guest')).click();
      if (custom) { const v = custom.split(',').map(Number); S.cam.goal = null; S.cam.theta = v[0]; S.cam.phi = v[1]; S.cam.r = v[2]; if (v.length > 5) S.cam.target.set(v[3], v[4], v[5]); }
    }, [st, tm, camName, custom]);
    await p.waitForTimeout(camName !== 'custom' ? wait + 1500 : wait);
    // freeze on the requested time (the page keeps playing while we wait)
    await p.evaluate(([st, tm]) => window.__sado.hold && window.__sado.hold(+st, +tm), [st, tm]);
    await p.waitForTimeout(250);
    shotN++;
    const name = `${out}-${String(shotN).padStart(2, '0')}-s${+st + 1}-t${tm}${camName ? '-' + camName : ''}.png`;
    await p.screenshot({ path: name });
    if (body) console.log(name, JSON.stringify(await p.evaluate(() => window.__sado.body())));
    else console.log(name);
  }
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
