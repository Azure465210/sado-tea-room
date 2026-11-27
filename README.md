# Sado Tea Room — project overview (start here)

This is a browser tea-ceremony (sado, Urasenke-style usucha) lesson made for an English Project Lab. It is the browser
version of a VR "AI tea-master avatar" project, for people without a headset. The page UI is English (British spelling).
Both instructors have English dialogue. Select **English** under **Narration language** on the opening screen or in Settings to hear it with a browser voice. By default, Shizue speaks in English and Ifu speaks in Japanese with English subtitles.

- **Finished page:** `dist/sado-tea-room.html` is a single self-contained file of about 1.9 MB. Open it in Chrome or Edge;
  nothing needs installing.
- **Instructor choice:** **Shizue-sensei**, the tea room's original host, or **Urone If (虚音イフ)**. The selected instructor performs the ceremony as a full-body 3D avatar and narrates the lesson.
- **The lesson:** 9 steps (greet → purify → … → serve), pose pictures, a Q&A drawer, tap-a-utensil names, and a guest part
  where the user whisks and drinks.

## Folder map

| Path | What it is |
|---|---|
| `src/shell.html` | HTML and CSS shell of the page (header, intro/selector host, captions, drawers, engine panel). |
| `src/js/NN-*.js` | Page logic, concatenated in filename order inside one IIFE by the build. Main files below. |
| `src/data/<id>-script.json` | One English or bilingual lesson script per instructor. Schema below. |
| `art/final/`, `art/ifu/` | Drawn SVG portrait and `spec.json` (palette, face metrics, style) for Shizue and for Urone If. `art/SPEC.md` is the drawing contract. |
| `vendor/three.min.js` | Three.js r128, used by the tea room. |
| `selector/` | React 18 + TypeScript + Tailwind 3 + React Three Fiber instructor selector. It builds to `selector/dist/selector.iife.js` and `selector.css`, which are inlined into the page. |
| `tools/` | Node build and test tools (Playwright). |
| `docs/roster-contract.md` | Instructor roster, speech behavior and integration notes. |
| `docs/teachers-contract.md` | The earlier spec (two teachers, Urone If's voice rules, script schema, TTS behaviour). |
| `ref/` | `uroneif-official.png` (official Urone If art, used as the look reference), `uploaded.html` and `current.html` (the two original versions this project was built from). |
| `EVALUATION.md`, `NOTES.md`, `shots/` | Local evaluation, working notes and screenshots, excluded from the repository. |

### Main page modules (`src/js/`)
- **`00-setup.js`:** renderer, scene, lights, cameras. The stage is mirrored (`MIRROR`) so the kettle is on the host's left.
- **`05-teachers.js`:** `TEACHERS`, `TEACHER`, and the helpers `teacherLines(i)`,
  `teacherQs(i)`, `teacherSays(key, k, fallback)`. The choice comes from `#teacher=<id>`, then localStorage `sado.teacher`.
- **`06-tts.js`:** browser Web Speech, plus local **COEIROINK v2** (127.0.0.1:50032) for Ifu's Japanese narration when available. Includes voice profiles, the sentence queue, `yomi` text, and engine status.
- **`20-rig.js`, `21-host.js`, `23-avatar.js`:**
  - **20-rig:** a human skeleton (158 cm, fixed bone lengths, 2-bone IK, automatic leaning, collision with the body, lap and utensils).
  - **21-host:** grip points on the utensils.
  - **23-avatar:** `makeAvatar(teacher)` builds the 3D body, with the drawn face projected onto the head. Urone If's official look is
    built here: beak mask, fur, cape, wing sleeves, talon hands, bird leg and lion leg, tail, and the hat set down on the tatami.
- **`30-utensils.js`, `40-choreography.js`:** the utensils, and the 9 `STEPS` (timed holds, poses, lines and questions).
- **`50-player.js`:** UI, the selector mount (`SadoSelector.mountSelector`), teacher switching, voice controls.
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

The preview listens at `http://127.0.0.1:8777/`. The build writes the local lesson to `dist/sado-tea-room.html` and the static site to `dist/online/`. The online build uses browser voices and includes Three.js. The local lesson can use COEIROINK v2 with the Urone If model installed on the same PC.

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
node tools/flow-test.js dist/sado-tea-room.html --teacher ifu
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
`__sado.setTeacher(id)`).

## Characters (see `selector/src/data/characters.ts` and `docs/roster-contract.md`)
| id | Name | Engine | Gender | Role |
|---|---|---|---|---|
| shizue | Shizue-sensei 静江先生 (Tea Room original) | Browser | female | performer, English lines |
| ifu | 虚音イフ Urone If | COEIROINK | male + `neutralPresentation` | performer, Japanese lines |

