# Mewventure artwork

These assets were generated with the built-in image-generation tool from the
user's PUR PUR and EIRA reference illustrations. EIRA's standalone image is the
original user-provided illustration. PNG originals are preserved; WebP assets
and icons are optimized copies with alpha preserved by `tools/prepare-mewventure.mjs`.

## Hero prompt

Final transparent character illustration for the hero of the cozy game website
Mewventure. Image 1 is the exact character reference for PUR PUR, the cat. Image
2 is the exact character and art style reference for EIRA, her owner. Generate
EIRA joyfully holding PUR PUR close to her chest with both arms, Pur Pur facing
the viewer, their heads close together. Match Eira's polished cute chibi anime
illustration style with clean expressive outlines, rich soft cel shading and
highlights, and warm cheerful amber eyes. Preserve Eira's long fluffy wavy
silver-periwinkle hair, purple T-shirt, dark charcoal trousers, brown leather
crossbody pouch with daisy details and gold hardware, and brown daisy boots.
Preserve Pur Pur as the same tiny round blue-gray kitten with cream white muzzle,
belly and paws, gray-blue forehead markings, pink inner ears and big shiny blue
eyes; use a soft happy expression instead of distress. A quadruped kitten, no
clothes, no human catguy. Full body Eira, relaxed affectionate pose, feet visible,
portrait composition with breathing room. Genuine transparent background with
clean alpha edges, no scenery, oval backplate, writing, logo or watermark.
Cozy, adorable and wholesome. Both characters recognizable from their references.

## PUR PUR prompt

Final transparent mascot art for Mewventure. Image 1 is the exact cat character
reference, PUR PUR; image 2 is a supporting polished cute chibi anime illustration
style reference. Draw only the same kitten, sitting with a round plump cream
white belly and tiny forward paws, one front paw slightly raised for a friendly
wave. Blue-gray fur, darker blue-gray forehead tuft and side stripes, cream white
muzzle and paws, short fluffy tail curled alongside, pink inner ears, tiny pink
nose, big glossy blue eyes. Preserve the round squishy silhouette and expressive
cat face. Happy gentle smile, rosy cheek blush and tiny pink toe beans. Clean
outlines, soft cel shading and highlights matching EIRA's aesthetic, keeping
the tiny cute kitten proportions. Entire kitten visible, centered on a generous
transparent background with clean alpha edges. No ground plane, background glow,
scenery, text, other character, clothing, human body, catguy or watermark.
Square composition; recognizable as PUR PUR.

## Floating PUR PUR prompt

Built-in image-generation tool. Saved as `pur-pur-floating.png` and optimized
with alpha preserved as `pur-pur-floating.webp`.

Use case: stylized-concept. Transparent mascot illustration for Mewventure's completed-challenge leaderboard. Reference image is the exact PUR PUR kitten identity and art style. Draw only the same tiny round fluffy blue-gray kitten with cream belly, muzzle and paws, pink ears, forehead tuft and stripes, big shiny blue eyes. PUR PUR floats happily in midair, full body visible, paws spread in a tiny celebratory jump, curled fluffy tail, happy open smile, a few tiny pastel mint and lavender sparkles surrounding it. Preserve squishy kitten proportions and polished soft cute anime cel shading from the reference. Centered square composition, generous clear margin. Real transparent alpha background; no ground, backdrop, cloud, clothes, trophy, lettering or watermark.

## Laughing PUR PUR prompt

Built-in image-generation tool. Saved as `pur-pur-laughing.png` and optimized
with alpha preserved as `pur-pur-laughing.webp`.

Use case: stylized-concept. Transparent mascot illustration for Mewventure's playful list-of-shames board. Reference image is the exact PUR PUR kitten identity and art style. Draw only the same tiny round fluffy blue-gray kitten with cream belly, muzzle and paws, pink ears, forehead tuft and side stripes, fluffy curled tail. PUR PUR is laughing with eyes squeezed into happy crescent arcs, mouth open in a delighted little giggle, one front paw held to her mouth and the other resting on her round belly, rosy cheeks. A cute teasing laugh, affectionate rather than mean. Keep original cat proportions and polished soft cute anime cel shading and fine outlines. Sitting, full body and all feet visible, centered square composition with generous transparent margin. Real alpha transparent background. No other character, clothing, text, backdrop or watermark.
## PUR PUR game sprites

Generated with the built-in image-generation tool, using PUR PUR as the character reference and the former player sheet as the animation-grid reference. Original: `pur-pur-generated-sprites.png`. Runtime: `../game/images/mewventure-sprites.png` (128 × 128, sixteen 32 × 32 frames). Packed with a single scale, transparent margins, and feet at y=24 to preserve the existing .5/.75 origin.

