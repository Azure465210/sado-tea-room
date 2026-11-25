// How a character speaks. Pure data (no functions or RegExps) so it can be shared with the vanilla tea room (06-tts.js).
// Engine order at run time: the character's local engine (VOICEVOX / COEIROINK on the user's PC) if enabled and reachable,
// otherwise the browser's Web Speech voice with the pitch/rate below. A.I.VOICE and AquesTalk have no browser-reachable API,
// so those characters always use the browser fallback.

export type VoiceEngineId = 'voicevox' | 'coeiroink' | 'browser';

/** Ranking hint for browser voices. 'neutral' = a neutral-ish, higher-pitched voice; the UI never labels it binary. */
export type BrowserVoiceHint = 'female' | 'male' | 'neutral';

export interface VoiceProfile {
  /** language of the spoken text: 'ja' speaks the `yomi` field, 'en' speaks the `en` field */
  lang: 'ja' | 'en';
  /** BCP-47 tag for SpeechSynthesisUtterance.lang, e.g. 'ja-JP', 'en-GB' */
  tag: string;
  /** browser fallback rate (1 = normal) */
  rate: number;
  /** browser fallback pitch (1 = normal) */
  pitch: number;
  /** preferred engine; always falls back to 'browser' */
  engine: VoiceEngineId;
  /** VOICEVOX (http://127.0.0.1:50021): speaker name as listed by GET /speakers, and the style name */
  voicevox?: { speaker: string; style: string };
  /** COEIROINK v2 (http://127.0.0.1:50032): substring matched against speakerName from GET /v1/speakers */
  coeiroink?: { speakerMatch: string; style?: string };
  /** ranking hint for the browser voice */
  browserHint: BrowserVoiceHint;
  /** credit line required when the local engine is used, e.g. 'VOICEVOX:ずんだもん' */
  credit?: string;
}
