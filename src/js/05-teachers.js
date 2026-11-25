// ---------- teachers: who hosts the lesson ----------
// Each teacher brings a portrait (whose face becomes the avatar's face), a body style, a voice and a way of speaking.
// Shizue has an English script; the other instructors have Japanese scripts with English translations.
// The asset tokens become `null` when a file is missing at build
// time (tools/build.js), so every lookup below falls back: shizue's art, the English lines, or a built-in placeholder.
const parseJSON = (s) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
};
const SHIZUE_ART = { svg: /*@TEXT:art/final/portrait.svg@*/, spec: parseJSON(/*@TEXT:art/final/spec.json@*/) };
const IFU_ART = (function () {
  const svg = /*@TEXT:art/ifu/portrait.svg@*/,
    spec = parseJSON(/*@TEXT:art/ifu/spec.json@*/);
  // until the artist's files exist, he borrows shizue's face but keeps his own body style, so the style code can be tried out
  if (!svg || !spec || !spec.face) return { svg: SHIZUE_ART.svg, spec: Object.assign({}, SHIZUE_ART.spec, { style: { hair: 'short', garment: 'jittoku', feathers: true, pixels: true, kneeGap: 0.02 } }), placeholder: true };
  return { svg, spec };
})();
const TEACHERS = {
  shizue: {
    id: 'shizue',
    name: 'Shizue-sensei',
    nameJa: '静江先生',
    romaji: 'Shizue-sensei',
    pronoun: 'she',
    lang: 'en',
    art: SHIZUE_ART,
    fukusa: '#b03a4a', // the red-orange silk she has always used (women's colour)
    // English, a woman's voice if the browser has one (she is a woman)
    voice: { lang: 'en', tag: 'en-GB', rate: 0.92, pitch: 1, hint: /female|samantha|karen|moira|tessa|serena|sonia|libby|hazel|susan|zira|aria|jenny|kate|martha|fiona/i },
    alt: 'Portrait of Shizue-sensei: a woman of about seventy with silver hair, in a kimono',
    intro: 'Shizue-sensei has practised Urasenke tea for more than forty years. She will make a bowl of usucha, thin tea, in eight short steps and explain each one in English. At the end, you whisk a bowl yourself.',
    voiceLabel: 'Read the explanations aloud (English voice)',
    headDesc: 'The tea master, teishu. Today Shizue-sensei explains everything in English.',
    card: {
      role: { en: 'Tea teacher · Urasenke style', ja: '裏千家の茶道教授' },
      personality: { en: 'Calm, warm and precise. Over forty years of practice have made every movement quiet and exact; she explains patiently and encourages you gently.', ja: '穏やかで温かく、所作は正確。四十年あまりの稽古を重ね、やさしく丁寧に教えてくれます。' },
      traits: [
        { en: 'Calm', ja: '穏やか' },
        { en: 'Warm', ja: '温かい' },
        { en: 'Precise', ja: '正確' },
        { en: '40+ years of practice', ja: '稽古四十年' },
      ],
    },
    greeting: { en: 'Welcome to my tea room. I am Shizue. Today I will make a bowl of thin tea for you, one step at a time. Please sit comfortably and watch.' },
    script: parseJSON(/*@TEXT:src/data/shizue-script.json@*/),
  },
  ifu: {
    id: 'ifu',
    name: 'Urone If',
    nameJa: '虚音イフ',
    romaji: 'Urone If',
    pronoun: 'he',
    lang: 'ja',
    art: IFU_ART,
    fukusa: '#5b3a7a', // purple: the men's colour
    // Japanese; a man's voice if there is one, otherwise a lower pitch (see 06-tts). Speaks the `yomi` text.
    voice: { lang: 'ja', tag: 'ja-JP', rate: 0.95, pitch: 0.85, hint: /keita|ichiro|daichi|naoki|otoya|hattori|male|男性/i },
    alt: 'Urone If: a chimera born of data, in a brown hat with a dark feather, a brown beak mask with a brass lens, cream fur, a maroon scarf, a ragged dark cape and a brown kimono whose sleeves end in wing feathers (fan-made model based on the official design)',
    intro: 'Urone If, a curious creature made of data, is playing the tea teacher today. He will make a bowl of usucha, thin tea, in eight short steps and explain each one in Japanese, with English subtitles. At the end, you whisk a bowl yourself.',
    voiceLabel: 'Read the explanations aloud (Japanese voice, English subtitles)',
    headDesc: 'The tea master, teishu. Today Urone If plays the teacher and explains everything in Japanese, with English subtitles.',
    credit: '虚音イフ © its creator (UTAU / COEIROINK character). 3D look based on the official design; a fan-made model.',
    card: null, // from the script
    greeting: null, // from the script
    script: parseJSON(/*@TEXT:src/data/ifu-script.json@*/),
  },
};
{
  // the card and the greeting come from his script; a small placeholder keeps the page whole until it exists
  const T = TEACHERS.ifu,
    sc = T.script || {};
  T.card = sc.card || {
    role: { en: "Tea teacher (today's role)", ja: '茶の湯の先生（本日の役どころ）' },
    personality: { en: 'A courteous gentleman with a sly streak, who calls himself a monster made of data and loves playing at human roles.', ja: '丁寧な紳士。けれど真意は読めない。' },
    traits: [
      { en: 'Gentlemanly', ja: '紳士的' },
      { en: 'Curious about humans', ja: '人間に興味津々' },
    ],
  };
  T.greeting = sc.greeting || { ja: 'お初にお目にかかります。虚音イフと申します。', en: 'A pleasure to meet you. I am Urone If.', yomi: 'おはつにおめにかかります。うろねいふともうします。' };
}
// ---- navigators: Shizue-sensei performs the ceremony silently, and the navigator explains it from a small corner window
// (the navigator window, 52-navigator.js) in Japanese, with the English under the caption. Each has its own script with the
// same schema and times as ifu's (src/data/<id>-script.json). The selector (window.SadoSelector) draws their busts. ----
const NAVIGATOR_SCRIPTS = {
  akane: /*@TEXT:src/data/akane-script.json@*/,
  aoi: /*@TEXT:src/data/aoi-script.json@*/,
  reimu: /*@TEXT:src/data/reimu-script.json@*/,
  marisa: /*@TEXT:src/data/marisa-script.json@*/,
  zundamon: /*@TEXT:src/data/zundamon-script.json@*/,
  metan: /*@TEXT:src/data/metan-script.json@*/,
  tsumugi: /*@TEXT:src/data/tsumugi-script.json@*/,
  zunko: /*@TEXT:src/data/zunko-script.json@*/,
  kiritan: /*@TEXT:src/data/kiritan-script.json@*/,
  itako: /*@TEXT:src/data/itako-script.json@*/,
};
const NAVIGATORS = [
  // id, English name, Japanese name, voice engine (for the texts)
  ['akane', 'Kotonoha Akane', '琴葉茜', 'A.I.VOICE'],
  ['aoi', 'Kotonoha Aoi', '琴葉葵', 'A.I.VOICE'],
  ['reimu', 'Yukkuri Reimu', 'ゆっくり霊夢', 'AquesTalk'],
  ['marisa', 'Yukkuri Marisa', 'ゆっくり魔理沙', 'AquesTalk'],
  ['zundamon', 'Zundamon', 'ずんだもん', 'VOICEVOX'],
  ['metan', 'Shikoku Metan', '四国めたん', 'VOICEVOX'],
  ['tsumugi', 'Kasukabe Tsumugi', '春日部つむぎ', 'VOICEVOX'],
  ['zunko', 'Tohoku Zunko', '東北ずん子', 'VOICEVOX'],
  ['kiritan', 'Tohoku Kiritan', '東北きりたん', 'VOICEVOX'],
  ['itako', 'Tohoku Itako', '東北イタコ', 'VOICEVOX'],
];
for (const [id, name, nameJa, engine] of NAVIGATORS) {
  const sc = parseJSON(NAVIGATOR_SCRIPTS[id]) || null;
  TEACHERS[id] = {
    id,
    name,
    nameJa,
    romaji: name,
    lang: 'ja',
    teaRole: 'navigator',
    performer: 'shizue', // who makes the tea (the avatar, the fukusa)
    narrator: id, // who speaks the lines
    art: SHIZUE_ART,
    fukusa: TEACHERS.shizue.fukusa,
    alt: name + ' (' + nameJa + '), navigator',
    intro: 'Shizue-sensei makes a bowl of usucha, thin tea, in eight short steps, and ' + name + ' explains each one from a small window, in Japanese with English subtitles. At the end, you whisk a bowl yourself.',
    voiceLabel: 'Read the explanations aloud (' + name + ', Japanese voice; English subtitles)',
    headDesc: TEACHERS.shizue.headDesc.replace('Today Shizue-sensei explains everything in English.', 'Today ' + name + ' explains each step from the corner window.'),
    engine,
    card: (sc && sc.card) || { role: { en: 'Navigator', ja: '解説' }, personality: { en: name + ' explains what Shizue-sensei does.', ja: '静江先生のお点前を解説します。' }, traits: [] },
    greeting: (sc && sc.greeting) || { ja: nameJa + 'です。', en: 'I am ' + name + '.', yomi: '' },
    script: sc,
  };
}
// the teacher whose body makes the tea: a navigator's performer, else the teacher itself
const performerOf = (T) => (T && T.performer && TEACHERS[T.performer]) || T;
const isNavigatorTeacher = (T) => !!T && T.teaRole === 'navigator';
// the teacher in charge: #teacher=<id> in the address (for tools and links), else the last choice, else shizue
let TEACHER = TEACHERS.shizue;
{
  let id = null;
  const m = /(?:^|[#&])teacher=(\w+)/.exec(location.hash || '');
  if (m) id = m[1];
  else
    try {
      id = localStorage.getItem('sado.teacher');
    } catch (e) {}
  if (id && TEACHERS[id]) TEACHER = TEACHERS[id];
}
function rememberTeacher(id) {
  try {
    localStorage.setItem('sado.teacher', id);
  } catch (e) {}
}
// ---- what the teacher says. A "unit" is either an English string or {ja, en, yomi}. STEPS (40-choreography) keeps the
// timing and the English; a teacher with a script replaces the words but never the times, so the motion stays in step. ----
const unitOk = (u) => u && typeof u === 'object' && typeof u.en === 'string' && (u.ja == null || typeof u.ja === 'string');
function teacherLines(i) {
  return STEPS[i].lines.map((l, k) => {
    const narrator = narratorForTurn(k);
    const sc = narrator.script && narrator.script.steps && narrator.script.steps[i];
    const u = sc && sc.lines && sc.lines[k] && sc.lines[k][1];
    return [l[0], narratedUnit(pairIntro(unitOk(u) ? u : l[1], i, k), narrator)];
  });
}
function teacherQs(i) {
  // the question stays English (the page's language); the answer is the teacher's
  return STEPS[i].qs.map((q, k) => {
    const narrator = narratorForTurn(k);
    const sc = narrator.script && narrator.script.steps && narrator.script.steps[i];
    const a = sc && sc.qs && sc.qs[k] && sc.qs[k][1];
    return [q[0], narratedUnit(unitOk(a) ? a : q[1], narrator)];
  });
}
function teacherSays(key, k, fallback) {
  // guestIntro / guestDrink (arrays, index k) or a single unit (whiskDone)
  const narrator = narratorForTurn(k);
  const sc = narrator.script;
  let u = sc && sc[key];
  if (Array.isArray(u)) u = u[k];
  return narratedUnit(unitOk(u) ? u : fallback, narrator);
}
const unitText = (u) => (typeof u === 'string' ? u : u.ja || u.en);
