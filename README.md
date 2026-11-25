# Sado Tea Room — project overview (start here)

This is a browser tea-ceremony (sado, Urasenke-style usucha) lesson made for an English Project Lab. It is the browser
version of a VR "AI tea-master avatar" project, for people without a headset. The page UI is English (British spelling).
Every instructor has English dialogue. Select **English** under **Narration language** on the opening screen or in Settings to hear it with a browser voice. The character default uses Japanese with English subtitles for the Japanese-speaking roster and English for Shizue.

- **Finished page:** `dist/sado-tea-room.html` is a single self-contained file of about 1.9 MB. Open it in Chrome or Edge;
  nothing needs installing.
- **Instructor choice:** the opening screen is a 3D instructor selector with 12 characters.
  - Two of them, **Shizue-sensei** (the tea room's own host) and **虚音イフ Urone If**, perform the ceremony themselves as
    full-body 3D avatars.
  - The other ten are **navigators**. Shizue performs silently while the chosen navigator comments in Japanese from a small
    3D window in the corner, in their own voice (like a "yukkuri kaisetsu" video).
- **The lesson:** 9 steps (greet → purify → … → serve), pose pictures, a Q&A drawer, tap-a-utensil names, and a guest part
  where the user whisks and drinks.

## Folder map

| Path | What it is |
|---|---|
| `src/shell.html` | HTML and CSS shell of the page (header, intro/selector host, captions, drawers, engine panel). |
| `src/js/NN-*.js` | Page logic, concatenated in filename order inside one IIFE by the build. Main files below. |
| `src/data/<id>-script.json` | One English or bilingual lesson script for each of the 12 instructors. Schema below. |
| `art/final/`, `art/ifu/` | Drawn SVG portrait and `spec.json` (palette, face metrics, style) for Shizue and for Urone If. `art/SPEC.md` is the drawing contract. |
| `vendor/three.min.js` | Three.js r128, used by the tea room. |
| `selector/` | React 18 + TypeScript + Tailwind 3 + React Three Fiber app: the instructor selector and the navigator window. It is built to `selector/dist/selector.iife.js` + `selector.css` and inlined into the page. |
| `tools/` | Node build and test tools (Playwright). |
| `docs/roster-contract.md` | The binding spec for the 12-character version: roster, genders, roles, TTS chain, credits, UI rules. Read it before changing characters. |
| `docs/teachers-contract.md` | The earlier spec (two teachers, Urone If's voice rules, script schema, TTS behaviour). |
| `ref/` | `uroneif-official.png` (official Urone If art, used as the look reference), `uploaded.html` and `current.html` (the two original versions this project was built from). |
| `EVALUATION.md`, `NOTES.md`, `shots/` | Local evaluation, working notes and screenshots, excluded from the repository. |

### Main page modules (`src/js/`)
- **`00-setup.js`:** renderer, scene, lights, cameras. The stage is mirrored (`MIRROR`) so the kettle is on the host's left.
- **`05-teachers.js`:** `TEACHERS` (all 12), `TEACHER`, `performerOf(T)`, `isNavigatorTeacher(T)`, and the helpers `teacherLines(i)`,
  `teacherQs(i)`, `teacherSays(key, k, fallback)`. The choice comes from `#teacher=<id>`, then localStorage `sado.teacher`.
- **`06-tts.js`:** speech. Engine chain: local **VOICEVOX** (127.0.0.1:50021) → local **COEIROINK v2** (127.0.0.1:50032) →
  browser Web Speech. Per-character voice `PROFILES`, sentence queue, `yomi` text, lip-sync callbacks, engine panel.
  A.I.VOICE and AquesTalk have no API a browser can reach, so those characters use the browser voice.
- **`20-rig.js`, `21-host.js`, `23-avatar.js`:**
  - **20-rig:** a human skeleton (158 cm, fixed bone lengths, 2-bone IK, automatic leaning, collision with the body, lap and utensils).
  - **21-host:** grip points on the utensils.
  - **23-avatar:** `makeAvatar(teacher)` builds the 3D body, with the drawn face projected onto the head. Urone If's official look is
    built here: beak mask, fur, cape, wing sleeves, talon hands, bird leg and lion leg, tail, and the hat set down on the tatami.
- **`30-utensils.js`, `40-choreography.js`:** the utensils, and the 9 `STEPS` (timed holds, poses, lines and questions).
- **`50-player.js`:** UI, the selector mount (`SadoSelector.mountSelector`), teacher switching, voice controls.
- **`52-navigator.js`:** the navigator window: placement, and talking only while that character's line is spoken.
- **`55-poses.js`, `60-pointer.js`, `70-guest.js`, `90-main.js`:** pose strip, pointer/whisk game, guest part, main loop.

## Build and test
Use Node.js 24 and npm from the project folder.

```bash
npm run setup
npm run typecheck
npm test
npm run build
npm run preview
```

The preview listens at `http://127.0.0.1:8777/`. The build writes the local lesson to `dist/sado-tea-room.html` and the static site to `dist/online/`. The online build uses browser voices and bundles the renderer locally. The local lesson can also use VOICEVOX and COEIROINK.

For GitHub Pages, push the project source, select **GitHub Actions** under **Settings → Pages**, and manually run **Deploy Sado Tea Room to GitHub Pages** from the default branch. The workflow publishes `dist/online/`. See [GitHub's publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
- `/*@TEXT:path@*/` tokens in the JS are replaced by the file's text as a JSON string. A missing file stops the build unless
  you pass `--allow-missing`.
- The build also inlines `selector/dist/*`, which is already built and included. After editing `selector/src`:
```bash
cd selector && npm install && npm run typecheck && npm run build && cd .. && node tools/build.js
```
Tests (they need `npm i playwright` or a global Playwright with Chromium):
```bash
node tools/flow-test.js dist/sado-tea-room.html --teacher shizue      # full click-through; must end with ERRORS []
```
```bash
node tools/flow-test.js dist/sado-tea-room.html --teacher zundamon    # a navigator; also checks the window talks during a line
```
```bash
node tools/audit.js dist/sado-tea-room.html --teacher ifu            # bone lengths constant, reach shortfall 0.0 cm
```
```bash
node tools/check-script.js src/data/ifu-script.json                  # script schema and timing check
```
```bash
node tools/shot.js ...                                               # screenshots (see header comment)
```
Each flow test takes about 4–5 minutes on a slow CPU. Debug hooks: `window.__sado` (e.g. `__sado.go(step, t)`,
`__sado.setTeacher(id)`) and `window.__sadoNav`.

## Characters (see `selector/src/data/characters.ts` and `docs/roster-contract.md`)
| id | Name | Engine | Gender | Role |
|---|---|---|---|---|
| shizue | Shizue-sensei 静江先生 (Tea Room original) | Browser | female | performer, English lines |
| ifu | 虚音イフ Urone If | COEIROINK | male + `neutralPresentation` | performer, Japanese lines |
| akane, aoi | 琴葉茜 Kotonoha Akane, 琴葉葵 Kotonoha Aoi | A.I.VOICE | female | navigator |
| reimu, marisa | ゆっくり霊夢 Yukkuri Reimu, ゆっくり魔理沙 Yukkuri Marisa (head-only manju models) | AquesTalk | female | navigator |
| zundamon | ずんだもん Zundamon | VOICEVOX | unknown | navigator |
| metan, tsumugi, zunko, kiritan, itako | 四国めたん, 春日部つむぎ, 東北ずん子, 東北きりたん, 東北イタコ | VOICEVOX | female | navigator |

- Gender and presentation metadata stay internal for instructor ordering and voice selection. The selector hides the labels and shows the whole roster.
- **3D:** each character has `model3dUrl` (.vrm/.glb, currently all `null`, since no licensed files are available) →
  procedural bust (`selector/src/models/<Name>Bust.tsx`, shared kit `kit.ts`) → 2D fallback.

## Script schema (`src/data/<id>-script.json`)
- **Spoken unit:** Shizue uses `{en}`. Bilingual instructors use `{ja, en, yomi}`. `yomi` is the Japanese the TTS reads, with words a TTS might misread
  rewritten in kana.
- **Fields:**
  - `steps[9].lines`: `[[t, unit], ...]`, with the same count and the same times `t` as `STEPS` in `40-choreography.js`;
  - `steps[i].qs`: `[[{ja,en} question, unit answer], ...]`;
  - `guestIntro[3]`, `guestDrink[9]`, `whiskDone`, `greeting`;
  - `card {role, personality, traits[]}`.
- **Timing rule:** a line's kana count must be at most (gap to the next line) × 6.5.
- **Tea facts must not change between characters.** They follow the lesson choreography. Examples: 1.5 scoops ≈ 2 g matcha, ≈ 60 ml water at ≈ 80 °C, whisk in an "M" shape, and the bowl
  turned clockwise before serving.

## Character-voice rules (do not go out of character)
- **Urone If:**
  - A polite but shady gentleman who jokes and then takes it back (「取り込んでしまいますぜ。…なんて、冗談で御座います」).
  - Calls himself a monster made of data (griffin and nue motifs). Loves imitating human jobs; today he plays the tea teacher.
  - First person あたくし; calls the user あんた様. Endings 〜で御座います / 〜ですかい. Avoids loanwords.
  - At most 3–4 jokes in the lesson, never during the bows, and never mocking the ceremony.
  - In the tea room he takes his hat off and keeps the mask on.
- **The other characters:**
  - Akane: うち, Kansai-ben. Aoi: 私, standard polite speech, calls Akane お姉ちゃん.
  - Zundamon: ボク, 〜のだ, never gendered.
  - Metan: わたくし, 〜ですわ, ojousama with a touch of chūnibyō.
  - Tsumugi: あーし, gyaru, calls the user キミ.
  - Zunko: 私, polite. Kiritan: わたくし, cool, with gamer asides. Itako: わたくし, 〜ですわ.
  - Reimu: calm, 「ゆっくりしていってね！」. Marisa: 〜だぜ, tomboyish.
- Any character or script change should be re-checked for voice and tea facts. EVALUATION.md records the checks done so far.

## Known limits and things not verified
Recent local updates (20 November 2026):
- **Narration team** adds Reimu + Marisa, Akane + Aoi, Zunko + Kiritan, Itako + Zunko, and Itako + Kiritan. Both navigators remain visible; each turn uses its speaker's script and voice. Captions identify the speaker. A short original exchange introduces each duo. Select Solo to return to individual narration. `#pair=reimu_marisa` links directly to a team.
- Relationship references: [Kotonoha character profiles](https://aivoice.jp/character/kotonoha/) and [SSS's Tohoku sisters campaign](https://greenfunding.jp/pub/projects/774). The added dialogue is original fan dialogue, not official dialogue.
- Narration waits for complete synthesis and speech before the next cue, including the final line of a section.
- Guest drinking restores visible tea, lowers its level over three sips, and automatically enables **Look into bowl**. Other camera buttons or dragging return to free viewing.
- Tests: `node tools/pairs-test.js`, `node tools/narration-test.js`, and `node tools/drink-view-test.js`.
- The 27 × 30 cm fukusa starts as a diagonal triangle, then the host raises the right corner, tucks the loose edge, turns the left palm up, folds over the thumb, and creases the tail with the right index finger. Chacha JAPAN's demonstration opens with the triangle already formed and ends at the right-hand transfer. The obi pickup, exact grip angles, and curved finishing motion are modeled from the lesson notes. The natsume wipe continues the lesson. [Video reference](https://www.youtube.com/watch?v=kmw29BVt_bs).
- Lesson controls and key poses are under the Settings gear; questions remain at the bottom. Folding pose replays open a camera framing the hands and silk.
- The instructor list shows all characters without gender labels. The metadata still guides its order and browser voice matching.
- For static hosting, build the selector and run `node tools/build.js --public`. Upload the contents of `dist/online` together, with `index.html` at the site root. That copy uses browser narration and ships its own Three.js file and credits. The regular `dist/sado-tea-room.html` still supports local voice engines.
- Settings provides **Master's view** for inspecting the folding sequence. Finger contact and arm heights are approximated. Run `node tools/fukusa-test.js` to check the folds and hand targets.

- The official Urone If profile page (hasewoalice.wixsite.com/uroneif/profile) could not be read from the build environment.
  His personality comes from the owner's description and his look from `ref/uroneif-official.png`.
- Character voices require their engine on the same PC. The local launcher in the parent workspace serves the lesson on localhost with VOICEVOX's default `localapps` policy. VOICEVOX 0.26.2 and Zundamon synthesis were verified locally; COEIROINK remains unverified. Reimu/Marisa and Akane/Aoi use browser fallback voices rather than their proprietary engines.
- Not tested on real GPUs or real phones (headless Chromium only).
- `node tools/collision-audit.js 0.4` samples both performers throughout the eight demonstrations. The audit estimates intersections and excludes planned contacts. Some brief sleeve catches and right-arm overlap during ladling remain.
- Credits: VOICEVOX character credits are shown in the page. Yukkuri Reimu and Marisa are Touhou Project fan characters.
  Check each character's terms of use before public use.
