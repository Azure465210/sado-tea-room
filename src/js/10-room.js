// ---------- room ----------
{
  const floor = mesh(new THREE.PlaneGeometry(2.7, 2.7), M.tatami, { shadow: false });
  floor.rotation.x = -Math.PI / 2;
  stage.add(floor);
  // mats 1.8 m deep; the dark borders lie behind the host and between the served bowl and the guest, never under a utensil
  M.tatami.map.repeat.set(1, 1.5);
  M.tatami.map.offset.y = 2 / 3;
  const wallH = 2.3;
  const back = mesh(new THREE.BoxGeometry(2.7, wallH, 0.05), M.wall, { shadow: false });
  back.position.set(0, wallH / 2, -1.35);
  stage.add(back);
  const left = mesh(new THREE.BoxGeometry(0.05, wallH, 2.7), M.wall, { shadow: false });
  left.position.set(-1.35, wallH / 2, 0);
  stage.add(left);
  const right = mesh(new THREE.BoxGeometry(0.05, wallH, 2.7), M.wall, { shadow: false });
  right.position.set(1.35, wallH / 2, 0);
  stage.add(right);
  const toko = new THREE.Group();
  toko.position.set(-0.75, 0, -1.3);
  const step = mesh(new THREE.BoxGeometry(1.0, 0.12, 0.45), M.wood);
  step.position.set(0, 0.06, 0.2);
  toko.add(step);
  // the scroll: 一期一会, written top to bottom. The stage is mirrored, so the writing is drawn mirrored to read correctly.
  const sc = document.createElement('canvas');
  sc.width = 224;
  sc.height = 800;
  const drawScroll = () => {
    const g = sc.getContext('2d');
    g.setTransform(MX, 0, 0, 1, MX < 0 ? sc.width : 0, 0);
    g.fillStyle = '#5b6a62';
    g.fillRect(0, 0, 224, 800);
    g.fillStyle = '#f4eedd';
    g.fillRect(22, 150, 180, 520);
    g.fillStyle = '#c9b58a';
    g.fillRect(0, 138, 224, 6);
    g.fillRect(0, 676, 224, 6);
    g.fillStyle = '#26211c';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 96px "Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif';
    ['一', '期', '一', '会'].forEach((ch, i) => g.fillText(ch, 112, 224 + i * 124));
    g.fillStyle = '#a43b2c';
    g.fillRect(150, 626, 22, 22);
  };
  drawScroll();
  const scrollTex = new THREE.CanvasTexture(sc);
  scrollTex.encoding = THREE.sRGBEncoding;
  if (document.fonts && document.fonts.load)
    document.fonts
      .load('700 96px "Shippori Mincho"', '一期一会')
      .then(() => {
        drawScroll();
        scrollTex.needsUpdate = true;
      })
      .catch(() => {});
  const scroll = mesh(new THREE.PlaneGeometry(0.28, 1.0), new THREE.MeshStandardMaterial({ map: scrollTex, roughness: 1 }), {
    name: 'Kakejiku',
    jp: '掛軸',
    desc: 'A hanging scroll, chosen by the host for today. It reads ichi-go ichi-e (一期一会), "one time, one meeting": this gathering will never come again, so host and guest give it their whole attention.',
  });
  scroll.position.set(0, 1.2, 0.03);
  toko.add(scroll);
  const rod = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 12), M.darkwood);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 0.69, 0.04);
  toko.add(rod);
  const vase = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 16), M.glaze, {
    name: 'Chabana',
    jp: '茶花',
    desc: 'One seasonal flower, placed as if it were still in the field.',
  });
  vase.position.set(0.3, 0.21, 0.2);
  toko.add(vase);
  const stem = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 6), M.kimonoPlain);
  stem.position.set(0.3, 0.4, 0.2);
  toko.add(stem);
  const bud = mesh(new THREE.SphereGeometry(0.025, 12, 12), M.silk);
  bud.position.set(0.3, 0.52, 0.2);
  toko.add(bud);
  stage.add(toko);
  const shoji = mesh(
    new THREE.PlaneGeometry(0.9, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xfdf8ea, emissive: 0xfff3d6, emissiveIntensity: 0.35, roughness: 1 }),
    { shadow: false },
  );
  shoji.rotation.y = -Math.PI / 2;
  shoji.position.set(1.32, 1.1, 0.2);
  stage.add(shoji);
  for (let i = 0; i < 4; i++) {
    const b = mesh(new THREE.BoxGeometry(0.02, 1.2, 0.02), M.darkwood, { shadow: false });
    b.position.set(1.31, 1.1, -0.25 + i * 0.3);
    stage.add(b);
  }
  for (let i = 0; i < 5; i++) {
    const b = mesh(new THREE.BoxGeometry(0.02, 0.02, 0.9), M.darkwood, { shadow: false });
    b.position.set(1.31, 0.5 + i * 0.3, 0.2);
    stage.add(b);
  }
  const zabuton = mesh(new THREE.BoxGeometry(0.55, 0.04, 0.55), new THREE.MeshStandardMaterial({ color: 0x8a4b63, roughness: 1 }));
  zabuton.position.set(0, 0.02, 1.35);
  stage.add(zabuton);
  // guest items: kaishi paper with a sweet, kuromoji pick, folded fan
  const kaishi = mesh(new THREE.BoxGeometry(0.15, 0.006, 0.1), M.linen, {
    name: 'Kaishi',
    jp: '懐紙',
    desc: 'Folded paper the guest brings. The sweet is served on it, and you wipe your fingers on it after wiping the rim of the bowl.',
  });
  kaishi.position.set(0.1, 0.003, 1.0);
  kaishi.rotation.y = 0.1;
  stage.add(kaishi);
  O.kaishi = kaishi;
  const basami = mesh(new THREE.BoxGeometry(0.12, 0.015, 0.18), new THREE.MeshStandardMaterial({ color: 0x6b4f8a, roughness: 0.7 }), {
    name: 'Fukusa-basami',
    jp: '帛紗ばさみ',
    desc: "The guest's brocade pouch. It holds the kaishi, the kuromoji, the fukusa and the kobukusa; the fan is tucked outside.",
  });
  basami.position.set(-0.3, 0.0075, 1.1);
  basami.rotation.y = 0.15;
  stage.add(basami);
  O.basami = basami;
  const kobukusa = mesh(new THREE.BoxGeometry(0.15, 0.004, 0.16), new THREE.MeshStandardMaterial({ color: 0x8a2f3c, roughness: 0.6 }), {
    name: 'Kobukusa',
    jp: '古帛紗',
    desc: 'A small square of brocade silk. It is used mainly with thick tea and with precious utensils, to protect them while they are handled.',
  });
  kobukusa.position.set(-0.32, 0.017, 1.1);
  kobukusa.rotation.y = 0.15;
  stage.add(kobukusa);
  O.kobukusa = kobukusa;
  const pickGeometry = new THREE.BoxGeometry(0.005, 0.003, 0.11);
  const pickVertices = pickGeometry.attributes.position;
  for (let i = 0; i < pickVertices.count; i++) {
    if (pickVertices.getZ(i) < 0) pickVertices.setX(i, pickVertices.getX(i) * 0.25);
  }
  pickGeometry.computeVertexNormals();
  const kuromoji = mesh(pickGeometry, M.bamboo, {
    name: 'Kuromoji',
    jp: '黒文字',
    desc: 'A small pick cut from spicebush wood, for cutting and eating the sweet.',
  });
  kuromoji.position.set(0.195, 0.0015, 1.0);
  kuromoji.rotation.y = 0.1;
  stage.add(kuromoji);
  O.kuromoji = kuromoji;
  const sensu = mesh(new THREE.BoxGeometry(0.17, 0.012, 0.022), M.lacquer, {
    name: 'Sensu',
    jp: '扇子',
    desc: "The guest's folded fan. It stays closed: laid in front of the knees during a greeting, it marks a polite boundary between host and guest.",
  });
  sensu.position.set(-0.12, 0.006, 1.05);
  sensu.rotation.y = 0.05;
  stage.add(sensu);
  O.sensu = sensu;
}