Use case: stylized-concept. Production game SPRITE SHEET for Mewventure. Image 1 is the exact PUR PUR identity reference. Image 2 is ONLY a 4 by 4 grid and animation placement reference; replace all human figures with PUR PUR, the tiny chubby BLUE-GRAY CAT. Transparent square canvas, exactly FOUR equal columns and FOUR equal rows, SIXTEEN separate full-body cat frames. Even grid, one cat centered inside each cell, generous consistent transparent margins, all frames same scale, facing right, no left-facing or back-facing frames. Compact pixel art designed for 32x32 game frames: crisp pixel clusters, dark muted plum outline, blue-gray fur, darker forehead/side stripes, cream muzzle belly and paws, pink inner ears, large glossy blue eyes, a fluffy short curled tail on the left, extremely round chubby body and tiny cat legs. Quadruped kitten, no clothes or human limbs. Keep PUR PUR recognizable but simplified as a readable cozy pixel game character. Row 1: four gently breathing idle poses with a soft blink on frame 3, feet same baseline. Row 2: four successive running-right poses, tiny alternating paws, body gently bobbing. Row 3: four more successive running-right poses continuing the run cycle. Row 4: jump crouch, jump takeoff with paws tucked, airborne curled pose, falling-right pose with paws extended below. No scenery, shadows on a floor, border, checkerboard, labels, text, grid lines, other characters or watermark. Genuine transparent alpha. Every complete sprite stays well inside its own quarter-sized cell, paws ears and tails never cut off or overlapping another cell.

## Cozy cave tiles

Generated with the built-in image-generation tool from the former cave atlas reference. Original: `cozy-cave-generated.png`. Runtime: `../game/images/mewventure-cave-tiles.png` (240 × 288, 16 × 16 tiles). Generated components are cropped and explicitly packed into the former tile positions by `tools/prepare-mewventure-game.mjs`; originally empty tiles stay transparent. The generated crystal strip and golden key also supply the separate hazard/key sprites. Existing tile IDs, collision polygons, animation timing, level geometry and gameplay rules are preserved. Story and ending artwork are deferred to the next pass.

Use case: precise-object-edit. Production PIXEL ART TILESET replacement for Mewventure, a cozy blue kitten escaping a cave to find EIRA. Reference image is an exact existing 15-column by 18-row grid of 16x16 logical tiles, enlarged to show the artwork. Keep exactly the reference's canvas aspect ratio, tile grid, object placement, boundaries, occupied shapes and transparent areas. This is a usable tile atlas, NOT a scene or a new freely arranged asset collection. Change only the art and palette to a cute cozy cave: softly lit lavender/periwinkle rounded stone edges, muted plum recesses, little sage moss, warm amber wall lanterns in existing light sockets, honey-brown wooden props. Preserve every wall/ledge edge and corner, slopes, masonry block silhouettes and all transparent holes exactly in the reference positions so existing tile IDs still join seamlessly. Bricks can be softer rounded cave stones but still perfectly line up. Existing empty cells stay EMPTY alpha. Existing ladders, wooden platforms, barrels, crates, doors and curved chains stay in their current positions and sizes. The hanging cage becomes a warm hanging lantern with the same silhouette. Bone decorations become tiny cream mushrooms within the same footprint. Red/bloody details become lavender crystals, retain sharp dangerous spike shapes. Lower web shapes become gentle mossy hanging vines with the same occupied positions. Preserve key and small props at the same locations. Keep decoration clearly lighter than the dark cave backing and make solid ground edges easy to read. Crisp pixel clusters designed for a 240x288 tile atlas, no gradients that break tile seams, no outer padding added, no scenery, no character, no labels/grid lines/text, no watermark. Genuine transparent background in exactly the same blank areas as the reference.
## Cave detail repair

Built-in image-generation tool. Original: `cozy-cave-details.png`. Nine isolated assets replace sliced mushroom groups, wall lanterns, small decorative stones and crystal clusters. `tools/prepare-mewventure-game.mjs` fits each complete mushroom into a single 16 × 16 cell with a bottom-aligned stem; crystal bases reach the last pixel row so flipped hazards sit flush against ceilings. Lanterns span their four connected tile IDs with transparent surroundings. Atlas size and collision data are unchanged.

