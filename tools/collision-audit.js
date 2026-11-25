// Run with `node tools/collision-audit.js [sample seconds]`.
// Run production geometry and inverse kinematics without a browser. Only the
// renderer and texture painting are stubbed. Measurements are sampled estimates.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = { ...require('../vendor/three.min.js') };
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const dt = Number(process.argv[2] || 0.2);
if (!Number.isFinite(dt) || dt <= 0) throw new Error('Sample seconds must be positive.');
THREE.WebGLRenderer = class {
  shadowMap = {};
  setPixelRatio() {}
};
const noop = () => {};
const paint = new Proxy({}, { get: (target, key) => target[key] || noop });
const ctx = vm.createContext({
  THREE, performance, devicePixelRatio: 1, addEventListener: noop, window: {}, location: { hash: '' },
  document: { createElement: () => ({ getContext: () => paint }), getElementById: () => ({ addEventListener: noop }) },
  DOMParser: class { parseFromString() { return { querySelector: () => true }; } },
});
const modules = fs.readdirSync(path.join(root, 'src/js')).filter((file) => /^(00|05|10|2[013]|30|4[01])-/.test(file));
const code = modules.sort().map((file) => read(`src/js/${file}`).replace(/\/\*@TEXT:([^@]+)@\*\//g, (_, name) => JSON.stringify(read(name)))).join('\n');
const run = (source) => vm.runInContext(source, ctx);
const player = read('src/js/50-player.js');
const applyInitSource = player.slice(player.indexOf('function applyInit('), player.indexOf('function loadStep('));
run(code + '\n' + applyInitSource + `
  hostObstacles();
  function auditPose(index, time) {
    const s = STEPS[index];
    resetRest();
    applyInit(s);
    applyTracks(s.tracks,time,time);
    const atBelt = O.fukusa.position.distanceToSquared(new THREE.Vector3(...HIP_L)) < 1e-6;
    chasenTurn(s,time,0);
    hostUpdate(s,time,0,true);
    applyShortfall(s,time);
    chasenTurn(s,time,1);
    scene.updateMatrixWorld(true);
    return atBelt;
  }
  globalThis.audit = { O, STEPS, scene, rig: RIG, avatar: () => AVATAR, auditPose,
    dress(id) { AVATAR.dispose(); AVATAR = makeAvatar(TEACHERS[id]); } };
`);
const { O, STEPS, scene, rig, avatar, dress, auditPose } = ctx.audit;
const visibleUtensils = ['bowl','chasen','natsume','lid','chashaku','hishaku','fukusa','chakin','kamaLid','kashiki','kaishi','basami','kobukusa','kuromoji','sensu'];
const fixtures = {};
scene.traverse(object => {
  const name = object.userData.name;
  if (['Kama', 'Furo', 'Mizusashi', 'Futaoki', 'Kensui'].includes(name)) fixtures[name] = object;
});
const direction = new THREE.Vector3(0.861, 0.284, 0.423).normalize();
const ray = new THREE.Raycaster();
const point = new THREE.Vector3();
const boxThreshold = 0.004;
function collectMeshes(object, out = []) {
  if (!object.visible) return out;
  if (object.isMesh) {
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
    const box = object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
    // Open cloth and hollow cylinder walls are surfaces, not volumes.
    const closed = object !== O.fukusa && !object.geometry.parameters?.openEnded;
    out.push({ object, box, closed });
  }
  for (const child of object.children) collectMeshes(child, out);
  return out;
}
function overlaps(a, b) {
  return a.max.x - b.min.x > boxThreshold && b.max.x - a.min.x > boxThreshold &&
    a.max.y - b.min.y > boxThreshold && b.max.y - a.min.y > boxThreshold &&
    a.max.z - b.min.z > boxThreshold && b.max.z - a.min.z > boxThreshold;
}
function vertexDepth(source, target) {
  if (!target.closed) return 0;
  const pos = source.object.geometry.attributes.position;
  let depth = 0;
  const material = target.object.material;
  if (Array.isArray(material)) return 0;
  const side = material.side;
  material.side = THREE.DoubleSide; // the parity test needs both entry and exit intersections
  for (let n = 0; n < pos.count; n += Math.max(1, Math.floor(pos.count / 250))) {
    point.fromBufferAttribute(pos, n).applyMatrix4(source.object.matrixWorld);
    if (!target.box.containsPoint(point)) continue;
    ray.set(point, direction);
    const hits = ray.intersectObject(target.object, false).filter(hit => hit.distance > 1e-5);
    const crossings = hits.filter((hit, i) => i === 0 || hit.distance - hits[i-1].distance > 1e-5);
    if (crossings.length % 2) {
      // Distance along the ray overstates depth at grazing angles. Clamp to the outer box.
      depth = Math.max(depth, Math.min(crossings[0].distance,
        target.box.max.x - point.x, point.x - target.box.min.x,
        target.box.max.y - point.y, point.y - target.box.min.y,
        target.box.max.z - point.z, point.z - target.box.min.z));
    }
  }
  material.side = side;
  return depth;
}
function meshOverlap(a, b) {
  let depth = 0;
  for (const first of a) for (const second of b) if (overlaps(first.box, second.box)) {
    depth = Math.max(depth, vertexDepth(first, second), vertexDepth(second, first));
  }
  return depth;
}
function report(out, key, t, depth) {
  if (depth < 0.006) return;
  const row = out[key] ||= { frames: 0, depth: 0, time: t };
  if (depth > row.depth) { row.depth = depth; row.time = t; }
  row.frames++;
}
const planned = new Set([
  'bowl-chakin','bowl-chasen','chashaku-lid','lid-natsume','fukusa-lid','fukusa-chashaku',
  'chakin-kamaLid','fukusa-kamaLid','Kama-kamaLid','Kama-hishaku','Futaoki-hishaku',
  'Futaoki-kamaLid','Furo-Kama',
].map((pair) => pair.split('-').sort().join('-')));
for (const teacher of ['shizue', 'ifu']) {
  dress(teacher);
  let frames = 0;
  console.log(`\n${teacher} (${dt}s between samples)`);
  for (const [i, s] of STEPS.entries()) {
    if (s.interactive) continue;
    const out = {};
    for (let n = 0; n <= Math.ceil(s.dur / dt); n++) {
      const time = Math.min(s.dur, +(n * dt).toFixed(6));
      const fukusaAtBelt = auditPose(i, time);
      frames++;
      const { arms } = rig.S;
      for (const [side, arm] of Object.entries(arms)) report(out, `arm vs body/room ${side}`, time, arm.pen);
      const parts = avatar().parts();
      const apparel = parts.sleeves.map(mesh => collectMeshes(mesh));
      const palms = parts.hands.map(mesh => collectMeshes(mesh));
      report(out, 'opposite sleeves', time, meshOverlap(apparel[0], apparel[1]));
      report(out, 'opposite palms', time, meshOverlap(palms[0], palms[1]));
      report(out, 'left palm vs right sleeve', time, meshOverlap(palms[0], apparel[1]));
      report(out, 'right palm vs left sleeve', time, meshOverlap(palms[1], apparel[0]));
      const utensils = visibleUtensils.map((name) => [name, collectMeshes(O[name])]);
      for (const [name, fixture] of Object.entries(fixtures)) utensils.push([name, collectMeshes(fixture)]);
      for (const [name, meshes] of utensils) {
        // Finger/cloth contact directly enacted by a hold is intentional. Check the opposite sleeve.
        const active = s.holds.filter(h => h.o === name && time >= h.t0 - .4 && time <= h.t1 + .4);
        for (let side = 0; side < 2; side++) {
          const hand = side ? 'R' : 'L';
          if (active.some(h => h.hand === hand)) continue;
          const atBelt = name === 'fukusa' && fukusaAtBelt;
          const item = atBelt ? 'fukusa at obi (layered cloth)' : name;
          report(out, `${hand} sleeve vs ${item}`, time, meshOverlap(apparel[side], meshes));
          report(out, `${hand} palm vs ${item}`, time, meshOverlap(palms[side], meshes));
        }
      }
      for (let a = 0; a < utensils.length; a++) for (let b = a + 1; b < utensils.length; b++) {
        const pair = [utensils[a][0], utensils[b][0]].sort().join('-');
        if (!planned.has(pair)) report(out, pair, time, meshOverlap(utensils[a][1], utensils[b][1]));
      }
    }
    console.log(`${i + 1} ${s.title}`);
    for (const [key, data] of Object.entries(out).sort((a,b) => b[1].depth - a[1].depth)) {
      console.log(`  ${key}: ${Math.round(data.depth * 1000)} mm at ${data.time}s (${data.frames} samples)`);
    }
  }
  console.log(`Total: ${frames} sampled poses.`);
}
console.log('\nDepths are estimates from sampled vertices and collision shapes. Small contacts below 6 mm are omitted.');
console.log('Planned grips, tool use, and layered cloth can touch. This scene audit samples poses, with no continuous mesh collision guarantee.');
console.log('The guest and navigator panels do not share the host body’s 3D space. Guest interactions require separate playback checks.');
