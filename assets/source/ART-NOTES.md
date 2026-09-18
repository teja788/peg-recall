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

## Board readability — September 2026 pass

After "board orientation is confusing and not clear". Measured off the same
reference (<https://toytheater.com/memory-chess/>, PLAY → NEXT → START, 24
pieces), this time by reading its 1280×768 canvas pixel-by-pixel in the page
rather than by eye. The disc ellipse was fitted from eight peg-head shadows on
the outer shell (`dx² + u·(y − cy)² = R²`, three unknowns, residuals under
1 px), then cross-checked against the wood silhouette's lower edge.

| Measure | Reference (px) | As a ratio | Ours before | Ours now |
| --- | --- | --- | --- | --- |
| Disc, long axis | 511 | — | — | — |
| Disc, short axis | 311 | **yScale 0.61** | 0.50 / 0.58 | 0.62 / 0.66 |
| Visible side wall | 28 | 0.055 × width | 0.09 | 0.065 |
| Outer shell radius | 190 | 0.74 × disc radius | 0.78 | 0.78 |
| Min peg spacing (shell chord) | 74.6 | — | — | — |
| Shell-to-shell spacing | ~95 | 1.27 × chord | 0.87 (hex row) | 0.87 |
| Peg head width | 35 | **0.47 × spacing** | 0.64 | 0.50 |
| Peg stem width | 29 | 0.39 × spacing | 0.46 | 0.42 |
| Head / stem | — | **1.21** | 1.39 | 1.19 |
| Head height | 37 | 1.06 × head width | 0.54 | 0.84 |
| Stem length (head → base) | 51 | 1.46 × head width | 1.15 | 1.30 |
| Whole peg height | 88 | 2.51 × head width | 1.9 | 2.35 |
| Peg height / spacing | — | 1.18 | 1.22 | 1.18 |
| Die | ~95 | 0.19 × disc width | 0.16 | 0.16 |

Five things the numbers settled:

1. **The reference is *less* tilted than we were, not more.** Its ellipse is
   0.61; we were at 0.50–0.58. Squashing the board further was the wrong
   instinct: a flatter ellipse is exactly what pulls the rows apart. The Play
   Store "Color Memory Chess" goes all the way to a flat top-down 5×5 grid, so
   both references point the same way. We landed at 0.62 (squat screens) /
   0.66 (tall phones) — slightly past the reference, because our hex lattice
   packs shells 0.87 spacings apart where the reference's rings sit 1.27
   apart, so we need the extra spread to buy the same air.

2. **The peg is a pin, not a mushroom.** Head 35 px on a 29 px stem is a
   1.21× flare — a turned wooden neck, nothing more. Ours was 1.39× on a
   0.64-spacing-wide head, i.e. a cap almost two-thirds as wide as the whole
   lattice cell. That alone is most of the "wall of caps" reading.

3. **The head is round.** 35 wide × 37 tall: a ball on a stick, not a flat
   dome. Drawing it as a shallow dome is what made ours read as a button.

4. **Every base sits visibly in its hole.** The strongest depth cue on the
   reference board is not shading, it is that you can see a dark drilled ring
   and a small pooled shadow at the foot of every peg. `holeSizeFor()` now
   returns 1.06 × peg width against a 0.84 × peg width stem, so ~0.11 of peg
   width of rim shows all the way round, and each peg carries two stacked
   contact-shadow ellipses instead of one.

5. **The die is a sixth of the board, centred below it** — which is where ours
   already was, so it did not move.

The invariant worth keeping: **head height < projected row pitch**, i.e.
`PEG_DOLL_CAP_HEIGHT × pegWidth < spacing × 0.866 × tilt`. With the numbers
above that is `0.42 × spacing < 0.537 × spacing` at tilt 0.62 and
`< 0.572 × spacing` at 0.66 — a 28–36 % margin at every board size, since both
sides scale with `spacing`. `Board.tsx` logs both plus `clear=yes/no` in dev.
