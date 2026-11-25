# Instructor roster – shared contract v2 (binding; read fully)

Project: /home/user/sado (not git; backups of the previous version in /home/user/sado/backup/src-v4, art-v4, v4.html).
Tea room = single-file vanilla Three.js r128 page: src/shell.html + src/js/*.js → `node tools/build.js` → dist/sado-tea-room.html
(+ dist/artifact.html). Previous contract (still valid where not replaced): /tmp/claude-0/-home-user/018441ed-544d-5052-b6ab-2a03b0fe355a/scratchpad/teachers-contract.md.
Existing teachers: `shizue` (Shizue-sensei, English, performs the ceremony) and `ifu` (虚音イフ, Japanese + English sub-line,
performs the ceremony; script src/data/ifu-script.json; art art/ifu/). Tools: tools/flow-test.js, audit.js, shot.js, ui-shot.js.
No model names or personal data in any file. Page language English (British) for UI; character lines Japanese + English.

## What the user asked (summary)
An interactive 3D instructor selection & teaching interface for 11 Japanese TTS characters, in React + Tailwind + React Three Fiber
with a TypeScript schema and internal gender metadata. Cards have an upper-torso (bust) 3D view in sharp
diagonal (clip-path / skew) panels with angled name typography; unselected = dimmed (≈brightness .45) and static facing forward;
selected = full brightness + rim light + smooth turntable rotation + voice greeting. 3D model priority: `.vrm`/`.glb` URL if given →
otherwise built-in procedural 3D bust → otherwise 2D portrait. Characters with special bodies (mask, tail, wings) must be modelled with
those features; head-only mascots (Yukkuri) framed properly. Characters must never be OOC (out of character).
Official site for 虚音イフ (hasewoalice.wixsite.com) is BLOCKED by the network policy; the user supplied the official full-body art:
/home/user/sado/ref/uroneif-official.png — LOOK AT IT (Read tool) if your role involves イフ's look.

## Roster (id · nameEn · nameJa · engine · gender · role in the tea room)
| id | nameEn | nameJa | engine | gender | tea room role |
|---|---|---|---|---|---|
| shizue | Shizue-sensei | 静江先生 | Browser voice (English) | female | performer (existing, unchanged look) |
| ifu | Urone If | 虚音イフ | COEIROINK | male (+ neutralPresentation: true) | performer (redesigned to the official look) |
| akane | Kotonoha Akane | 琴葉茜 | A.I.VOICE | female | navigator |
| aoi | Kotonoha Aoi | 琴葉葵 | A.I.VOICE | female | navigator |
| reimu | Yukkuri Reimu | ゆっくり霊夢 | AquesTalk | female | navigator (head-only manju) |
| marisa | Yukkuri Marisa | ゆっくり魔理沙 | AquesTalk | female | navigator (head-only manju) |
| zundamon | Zundamon | ずんだもん | VOICEVOX | unknown | navigator |
| metan | Shikoku Metan | 四国めたん | VOICEVOX | female | navigator |
| tsumugi | Kasukabe Tsumugi | 春日部つむぎ | VOICEVOX | female | navigator |
| zunko | Tohoku Zunko | 東北ずん子 | VOICEVOX | female | navigator |
| kiritan | Tohoku Kiritan | 東北きりたん | VOICEVOX | female | navigator |
| itako | Tohoku Itako | 東北イタコ | VOICEVOX | female | navigator |
The reading うろね いふ is written "Urone If". For イフ, `gender: 'male'` remains the voice hint, and `neutralPresentation: true`
includes him with Zundamon when the instructor list prioritizes neutral presentation. Gender labels are hidden on the selector.
All instructors appear in the list. A saved female or male preference moves matching characters first. Otherwise, the neutral presentation group comes first.
Shizue is an extra 12th card labelled "Tea Room original" (the user's 11 + the existing host).

"performer" = the full-body avatar in the tea room makes the tea (existing rig). "navigator" = Shizue-sensei performs the ceremony
silently, and the chosen character appears as a 3D bust in a small corner window ("navigator window", like Yukkuri commentary videos)
and speaks the commentary in their own voice and personality. Each navigator has a script file src/data/<id>-script.json with the
SAME schema as src/data/ifu-script.json (steps[].lines with identical times, steps[].qs, guestIntro, guestDrink, whiskDone,
greeting, card) — written as commentary about what Shizue-sensei (静江先生) is doing, in the character's voice; teaching facts must stay
exactly as in the English source (src/js/40-choreography.js, 70-guest.js, 60-pointer.js) and the timing rule holds (yomi kana ≤
gap × 6.5). Use the writer check script /tmp/claude-0/-home-user/018441ed-544d-5052-b6ab-2a03b0fe355a/scratchpad/check-script.js (run `node check-script.js /home/user/sado`; it may need a
small extension to accept a file argument — copy it to a new name rather than changing behaviour for ifu).

## Personality briefs (keep IN CHARACTER; widely known public settings – if unsure, stay neutral rather than invent)
- **akane 琴葉茜**: elder Kotonoha twin, pink hair; energetic, cheerful, a bit airheaded; KANSAI dialect (うち, 〜やで, 〜やん, ほんま);
  dotes on her sister Aoi (「葵」).
- **aoi 琴葉葵**: younger twin, blue hair; calm, polite standard Japanese (私), a sensible straight man to Akane; calls her
  「お姉ちゃん」. Gentle tsukkomi.
- **reimu ゆっくり霊夢**: Yukkuri-commentary style (a manju head of the shrine maiden: black hair, big red bow with white frills,
  hair tubes/sidelocks). Laid-back, plain speech, 「ゆっくりしていってね！」 as a greeting, explains in the classic commentary rhythm.
- **marisa ゆっくり魔理沙**: manju head of the witch: blonde hair with a single braid on one side, big black witch hat with a white bow/
  ribbon band. Tomboyish: 〜だぜ, 〜なんだぜ, first person 私 (read わたし) or 魔理沙; confident, curious.
- **zundamon ずんだもん**: edamame fairy; first person ボク; ends sentences with 〜なのだ / 〜のだ; childish, eager, a bit cheeky,
  loves zunda mochi; gender unknown – never call it boy or girl. Look: green-light-green hair with small edamame-pod ears/ornaments
  on the head, simple light outfit; small and round-faced.
- **metan 四国めたん**: first person わたくし; refined ojou-sama manner with chuunibyou flair, but kind; 〜ですわ / 〜かしら sparingly;
  look: pink hair in two large drill twin-tails, dark gothic-lolita style dress.
- **tsumugi 春日部つむぎ**: gal high-school girl from Kasukabe, Saitama; first person あーし; bright, friendly, casual (〜じゃん, マジ);
  calls the user 「キミ」 or 「〜ちゃん」 politely-casual; look: blonde/golden hair with side ponytail, school uniform with cardigan,
  slightly tanned, a yellow accent.
- **zunko 東北ずん子**: Tohoku zunda promotion character; gentle, polite, earnest (私); loves zunda mochi; look: long green hair,
  a hair band with edamame, kimono-like top with a short skirt/hakama, carries a bow (archery) – in a bust just the hair and outfit.
- **kiritan 東北きりたん**: youngest Tohoku sister, small; calm, slightly sarcastic, gamer; polite (わたくし), deadpan; look: long
  brown hair, a kiritanpo on the back/head, red-white shrine-maiden-like outfit.
- **itako 東北イタコ**: eldest Tohoku sister, an itako (spirit medium); first person わたくし, ends with 〜ですわ; elegant, dotes on
  Zunko (「ずん子」) a little too much; look: long silver-white hair, fox-like ears/hair, white-and-blue miko style outfit.
- **ifu 虚音イフ**: see the previous contract (gentlemanly yet sly, あたくし, あんた様, 〜で御座います/〜ですかい, avoids loanwords, jokes like
  「取り込んでしまいますぜ。…なんて、冗談で御座います」, a monster made of data, griffin/nue motifs, enjoys playing human roles).
- **shizue**: calm, warm, precise, English.
OOC red lines for all: no character insults the tea ceremony or the user; jokes never during the bows; facts unchanged.

## 虚音イフ official look (from /home/user/sado/ref/uroneif-official.png)
Brown hat with darker band, a dark feather in the band and a small patch; head covered in cream/beige fluffy fur with small ear tufts;
a brown plague-doctor-style BEAK MASK covering the face (long curved beak pointing down-forward), a round brass ring/lens at the side
of the mask; a stitched seam on the neck; a dark maroon scarf tied at the side; a ragged dark-brown short cape over the shoulders;
a mid-brown kimono with huge rounded sleeves whose ends turn into dark feather tips (wings) with grey striped cuff bands; a maroon
obi tied with cords in front; dark brown pleated hakama; legs: his RIGHT leg (viewer's left) a thin dark bird leg with talons and a
bead/ring, his LEFT leg (viewer's right) a cream furry lion leg with a paw and claws wrapped in maroon bandages; a long cream lion tail
with a tufted end from behind. Hands are hidden in the sleeves in the art; for the tea ceremony he needs hands: dark scaly bird-talon
fingers with small claws (griffin = eagle front, lion back). Tea etiquette: no hat indoors → in the tea room he has taken the hat off
and it rests on the tatami behind him at his side (the selection bust wears it). The mask stays on. In the tea room he wears the
kimono + hakama + cape + scarf (drop the earlier invented jittoku), fukusa purple. Mouth: the beak does not open; when talking, the head
nods subtly instead (and a faint glint in the mask's eye lens). His art is drawn by the character's creator: in-page credit
"虚音イフ © its creator (UTAU / COEIROINK character). 3D look based on the official design; a fan-made model."

## Selector app (React) — selector/
Vite + React 18 + TypeScript + Tailwind 3 + @react-three/fiber 8 + @react-three/drei 9 + three (bundled; independent of the tea room's
global r128 THREE) + @pixiv/three-vrm (for optional .vrm). npm registry is reachable; GitHub is NOT.
- selector/src/data/characters.ts: `export type Gender = 'female'|'male'|'unknown'`; `export interface Character { id; nameEn; nameJa;
  engine: 'A.I.VOICE'|'AquesTalk'|'VOICEVOX'|'COEIROINK'|'Browser'; gender: Gender; neutralPresentation?: boolean; model3dUrl: string|null;
  fallback2dUrl: string|null; bodyType: 'humanoid'|'head-only'|'chimera'; features: string[] /* 'mask','tail','wings','hat',... */;
  teaRole: 'performer'|'navigator'; accent: string /* CSS colour */; card: { role:{ja,en}; personality:{ja,en}; traits:{ja,en}[] };
  greeting: {ja,en,yomi}; voice: VoiceProfile }`. All 12 entries. model3dUrl null for all (no licensed model files available here);
  the component loads a .vrm/.glb when a URL is set.
- selector/src/models/*.tsx: one procedural bust component per character: `export function AkaneBust(props:{talking:boolean})` …
  convention: a THREE group whose bust spans y = 0 (mid-chest) to y ≈ 1 (top of head/hat), centred at x = 0, facing +z; stylised
  "chibi-ish but tasteful" low-poly shapes, MeshToonMaterial or MeshStandardMaterial, readable at 200 px; the character's signature
  features must be clearly recognisable (hair colour/shape, accessories, outfit colour). Head-only Yukkuri: a squashed manju sphere
  filling the frame, with face, hair, bow/hat. イフ: beak mask, fur, hat with feather, scarf, cape, a hint of wing-feather sleeves.
  Faces: simple eyes/mouth (planes or canvas textures); `talking` animates the mouth (or a nod for イフ / a bounce for Yukkuri).
  An index selector/src/models/index.ts maps id → component.
- selector/src/components/InstructorSelect.tsx: the selection UI per the user's section 3 (diagonal panels with clip-path or skew +
  counter-skewed viewport, angled bold English name + small Japanese name + engine tag on the slash; accent bar on the selected card;
  dimmed + static vs bright + rim light + turntable; keyboard accessible radio-group; phone layout
  stacks; reduced-motion respected). Use ONE shared <Canvas> with drei <View> per card, or one small canvas per card only if it stays
  fast (12 WebGL contexts is too many — prefer drei View / scissor). Greeting voice on select via a `speak(character)` prop.
- selector/src/components/NavigatorWindow.tsx: a small framed bust viewport with the name plate, `talking` prop.
- selector/src/embed.tsx: exposes `window.SadoSelector = { characters, mountSelector(el, {currentId, onChoose(id), speak(id)}),
  mountNavigator(el, {id}) → {setTalking(b), setId(id), dispose()} }`. Built with Vite library mode as ONE IIFE JS file + ONE CSS file
  (selector/dist/selector.iife.js, selector/dist/selector.css). Tailwind must NOT break the tea room: preflight off, `important:
  '#sado-selector'`-style scoping or a prefix, all selector DOM under elements with that id/class.
- selector/index.html + src/main.tsx: a standalone dev/demo page.
- npm scripts: `npm run build` (lib), `npm run typecheck` (tsc --noEmit) must pass.

## Tea room integration (vanilla)
- tools/build.js inlines selector/dist/selector.css into a <style> and selector/dist/selector.iife.js into a <script> before the
  main script (token in shell.html, e.g. <!--@SELECTOR@-->). The intro (#intro) hosts the React selector (mountSelector) instead of the
  two hand-made cards; the voice checkbox and "Enter the tea room" stay; the header "Teacher" button reopens it.
- 05-teachers.js: all 12 teachers; for navigators: performer = shizue, narrator = id, script from src/data/<id>-script.json.
  Captions show the narrator's ja + en sub-line; the narrator's navigator window shows talking while speech plays.
- 06-tts.js engines, chosen per character with graceful fallback:
  1. VOICEVOX engine on the user's PC (http://127.0.0.1:50021): GET /speakers, match speaker by name (ずんだもん, 四国めたん, 春日部つむぎ,
     東北ずん子, 東北きりたん, 東北イタコ; style ノーマル), POST /audio_query?text=&speaker= then POST /synthesis?speaker= → WAV → play.
  2. COEIROINK v2 on the user's PC (http://127.0.0.1:50032): GET /v1/speakers, match 虚音イフ by speakerName containing イフ,
     POST /v1/estimate_prosody {text} then POST /v1/synthesis {speakerUuid, styleId, text, prosodyDetail, speedScale:1, volumeScale:1,
     pitchScale:0, intonationScale:1, prePhonemeLength:0.1, postPhonemeLength:0.1, outputSamplingRate:24000} → WAV.
  3. A.I.VOICE and AquesTalk have no browser-reachable API → browser voice.
  4. Browser Web Speech fallback with per-character pitch/rate and gender-appropriate voice ranking (unknown gender → a neutral-ish
     higher-pitched voice, never forced binary labels in the UI).
  A small "Voice engine" panel: checkbox "Use VOICEVOX / COEIROINK running on this PC", a status line (connected / not found /
  blocked by the browser), and the setup hint: VOICEVOX → engine setting "CORS Policy Mode: all" (http://127.0.0.1:50021/setting);
  note that it works from the downloaded HTML file, not inside the claude.ai preview. Short probes with timeouts; never block the page.
  Credits shown in the selector footer: "VOICEVOX:ずんだもん" style credit for VOICEVOX characters when that engine is used, and a
  general line: characters belong to their respective creators; fan-made non-commercial models for a school project.
- flow-test must run shizue, ifu and at least two navigators (zundamon, reimu) with ERRORS [], audit clean for shizue and ifu.
