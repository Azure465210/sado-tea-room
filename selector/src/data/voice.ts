// A local COEIROINK engine can provide Ifu’s Japanese voice. Other speech uses browser voices.

export type VoiceEngineId = 'coeiroink' | 'browser';

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
  /** COEIROINK v2 (http://127.0.0.1:50032): substring matched against speakerName from GET /v1/speakers */
  coeiroink?: { speakerMatch: string; style?: string };
  /** ranking hint for the browser voice */
  browserHint: BrowserVoiceHint;
  /** credit line required when the local engine is used, e.g. 'COEIROINK:虚音イフ' */
  credit?: string;
}
