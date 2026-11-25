// Render an SVG portrait (see art/SPEC.md for the group ids) to PNG with Playwright.
// usage:
//   node tools/render-svg.js <in.svg> <out.png> [--show id,id] [--hide id,id] [--width 600] [--bg "#e9e3d3"]
//   node tools/render-svg.js <in.svg> <out.png> --sheet        (contact sheet: portrait, eye/mouth variants, small sizes, texture view)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const a = process.argv.slice(2);
  const [inp, out] = a;
  if (!inp || !out) { console.error('usage: node render-svg.js <in.svg> <out.png> [--sheet] [--show a,b] [--hide c,d] [--width n] [--bg css]'); process.exit(2); }
  const opt = n => { const i = a.indexOf('--' + n); return i < 0 ? null : (a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : true); };
  const svg = fs.readFileSync(inp, 'utf8');
  const sheet = !!opt('sheet');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: sheet ? 1560 : 800, height: sheet ? 900 : 900 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.setContent('<!doctype html><html><body style="margin:0;background:#777;font:12px sans-serif;color:#fff"></body></html>');
  const info = await p.evaluate(async ({ svg, sheet, show, hide, width, bg }) => {
    const parse = s => new DOMParser().parseFromString(s, 'image/svg+xml');
    const doc0 = parse(svg);
    if (doc0.querySelector('parsererror')) return { error: 'SVG does not parse: ' + doc0.querySelector('parsererror').textContent.slice(0, 300) };
    const root0 = doc0.documentElement;
    const vb = (root0.getAttribute('viewBox') || '0 0 600 720').trim().split(/[\s,]+/).map(Number);
    const ids = ['bg','hair-back','body','ears','face-base','lines','brows','eyes-open','eyes-lowered','eyes-closed','nose','mouth-rest','mouth-talk','hair-front'];
    const missing = ids.filter(i => !doc0.getElementById(i));
    const variant = (showIds, hideIds, crop) => {
      const d = parse(svg), r = d.documentElement;
      for (const i of hideIds) { const e = d.getElementById(i); if (e) e.setAttribute('display', 'none'); }
      for (const i of showIds) { const e = d.getElementById(i); if (e) e.removeAttribute('display'); if (e && e.style) e.style.display = ''; }
      if (crop) r.setAttribute('viewBox', crop.join(' '));
      r.setAttribute('width', crop ? crop[2] : vb[2]); r.setAttribute('height', crop ? crop[3] : vb[3]);
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(r));
    };
    const img = (src, w, h, bgc, label) => new Promise(res => {
      const wrap = document.createElement('div'); wrap.style.cssText = 'display:inline-block;margin:6px;vertical-align:top;text-align:center';
      const im = new Image(); im.onload = () => res(wrap); im.onerror = () => { wrap.append('IMG ERROR'); res(wrap); };
      im.width = w; im.height = h; im.style.cssText = `display:block;background:${bgc}`; im.src = src; wrap.append(im);
      if (label) { const s = document.createElement('div'); s.textContent = label; wrap.append(s); }
    });
    // face bbox from the live DOM
    const holder = document.createElement('div'); holder.style.cssText = 'position:absolute;left:-9999px;top:0'; holder.innerHTML = svg; document.body.append(holder);
    const fb = holder.querySelector('#face-base'); let box = null;
    if (fb) { const r = fb.getBBox(); box = [r.x, r.y, r.width, r.height]; }
    holder.remove();
    if (!sheet) {
      const w = width || vb[2], h = Math.round(w * vb[3] / vb[2]);
      const el = await img(variant(show, hide), w, h, bg || 'transparent');
      el.style.margin = '0'; document.body.style.background = bg || '#777'; document.body.append(el);
      return { clip: { x: 0, y: 0, width: w, height: h }, missing, box, vb };
    }
    document.body.style.cssText += ';width:1560px;height:900px;overflow:hidden';
    const col = (wd) => { const c = document.createElement('div'); c.style.cssText = `display:inline-block;vertical-align:top;width:${wd}px`; document.body.append(c); return c; };
    const c1 = col(620), c2 = col(560), c3 = col(370);
    c1.append(await img(variant([], []), 600, Math.round(600 * vb[3] / vb[2]), '#e9e3d3', 'portrait (as authored) on the room wall colour'));
    const fx = box ? [box[0] - box[2] * 0.25, box[1] - box[3] * 0.18, box[2] * 1.5, box[3] * 1.3] : [vb[0], vb[1], vb[2], vb[3]];
    const fw = 260, fh = Math.round(fw * fx[3] / fx[2]);
    c2.append(await img(variant(['eyes-open', 'mouth-rest'], ['eyes-lowered', 'eyes-closed', 'mouth-talk'], fx), fw, fh, '#e9e3d3', 'eyes-open + mouth-rest'));
    c2.append(await img(variant(['eyes-lowered', 'mouth-rest'], ['eyes-open', 'eyes-closed', 'mouth-talk'], fx), fw, fh, '#e9e3d3', 'eyes-lowered'));
    c2.append(await img(variant(['eyes-closed', 'mouth-rest'], ['eyes-open', 'eyes-lowered', 'mouth-talk'], fx), fw, fh, '#e9e3d3', 'eyes-closed'));
    c2.append(await img(variant(['eyes-open', 'mouth-talk'], ['eyes-lowered', 'eyes-closed', 'mouth-rest'], fx), fw, fh, '#e9e3d3', 'eyes-open + mouth-talk'));
    const tex = variant(['face-base', 'lines', 'brows', 'eyes-open', 'nose', 'mouth-rest', 'hair-front'], ['bg', 'hair-back', 'body', 'ears', 'eyes-lowered', 'eyes-closed', 'mouth-talk'], fx);
    c3.append(await img(tex, 170, Math.round(170 * fx[3] / fx[2]), '#b9b9b9', 'texture view: face-base, lines, brows, eyes, nose, mouth, hair-front'));
    for (const [w, bgc, lab] of [[150, '#c9bf8f', 'whole portrait at 150 px'], [76, '#c9bf8f', '76 px'], [46, '#e9e3d3', '46 px (in-game size)'], [46, '#c9bf8f', '46 px on tatami']])
      c3.append(await img(variant([], []), w, Math.round(w * vb[3] / vb[2]), bgc, lab));
    return { clip: { x: 0, y: 0, width: 1560, height: 900 }, missing, box, vb };
  }, { svg, sheet, show: (opt('show') || '').toString().split(',').filter(s => s && s !== 'true'), hide: (opt('hide') || '').toString().split(',').filter(s => s && s !== 'true'), width: +opt('width') || 0, bg: opt('bg') === true ? null : opt('bg') });
  if (info.error) { console.error(info.error); await b.close(); process.exit(1); }
  await p.waitForTimeout(150);
  await p.screenshot({ path: out, clip: info.clip, omitBackground: !sheet && !opt('bg') });
  console.log(JSON.stringify({ out, bytes: fs.statSync(inp).size, missingGroups: info.missing, faceBaseBBox: info.box, viewBox: info.vb, errors: errs }));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
