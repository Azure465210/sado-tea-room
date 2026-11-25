# Teacher selection – shared contract (read fully before working)

Project: /home/user/sado — single-file Three.js r128 page "Sado Tea Room" (a browser tea-ceremony lesson for an English class).
Build: `node tools/build.js` → dist/sado-tea-room.html (standalone). Sources: src/shell.html + src/js/*.js (concatenated in filename
order inside one IIFE). Asset tokens `/*@TEXT:relative/path@*/` are replaced at build time by a JSON string literal of that file.
Test tools: tools/flow-test.js (full click-through, prints ERRORS []), tools/audit.js (bone lengths / reach), tools/shot.js,
tools/ui-shot.js, tools/render-svg.js, tools/measure-portrait.js [artDir]. Debug hook: window.__sado.
The page UI language is English (British spelling). Do NOT include any model names or personal data anywhere.

## The user's request
Add a page to choose the teacher, with a personality for each teacher. Add a second teacher based on the UTAU character
**虚音イフ (Urone If)**, with "more natural TTS" and a sado-teacher character design. The user gave this personality:
- 紳士的かつ胡散臭い態度。基本的には丁寧で穏やかな紳士として振る舞うが、「取り込んでしまいますぜ。…なんて、冗談で御座います」
  といったジョークを交えるなど、真意が読めない掴みどころのない一面がある。
- 人間への興味と真似事。自身を「データで出来た化け物（グリフォンや鵺をモチーフとした異形）」と称し、人間の真似事を好む。
  記者や教師、医者、占い師など、さまざまな職業や役割になりきって楽しむ好奇心旺盛な性格。 (→ today he is "playing" a tea teacher)
- 古風な口調。一人称は「あたくし」、二人称は「あんた様」「〇〇のお嬢」。語尾に「〜で御座います」「〜ですかい」をつける近世語混じりの敬語。
  横文字（外来語）は少し苦手。
IMPORTANT: the official character artwork could NOT be fetched (network blocked). Nobody here knows the official look.
So the design is an ORIGINAL INTERPRETATION built only from the facts above (gentleman; a monster made of data; griffin and
nue motifs; playing the role of a tea teacher). Never claim it is the official design. In-page credit line (selection card):
"虚音イフ is an UTAU character; this tea-teacher look is a fan interpretation, not the official artwork."

## Teachers
1. `shizue` – the existing host, now named **Shizue-sensei 静江先生**. Unchanged look (art/final/). English narration
   (existing lines). Personality: calm, warm, precise; over forty years of Urasenke practice; encourages gently.
2. `ifu` – **虚音イフ Urone If**. Speaks JAPANESE (spoken by a Japanese TTS voice), caption shows Japanese with an English
   translation under it. He is a male-presenting, ageless gentleman. Today he plays the role of a tea teacher and wears
   the tea master's 十徳 (jittoku: a black, slightly sheer short over-robe of male tea teachers, tied with short flat cords at
   the chest) over a kimono; fukusa colour PURPLE (men's colour). Motifs (subtle, tasteful, readable at small size):
   griffin → amber raptor-like eyes, a few small feathers (e.g. tucked at the temple/behind an ear); nue → a faint tiger-stripe
   pattern somewhere (e.g. kimono lining at the collar or hem) and/or a slim tail; data → a few small square "pixel" fragments
   (e.g. at hair tips or sleeve hems). Hair: short, combed back neatly (no chignon), colour of the artist's choice.

## Files and who writes them
- art/ifu/portrait.svg + art/ifu/spec.json  — ARTIST. Same contract as art/SPEC.md (groups, ids, viewBox, rules), except the
  person is イフ as above. spec.json additionally has `"style"` (see below). Run `node tools/measure-portrait.js art/ifu`
  after drawing (it fills spec.face). Check with `node tools/render-svg.js art/ifu/portrait.svg <png> --sheet`.
  spec.palette must have the same keys as art/final/spec.json, plus `"jittoku"`, `"jittokuCord"`, `"fukusa"`, `"accent"` (amber),
  `"stripe"`. For shizue add `"fukusa"` handling in code with default red-orange (keep her current fukusa colour).
- src/data/ifu-script.json — WRITER (schema below).
- src/js/*.js, src/shell.html, tools/* — ENGINEER.

### spec.json "style" (ARTIST writes for ifu; ENGINEER reads with defaults matching shizue)
```json
"style": {
  "hair": "short",            // "chignon" (shizue default) | "short"
  "garment": "jittoku",       // "kimono" (default) | "jittoku" (dark over-robe on trunk + sleeves, kimono visible at collar and lap)
  "feathers": true,           // a few small feathers near one temple/ear (3D, small)
  "tail": false,              // optional slim nue tail lying behind on the tatami (must not intersect anything)
  "pixels": true,             // a few tiny floating/attached squares at hair tips or sleeve hems
  "kneeGap": 0.02             // men sit seiza with knees about a fist apart: extra half-gap in metres (0 = default)
}
```

### src/data/ifu-script.json (WRITER)
Every spoken unit = `{"ja": "...display Japanese...", "en": "...English translation (British)...", "yomi": "...the same
Japanese for TTS: kanji a TTS might misread rewritten in hiragana, e.g. 御座います→ございます, 帛紗→ふくさ, 棗→なつめ,
茶杓→ちゃしゃく, 茶筅→ちゃせん, 柄杓→ひしゃく, 建水→けんすい, 蓋置→ふたおき, 茶巾→ちゃきん, 総礼→そうれい, あんた様→あんたさま,
点前→てまえ, 一期一会→いちごいちえ..."}`.
```json
{
  "teacher": "ifu",
  "steps": [            // EXACTLY as many entries as STEPS in src/js/40-choreography.js (currently 9), same order
    { "lines": [ [t, {ja,en,yomi}], ... ],   // SAME count and SAME times t as that step's existing `lines`, same content/
                                              // teaching facts (do not invent new procedure), retold in his voice
      "qs": [ [ {ja,en} (question), {ja,en,yomi} (answer) ], ... ] }  // same questions as the step's existing qs, his answers
  ],
  "guestIntro": [ {ja,en,yomi}, ... ],   // one per entry of the guest-intro phases array in src/js/70-guest.js (instructions
                                         // to the user, in his voice). Keep the guest's own phrases (say/sayJa) unchanged.
  "guestDrink": [ {ja,en,yomi}, ... ],   // one per entry of the drink-sequence array in 70-guest.js (same order)
  "whiskDone": {ja,en,yomi},             // replaces 'Well done. Now receive the bowl as a guest: press Drink and follow the steps.'
  "greeting": {ja,en,yomi},              // a short self-introduction used on the selection card "Hear a sample" button
  "card": { "role": {ja,en}, "personality": {ja,en}, "traits": [ {ja,en}, ... 3-4 short chips ] }
}
```
Timing rule: Japanese TTS speaks about 7 kana (mora) per second at rate 1.0. A line's `yomi` must be speakable before
the next line's time (gap × 6.5 kana max); the last line of a step before the step's `dur`. Speech is cut when the next line starts.
Voice rules: first person あたくし; addresses the user as あんた様 (or お客のお嬢/お客の旦那 only where natural – default あんた様,
the user's gender is unknown); endings 〜で御座います / 〜ですかい / 〜で御座いましょう; avoids katakana loanwords (when the
English source has one, he rephrases, and may show a little comic discomfort once, e.g. 「ええと、横文字はどうも…」).
At most 3–4 jokes in the whole lesson, in the spirit of 「取り込んでしまいますぜ。…なんて、冗談で御座います」 — never during the
solemn bows, never mocking the tea ceremony itself; the tea facts stay correct (Urasenke-style usucha). He enjoys "playing
the teacher" (curious about humans) and can say so once. Gentle, polite, a little uncanny, never rude.

### Engineer: behaviour
- New file src/js/05-teachers.js (runs before the avatar): `TEACHERS` {shizue, ifu}, `let TEACHER`. Each: id, name, nameJa,
  pronoun ('she'/'he'), lang ('en'|'ja'), art {svg, spec} via /*@TEXT@*/ tokens, voice profile, card text, script (ifu: parsed
  ifu-script.json). If src/data/ifu-script.json or art/ifu/* do not exist yet, write the code against the schema and test with a
  temporary copy elsewhere – never create/overwrite those files yourself (other agents are writing them in parallel).
- 23-avatar.js: turn the IIFE into `makeAvatar(teacher)` returning {update, portraitURL, trunkG, headG, dispose}. `dispose()` removes
  and frees everything it added (meshes, textures, materials) so a teacher change rebuilds cleanly. Shizue must look exactly as now.
  Implement the style options (short hair, jittoku layer, feathers, tail, pixels, kneeGap if the rig allows it safely; fukusa colour
  per teacher on O.fukusa's material). Keep the anti-penetration logic intact; re-run tools/audit.js for both teachers.
- Selection page = the intro screen (#intro) rebuilt: two teacher cards side by side (stacked on phones, 16px gutters, no horizontal
  scroll): portrait (from the teacher's SVG), name (Japanese + romaji), role, personality, trait chips, a "Hear a sample" button
  (speaks the greeting with that teacher's voice), choosing a card selects it (radio-group semantics, keyboard accessible). Then the
  existing voice checkbox and "Enter the tea room". Header: a "Teacher" button that reopens the selection; changing teacher rebuilds
  the avatar and restarts at step 1. The intro paragraph and the head's tap-info ("The host…") use the teacher's name/pronoun.
  Remember the last choice in localStorage (wrapped in try/catch).
- Captions for ifu: #line shows the Japanese (lang="ja"); a new small line under it shows the English. Ask-panel answers likewise.
  Step titles / UI stay English.
- More natural TTS (a small TTS module replacing speak()): wait for `voiceschanged`; per-teacher ranked voice choice
  (prefer names matching /natural|neural|online|premium|enhanced|google/i, then gender hints – ja male: /keita|ichiro|daichi|naoki|
  otoya|hattori|male|男性/i; en female for shizue as now), per-teacher pitch/rate (ifu: ja-JP, rate ≈0.95, pitch ≈0.85 if the voice
  is not male, else 1.0); split text into sentences (。！？!?.) and queue them for natural pauses and to avoid Chrome's long-utterance
  cut-off; cancel on a new line; speak `yomi` (not `ja`) for ifu. If no Japanese voice exists, speak the English translation with an
  English male voice (/ryan|guy|daniel|george|thomas|male/i). Lip sync: while an utterance is actually speaking (onstart/onend),
  hostState.talkUntil keeps extending so the mouth moves with the voice. A small "Voice" selector (in the existing voice control
  area or the teacher card) lets the user pick another installed voice of the teacher's language; remember it per teacher.
- Guest phrases (say/sayJa) keep using a Japanese voice exactly as now.
- Must keep: pictures/smooth motion, pose strip, flow-test passing (ERRORS []), audit clean for both teachers, standalone + artifact build.
  Add a way for tools to choose the teacher (e.g. URL hash #teacher=ifu or __sado.setTeacher('ifu')) and make flow-test run both.
