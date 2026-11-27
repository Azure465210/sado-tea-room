// ---------- renderer, scene, camera ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e3d3);
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 50);
// The room, the utensils and the whole choreography are authored in `stage`. The stage is mirrored in x, because the layout was
// written as if the host faced away from us: without the mirror the kettle and the fukusa sit on her right and she whisks with
// her left hand. Mirrored, "handL" really is her left hand and the narration ("on my left") is true.
const MIRROR = true,
  MX = MIRROR ? -1 : 1;
const stage = new THREE.Group();
stage.scale.x = MX;
scene.add(stage);

const cam = { target: new THREE.Vector3(0, 0.3, 0.4), theta: 0, phi: 1.05, r: 2.0, goal: null, fov: null };
let masterView = false;
canvas.addEventListener('pointerdown',()=>{masterView=false;});
canvas.addEventListener('wheel',()=>{masterView=false;},{passive:true});
const PRESETS = {
  guest: { target: [0, 0.3, 0.4], theta: 0, phi: 1.05, r: 2.0 },
  close: { target: [0, 0.1, 0.42], theta: 0.4 * MX, phi: 0.95, r: 0.8 },
  folding: { target: [-0.02, 0.47, 0.17], theta: -0.75 * MX, phi: 1.1, r: 0.98 }, // her front-right: the flap side of the hanging cloth, the top of the pad
  master: { target: [0, 0.375, 0.205], theta: Math.PI, phi: 0.582, r: 0.541, fov: 60 }, // her own eyes, looking down at her hands
  top: { target: [0, 0.1, 0.3], theta: 0, phi: 0.25, r: 1.8 },
};
const camLook = new THREE.Vector3();
function applyCam() {
  // when the host rises onto her knees or to her feet the camera lifts and pulls back with her, so her head stays in the picture
  const up = typeof RIG === 'undefined' ? 0 : RIG.S.legs, // 0 seiza, 1 up on the knees, 2 standing
    r = cam.r * (1 + 0.22 * up) * (camera.aspect < 0.8 ? 1.12 : 1),
    s = Math.sin(cam.phi);
  camLook.copy(cam.target);
  camLook.y += 0.2 * up;
  camera.position.set(camLook.x + r * s * Math.sin(cam.theta), camLook.y + r * Math.cos(cam.phi), camLook.z + r * s * Math.cos(cam.theta));
  camera.lookAt(camLook);
}
function goCam(name) {
  stopDrinkView();
  masterView = name === 'master';
  const p = name === 'close' && step === 2 ? PRESETS.folding : PRESETS[name];
  cam.goal = { target: new THREE.Vector3(...p.target), theta: p.theta, phi: p.phi, r: p.r };
  cam.fov = p.fov || null; // a preset may ask for its own lens
  resize();
  for (const id of ['camGuest', 'camClose', 'camTop', 'camMaster'])
    document.getElementById(id).setAttribute('aria-pressed', String(id === 'cam' + name[0].toUpperCase() + name.slice(1)));
}
function resize() {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = cam.fov || (w / h < 0.8 ? 60 : 50); // a wider lens on an upright phone, so the utensils beside her stay in the picture
  camera.updateProjectionMatrix();
  document.documentElement.style.setProperty('--top-h', document.getElementById('top').offsetHeight + 'px'); // panels hang below the header
}
addEventListener('resize', resize);

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7a5a, 0.75));
const sun = new THREE.DirectionalLight(0xfff1dc, 0.9);
sun.position.set(-1.5, 2.4, 1.2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -2;
sun.shadow.camera.right = 2;
sun.shadow.camera.top = 2;
sun.shadow.camera.bottom = -2;
sun.shadow.bias = -0.0006; // no striped "shadow acne" on the curved kimono and face at close range
sun.shadow.normalBias = 0.012;
scene.add(sun);
const fill = new THREE.PointLight(0xffe9c8, 0.35, 6);
fill.position.set(0.8, 1.6, 1.4);
scene.add(fill);

// ---------- materials ----------
function tatamiTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#c9bf8f';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 4) {
    g.fillStyle = y % 8 ? '#bfb482' : '#d2c897';
    g.fillRect(0, y, 512, 2);
  }
  g.fillStyle = '#3b3a2f';
  g.fillRect(0, 0, 512, 14);
  g.fillRect(0, 498, 512, 14);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.encoding = THREE.sRGBEncoding;
  return t;
}
function kimonoTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4a6a3e';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(230,225,200,.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      g.beginPath();
      g.arc(i * 32 + 16, j * 32 + 16, 9, 0, Math.PI * 2);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  t.encoding = THREE.sRGBEncoding;
  return t;
}
const M = {
  tatami: new THREE.MeshStandardMaterial({ map: tatamiTexture(), roughness: 1 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xd9cfb5, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 }),
  darkwood: new THREE.MeshStandardMaterial({ color: 0x3e2a1c, roughness: 0.7 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xf6f1e3, roughness: 1 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xe8bf9c, roughness: 0.85 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x2b2222, roughness: 0.85 }),
  kimono: new THREE.MeshStandardMaterial({ map: kimonoTexture(), roughness: 0.95 }),
  kimonoPlain: new THREE.MeshStandardMaterial({ color: 0x4a6a3e, roughness: 0.95 }),
  juban: new THREE.MeshStandardMaterial({ color: 0xf7f2e6, roughness: 1, side: THREE.DoubleSide }),
  obi: new THREE.MeshStandardMaterial({ color: 0xc9a35c, roughness: 0.8 }),
  obijime: new THREE.MeshStandardMaterial({ color: 0x8a2f3c, roughness: 0.7 }),
  clay: new THREE.MeshStandardMaterial({ color: 0x7a4c33, roughness: 0.75 }),
  glaze: new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.4, metalness: 0.05 }),
  bamboo: new THREE.MeshStandardMaterial({ color: 0xd9bb86, roughness: 0.7 }),
  bambooLight: new THREE.MeshStandardMaterial({ color: 0xe9d7ad, roughness: 0.7 }),
  lacquer: new THREE.MeshStandardMaterial({ color: 0x1b1212, roughness: 0.25, metalness: 0.1 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2e2e2e, roughness: 0.6, metalness: 0.4 }),
  silk: new THREE.MeshStandardMaterial({ color: 0xb03a4a, roughness: 0.6, side: THREE.DoubleSide }),
  linen: new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 1, side: THREE.DoubleSide }),
  water: new THREE.MeshStandardMaterial({ color: 0xcfe3ea, roughness: 0.2, transparent: true, opacity: 0.85 }),
  tea: new THREE.MeshStandardMaterial({ color: 0x5f9a3c, roughness: 0.5 }),
  froth: new THREE.MeshStandardMaterial({ color: 0x568b2e, roughness: 0.95 }),
  powder: new THREE.MeshStandardMaterial({ color: 0x4f8a2e, roughness: 1 }),
  ash: new THREE.MeshStandardMaterial({ color: 0x8f8f86, roughness: 1 }),
  celadon: new THREE.MeshStandardMaterial({ color: 0x8fb3a0, roughness: 0.35 }),
};
const clickable = [];
const O = {}; // animatable objects
function mesh(geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = true;
  if (opts.name) {
    m.userData.name = opts.name;
    m.userData.desc = opts.desc;
    m.userData.jp = opts.jp;
    clickable.push(m);
  }
  return m;
}
function lathe(points, mat, opts) {
  return mesh(
    new THREE.LatheGeometry(
      points.map((p) => new THREE.Vector2(p[0], p[1])),
      32,
    ),
    mat,
    opts,
  );
}
