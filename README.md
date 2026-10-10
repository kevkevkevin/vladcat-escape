# VLADCAT ESCAPE

The complete 50-level Construct game now runs inside a Next.js 16 / React 19 / TypeScript application, with a visual level editor and editable game source. The original export is preserved in `legacy-export/`.

## Trusted challenge gameplay

Challenges run the original rules in isolated server Chromium. Players send
keyboard/pointer controls and receive game frames and sound events. Only actual
engine exits save stage completions. Signed receipts for all 49 puzzles are
required for verified rankings; older scores remain unverified. Practice and
editor previews run locally. This closes scripted completion/score claims but
does not prevent bots that solve puzzles through legal controls.

Hosting now requires persistent Node plus Chromium, sticky session routing and
unbuffered SSE. It introduces network latency and browser resources per player;
the default cap is four simultaneous challenges. See [deployment and security
details](supabase/AUTHORITY.md). `npm run verify:authority` exercises the real
engine and live app with disposable accounts, then removes their data.

For a Hostinger VPS, [deployment steps](deploy/HOSTINGER.md) cover the Docker
build, non-root sandboxed Chromium, HTTPS, secrets and launch verification.
The Compose configuration defaults to one active challenge for initial KVM 1
testing; actual capacity still needs to be measured on the server.

## Website pages

