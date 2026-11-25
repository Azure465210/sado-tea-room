// Build the single-file page from src/shell.html + src/js/*.js (+ art assets).
//   node tools/build.js            -> dist/sado-tea-room.html (standalone) and dist/artifact.html (body-only variant for publishing)
//   node tools/build.js --public   -> also write the static upload to dist/online/
//   node tools/build.js --host orig  -> use the original host code (src/_orig_host.js) instead of src/js/2*-*.js (for A/B checks)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const arg = n => { const i = process.argv.indexOf('--' + n); return i < 0 ? null : process.argv[i + 1] || true; };
const shell = fs.readFileSync(path.join(root, 'src/shell.html'), 'utf8');
let files = fs.readdirSync(path.join(root, 'src/js')).filter(f => f.endsWith('.js')).sort();
let parts = files.map(f => fs.readFileSync(path.join(root, 'src/js', f), 'utf8').replace(/\s+$/, ''));
if (arg('host') === 'orig') {
  const i = files.findIndex(f => f.startsWith('2'));
  const orig = fs.readFileSync(path.join(root, 'src/_orig_host.js'), 'utf8');
  parts = parts.filter((p, k) => !files[k].startsWith('2')); files = files.filter(f => !f.startsWith('2'));
  const at = files.findIndex(f => f.startsWith('3')); parts.splice(at, 0, orig.replace(/\s+$/, ''));
}
let js = parts.join('\n\n');
// asset tokens: /*@TEXT:relative/path@*/ -> JSON string literal of the file content
// SADO_ASSETS=<dir>: look for each token's file in <dir> first (same relative path), so a build can try out art or a script
// kept elsewhere without touching src/ or art/. A file that exists in neither place becomes `null`, and the page falls back
// (05-teachers.js: shizue's art / the English lines). The build then stops with an error unless --allow-missing is given.
const overrideDir = process.env.SADO_ASSETS ? path.resolve(process.env.SADO_ASSETS) : null;
const missing = [];
js = js.replace(/\/\*@TEXT:([^@]+)@\*\//g, (m, p) => {
  for (const base of [overrideDir, root]) {
    // '<' as \u003c: an asset's text can never close the page's <script> or open an HTML comment-script state
    if (base && fs.existsSync(path.join(base, p))) return JSON.stringify(fs.readFileSync(path.join(base, p), 'utf8')).replace(/</g, '\\u003c');
  }
  missing.push(p);
  return 'null';
});
if (missing.length) {
  // a missing teacher asset would quietly ship placeholder data (the wrong face or language), so stop unless asked not to
  console.warn('asset tokens with no file (built as null):', missing.join(', '));
  if (!process.argv.includes('--allow-missing')) {
    console.error('build stopped: pass --allow-missing to build with placeholders');
    process.exit(1);
  }
}
if (/<\/script|<!--/i.test(js)) { console.error('build stopped: the page script contains </script or <!--'); process.exit(1); }
let html = shell.replace('/*@MAIN@*/', () => js);
// the 3D instructor selector (selector/, React; build it with `npm run build` there): one CSS and one IIFE file, inlined at
// <!--@SELECTOR_CSS@--> (end of <head>) and <!--@SELECTOR_JS@--> (before the page's own scripts). It sets window.SadoSelector;
// without it the page falls back to its hand-made teacher cards and no navigator window.
{
  const sd = path.join(root, 'selector/dist'), cssF = path.join(sd, 'selector.css'), jsF = path.join(sd, 'selector.iife.js');
  if (fs.existsSync(cssF) && fs.existsSync(jsF)) {
    const css = fs.readFileSync(cssF, 'utf8'), sjs = fs.readFileSync(jsF, 'utf8');
    if (/<\/(script|style)/i.test(sjs + css)) { console.error('build stopped: the selector bundle contains a closing script/style tag'); process.exit(1); }
    html = html.replace('<!--@SELECTOR_CSS@-->', () => '<style id="sado-selector-css">\n' + css.trim() + '\n</style>');
    html = html.replace('<!--@SELECTOR_JS@-->', () => '<script>\n' + sjs.trim() + '\n</script>');
  } else {
    console.warn('selector/dist/selector.{css,iife.js} missing: built without the 3D selector');
    if (!process.argv.includes('--allow-missing')) { console.error('build stopped: run `npm run build` in selector/ or pass --allow-missing'); process.exit(1); }
    html = html.replace('<!--@SELECTOR_CSS@-->', '').replace('<!--@SELECTOR_JS@-->', '');
  }
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', arg('out') || 'sado-tea-room.html');
fs.writeFileSync(out, html);
// artifact variant: no doctype/html/head/body wrappers (the publisher adds them)
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), (head.includes('claude:viewport-fit-sides') ? '' : '<meta name="claude:viewport-fit-sides" content="cover">\n') + head.trim() + '\n' + body.trim() + '\n');
if (process.argv.includes('--public')) {
  const online = path.join(root, 'dist', 'online');
  fs.mkdirSync(online, { recursive: true });
  const publicHtml = html
    .replace('<html lang="en">', '<html lang="en" data-public-build="true">')
    .replace(/^<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]+">\r?\n/m, '')
    .replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', './three.min.js')
    .replace('<!--@PUBLIC_VOICE_NOTE@-->', '<p>Online narration uses voices available in your browser. <a href="./CREDITS.txt">Credits</a></p>');
  fs.writeFileSync(path.join(online, 'index.html'), publicHtml);
  fs.copyFileSync(path.join(root, 'vendor', 'three.min.js'), path.join(online, 'three.min.js'));
  fs.copyFileSync(path.join(root, 'docs', 'public-credits.txt'), path.join(online, 'CREDITS.txt'));
  fs.copyFileSync(path.join(root, 'docs', 'third-party-notices.txt'), path.join(online, 'THIRD-PARTY-NOTICES.txt'));
  console.log('Static upload built at dist/online/');
}
console.log('built', path.relative(root, out), (html.length / 1024).toFixed(1) + ' KB', '| js parts:', files.join(' '));