Use case: stylized-concept. Production pixel-art game detail sprite sheet for Mewventure's cozy cave. The reference supplies ONLY the lavender stone, sage moss, cream mushrooms, golden lantern and amethyst crystal palette. Create a new square transparent sheet with EXACTLY 3 equal columns and 3 equal rows, 9 isolated complete assets, ONE complete object centered per cell, generous transparent margins, never crossing cell boundaries. Each cell will be packed independently into a 16x16 pixel game tile; lantern will be 32x32. Crisp low resolution pixel clusters, sharp outlines, flat limited palette, no gradients, no glow halos, no surrounding stone wall or background rectangles. Row 1: three separate small mushroom variants: one cream mushroom with round cap and full little stem; a pair of small cream mushrooms with both entire stems; one smaller cream mushroom with a soft lavender cap. All fully visible from cap to stem bottom, no connected ground, grass carpet or moss spilling off the sides. Row 2: a complete cozy wall lantern, dark plum metal with warm amber light in a rounded casing, NO wall behind it; one isolated horizontal lavender stone; one isolated horizontal lavender stone with a tiny sage moss tuft. Entire objects with transparent surroundings. Row 3: three independent upright sharp lavender crystal hazard clusters, each a self-contained 16x16-compatible tile with crystals pointing upward and a straight horizontal opaque dark plum base along the bottom, intended to sit flush on stone or flip upside-down to touch a ceiling. Exactly three spiky crystals per cluster, no cropped crystals at the left or right, no ground shadow, clear dangerous sharp tips. Consistent scale across mushroom cells and across crystal cells. No other props, text, labels, grid lines, borders, floor, background, checkerboard, stray coloured pixels, characters or watermark. Genuine alpha transparent background.
## Solid stone face repair

Built-in image-generation tool. Original: `cozy-cave-solid.png`. Packed into the eighteen solid wall/platform cells so a one-tile-high block has a visible stone face down to its hazard mounting edge, instead of using the top of a hollow nine-slice frame. Completely opaque stone cells avoid transparent seams. Rebuild all game artwork with `node tools/prepare-mewventure-game.mjs`; optional arguments provide replacement source sheets.

Use case: seamless-texture. A SINGLE fully opaque square repeating pixel-art stone tile texture for Mewventure's cozy lavender cave. Reference provides palette and pixel-art style only. Dense softly rounded lavender/periwinkle cave stones, dark muted plum mortar cracks, a few tiny sage moss pixels. The entire square must be filled with SOLID STONE FACE from top edge to bottom edge and left edge to right edge, with very narrow dark mortar. NO large hollow region, no central hole, no empty/transparent areas, no background void, no border, no outer frame, no highlights halo, no cap sitting above empty space, no isolated rock sprite, no ground plane, no objects, text, lanterns, mushrooms, crystals or characters. Seamless repeating pattern on all four edges. Low resolution crisp pixel clusters, suitable for reduction to one 16x16 logical tile: only 2 or 3 broad stones across and 3 broad stone courses down the square, keep details simple and bold. Top and bottom edges visually read as solid stone too, because it must support crystal hazards flush along either edge. Cute cozy hand-painted pixel palette matching existing purple cave art, flat limited colours, consistent light. Completely opaque full-bleed square stone texture.
## Challenge invitation banner

Built-in image-generation tool, using EIRA and PUR PUR as identity/style references. Preserved original: `challenge-banner.png`; optimized UI asset: `challenge-banner.webp`, 800 × 1000. Prepared without cropping by `tools/prepare-mewventure-challenge.mjs`. The banner contains the invitation text; the separate native button retains login/profile checks and starts the existing challenge flow.

Use case: graphic-banner. Final illustrated CTA banner for the cozy game MEWVENTURE. Portrait 4:5 composition for a narrow website sidebar. Image 1 is the exact character reference for EIRA; image 2 is the exact character reference for PUR PUR. Preserve EIRA's long fluffy silver-periwinkle hair, amber eyes, purple T-shirt, dark trousers, brown daisy pouch and boots. Preserve PUR PUR as a tiny chubby blue-gray kitten, cream muzzle belly and paws, forehead stripes, fluffy tail, pink ears and large glossy blue eyes. Polished adorable chibi anime cel shading matching the references. Cheerful playful inviting mood. EIRA is crouching beside PUR PUR, smiling and presenting a shiny little golden cave key; PUR PUR enthusiastically raises one paw and looks ready for adventure. Characters fill the lower two thirds, faces clearly visible, all bodies stay inside the composition. Background: a dreamy pale lavender cozy cave entrance with softly rounded periwinkle stones, tiny cream mushrooms, warm amber lantern light, sage moss, subtle floating hearts and paw-print sparkles. Cream and EIRA-hair periwinkle palette with soft lavender shadows. Upper third features LARGE perfectly legible rounded friendly dark-purple display typography on a cream/lavender curved ribbon with generous margins. EXACT TEXT, three centered lines: "WHO’S UP" / "FOR A" / "CHALLENGE?". Use exactly those words and apostrophe, no other writing. Text readable even when reduced to 280px width, no characters/objects overlapping letters. Clever lively composition with a small trail of golden pawprints leading toward the cave behind the characters. No frightening traps, dark grim mood, catguy, logos, watermark, tiny subtitles, simulated web UI, baked-in button, surrounding device or outer white padding. Finished full-bleed banner art, no transparency.

## Standalone gold key

The former bitmap crop included neighboring crate pixels. `game-key.svg` is an editable gold recoloring of the project's existing code-native pixel key. The packaging script renders it into a complete transparent 16 × 16 `../game/images/mewventure-key.png` and copies exactly the same pixels into tile ID 146. Both key objects retain their former frame size, origin and collision metadata.
