// Measure the final portrait and write art/final/spec.json: head silhouette (half-widths of face-base from top to chin),
// and the heights of brows, eyes, nose and mouth. The avatar builds its 3D head from these numbers.
//   node tools/measure-portrait.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '../art/final'));
  const svg = fs.readFileSync(path.join(dir, 'portrait.svg'), 'utf8');
  const prev = JSON.parse(fs.readFileSync(path.join(dir, 'spec.json'), 'utf8'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 800 } });
  await p.setContent('<!doctype html><html><body style="margin:0"></body></html>');
  const m = await p.evaluate(async (svg) => {
    const holder = document.createElement('div'); holder.innerHTML = svg; document.body.append(holder);
    const box = id => { const e = holder.querySelector('#' + id); const d = e.getAttribute('display'); e.removeAttribute('display'); const r = e.getBBox(); if (d) e.setAttribute('display', d); return [r.x, r.y, r.width, r.height].map(v => +v.toFixed(1)); };
    const boxes = {}; for (const id of ['face-base', 'brows', 'eyes-open', 'nose', 'mouth-rest', 'hair-front', 'ears']) boxes[id] = box(id);
    holder.remove();
    // silhouette of face-base alone, 1 px per unit
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), root = doc.documentElement;
    for (const g of [...root.children]) if (g.tagName === 'g' && g.id !== 'face-base') g.setAttribute('display', 'none');
    root.setAttribute('width', 600); root.setAttribute('height', 720);
    const img = new Image(); await new Promise(r => { img.onload = r; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(root)); });
    const c = document.createElement('canvas'); c.width = 600; c.height = 720; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, 600, 720).data, rows = [];
    for (let y = 0; y < 720; y++) { let a = -1, z = -1; for (let x = 0; x < 600; x++) if (d[(y * 600 + x) * 4 + 3] > 128) { if (a < 0) a = x; z = x; } rows.push(a < 0 ? null : [a, z]); }
    // hairline at the centre of the forehead: lowest opaque pixel of hair-front on the centre line
    const doc2 = new DOMParser().parseFromString(svg, 'image/svg+xml'), root2 = doc2.documentElement;
    for (const g2 of [...root2.children]) if (g2.tagName === 'g' && g2.id !== 'hair-front') g2.setAttribute('display', 'none');
    root2.setAttribute('width', 600); root2.setAttribute('height', 720);
    const img2 = new Image(); await new Promise(r => { img2.onload = r; img2.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(root2)); });
    g.clearRect(0, 0, 600, 720); g.drawImage(img2, 0, 0);
    const d2 = g.getImageData(0, 0, 600, 720).data; let hairC = 0;
    for (let y = 0; y < 720; y++) if (d2[(y * 600 + 300) * 4 + 3] > 128) hairC = y;
    return { boxes, rows, hairC };
  }, svg);
  await b.close();
  const ys = m.rows.map((r, y) => r ? y : -1).filter(y => y >= 0), top = ys[0], chin = ys[ys.length - 1] + 1;
  const cx = 300, N = 28, half = [];
  for (let i = 0; i <= N; i++) { const y = Math.min(chin - 1, Math.round(top + (chin - top) * i / N)); const r = m.rows[y]; half.push(+(Math.max(cx - r[0], r[1] + 1 - cx)).toFixed(1)); }
  const mid = bx => +(bx[1] + bx[3] / 2).toFixed(1);
  const spec = Object.assign({}, prev, {
    name: prev.name || 'Quiet nihonga (a-nihonga, round 4)',
    palette: prev.palette || { skin: '#efdcc8', skinShade: '#d9b89e', lip: '#b98178', hair: '#a4a8ac', hairLight: '#dfe1e2', hairDark: '#8a8f95',
      kimono: '#6c7c72', kimonoShade: '#55645b', haneri: '#f5f2ea', obi: '#cdb98f', obiAccent: '#8a4b3f', obiage: '#e9dfce', tabi: '#f4f1ea' },
    face: { cx, topY: top, chinY: chin, halfWidths: half, browY: mid(m.boxes.brows), eyeY: mid(m.boxes['eyes-open']), eyeHalfSpan: +(m.boxes['eyes-open'][2] / 2).toFixed(1),
      noseY: +(m.boxes.nose[1] + m.boxes.nose[3]).toFixed(1), noseTopY: m.boxes.nose[1], mouthY: mid(m.boxes['mouth-rest']), hairlineY: +(m.boxes['hair-front'][1] + m.boxes['hair-front'][3]).toFixed(1), hairCentreY: m.hairC, earBox: m.boxes.ears },
    notes: prev.notes && prev.notes !== 'provisional' ? prev.notes : 'A calm, front-lit portrait in soft flat planes: silver hair swept back into a low chignon, a grey-green iromuji, white han-eri.',
  });
  fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify(spec, null, 1));
  console.log(JSON.stringify(spec.face), '\nboxes', JSON.stringify(m.boxes));
})().catch(e => { console.error(e); process.exit(1); });
