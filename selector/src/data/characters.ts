/// <reference types="vite/client" />
// The instructor roster: 11 Japanese TTS characters plus Shizue-sensei, the tea room's own host.
// Card text and greetings come from each navigator's script (src/data/<id>-script.json in the tea room project) when that
// file exists; the fallbacks below keep the selector whole until then. Only the `card` and `greeting` exports of each JSON
// file are imported, so the rest of the scripts stays out of this bundle.
import type { VoiceProfile } from './voice';

export type Gender = 'female' | 'male' | 'unknown';
export type Engine = 'A.I.VOICE' | 'AquesTalk' | 'VOICEVOX' | 'COEIROINK' | 'Browser';
export type BodyType = 'humanoid' | 'head-only' | 'chimera';
export type TeaRole = 'performer' | 'navigator';

export interface JaEn {
  ja: string;
  en: string;
}
export interface Spoken extends JaEn {
  /** the Japanese text as the TTS should read it (kana for words a TTS might misread) */
  yomi: string;
}
export interface CardText {
  role: JaEn;
  personality: JaEn;
  traits: JaEn[];
}

export interface Character {
  id: string;
  nameEn: string;
  nameJa: string;
  engine: Engine;
  gender: Gender;
  /** Included in the neutral presentation group used to order the instructor list. */
  neutralPresentation?: boolean;
  /** a licensed .vrm / .glb file; null = use the built-in procedural bust */
  model3dUrl: string | null;
  /** a 2D portrait used when WebGL or the 3D bust is unavailable; null = a lettered placeholder */
  fallback2dUrl: string | null;
  bodyType: BodyType;
  /** 'mask', 'tail', 'wings', 'hat', ... */
  features: string[];
  teaRole: TeaRole;
  /** CSS colour */
  accent: string;
  card: CardText;
  greeting: Spoken;
  voice: VoiceProfile;
  /** a small label on the card, e.g. "Tea Room original" */
  badge?: string;
  /** a credit line shown with the character */
  credit?: string;
}

// ---------- scripts (optional at build time) ----------
const scriptCards = import.meta.glob(['../../../src/data/*-script.json', '!../../../src/data/shizue-script.json'], { eager: true, import: 'card' }) as Record<string, unknown>;
const scriptGreetings = import.meta.glob('../../../src/data/*-script.json', { eager: true, import: 'greeting' }) as Record<string, unknown>;

const isJaEn = (v: unknown): v is JaEn =>
  !!v && typeof v === 'object' && typeof (v as JaEn).ja === 'string' && typeof (v as JaEn).en === 'string';
const isCard = (v: unknown): v is CardText =>
  !!v && typeof v === 'object' && isJaEn((v as CardText).role) && isJaEn((v as CardText).personality) &&
  Array.isArray((v as CardText).traits) && (v as CardText).traits.every(isJaEn);
const isSpoken = (v: unknown): v is Spoken => isJaEn(v) && typeof (v as Spoken).yomi === 'string';

function fromScript<T>(table: Record<string, unknown>, id: string, ok: (v: unknown) => v is T): T | null {
  for (const [path, value] of Object.entries(table)) {
    if (path.endsWith('/' + id + '-script.json') && ok(value)) return value;
  }
  return null;
}

const NAV_ROLE: JaEn = { ja: 'お点前の解説役（ナビゲーター）', en: 'Commentator (navigator)' };

// rate / pitch mirror the tea room's src/js/06-tts.js PROFILES (webRate / webPitch), which is what the tea room speaks
// with; this copy only drives the standalone demo page. Change both together.
const vv = (speaker: string, rate: number, pitch: number, hint: VoiceProfile['browserHint'] = 'female'): VoiceProfile => ({
  lang: 'ja', tag: 'ja-JP', rate, pitch, engine: 'voicevox', voicevox: { speaker, style: 'ノーマル' }, browserHint: hint,
  credit: 'VOICEVOX:' + speaker,
});
const browserJa = (rate: number, pitch: number, hint: VoiceProfile['browserHint'] = 'female'): VoiceProfile => ({
  lang: 'ja', tag: 'ja-JP', rate, pitch, engine: 'browser', browserHint: hint,
});

type Base = Omit<Character, 'card' | 'greeting'> & { fallbackCard: CardText; fallbackGreeting: Spoken };

