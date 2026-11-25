# Tea master portrait – art contract

One SVG file, `portrait.svg`, hand-authored (no image generator, no embedded bitmaps). It is used three ways:

1. as the portrait picture shown to the user ("your host"),
2. as the face of a 3D avatar: the face groups are rasterised and projected straight onto the front of a 3D head
   (planar projection along the view axis, like a slide projector), under ordinary soft 3D lighting,
3. the eye and mouth groups are swapped at run time (looking at the guest / looking down at the work / eyes closed in a bow / speaking).

## Who she is
A Japanese woman in her seventies who has practised and taught tea (Urasenke) for more than forty years.
She should read, at a glance, as **experienced, composed and kind**: upright, calm eyes, the trace of a smile.
Real adult proportions (eyes at about half the head height, not a child or chibi face). Age shows in a dignified way:
silver-grey hair combed smoothly back from the forehead (no fringe) into a low chignon at the nape, soft nasolabial folds,
two or three fine crow's-feet lines, slightly hooded upper eyelids, a faint line under each eye. Never a caricature, never a mask.
Kimono: a plain, quiet colour suited to a tea teacher (iromuji), white han-eri collar underneath.
The collar is worn **left over right as she wears it**: seen by us, the upper (visible) collar edge runs from OUR upper right
(her left shoulder) diagonally down to OUR lower left, making a lowercase "y". The reverse is how the dead are dressed; it must not happen.
No jewellery, no glasses, no visible make-up beyond a natural lip colour.

## File rules
- `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720">`. No `<image>`, `<foreignObject>`, `<script>`, `<text>`, external references or fonts.
- No `<filter>` elements (they rasterise inconsistently and slowly). Gradients, opacity, `clipPath` and `mask` are fine.
- Presentation attributes directly on elements (fill="…", stroke="…"); a `<style>` block is not allowed, because single groups are extracted and drawn alone.
- Any `<defs>` (gradients, clip paths) go in ONE `<defs>` block as the first child of `<svg>`; ids inside it must be unique.
- At most about 45 KB. Keep paths clean: this is illustration, not noise.
- Strictly frontal and upright. Mirror-symmetric about x = 300 in structure (small natural asymmetry in hair strands or lines is welcome).
- Lit evenly from the front. No cast shadow across the face, no strong highlight on one side: the 3D scene adds the real light.
  Soft, symmetric modelling (a hint of colour under the cheekbones, a slightly darker temple) is good.

## Required top-level groups, in this exact paint order (ids are a contract)
| id | content |
|---|---|
| `bg` | optional quiet background (may be empty). Hidden for the avatar. |
| `hair-back` | hair mass behind the head and neck, including the chignon. |
| `body` | neck, shoulders and kimono down to the bottom edge (y = 720). |
| `ears` | both ears. Kept separate so the head outline can be measured without them. |
| `face-base` | the skin shape of the whole head as seen from the front (cranium to chin, WITHOUT ears) plus its soft shading. Its outer silhouette is measured to build the 3D head, so it must be one clean egg/oval outline with no holes; draw the full cranium even where hair will cover it. |
| `lines` | age lines and any feature-independent shading marks (nasolabial folds, crow's feet, under-eye lines, a faint forehead line). |
| `brows` | eyebrows. |
| `eyes-open` | default eyes: looking at the viewer, warm. |
| `eyes-lowered` | same eyes, gaze lowered to the hands (upper lids about 60% down, lashes line visible). Has `display="none"`. |
| `eyes-closed` | gently closed eyes, for the bow. Has `display="none"`. |
| `nose` | the nose, drawn lightly (it also gets a small 3D bump). |
| `mouth-rest` | default mouth: closed, the trace of a smile. |
| `mouth-talk` | speaking mouth: slightly open, same width and position. Has `display="none"`. |
| `hair-front` | hairline and the front hair that overlaps the top and temples of `face-base` (it defines the hairline on the 3D head too). |

The three eye groups must occupy exactly the same place, and so must the two mouths: only one of each is shown at a time.

## Geometry
- Head (chin to top of the hair) about 330–380 px tall, horizontally centred on x = 300, chin at about y = 470–500,
  so that neck, collar and shoulders fill the rest down to y = 720.
- Everything inside `lines`, `brows`, `eyes-*`, `nose`, `mouth-*` must stay well inside `face-base`
  (at least 12 px from its silhouette): near the silhouette the projection onto the 3D head stretches.
- It must still read when the whole head is only 46 px tall on screen: eyes, brows and mouth need enough contrast and weight.

## spec.json (next to the SVG)
```json
{
  "name": "short name of the art direction",
  "palette": { "skin": "#…", "skinShade": "#…", "lip": "#…", "hair": "#…", "hairLight": "#…",
               "kimono": "#…", "kimonoShade": "#…", "haneri": "#…", "obi": "#…", "obiAccent": "#…" },
  "face": { "cx": 300, "topY": 0, "chinY": 0, "eyeY": 0, "mouthY": 0, "halfWidthAtEyes": 0 },
  "notes": "two or three sentences: what the picture is going for"
}
```
`obi` and `obiAccent` are for the sash on the 3D body even though the portrait may not show it; choose them to suit the kimono.
The kimono must stand out against a pale beige wall (#e9e3d3) and yellow-green tatami (#c9bf8f).

## Checking your work
`node /home/user/sado/tools/render-svg.js <portrait.svg> <out.png> --sheet` writes a contact sheet: the portrait, the eye and mouth
variants, the texture view and small sizes. Its JSON output lists `missingGroups` (must be empty) and the file size.
Look at the sheet with the Read tool, be critical, and iterate.
