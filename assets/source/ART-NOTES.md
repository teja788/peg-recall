# Art references — wooden die, board and pegs

Gathered before the September 2026 rework, after the note that "colour of dice and
shape of dice is too dull and not realistic … even board colour is dull".

Sources: the reference game at <https://toytheater.com/memory-chess/> (played
through PLAY → NEXT → START, then its own `item_dice_01.png` sprite sheet and
the live canvas sampled pixel-by-pixel), plus listings for physical sets
(TOWO wooden memory game, Montessori beech colour-memory sets, painted wooden
colour dice).

## Five observations

1. **The reference die is a *rounded* isometric cube, not a flat hexagon.**
   Tracing the alpha of `item_dice_01.png` (540×180, six 90×90 frames) gives an
   octagonal silhouette: every corner of the top diamond and every vertical
   corner is visibly radiused, roughly 6 % of the sprite width. Our old die was a
   hard-edged hexagon, which is most of why it read as a flat icon rather than a
   turned wooden block.

2. **Every visible face carries ONE big pip, and they are fully saturated.**
   Sampled pips from a single frame: top `#BF0605` (red), front `#262422`
   (near-black), right `#1E941A` (green). Each pip spans ~55 % of its face. There
   is no "small decorative dot" treatment — the colour is the whole message, so
   it is drawn as large and as saturated as the face allows.

3. **Die wood is golden, and the three faces are clearly separated in value.**
   Top `#D4A86C`, front ≈ `#D3A76B` falling to `#C3985D`, right `#A07946`
   falling to `#B1864E` at the lit corner. That is a ~25 % value drop per face
   turn — far more contrast than our old die, whose three faces were within a
   few percent of each other and so read as one flat blob.

4. **The board is honey/gold, not beige.** Sampling a 9×9 grid over the live
   board: the dominant face tone is `#D4A86C`, with the lit sweep running up to
   `#E7CEB4`/`#EAD2BA` at the top-left and dropping to `#B38A54`/`#8D6942` in the
   holes and near the rim. Our old face (`#EFD9B8` → `#E3C9A4`) is a full step
   paler and greyer — literally the "dull" complaint.

5. **Peg bodies are lighter than the board face, so the pegs pop off it.**
   Reference peg stem `#BB8B53`/`#CC9E5F` against the darker drilled face, with
   a hard specular on the cap. Physical sets do the same thing: untreated beech
   pegs on a stained/oiled base. Our pegs were the *same* value as the face, so
   the board read as one undifferentiated mass of wood.

## Hexes carried into the rework

| Part | Light | Dark |
| --- | --- | --- |
| Board face, lit centre | `#ECC788` | `#A67940` |
| Board face, outer | `#CE9F60` | `#8A6031` |
| Rim / side wall, lit | `#B8875A` | `#6E4C29` |
| Side wall, bottom edge | `#8F6238` | `#4A3218` |
| Turned groove ring | `#9A6C40` | `#4E3419` |
| Hole, deep wall | `#5E4326` | `#2A1C0C` |
| Hole, lit floor | `#7A5A3A` | `#453014` |
| Peg cap (face-down) | `#E6C68F` | `#D5AC73` |
| Peg body | `#DEBA82` | `#BE945B` |
| Die top face | `#F0D3A0` | `#B98D55` |
| Die front face | `#D6B37E` | `#9C7340` |
| Die right face | `#BC9159` | `#80592D` |
| Die bevel / edge | `#9A7448` | `#5C3F20` |

Pips are the untouched Okabe-Ito peg colours (`PEG_HEX`) with `PEG_RIM` darkened
12 % as their rim — fully saturated, no tinting.

`src/ui/art/palette.ts` is the source of truth; `assets/source/build-svg.js`
keeps a hand-copy of the light set for the app icon.