The home strip is a 100vw seamless marquee with pause/resume, hover pause and
reduced-motion support. A generated chibi VLADCAT opens a corner game guide on
all pages. Without an OpenAI key, it answers built-in help topics locally.
Set server-only `OPENAI_API_KEY` and optionally `OPENAI_GUIDE_MODEL` (default:
`gpt-4.1-mini`) in `.env.local`, then restart/rebuild, to enable live AI for
logged-in players. The widget labels live mode and discloses that the current
question and the last two messages (up to 240 characters each) are sent to OpenAI.
Guests retain local help. The server verifies login, bounds input/output, uses
`store: false`, times out after 15 seconds and falls back to game help on provider
failure. It has no tools or access to scores/profile fields. The eight-request
per-minute cap is per player per server process, not a distributed quota; set
provider project spend limits for hosted deployments. The key never enters
client bundles. Live provider replies have not been exercised without a key;
the provider protocol and failure handling are tested with mocks. Reference:
[OpenAI text generation](https://developers.openai.com/api/docs/guides/text).
The guide hides during fullscreen gameplay and supports
keyboard dismissal. Asset prompt is saved in `public/vladcat/ARTWORK.md`.
UI verification is recorded in `artifacts/marquee-guide-results.json`.

- `/`: landing page with VLADCAT, controls, the weekly incentive plan, token/community links and future games/buybacks.
- `/play`: expanded game canvas, account/challenge flow and saved progress. Profile and instructions collapse by default on mobile; portrait phones get a landscape tip.
- `/leaderboard`: public completed-run rankings and the list of shames. Ranking tables are no longer embedded on Play.
- `/editor`: coming-soon level creator preview. The interactive editor and
  playtest controls are hidden; their source is retained for future work.

Play uses a desktop canvas-left/sidebar-right layout. The sidebar contains
profile details, a newly generated VLADCAT challenge banner and instructions.
On phones the canvas leads and sidebar cards stack below it. Guest login stays
collapsed until opened or requested by the challenge button; logged-in profile
details open on desktop. Artwork and its generation prompt are documented in
`public/vladcat/ARTWORK.md`.

The landing page includes an actual game screenshot and a static level-creator
sneak peek: build your own escape, share it with friends, and challenge them to
beat it. The preview is clearly marked coming soon; level sharing is not yet
implemented. Editor navigation is hidden, and visiting `/editor` shows the same
preview instead of the interactive tool. Screenshots are in `public/showcase/`.

Set `NEXT_PUBLIC_VLADCAT_TOKEN_CA`, `NEXT_PUBLIC_VLADCAT_X_URL` and
`NEXT_PUBLIC_VLADCAT_TELEGRAM_URL` in `.env.local`, then restart/rebuild, to publish
the real community details. Blank values show coming-soon text. CA has a copy
button when configured. Incentives/buybacks are described as plans; this UI
does not execute payments, purchases or buybacks. Rankings remain all-time.
Current Supabase login/progress and score-security behavior is documented in
`supabase/SETUP.md`; older migration notes below describe the original implementation.

Page verification is saved in `artifacts/pages-ui-results.json`: navigation,
wider Play canvas, dedicated tables, mobile toggles, landscape handling and
mobile routes passed without browser errors. The profile live checks also
verify quit-to-leaderboard navigation using a disposable account that is removed
with its runs after the check.

VLADCAT is the playable catguy, inspired by the supplied brown-haired character with lime cat ears, a goatee and a shoulder sash. The rebrand includes the website, favicon, game title, all player and clone animations, key artwork, three story screens, hints and completion message. Generated hero art and the original generated sprite sheet are in `public/vladcat/`; the packaged 32px atlas and title/story assets are in `public/game/images/`. See [artwork prompts](public/vladcat/ARTWORK.md). `tools/prepare-vladcat.mjs` packages the selected generated images into engine-compatible assets. Animation names, origins, collision shapes and stage geometry are preserved.

Existing database table names, timing bridge names and local draft keys retain their original internal identifiers so saved scores, drafts and run handling remain compatible.

**The Story:** New Game opens two generated comic slides with four panels each. VLADCAT must escape the Void Ruins to save CLANK WORLD. Desktop shows each full page; phones stack its four panels for readable dialogue. Previous/Next controls and a text transcript accompany the art. The final slide starts stage 1 in practice mode; ranked runs retain their direct stage-1 start. The original engine also has exactly two story frames.

**Victory:** Stage 50 shows the new CLANK WORLD victory image, a thank-you addressed to the entered X handle, and the requested sharing/reward message. Share on X opens a prefilled post composer with the game name and completed time; it includes the game URL on public HTTPS hosts. It does not automatically post, verify shares, or distribute rewards. Completed ranked scores still submit normally and their status appears below the game. The native engine ending also includes the image and personalized sprite-font text. Rebuild comic/ending assets with `node tools/prepare-vladcat-story.mjs`; prompts are saved in [STORY-PROMPTS.md](public/vladcat/STORY-PROMPTS.md).

**Migration scope:** Next.js owns the application, navigation, editor, source loading, and saves. Construct still handles rendering, collisions, animations, and its original event engine inside an isolated game frame. This preserves every puzzle, menu, story scene, touch control, and audio cue. This is not a native React/Canvas rewrite of the engine; the original `.c3p` authoring project was not included in this folder.

## Run locally

Use Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

- Game: http://127.0.0.1:3000
- Editor: http://127.0.0.1:3000/editor

## Timed runs and leaderboard

Each stage has a live timer, plus a total clock. A genuine exit records its split before the exit animation and starts the next stage at zero. Deaths and in-game retries keep the current stage's accumulated time. App pauses, in-game pauses, hidden tabs, loading, menu screens and exit fades are excluded. Stage 48's return-to-menu puzzle can resume the same stage without losing its time.

Enter an X handle and select **Start ranked run** to begin from stage 1. A complete sequential run submits automatically. Using the stage picker, skipping a puzzle, editor playtesting, or continuing an old game without a new ranked run cannot submit a score. The outer restart button starts a fresh ranked run from stage 1; the original in-game retry keeps the current timer. Ranked timing is held for the current page session; refreshing closes that attempt, so start a new ranked run after a reload.

The original export's `Level_49` is the final back-button scene and `Level_50` is the congratulations screen. There are **49 timed stage splits**; entering the congratulations screen finishes the run without adding a 50th waiting time. The server calculates the total from the ordered splits, ranks ascending, uses completion date and run ID for deterministic ties, and treats repeat submissions of a run ID as one entry. The table includes stage-by-stage times and refreshes every 15 seconds.

### X handles and ending a challenge

The outer field is **Enter X handle**, with a reward reminder available on the question-mark button by hover or keyboard focus. Handles use 1–15 letters, digits or underscores and are stored with a leading `@`. Format checking does not verify account ownership or implement reward payments. The original Construct menu's `TextInput` instance and its name-related event actions have been removed; the bridge supplies the outer handle for the game's congratulation text.

The final toolbar control is **☠ End challenge**, available during an unfinished ranked run. Clicking it freezes the game and clock, opens the taunt modal, and saves the handle, completed-stage count, stage reached and total time to **List of shames**. The modal's final line is “GAAAAAME OVER!”. The player can then view the list and start a fresh challenge. Saving failures expose a retry button; the game stays ended. Practice sessions and editor playtests cannot create shame entries. Only explicit clicks on End challenge are recorded; closing a browser tab or refreshing does not automatically record a quit.

Shame entries use the same server storage as successful scores, with separate views. Old database score records retain the default completed outcome. The schema adds `outcome`, `stage` and `stage_ms` columns on startup, so the database user also needs ALTER permission for this upgrade. Run IDs are unique across both outcomes: repeated quit submissions do not duplicate entries, and an ended challenge cannot subsequently appear in the winners' leaderboard. The online database connection requirements below apply to both lists.

### Shared online storage

In local development, scores persist in `.data/leaderboard.json` and are shared by browsers connected to this Next server. There are no sample scores. Development also creates a signing key in `.data/leaderboard-secret`. These files are ignored by Git.

Production uses PostgreSQL for durable rankings shared across players, deployments and server instances. Copy `.env.example` to `.env.local` for local database testing, or set these server-side environment variables on your hosting provider:

```text
DATABASE_URL=postgresql://…
LEADERBOARD_SECRET=<a stable random secret of at least 32 characters>
```

Use the connection string and TLS settings supplied by your database provider. The database user needs permission to create the `ecodroids_scores` table on the first request; subsequent requests insert/read scores. The implementation uses parameterized queries and a small connection pool. See the [node-postgres query documentation](https://node-postgres.com/features/queries) and [pool documentation](https://node-postgres.com/features/pooling).

Production deliberately shows a setup error instead of writing scores to a temporary server filesystem when these settings are missing. No hosted database or public deployment is provisioned by this code change. Tickets are signed, expire after 24 hours, and validate names, ordered splits and elapsed duration. Gameplay time is still reported by the browser: this is a casual leaderboard, not server-verified anti-cheat for prize competitions. Changing scoring rules should also change `RULESET` in `src/game/leaderboard-rules.mjs` to keep incompatible records separate.

Timer logic lives in `public/game/run-timer.js`. Expression 138 in `src/game/expressions.js` binds the live Level variable so Construct evaluates the timing hook at the actual exit, rather than precomputing it as a constant. The normal exit rule (line 148) and stage-49 back-button rule (line 168) use this expression; the skip rule does not. The original engine still receives the constant increment value of 1.

For production:

```sh
npm run build
npm start
```

This project needs a Next.js Node server for the game-data routes. It is not configured for `output: "export"`. Production includes a bundled snapshot of the source, so editable files do not need to be read from a deployed filesystem.

## Edit visually

1. Choose a level in the editor. Menu and story scenes are also available.
2. Select a layer and object. Drag the object or enter its position and size in the inspector. The visible player and collision body move together.
3. Select **Tiles** to paint or erase the tilemap. Grid and snap can be toggled independently. Undo and redo retain the most recent 50 edits.
4. Select the **Text** layer and its `UITip` object to edit the hint. Select `player base` to tune speed, acceleration, jump strength, gravity, and fall speed.
5. **Playtest** runs a snapshot of the current draft without requiring a save. Return to editing and launch again to test further changes.
6. **Save source** writes the selected scene back to its JSON file. This works only with the local development server. **Download JSON** and **Import JSON** work for sharing or keeping edited layouts in production.

Drafts are stored in this browser when local storage is available, and are restored when returning to a level. Use Save source or Download JSON for a durable copy. Reset to source restores the last saved file, and is undoable. In production, game navigation retains the bundled source until the next build; editor playtests use their current draft.

The editor's static canvas shows starting positions and approximates text, tiled-background stretching, and special visual effects. The live game frame uses the original rendering and all original rules. Core objects cannot be deleted through the editor; keys, traps, and other objects can be added or removed.

## Edit source directly

| What to change | Source |
| --- | --- |
| Individual levels | `src/game/layouts/level-01.json` through `level-50.json` |
| Main menu / story | `src/game/layouts/menu.json`, `scene.json` |
| Sprites, frames, animation speeds, asset paths | `src/game/objects.json` |
| Movement, traps, level-specific puzzles, progression | `src/game/events/esLevels.json` |
| Menu, name input, continue/new game | `src/game/events/esMenu.json` |
| Music and sound settings | `src/game/events/esAudio.json` |
| Story scene logic | `src/game/events/esScene.json` |
| Shared constants and computed expressions | `src/game/expressions.js` |
| Application screens | `src/components/` and `src/app/` |
| Interface styling | `src/app/globals.css` |
| Images and audio | `public/game/images/`, `public/game/media/` |

### Level data

Each scene has named `layers`. Each instance has `type`, `id`, `x`, `y`, `width`, `height`, `angle` (radians), `properties`, named `variables`, and named `behaviors`. Tilemaps have a two-dimensional `tiles` array; `-1` is empty. Coordinates use the original 384 × 216 game space. Origins define the point the coordinates refer to; preserve these when moving objects.

For example, the player collision body's `behaviors.Platform` array contains:

```text
[maxSpeed, acceleration, deceleration, jumpStrength, gravity, maxFallSpeed, ...]
```

Instance IDs are used by the engine. Preserve existing IDs; the editor allocates new ones when adding objects. Keep the `engine` fields: they preserve collision polygons, family behavior slots, IDs, rendering metadata, and other original export details that aren't exposed as editable controls.

### Artwork

`objects.json` contains named objects, textures, animations, and frames. A frame exposes `asset`, crop `x`/`y`/`width`/`height`, origins, and duration. An animation exposes `name`, `speed`, and `loop`. Place replacement assets in `public/game/images/` and use paths such as `images/my-robot.webp` in the definition. Keep asset dimensions and collision shapes compatible, or update their metadata deliberately.

### Event rules and expressions

Events have named objects and methods rather than numbered object references. Groups, functions, actions, conditions, and child events retain their original order. For example, an action on `spr_player_base` can use `C3.Behaviors.Platform.Acts.SetMaxSpeed` with behavior `Platform`.

The `parameters` arrays retain Construct's operand encoding. Numeric, string, and general expression parameters (`0`, `1`, and `7`) start with an expression-table index inside their second entry. For example, `[7, [3]]` uses **expression 3**, which returns `1`. Expressions with arguments include their operand nodes after that index. Other parameter kinds include object references, flags, layer references, and variables; preserve their encoding when making changes.

`expressions.js` is ordinary JavaScript, with each exported function labeled by its index. Change an existing constant or calculation there, or append a new expression and reference its index in the event parameters. Do not reorder existing entries: many events refer to the same constants. Editing a shared expression changes all its uses. To change only one event, append a new expression and update that event's reference.

Changes to layout, object, or event JSON are read from disk in development each time a game or playtest is launched. Reload the editor page after direct source changes to update its inspector data. For expression JavaScript changes, run `npm run game:build` and relaunch the game frame. Source saves never touch the original backup.

## Validate

```sh
npm test
npm run typecheck
npm run build
```

Migration tests verify that the original scenes, objects, family behaviors, and event sheets round-trip without changes, independently of edits to authored levels; that the stage 5 drag repair reaches the runtime; that position, physics, tile and sprite edits propagate; that preview starts initialize the correct level; that malformed layouts are rejected; and that audio filename casing is portable to Linux hosting.

Stage 5 repair: the exported robot had its DragDrop behavior disabled despite the hint asking you to drag it to the door. Its `behaviors.DragDrop` enabled flag is now `true` in `level-05.json`. The stage-specific door collision rule in `esLevels.json` now checks the robot instead of the e-waste, allowing the robot to unlock the door and advance. The existing drag-start/drop rules suspend and resume platform physics. Other stages retain their original drag settings.

`tools/build-game.mjs` creates the production snapshot and copies the editable expression table into the runtime. `tools/extract-game.mjs` documents the one-time import process. Do not rerun extraction on an edited project: it regenerates source from the original export.

The old offline service worker is intentionally not registered by the Next.js app, so an old game cache cannot hide source edits. LocalStorage progress remains managed by the original game. Browser-origin changes create separate saves, as with the original export.
