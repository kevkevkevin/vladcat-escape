# Purrvival homepage artwork

Generated with the built-in image-generation tool from EIRA and Pur Pur's reference illustrations. PNG originals are preserved in this directory. Optimized WebP versions and the mobile character composition are produced by `tools/prepare-purrvival-home.mjs`. No text or button is baked into the images: native page headings and CTA links remain editable and accessible.

## Hero banner

Files: `hero-banner.png`, `hero-banner.webp`, `hero-mobile.webp`. Wide 2:1 composition, with the real headline and Play link on the quiet left side. Mobile uses the character portion with a separate text block above it.

Use case: website-hero. Large panoramic homepage banner illustration for Purrvival, a cute cozy cave escape game. Landscape 2:1 aspect ratio. Image 1 is the exact EIRA identity/art-style reference; image 2 is exact PUR PUR identity. Polished soft chibi anime illustration with clean outlines, warm cel shading, silver-periwinkle lavender palette, pale cream light, tiny sage details. EIRA with long fluffy silver-periwinkle hair, amber eyes, purple T-shirt, dark trousers, brown daisy satchel and daisy boots, joyfully kneeling and giving a little golden key to her fluffy chubby blue-gray kitten PUR PUR. PUR PUR has cream muzzle belly/paws, darker forehead stripes, pink ears, glossy big blue eyes, curled tail, round squishy cat body, happy and curious. Both characters grouped in the RIGHT HALF, full bodies inside generous safe margins, EIRA's head around 65% canvas width, kitten around 80%, recognizable expressive faces. A magical cozy lavender cave opens onto a sunlit meadow behind them, warm hanging lanterns, rounded stone arch, cream mushrooms, moss and a trail of tiny golden pawprints. Soft magical adventure mood, like an illustrated children's storybook, never scary. LEFT 42% stays QUIET and very LIGHT CREAM/LAVENDER, mostly soft sky and gently blurred meadow with minimal detail, absolutely no characters, props or high contrast elements there; this area is for real website headline and buttons to overlay later. Decorative stones/flowers only at the outermost edges. Full-bleed spacious composition, characters right, background extends across whole panorama. No text, lettering, logo, button, UI, speech balloons, watermark, frame, device mockup or transparency. This is a wide finished hero image, not a portrait cutout.

## Rewards CTA illustration

Files: `rewards-banner.png`, `rewards-banner.webp`. Gold tokens carry generic paw symbols. The section links to Play and the leaderboard; existing reward-plan copy is preserved.

Use case: stylized-concept. Cozy reward celebration illustration for Purrvival's HAPPY PAWS. LITTLE REWARDS. website section. Wide 4:3 landscape composition. Exact character references: image 1 EIRA, image 2 PUR PUR. Draw EIRA sitting comfortably on a lavender picnic blanket beside her tiny chubby blue-gray cat PUR PUR. EIRA smiles with delight and holds one shiny GOLD TOKEN with a simple embossed PAW PRINT emblem toward PUR PUR, who happily hugs another paw-emblem token with both front paws, eyes sparkling and tail curled. A small tidy cluster of a few gold tokens nearby, tiny mint and lavender confetti hearts/stars, warm happy cozy moment. Preserve EIRA's long flowing silver-periwinkle hair, amber eyes, purple T-shirt, dark trousers, brown daisy satchel and brown daisy boots. Preserve PUR PUR's round squishy body, blue-gray stripes, cream belly/muzzle/paws, pink ears, glossy large blue eyes, fluffy curved tail, tiny kitten proportions. Polished cute chibi anime style, soft cel shading matching the references. Palette: EIRA-hair lavender/periwinkle, cream, pastel mint, warm amber gold. Background is a simple softly lit whimsical cave nook with lantern bokeh and small cream mushrooms, not cluttered. Full characters and every token visible, generous 8% safe margin all around, faces prominent. Emblems are plain paw symbols with NO letters, ticker or currency logo; no implied brand partnership, prices or gains. No text, headline, writing, buttons, UI, labels, watermark or transparency. Full-bleed polished illustration, happy and welcoming, easy to crop minimally into a rounded card.

## Resting Pur Pur community decoration

Files: `pur-pur-resting.png` (1536 × 1024 generated original) and
`pur-pur-resting.webp` (900 × 600 optimized cutout, alpha preserved).
Created with the built-in image-generation tool using
`../mewventure/pur-pur.png` as the character reference. The native SVG
`paw-pattern.svg` repeats the existing `MewIcon` paw outline, with staggered
lavender prints across all main homepage sections, with a softer fade
over the hero art. The community section reserves space for the cat; on mobile
the decoration flows below the links. Both decorations are non-interactive
and hidden from assistive technology.

Final prompt:

Use case: identity-preserve. Create a new decorative transparent illustration of the exact Pur Pur cat in the reference, for the bottom-right corner of Purrvival's cozy community website section. Preserve the reference's chubby blue-gray kitten identity, creamy white muzzle/belly/paws, darker blue forehead stripes, pink inner ears and little nose, fluffy tail, soft chibi anime outlines and warm cel shading. Change the pose: Pur Pur is lying sideways in a very relaxed cozy loaf/stretch, head toward the left, enormous round fluffy body resting on its side, front cream paws tucked together beneath its cheek, soft sleepy closed smiling eyes, pink blush, fluffy curled tail at the right. Show a happy peaceful nap, extremely cute and squishy. Landscape horizontal silhouette, entire cat including ears, paws, belly and tail visible, generous transparent safe margin around all sides. The cat looks naturally resting on the section's bottom edge. Blue-gray silver-periwinkle and cream palette matches the supplied reference exactly. One cat only, no other characters, no props, no extra paws, no background, no floor rectangle, no text, no letters, no watermark. Genuine transparent background, with at most a tiny soft contact shadow directly beneath the cat. Polished production-ready cutout.

## Current game showcase

`../showcase/purrvival-gameplay.jpg` is a 768 × 432 capture of the actual updated stage 1 engine, including Pur Pur, the repaired key, solid stone tiles, complete mushrooms, lanterns and crystal hazards. Refresh it with `node tools/capture-purrvival-showcase.mjs`. The capture uses an isolated local engine and performs no account/database writes.

## Player-supplied story frames

The three comics supplied by the user on 2026-10-12 replace the former VLADCAT story and ending artwork. They retain their complete 1672 × 941 composition and dialogue, encoded as WebP at quality 94:

- `../game/images/purrvival-story-01.webp`: frame 1, opening story.
- `../game/images/purrvival-story-02.webp`: frame 2, opening story.
- `../game/images/purrvival-ending.webp`: frame 3, completion comic.

The story reader provides matching text transcripts and a full-size link. The ending displays its comic above the personalized thank-you and share controls.