- Gender and presentation metadata stay internal for instructor ordering and voice selection. The selector hides the labels and shows the whole roster.
- **3D:** each character has `model3dUrl` (.vrm/.glb, currently all `null`, since no licensed files are available) →
  procedural bust (`selector/src/models/<Name>Bust.tsx`, shared kit `kit.ts`) → 2D fallback.

## Script schema (`src/data/<id>-script.json`)
- **Spoken unit:** Shizue uses `{en}`. Ifu uses `{ja, en, yomi}`. `yomi` is the Japanese the TTS reads, with words a TTS might misread
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
- **Shizue-sensei:** calm, warm and precise. Explains each step in plain English.
- Any character or script change should be re-checked for voice and tea facts. EVALUATION.md records the checks done so far.

## Known limits and things not verified
- Narration waits for complete synthesis and speech before the next cue, including the final line of a section.
- Guest drinking restores visible tea, lowers its level over three sips, and automatically enables **Look into bowl**. Other camera buttons or dragging return to free viewing.
- Tests: `node tools/teachers-test.js`, `node tools/narration-test.js`, and `node tools/drink-view-test.js`.
- **Fukusa.**
  - **At the obi.** The 27 × 30 cm silk is worn at the left hip as a diagonal triangle folded in two: over the top of the obi for Shizue, under the lower edge for Urone If.
  - **Opening it.** The left index and middle fingers draw it out near the near-left corner, leaving a short tail. The right hand comes over the left with the back of the hand up and the forearm level, and pinches 3 cm inside the far-right corner between the thumb and the side of the index finger. It lifts while the left wrist turns over. The packet opens until the diagonal stands vertical, right hand above and left hand below, with the cloth hanging from it as a triangle. The hanging cloth is turned 15° to her left of straight ahead, so the right forearm, coming across from her right elbow, can hold the corner without bending the wrist.
  - **Folding.** The left hand takes the middle of the right edge and folds the loose sail over, then puts its thumb on the exact centre and turns the palm up. The right hand folds the far corner down onto the near corner over the thumb, draws the stroke 一 with the index finger and curls the tail under (つ). The result is a 10 × 10 cm pad held on both palms.
  - **Wiping.** The left hand goes to the knee and the right hand wipes the natsume lid in a こ shape. For the purification the natsume stands just in front of her right knee; it is moved to its usual place at the end of the step. The cloth is folded again onto the left palm for the three chashaku wipes (the scoop lies on the bowl with its node end toward her right hand), then returned to the obi. No snap (塵打ち) is made.
  - **How it is modelled.** The silk is a target-guided soft cloth: exact rounded folds plus a deterministic settle against the hands, lap and sleeves. Each hand follows a plan made of sub-steps that blend into one another, so no hand or cloth jumps; the rig moves the wrist so the planned fingertip, pinch or clamp lands on the cloth even where the wrist cannot turn the hand as far as planned. While the cloth is handled the hands follow the plan without lag, so seeking, pose pictures and Master's view show the same shape as playing.
  - **Sources.** The sequence follows Urasenke practice notes (warigeiko pages and videos, read only as search summaries). Hand angles, heights and timing are modelled. [Video reference](https://www.youtube.com/watch?v=kmw29BVt_bs).
  - **Checks.** Run `node tools/fukusa-test.js` to check folds, pinches, layer order and seeking. `--browser dist/sado-tea-room.html` also checks, for both teachers, the real fingers on the cloth, every finger capsule against the cloth, and the drawn cloth's and wrists' continuity at 60 fps (including the hand-overs to the tracks).
- Lesson controls and key poses are under the Settings gear; questions remain at the bottom. Folding pose replays open a camera framing the hands and silk.
- The instructor list shows all characters without gender labels. The metadata still guides its order and browser voice matching.
- For static hosting, build the selector and run `node tools/build.js --public`. Upload the contents of `dist/online` together, with `index.html` at the site root. That copy uses browser narration and ships its own Three.js file and credits. The regular `dist/sado-tea-room.html` still supports local voice engines.
- Settings provides **Master's view** (her own eyes, a 60° lens) for inspecting the folding sequence. The fingers are placed on the cloth by the same finger kinematics the avatar draws; arm heights are modelled.

- The official Urone If profile page (hasewoalice.wixsite.com/uroneif/profile) could not be read from the build environment.
  His personality comes from the owner's description and his look from `ref/uroneif-official.png`.
- Ifu's COEIROINK voice requires the engine and model on the same PC. The public site uses browser voices.
- Not tested on real GPUs or real phones (headless Chromium only).
- `node tools/collision-audit.js 0.4` samples both performers throughout the eight demonstrations. The audit estimates intersections and excludes planned contacts. Some brief sleeve catches and right-arm overlap during ladling remain.
- The local lesson shows the COEIROINK credit when used. See [Urone If's terms](https://hasewoalice.wixsite.com/uroneif/terms-of-use) for the fan interpretation.
