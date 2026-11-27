# Instructor roster

Sado Tea Room has two instructors. The chosen instructor performs the ceremony as the full-body avatar and narrates each step.

| ID | Name | Default narration |
|---|---|---|
| `shizue` | Shizue-sensei (静江先生) | English, using a browser voice |
| `ifu` | Urone If (虚音イフ) | Japanese with English subtitles, using the local COEIROINK v2 model when available or a browser voice |

Both scripts include English narration. The **English** option uses browser speech for either instructor. The public site uses browser voices for both languages. Gender and neutral-presentation metadata stay internal for instructor ordering and browser voice matching.

## Dialogue and captions

- Shizue is warm, calm and precise. Ifu speaks as a courteous, slightly sly gentleman. In Japanese he uses あたくし for himself, あんた様 for the guest, and endings such as 〜で御座います or 〜ですかい. Keep jokes out of the bows and keep the ceremony details consistent across scripts.
- `src/data/shizue-script.json` has English units. `src/data/ifu-script.json` has Japanese and English text plus `yomi`, the reading used for Japanese speech.
- `src/js/40-choreography.js` controls cue timing and the scene choreography. Run `node tools/check-script.js src/data/ifu-script.json` to check timing and script coverage, and `node tools/teachers-test.js` to check both instructors.

## Urone If’s visual reference
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

## Selector integration

- `selector/src/data/characters.ts` defines the same two IDs as `src/js/05-teachers.js`. The selector previews their procedural busts and falls back to a 2D card without WebGL.
- The Vite build exports `window.SadoSelector.characters` and `window.SadoSelector.mountSelector`. The tea room inlines the selector’s JavaScript and CSS. Keep styles scoped to `#sado-selector`.
- Run `npm run typecheck`, `npm test` and `npm run build` at the project root.
