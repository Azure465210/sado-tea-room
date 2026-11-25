// Usage: node check-script-any.js <path/to/id-script.json> [ROOT]. Validates a script against the STEPS / guest arrays in the sources.
const fs = require('fs');
const path = require('path');
const SCRIPT = process.argv[2] || require('path').join(__dirname,'../src/data/ifu-script.json');
const ROOT = process.argv[3] || require('path').join(__dirname,'..');
const ID = path.basename(SCRIPT).replace(/-script\.json$/, '');
const errs = [];
const warn = [];
const S = JSON.parse(fs.readFileSync(SCRIPT, 'utf8'));

// --- extract STEPS lines/qs/dur from 40-choreography.js
const chor = fs.readFileSync(path.join(ROOT, 'src/js/40-choreography.js'), 'utf8');
const laterLines = (dt, ls) => ls.map((l) => [l[0] + dt, l[1]]);
function grab(src, from, key) { // returns array literal text after `key:` starting at index from
  const i = src.indexOf(key + ':[', from);
  if (i < 0) return null;
  let d = 0, j = i + key.length + 1, q = null;
  for (; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') d++;
    else if (c === ']') { d--; if (d === 0) break; }
  }
  return { text: src.slice(i + key.length + 1, j + 1), end: j };
}
const steps = [];
const re = /\{title:'([^']*)'[^]*?dur:([\d.]+)/g;
let m;
const heads = [];
while ((m = re.exec(chor))) heads.push({ title: m[1], dur: +m[2], at: m.index });
for (let k = 0; k < heads.length; k++) {
  const lim = k + 1 < heads.length ? heads[k + 1].at : chor.length;
  const L = grab(chor, heads[k].at, 'lines');
  const Q = grab(chor, heads[k].at, 'qs');
  if (!L || L.end > lim || !Q || Q.end > lim) { errs.push('could not parse step ' + heads[k].title); continue; }
  steps.push({ title: heads[k].title, dur: heads[k].dur, lines: eval(L.text), qs: eval(Q.text) });
}

// --- guest arrays
const guest = fs.readFileSync(path.join(ROOT, 'src/js/70-guest.js'), 'utf8');
function arr(name) {
  const i = guest.indexOf('const ' + name + ' = [');
  const j = guest.indexOf('\n];', i);
  return eval(guest.slice(guest.indexOf('[', i), j + 2));
}
const PHASES = arr('PHASES'), DRINK = arr('DRINK');

// --- mora estimate: kana (small ya/yu/yo/vowels not counted), ー, kanji ×2, latin letters ×1
function mora(s) {
  let n = 0;
  for (const c of s) {
    if (/[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/.test(c)) continue;
    if (/[ぁ-ゖァ-ヺー]/.test(c)) n += 1;
    else if (/[一-鿿々]/.test(c)) n += 2;
    else if (/[A-Za-z0-9]/.test(c)) n += 1;
  }
  return n;
}
function unit(u, where, needYomi = true) {
  if (!u || typeof u !== 'object') return errs.push(where + ': missing unit');
  const fields = S.language === 'en' ? ['en'] : needYomi ? ['ja', 'en', 'yomi'] : ['ja', 'en'];
  for (const k of fields)
    if (typeof u[k] !== 'string' || !u[k].trim()) errs.push(where + ': missing ' + k);
  if (needYomi && /御座|帛紗|棗|茶杓|茶筅|柄杓|建水|蓋置|茶巾|総礼|様|点前/.test(u.yomi || '')) errs.push(where + ': yomi still has a term in kanji');
}

if (S.teacher !== ID) errs.push('teacher != ' + ID);
if (!Array.isArray(S.steps) || S.steps.length !== steps.length) errs.push(`step count ${S.steps && S.steps.length} != ${steps.length}`);
let worst = 0;
steps.forEach((st, i) => {
  const w = S.steps[i]; if (!w) return;
  if (w.lines.length !== st.lines.length) errs.push(`step ${i + 1}: line count ${w.lines.length} != ${st.lines.length}`);
  st.lines.forEach((l, k) => {
    const wl = w.lines[k]; if (!wl) return;
    if (Math.abs(wl[0] - l[0]) > 1e-9) errs.push(`step ${i + 1} line ${k + 1}: time ${wl[0]} != ${l[0]}`);
    unit(wl[1], `step ${i + 1} line ${k + 1}`);
    const next = k + 1 < st.lines.length ? st.lines[k + 1][0] : st.dur;
    if (st.dur > 0 || k + 1 < st.lines.length) {
      const gap = next - l[0], cap = gap * 6.5, n = mora(wl[1].yomi || '');
      worst = Math.max(worst, n / cap);
      if (n > cap) errs.push(`step ${i + 1} line ${k + 1}: yomi ${n} kana > ${cap.toFixed(1)} (gap ${gap}s)`);
      else if (n > cap * 0.95) warn.push(`step ${i + 1} line ${k + 1}: tight ${n}/${cap.toFixed(1)}`);
    }
  });
  if (!w.qs || w.qs.length !== st.qs.length) errs.push(`step ${i + 1}: qs count ${w.qs && w.qs.length} != ${st.qs.length}`);
  else w.qs.forEach((qa, k) => { unit(qa[0], `step ${i + 1} q${k + 1}`, false); unit(qa[1], `step ${i + 1} a${k + 1}`); });
});
if (!S.guestIntro || S.guestIntro.length !== PHASES.length) errs.push(`guestIntro ${S.guestIntro && S.guestIntro.length} != ${PHASES.length}`);
else S.guestIntro.forEach((u, k) => unit(u, 'guestIntro ' + k));
if (!S.guestDrink || S.guestDrink.length !== DRINK.length) errs.push(`guestDrink ${S.guestDrink && S.guestDrink.length} != ${DRINK.length}`);
else S.guestDrink.forEach((u, k) => unit(u, 'guestDrink ' + k));
unit(S.whiskDone, 'whiskDone');
unit(S.greeting, 'greeting');
if (S.language !== 'en' || S.card) {
  const c = S.card || {};
  unit(c.role, 'card.role', false); unit(c.personality, 'card.personality', false);
  if (!Array.isArray(c.traits) || c.traits.length < 3 || c.traits.length > 4) errs.push('card.traits must have 3-4 chips');
  else c.traits.forEach((t, k) => unit(t, 'card.trait ' + k, false));
}

console.log(`steps ${steps.length} (${steps.map((s) => s.lines.length + '/' + s.qs.length).join(' ')}), PHASES ${PHASES.length}, DRINK ${DRINK.length}`);
console.log('worst timing ratio', worst.toFixed(2));
if (warn.length) console.log('WARN', warn);
console.log('ERRORS', errs);
process.exit(errs.length ? 1 : 0);
