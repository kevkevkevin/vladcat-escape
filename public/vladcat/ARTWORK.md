# VLADCAT artwork

Generated with the built-in image-generation tool using the supplied character image as an identity reference. The original generated images remain available here; `tools/prepare-vladcat.mjs` crops and scales the animation cells and packages code-rendered title, key, logo and story UI around the generated art.

## Hero prompt

Use case: stylized-concept. Asset type: transparent character hero artwork for the browser platform game VLADCAT ESCAPE. Input image 1 is the character identity reference, not a background to copy. Generate VLADCAT, a confident adult masculine catguy, faithfully recognizable from the reference: tousled medium brown hair, strong expressive face, brown mustache and pointed goatee, tall pointed acid-lime cat ears, pale skin, athletic muscular upper body, vivid lime cloth diagonally across one shoulder. Stylized high-quality illustrated game character, polished shaded forms and crisp silhouette, rebellious arcade protagonist. Waist-up portrait in a ready-to-escape pose, one arm bent, looking slightly toward the viewer, subtle cheeky confidence. Entire head, both cat ears and shoulders fully in frame with breathing room; bottom terminates cleanly around waist. Dark wrist wraps. Color palette lime green, brown hair, warm pale skin, dark charcoal accents. True transparent alpha background, no backdrop, no code text, no letters, no logo, no watermark, only one character. This is the new playable CATguy hero, not a robot.

## Animation prompt

Use case: stylized-concept. Asset type: production pixel-art animation sprite sheet for VLADCAT ESCAPE, a side-view platformer. Image 1 is character identity reference. Generate one square 1024x1024 transparent PNG, EXACTLY a 4 columns by 4 rows grid of 16 equally sized 256x256 cells. No visible grid lines. Each cell holds ONE full-body VLADCAT catguy, centered at x=128, same baseline y=224, contained between x40..216 and y32..224 of its own cell. All sprites face RIGHT, identical consistent size and design, no sprites extending beyond their cell, no text or labels. Pixel art made for eventual 32x32 cells: chunky crisp discrete square pixels, about 32x32 logical pixel resolution per cell, strong dark outline, readable at tiny game size, NOT painterly, NOT smooth chibi illustration. Character: adult male catguy, shaggy brown hair, brown mustache and pointed goatee, large pointed neon lime cat ears, pale skin, muscular arms, diagonal lime sash/tunic, charcoal trousers and boots, dark wrist wraps. Human face and physique with cat ears. Top row: four subtly different standing idle/breathing poses. Second row: four RIGHT-facing running poses forming a cycle: contact, down, passing, up. Third row: four further running cycle poses with opposite leg leads. Bottom row: jump launch, airborne rising with tucked knees, airborne apex, falling with outstretched limbs. Exactly sixteen coherent animation frames, isolated true alpha transparency, NO background colors, gradients, halo, ground shadows or checkerboard. Preserve consistent head scale, palette, sash and lime ears in every frame. Character only.

## Files

- `vladcat-hero.png`: generated character illustration, 1024 × 1536, with alpha.
- `vladcat-hero.webp`: optimized 800 × 1200 hero used by the website.
- `vladcat-generated-sprites.png`: original generated animation sheet, 1254 × 1254, with alpha. The generator returned this size rather than the requested 1024px; packaging uses its actual dimensions.
- `../game/images/vladcat-sprites.png`: normalized 128 × 128 atlas with sixteen 32px cells. Idle/run/jump/fall and clone animations retain their existing frame counts, speed, origins and duration.
- `mark.svg` / `apple-icon.png`: code-native cat mark and app icon.
- `../game/images/vladcat-title.png`, `vladcat-key.png`, `vladcat-panel.png`, `vladcat-story-1.png` through `vladcat-story-3.png`: game title, key, panel and story UI.

No external image API key was used.

## Play-page challenge banner

Generated with the built-in image-generation tool. The existing
`vladcat-hero.webp` was supplied as the character identity reference.
`vladcat-challenge.png` preserves the original 1536 × 1024 output;
`vladcat-challenge.webp` is the optimized 900 × 600 website asset.
The challenge heading and button remain accessible HTML rather than image text.

Final prompt:

Use case: ads-marketing. Create a new landscape 3:2 illustrated banner for the 'Ready to take a challenge?' CTA card on the VLADCAT ESCAPE game website. The supplied image is a character identity reference only; create new artwork and a new pose. VLADCAT is the same handsome muscular catguy with tousled brown hair, lime-green cat ears, a mustache and pointed goatee, lime one-shoulder sash, dark belt and wrist wraps. Show him waist-up on the right half, leaning toward the viewer with a cheeky confident grin and beckoning with one hand, inviting the player into an escape challenge. Behind him are the dark purple Void Ruins and a luminous lime-green escape doorway with subtle floating sparks. Polished anime/comic illustration matching the character reference, strong silhouette and bold lighting that stays readable at a 320px card width. Dark charcoal and aubergine background with lime-green accents, energetic and playful. Keep face and ears inside the frame with comfortable margins, no cropped head. Left half shows atmospheric ruins and the doorway. No words, no lettering, no button, no logo, no watermark: accessible website text and a real button will be placed below the artwork in HTML. Opaque background.

## Chibi guide mascot

Generated using the built-in image-generation tool with `vladcat-hero.png` as
the identity reference. `vladcat-chibi.png` preserves the original 1024 × 1536
RGBA output; `vladcat-chibi.webp` is its 280 × 420 optimized website asset.
The image has real alpha transparency and is used by the bottom-right game guide.

Final prompt:

Use case: stylized-concept. Asset type: transparent mascot illustration for a website corner game guide. Generate a CHIBI version of VLADCAT. Input image 1 is an identity reference only; do not reproduce its background or composition. Keep his recognizable adult male catguy identity: shaggy medium brown hair, brown moustache and little pointed goatee, expressive confident human face, tall pointed neon lime cat ears, warm pale skin, diagonal lime green shoulder sash, dark wrist wraps, charcoal trousers and boots. Cute polished anime game mascot with large head, tiny compact muscular body, chunky clean outline and cel shaded forms; friendly mischievous wink and a small wave toward the viewer. One full-body character, both ears, hands and feet completely visible, centered with breathing room. Readable as a tiny bottom-right website guide button. True transparent alpha background, no backdrop, no gradient glow, no floor or shadow, no speech bubble, no text, no watermark. Only one mascot, no alternate poses or sprite grid. Preserve VLADCAT's lime/brown/charcoal brand palette.