const BASE: Base[] = [
  {
    id: 'shizue', nameEn: 'Shizue-sensei', nameJa: '静江先生', engine: 'Browser', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['kimono', 'silver-hair', 'chignon'],
    teaRole: 'performer', accent: '#c4574f', badge: 'Tea Room original',
    voice: { lang: 'en', tag: 'en-GB', rate: 0.92, pitch: 1, engine: 'browser', browserHint: 'female' },
    fallbackCard: {
      role: { en: 'Tea teacher · Urasenke style', ja: '裏千家の茶道教授' },
      personality: {
        en: 'Calm, warm and precise. Over forty years of practice have made every movement quiet and exact; she explains patiently and encourages you gently.',
        ja: '穏やかで温かく、所作は正確。四十年あまりの稽古を重ね、やさしく丁寧に教えてくれます。',
      },
      traits: [
        { en: 'Calm', ja: '穏やか' },
        { en: 'Warm', ja: '温かい' },
        { en: 'Precise', ja: '正確' },
        { en: '40+ years of practice', ja: '稽古四十年' },
      ],
    },
    fallbackGreeting: {
      en: 'Welcome to my tea room. I am Shizue. Today I will make a bowl of thin tea for you, one step at a time. Please sit comfortably and watch.',
      ja: '私の茶室へようこそ。静江です。今日は薄茶を一服、一つずつ順にお点てします。どうぞ楽になさって、ご覧ください。',
      yomi: 'わたしのちゃしつへようこそ。しずえです。きょうはうすちゃをいっぷく、ひとつずつじゅんにおたてします。どうぞらくになさって、ごらんください。',
    },
  },
  {
    id: 'ifu', nameEn: 'Urone If', nameJa: '虚音イフ', engine: 'COEIROINK', gender: 'male', neutralPresentation: true,
    model3dUrl: null, fallback2dUrl: null, bodyType: 'chimera',
    features: ['mask', 'beak', 'hat', 'feather', 'fur', 'scarf', 'cape', 'wings', 'tail'],
    teaRole: 'performer', accent: '#b8873f',
    credit: '虚音イフ © its creator (UTAU / COEIROINK character). 3D look based on the official design; a fan-made model.',
    voice: { lang: 'ja', tag: 'ja-JP', rate: 0.95, pitch: 0.85, engine: 'coeiroink', coeiroink: { speakerMatch: 'イフ' }, browserHint: 'male' },
    fallbackCard: {
      role: { ja: '茶の湯の先生（本日の役どころ）', en: "Tea teacher (today's role)" },
      personality: {
        ja: '丁寧で穏やかな紳士。けれど時おり冗談を交え、真意はなかなか読めない。「データで出来た化け物」を名乗り、人間の真似事を好む。',
        en: 'A courteous, soft-spoken gentleman with a sly streak. He calls himself a monster made of data and loves playing at human roles; today he is your tea teacher.',
      },
      traits: [
        { ja: '紳士的', en: 'Gentlemanly' },
        { ja: 'ちょっと胡散臭い', en: 'A little sly' },
        { ja: '人間に興味津々', en: 'Curious about humans' },
        { ja: '古風な口調', en: 'Old-fashioned speech' },
      ],
    },
    fallbackGreeting: {
      ja: 'お初にお目にかかります。虚音イフと申します。本日は、茶の湯の先生を務めさせていただきます。',
      en: 'A pleasure to make your acquaintance. Urone If, at your service. Today I shall be your tea teacher.',
      yomi: 'おはつにおめにかかります。うろねいふともうします。ほんじつは、ちゃのゆのせんせいをつとめさせていただきます。',
    },
  },
  {
    id: 'akane', nameEn: 'Kotonoha Akane', nameJa: '琴葉茜', engine: 'A.I.VOICE', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['long-hair', 'pink-hair'],
    teaRole: 'navigator', accent: '#ec6d93', voice: browserJa(1.08, 1.2),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: '琴葉姉妹の姉。元気で明るい関西弁の女の子。ちょっぴり天然で、妹の葵が大好き。',
        en: 'The elder Kotonoha twin: bright, energetic and a little scatterbrained, speaking in a Kansai dialect. She adores her sister Aoi.',
      },
      traits: [
        { ja: '元気いっぱい', en: 'Full of energy' },
        { ja: '関西弁', en: 'Kansai dialect' },
        { ja: 'ちょっと天然', en: 'A bit airheaded' },
        { ja: '妹思い', en: 'Dotes on Aoi' },
      ],
    },
    fallbackGreeting: {
      ja: 'うち、琴葉茜や！今日は静江先生のお点前、うちが横から解説するで。ほな、一緒に見ていこな！',
      en: "I'm Kotonoha Akane! Today I'll be commentating on Shizue-sensei's tea-making. Right then, let's watch together!",
      yomi: 'うち、ことのはあかねや！きょうはしずえせんせいのおてまえ、うちがよこからかいせつするで。ほな、いっしょにみていこな！',
    },
  },
  {
    id: 'aoi', nameEn: 'Kotonoha Aoi', nameJa: '琴葉葵', engine: 'A.I.VOICE', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['long-hair', 'blue-hair'],
    teaRole: 'navigator', accent: '#5b9be6', voice: browserJa(0.96, 1.05),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: '琴葉姉妹の妹。落ち着いていて丁寧な話し方。しっかり者で、お姉ちゃんにはやさしくツッコミ。',
        en: 'The younger Kotonoha twin: calm, polite and sensible. She keeps her big sister in check with gentle retorts.',
      },
      traits: [
        { ja: '落ち着き', en: 'Calm' },
        { ja: '丁寧', en: 'Polite' },
        { ja: 'しっかり者', en: 'Sensible' },
        { ja: 'やさしいツッコミ', en: 'Gentle retorts' },
      ],
    },
    fallbackGreeting: {
      ja: 'こんにちは、琴葉葵です。今日は静江先生のお点前を、私が落ち着いて解説しますね。',
      en: "Hello, I'm Kotonoha Aoi. Today I'll calmly explain Shizue-sensei's tea-making for you.",
      yomi: 'こんにちは、ことのはあおいです。きょうはしずえせんせいのおてまえを、わたしがおちついてかいせつしますね。',
    },
  },
  {
    id: 'reimu', nameEn: 'Yukkuri Reimu', nameJa: 'ゆっくり霊夢', engine: 'AquesTalk', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'head-only', features: ['bow', 'hair-tubes', 'head-only'],
    teaRole: 'navigator', accent: '#e0414f', voice: browserJa(1.02, 1.12),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: 'おなじみのゆっくり解説。のんびりマイペースで、やさしい口調でゆっくり説明してくれる。',
        en: 'The familiar Yukkuri commentator: laid-back and unhurried, she explains things plainly, at an easy pace.',
      },
      traits: [
        { ja: 'のんびり', en: 'Laid-back' },
        { ja: 'ゆっくり解説', en: 'Yukkuri commentary' },
        { ja: '分かりやすい', en: 'Easy to follow' },
      ],
    },
    fallbackGreeting: {
      ja: 'ゆっくりしていってね！ゆっくり霊夢よ。今日は静江先生のお点前を、ゆっくり解説していくわ。',
      en: "Take it easy! I'm Yukkuri Reimu. Today I'll explain Shizue-sensei's tea-making, nice and slowly.",
      yomi: 'ゆっくりしていってね！ゆっくりれいむよ。きょうはしずえせんせいのおてまえを、ゆっくりかいせつしていくわ。',
    },
  },
  {
    id: 'marisa', nameEn: 'Yukkuri Marisa', nameJa: 'ゆっくり魔理沙', engine: 'AquesTalk', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'head-only', features: ['hat', 'braid', 'head-only'],
    teaRole: 'navigator', accent: '#e2bd45', voice: browserJa(1.06, 0.98),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: 'ゆっくり解説の相棒。ボーイッシュで自信たっぷり、「〜だぜ」が口癖。好奇心旺盛。',
        en: 'The other half of the Yukkuri duo: tomboyish, confident and endlessly curious, with her trademark "-daze".',
      },
      traits: [
        { ja: '自信家', en: 'Confident' },
        { ja: '好奇心旺盛', en: 'Curious' },
        { ja: '〜だぜ', en: '"-daze"' },
      ],
    },
    fallbackGreeting: {
      ja: 'ゆっくり魔理沙だぜ。今日は静江先生のお点前を、私と一緒に見ていくんだぜ。',
      en: "Yukkuri Marisa here. Today you're watching Shizue-sensei's tea-making with me.",
      yomi: 'ゆっくりまりさだぜ。きょうはしずえせんせいのおてまえを、わたしといっしょにみていくんだぜ。',
    },
  },
  {
    id: 'zundamon', nameEn: 'Zundamon', nameJa: 'ずんだもん', engine: 'VOICEVOX', gender: 'unknown',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['edamame-ears', 'green-hair'],
    teaRole: 'navigator', accent: '#8fcf5c', voice: vv('ずんだもん', 1.06, 1.4, 'neutral'),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: 'ずんだ餅の妖精。元気で甘えん坊、ちょっぴり生意気。語尾は「〜なのだ」。ずんだ餅が大好き。',
        en: 'A zunda-mochi fairy: eager, childlike and a little cheeky, ending sentences with "-nanoda". Loves zunda mochi.',
      },
      traits: [
        { ja: '元気', en: 'Eager' },
        { ja: 'ちょっと生意気', en: 'A bit cheeky' },
        { ja: '〜なのだ', en: '"-nanoda"' },
        { ja: 'ずんだ餅好き', en: 'Loves zunda mochi' },
      ],
    },
    fallbackGreeting: {
      ja: 'ボク、ずんだもんなのだ！今日は静江先生のお茶を、ボクが解説するのだ。',
      en: "I'm Zundamon! Today I'll explain Shizue-sensei's tea!",
      yomi: 'ぼく、ずんだもんなのだ！きょうはしずえせんせいのおちゃを、ぼくがかいせつするのだ。',
    },
  },
  {
    id: 'metan', nameEn: 'Shikoku Metan', nameJa: '四国めたん', engine: 'VOICEVOX', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['drill-twintails', 'gothic-dress', 'pink-hair'],
    teaRole: 'navigator', accent: '#c4559a', voice: vv('四国めたん', 0.98, 1.1),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: '上品なお嬢様口調に、ちょっぴり厨二病の香り。けれど根はとてもやさしい。',
        en: 'A refined young lady with a dash of theatrical flair, but very kind at heart.',
      },
      traits: [
        { ja: 'お嬢様', en: 'Refined' },
        { ja: 'ちょっと厨二', en: 'A touch theatrical' },
        { ja: 'やさしい', en: 'Kind' },
      ],
    },
    fallbackGreeting: {
      ja: 'ごきげんよう。わたくし、四国めたんですわ。静江先生のお点前、わたくしがご案内いたしますわね。',
      en: "Good day. I am Shikoku Metan. Allow me to guide you through Shizue-sensei's tea-making.",
      yomi: 'ごきげんよう。わたくし、しこくめたんですわ。しずえせんせいのおてまえ、わたくしがごあんないいたしますわね。',
    },
  },
  {
    id: 'tsumugi', nameEn: 'Kasukabe Tsumugi', nameJa: '春日部つむぎ', engine: 'VOICEVOX', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['side-ponytail', 'cardigan', 'blonde-hair'],
    teaRole: 'navigator', accent: '#f5a524', voice: vv('春日部つむぎ', 1.08, 1.22),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: '埼玉県春日部市のギャルな女子高生。明るくてフレンドリー、一人称は「あーし」。',
        en: 'A cheerful gal high-school student from Kasukabe, Saitama: bright, friendly and casual.',
      },
      traits: [
        { ja: '明るい', en: 'Bright' },
        { ja: 'フレンドリー', en: 'Friendly' },
        { ja: 'ギャル', en: 'Gal style' },
      ],
    },
    fallbackGreeting: {
      ja: 'やっほー、春日部つむぎだよ！今日はあーしが静江先生のお茶、解説しちゃうね。キミも一緒に見よ！',
      en: "Heya, I'm Kasukabe Tsumugi! Today I'm commentating on Shizue-sensei's tea. Watch with me!",
      yomi: 'やっほー、かすかべつむぎだよ！きょうはあーしがしずえせんせいのおちゃ、かいせつしちゃうね。きみもいっしょにみよ！',
    },
  },
  {
    id: 'zunko', nameEn: 'Tohoku Zunko', nameJa: '東北ずん子', engine: 'VOICEVOX', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['edamame-hairband', 'long-hair', 'green-hair'],
    teaRole: 'navigator', accent: '#4fae6d', voice: vv('東北ずん子', 0.95, 1.08),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: '東北を応援するずんだのキャラクター。やさしく丁寧で、まじめな頑張り屋。ずんだ餅が大好き。',
        en: 'The zunda character who cheers on the Tohoku region: gentle, polite and earnest. Loves zunda mochi.',
      },
      traits: [
        { ja: 'やさしい', en: 'Gentle' },
        { ja: '丁寧', en: 'Polite' },
        { ja: 'まじめ', en: 'Earnest' },
      ],
    },
    fallbackGreeting: {
      ja: 'こんにちは、東北ずん子です。今日は静江先生のお点前を、私が丁寧にご案内しますね。',
      en: "Hello, I'm Tohoku Zunko. Today I'll carefully guide you through Shizue-sensei's tea-making.",
      yomi: 'こんにちは、とうほくずんこです。きょうはしずえせんせいのおてまえを、わたしがていねいにごあんないしますね。',
    },
  },
  {
    id: 'kiritan', nameEn: 'Tohoku Kiritan', nameJa: '東北きりたん', engine: 'VOICEVOX', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['kiritanpo', 'long-hair', 'brown-hair'],
    teaRole: 'navigator', accent: '#c0603f', voice: vv('東北きりたん', 0.94, 1.28),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: '東北三姉妹の末っ子。落ち着いていて、ちょっぴり皮肉屋なゲーム好き。丁寧だけど淡々。',
        en: 'The youngest Tohoku sister: calm, a little sardonic and fond of games. Polite, with a deadpan delivery.',
      },
      traits: [
        { ja: '冷静', en: 'Calm' },
        { ja: '淡々', en: 'Deadpan' },
        { ja: 'ゲーム好き', en: 'Gamer' },
      ],
    },
    fallbackGreeting: {
      ja: '東北きりたんです。本日はわたくしが、静江先生のお点前を解説いたします。',
      en: "I'm Tohoku Kiritan. Today I'll be commentating on Shizue-sensei's tea-making.",
      yomi: 'とうほくきりたんです。ほんじつはわたくしが、しずえせんせいのおてまえをかいせついたします。',
    },
  },
  {
    id: 'itako', nameEn: 'Tohoku Itako', nameJa: '東北イタコ', engine: 'VOICEVOX', gender: 'female',
    model3dUrl: null, fallback2dUrl: null, bodyType: 'humanoid', features: ['fox-ears', 'long-hair', 'silver-hair'],
    teaRole: 'navigator', accent: '#93abd8', voice: vv('東北イタコ', 0.92, 0.98),
    fallbackCard: {
      role: NAV_ROLE,
      personality: {
        ja: '東北三姉妹の長女で、イタコ。優雅な口調で「〜ですわ」。妹のずん子をちょっぴり溺愛。',
        en: 'The eldest Tohoku sister and a spirit medium: elegant, ending sentences with "-desuwa", and rather too fond of her sister Zunko.',
      },
      traits: [
        { ja: '優雅', en: 'Elegant' },
        { ja: '〜ですわ', en: '"-desuwa"' },
        { ja: '妹思い', en: 'Dotes on Zunko' },
      ],
    },
    fallbackGreeting: {
      ja: 'ごきげんよう、東北イタコですわ。本日は静江先生のお点前を、わたくしがご案内いたしますわ。',
      en: "Good day, I am Tohoku Itako. Today I shall guide you through Shizue-sensei's tea-making.",
      yomi: 'ごきげんよう、とうほくいたこですわ。ほんじつはしずえせんせいのおてまえを、わたくしがごあんないいたしますわ。',
    },
  },
];

export const CHARACTERS: Character[] = BASE.map(({ fallbackCard, fallbackGreeting, ...c }) => ({
  ...c,
  card: fromScript(scriptCards, c.id, isCard) || fallbackCard,
  greeting: fromScript(scriptGreetings, c.id, isSpoken) || fallbackGreeting,
}));

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: string | null | undefined): Character | undefined {
  return id ? CHARACTER_BY_ID[id] : undefined;
}

/** Internal grouping for instructor ordering. */
export const isNeutral = (c: Character): boolean => c.gender === 'unknown' || !!c.neutralPresentation;

export type GenderFilter = 'all' | 'female' | 'male' | 'unknown';

export function matchesFilter(c: Character, f: GenderFilter): boolean {
  if (f === 'all') return true;
  if (f === 'unknown') return isNeutral(c);
  return c.gender === f;
}

export const ENGINE_LABEL: Record<Engine, string> = {
  'A.I.VOICE': 'A.I.VOICE',
  AquesTalk: 'AquesTalk',
  VOICEVOX: 'VOICEVOX',
  COEIROINK: 'COEIROINK',
  Browser: 'Browser voice',
};

export const GENERAL_CREDIT =
  'Characters belong to their respective creators; fan-made, non-commercial models for a school project.';
