/// <reference types="vite/client" />
// The instructor roster contains the two hosts who perform the ceremony.
// Only Ifu's card and greeting are read into the selector bundle.
import type { VoiceProfile } from './voice';

export type Gender = 'female' | 'male' | 'unknown';
export type Engine = 'COEIROINK' | 'Browser';
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
const scriptCards = import.meta.glob('../../../src/data/ifu-script.json', { eager: true, import: 'card' }) as Record<string, unknown>;
const scriptGreetings = import.meta.glob('../../../src/data/ifu-script.json', { eager: true, import: 'greeting' }) as Record<string, unknown>;

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
  COEIROINK: 'COEIROINK',
  Browser: 'Browser voice',
};

export const GENERAL_CREDIT =
  'Shizue-sensei is original to the tea room. This is a fan-made Urone If model.';
