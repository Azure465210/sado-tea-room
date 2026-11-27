// ---------- utensils ----------
// chawan group with liquids; the "front" mark faces the host (-z) while tea is made
{
  const g = new THREE.Group();
  const bowl = lathe(
    [
      [0.035, 0],
      [0.045, 0.005],
      [0.055, 0.02],
      [0.062, 0.05],
      [0.066, 0.08],
      [0.06, 0.08],
      [0.056, 0.05],
      [0.048, 0.02],
      [0.04, 0.012],
    ],
    M.glaze,
    {
      name: 'Chawan',
      jp: '茶碗',
      desc: 'The tea bowl. Its "front" is the most beautiful side; the host turns it toward you before serving.',
    },
  );
  bowl.material = bowl.material.clone();
  bowl.material.side = THREE.DoubleSide;
  g.add(bowl);
  const mark = mesh(new THREE.BoxGeometry(0.022, 0.035, 0.004), M.clay, { shadow: false });
  mark.position.set(0, 0.055, -0.064);
  g.add(mark);
  const water = mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.012, 24), M.water, { shadow: false });
  water.position.y = 0.03;
  water.visible = false;
  g.add(water);
  const tea = mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.014, 24), M.tea, { shadow: false });
  tea.position.y = 0.03;
  tea.visible = false;
  g.add(tea);
  const froth = mesh(new THREE.CylinderGeometry(0.049, 0.046, 0.006, 24), M.froth, { shadow: false });
  froth.position.y = 0.04;
  froth.visible = false;
  g.add(froth);
  const powder = mesh(new THREE.ConeGeometry(0.02, 0.018, 16), M.powder, { shadow: false });
  powder.position.y = 0.021;
  powder.visible = false;
  g.add(powder);
  O.bowl = g;
  O.water = water;
  O.tea = tea;
  O.froth = froth;
  O.powder = powder;
  stage.add(g);
}
// Restore the liquid for a fresh lesson; drinking can lower it over several sips.
function resetTeaContents() {
  O.tea.position.y = 0.03;
  O.tea.scale.set(1,1,1);
  O.tea.userData.fill = 1;
  O.froth.position.y = 0.04;
  O.froth.scale.set(1,1,1);
}
function setTeaFill(amount) {
  const fill = Math.max(0,Math.min(1,amount));
  O.tea.userData.fill = fill;
  O.tea.visible = O.froth.visible = fill > 0.015;
  const radius = 0.82 + 0.18 * fill;
  O.tea.scale.set(radius,0.3 + 0.7 * fill,radius);
  O.tea.position.y = 0.017 + 0.013 * fill;
  O.froth.scale.set(radius,Math.max(0.1,fill),radius);
  O.froth.position.y = O.tea.position.y + 0.007 * O.tea.scale.y + 0.003 * O.froth.scale.y;
}
// chasen (whisk) — tines spread upward from the handle
{
  const g = new THREE.Group();
  const handle = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.055, 12), M.bamboo, {
    name: 'Chasen',
    jp: '茶筅',
    desc: 'The bamboo whisk, cut from one piece of bamboo into about 80 fine tines.',
  });
  handle.position.y = 0.028;
  g.add(handle);
  const tines = mesh(new THREE.CylinderGeometry(0.026, 0.013, 0.05, 18, 1, true), M.bambooLight);
  tines.material = tines.material.clone();
  tines.material.side = THREE.DoubleSide;
  tines.material.transparent = true;
  tines.material.opacity = 0.85;
  tines.position.y = 0.08;
  g.add(tines);
  const core = mesh(new THREE.CylinderGeometry(0.004, 0.01, 0.05, 8), M.bamboo);
  core.position.y = 0.08;
  g.add(core);
  const thread = mesh(new THREE.TorusGeometry(0.013, 0.002, 6, 16), M.hair);
  thread.rotation.x = Math.PI / 2;
  thread.position.y = 0.058;
  g.add(thread);
  O.chasen = g;
  stage.add(g);
}
// natsume + lid
{
  const body = lathe(
    [
      [0, 0],
      [0.035, 0],
      [0.038, 0.03],
      [0.036, 0.052],
      [0, 0.052],
    ],
    M.lacquer,
    { name: 'Natsume', jp: '棗', desc: 'The lacquered container for thin tea. Its shape is like a jujube fruit (natsume).' },
  );
  O.natsume = body;
  stage.add(body);
  const lid = lathe(
    [
      [0, 0],
      [0.036, 0],
      [0.038, 0.01],
      [0.03, 0.026],
      [0, 0.028],
    ],
    M.lacquer,
    { name: 'Natsume lid', jp: '棗の蓋', desc: 'The host lifts the lid and rests it to the right of the bowl while scooping.' },
  );
  O.lid = lid;
  stage.add(lid);
}
// chashaku (scoop): lies along local z, scoop tip at -z
{
  const g = new THREE.Group();
  const s = mesh(new THREE.BoxGeometry(0.008, 0.004, 0.17), M.bamboo, {
    name: 'Chashaku',
    jp: '茶杓',
    desc: 'The bamboo tea scoop. One and a half scoops of matcha make a bowl of thin tea.',
  });
  g.add(s);
  const tip = mesh(new THREE.BoxGeometry(0.012, 0.004, 0.03), M.bambooLight);
  tip.position.set(0, 0.006, -0.085);
  tip.rotation.x = 0.5;
  g.add(tip);
  O.chashaku = g;
  stage.add(g);
}
// furo + kama (host's left front), lid with chakin on top
const KAMA = [-0.45, 0, 0.36];
const FUTA = [-0.3, 0, 0.57]; // lid rest (futaoki), in front of her on the left
const MIZU = [0.36, 0, -0.02]; // cold-water jar
const KENSUI = [-0.4, 0, 0.05]; // waste-water bowl, beside her left knee
{
  const brazier = lathe(
    [
      [0, 0],
      [0.14, 0],
      [0.15, 0.08],
      [0.13, 0.1],
      [0.11, 0.1],
      [0.11, 0.09],
      [0, 0.09],
    ],
    M.clay,
    { name: 'Furo', jp: '風炉', desc: 'The portable brazier used from May to October. Charcoal inside heats the kettle. From November to April the kettle sits in a sunken hearth (ro) instead; this room shows the summer setting.' },
  );
  brazier.position.set(...KAMA);
  stage.add(brazier);
  const ash = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), M.ash, { shadow: false });
  ash.position.set(KAMA[0], 0.095, KAMA[2]);
  stage.add(ash);
  const kama = mesh(new THREE.SphereGeometry(0.12, 24, 24), M.iron, {
    name: 'Kama',
    jp: '釜',
    desc: 'The iron kettle. The sound of the water just under the boil is called matsukaze, "wind in the pines".',
  });
  kama.scale.set(1, 0.8, 1);
  kama.position.set(KAMA[0], 0.19, KAMA[2]);
  stage.add(kama);
  const lidG = new THREE.Group();
  const lid = mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.015, 20), M.iron, {
    name: 'Kama lid',
    jp: '釜の蓋',
    desc: 'The kettle lid. It is lifted with the fukusa, because it is hot, and rested on the futaoki.',
  });
  lidG.add(lid);
  const knob = mesh(new THREE.SphereGeometry(0.012, 10, 10), M.iron);
  knob.position.y = 0.015;
  lidG.add(knob);
  O.kamaLid = lidG;
  stage.add(lidG);
  const kw = mesh(
    new THREE.CylinderGeometry(0.078, 0.078, 0.006, 28),
    new THREE.MeshStandardMaterial({ color: 0x9fb8bf, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 }),
    {
      shadow: false,
      name: 'Hot water',
      jp: '湯',
      desc: 'The kettle is about two-thirds full. It is kept just under the boil all through the ceremony.',
    },
  );
  kw.position.set(KAMA[0], 0.268, KAMA[2]);
  stage.add(kw);
  O.kamaWater = kw;
  const steam = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const p = mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 1 }),
      { shadow: false },
    );
    p.userData.o = i * 1.1;
    steam.add(p);
  }
  steam.position.set(KAMA[0] + 0.02, 0.3, KAMA[2]);
  stage.add(steam);
  O.steam = steam;
}
// chakin (linen cloth), folded, rests on the kama lid
{
  const c = mesh(new THREE.BoxGeometry(0.05, 0.012, 0.03), M.linen, {
    name: 'Chakin',
    jp: '茶巾',
    desc: 'A small damp linen cloth for wiping the bowl. It comes in inside the bowl and waits on the kettle lid.',
  });
  O.chakin = c;
  stage.add(c);
}
// mizusashi (cold-water jar) to the host's right, behind
{
  const jar = lathe(
    [
      [0, 0],
      [0.085, 0],
      [0.095, 0.1],
      [0.09, 0.17],
      [0, 0.17],
    ],
    M.celadon,
    { name: 'Mizusashi', jp: '水指', desc: 'The cold-water jar. Fresh water is added to the kettle at the end to replace what was used.' },
  );
  jar.position.set(...MIZU);
  stage.add(jar);
  const lid = mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.015, 24), M.lacquer);
  lid.position.set(MIZU[0], 0.178, MIZU[2]);
  stage.add(lid);
}
// futaoki (lid rest, bamboo) and hishaku resting on it
{
  const f = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.05, 16), M.bamboo, {
    name: 'Futaoki',
    jp: '蓋置',
    desc: 'A short piece of bamboo: the rest for the kettle lid and the ladle.',
  });
  f.position.set(FUTA[0], 0.025, FUTA[2]);
  stage.add(f);
  const g = new THREE.Group();
  const cup = mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.035, 16, 1, true), M.bamboo, {
    name: 'Hishaku',
    jp: '柄杓',
    desc: 'The bamboo ladle. It carries hot water from the kettle to the bowl, and spare water back.',
  });
  cup.material = cup.material.clone();
  cup.material.side = THREE.DoubleSide;
  g.add(cup);
  const bottom = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.004, 16), M.bamboo);
  bottom.position.y = -0.016;
  g.add(bottom);
  const handle = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.38, 8), M.bamboo);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.21, 0.005, 0);
  g.add(handle);
  O.hishaku = g;
  stage.add(g);
}
// pour stream (shown while the ladle is tilted)
{
  const st = mesh(new THREE.CylinderGeometry(0.006, 0.004, 1, 8), M.water, { shadow: false });
  st.visible = false;
  O.stream = st;
  stage.add(st);
}
// fukusa (silk cloth) tucked at the left hip when not in use
{
  const fg = new THREE.BoxGeometry(1, 0.002, 1);
  fg.translate(0, 0, 0.5); // replaced with the silk mesh in 41-fukusa.js
  const f = mesh(fg, M.silk, {
    name: 'Fukusa',
    jp: '帛紗',
    desc: 'A silk cloth for purifying the utensils, shown here at 27 × 30 cm. It is worn at the left hip folded as a triangle, then shaped into a small square pad for wiping.',
  });
  O.fukusa = f;
  stage.add(f);
}
// kashiki: lacquer sweet dish with two nerikiri (main sweets) and kuromoji picks, kept at the host's right until served
{
  const g = new THREE.Group();
  const dish = lathe(
    [
      [0, 0],
      [0.09, 0],
      [0.1, 0.012],
      [0.1, 0.02],
      [0.085, 0.02],
      [0.085, 0.008],
      [0, 0.008],
    ],
    M.lacquer,
    {
      name: 'Kashiki',
      jp: '菓子器',
      desc: 'The sweet dish. The host brings it out and places it before the guest; the sweet is eaten before the tea.',
    },
  );
  g.add(dish);
  for (const [x, z] of [
    [-0.035, 0.01],
    [0.035, -0.01],
  ]) {
    const sw = mesh(nerikiriGeometry(-SWEET_RADIUS, SWEET_RADIUS), new THREE.MeshStandardMaterial({ color: 0xdb759a, roughness: 0.85 }), {
      name: 'Nerikiri',
      jp: '練り切り',
      desc: 'A soft main sweet (omogashi) of white bean paste, shaped for the season. Cut it with the kuromoji and eat it in two or three bites.',
    });
    sw.position.set(x, 0.008, z);
    sw.userData.home = sw.position.clone();
    g.add(sw);
    (O.sweets = O.sweets || []).push(sw);
    const lf = mesh(new THREE.SphereGeometry(0.007, 12, 8), M.kimonoPlain);
    lf.scale.set(0.64, 0.24, 1.25);
    lf.position.set(0, 0.034, 0);
    sw.add(lf);
    sw.userData.leaf = lf;
  }
  const pick = mesh(new THREE.BoxGeometry(0.004, 0.003, 0.12), M.bamboo, {
    name: 'Kuromoji',
    jp: '黒文字',
    desc: 'Picks of spicebush wood come with the dish, one for each guest: a small knife and fork in one.',
  });
  pick.position.set(0.0, 0.022, 0.07);
  pick.rotation.y = 1.35;
  g.add(pick);
  const pick2 = pick.clone();
  pick2.position.set(0.0, 0.025, 0.078);
  g.add(pick2);
  O.kashiki = g;
  stage.add(g);
}
// kensui (waste-water bowl) beside the left knee
{
  const k = lathe(
    [
      [0, 0],
      [0.06, 0],
      [0.07, 0.055],
      [0.06, 0.055],
      [0.05, 0.01],
      [0, 0.01],
    ],
    M.iron,
    { name: 'Kensui', jp: '建水', desc: "The waste-water bowl, kept low beside the host's left knee. Used water goes here." },
  );
  k.position.set(...KENSUI);
  stage.add(k);
}

const hishakuOnKama_ = [KAMA[0] + 0.02, 0.31, KAMA[2] + 0.02]; // "oki-bishaku": ladle rests across the open kettle mouth, handle toward the host
