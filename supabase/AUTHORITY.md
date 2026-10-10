# Trusted challenge gameplay

Challenges now run the original Construct engine in an isolated server Chromium
context. The browser displays JPEG frames and sends bounded keyboard/pointer
controls. Practice and editor previews still run locally. All 49 stages share
the original puzzle rules, collision engine, and exit conditions; no second,
approximate implementation of the puzzles is trusted.

## Deployment

The [Hostinger VPS guide](../deploy/HOSTINGER.md) provides a Docker configuration
with non-root Chromium, its sandbox profile, HTTPS and unbuffered streams. That
configuration defaults to one active challenge for initial KVM 1 testing. Run
the container build and browser check on the actual VPS before launch.

Use a persistent Node server with Chromium. Ordinary short-lived serverless
functions cannot host these sessions. On Linux install the browser and libraries
with `npx playwright install --with-deps chromium`. Run Node as a non-root user
with Chromium sandbox support. Do not disable the Chromium sandbox. On Windows,
the default uses installed Chrome. `VLADCAT_CHROMIUM_PATH` can select an installed
browser executable. Package `src/game/authority/bootstrap.js` and `public/` with
the deployment. Build once, then use `npm start`.

SSE must pass through the reverse proxy without buffering and with an appropriate
long-lived connection timeout. Game and input routes must reach the same Node
instance (sticky routing). Start with `VLADCAT_MAX_SESSIONS=4` and load-test before
raising it. Each active challenge has a browser context; this is more costly and
adds more network latency than the previous client-only game. Sound events and
music/mute controls are mirrored from the engine to local audio playback.
Mobile movement uses the page's touch buttons; dragging uses touch
on the game screen. A dedicated shared physics engine with client prediction is
a future optimization if streaming latency/cost is unacceptable at scale.

Server signing uses `VLADCAT_VERIFICATION_KEY` if provided, otherwise a
purpose-separated key derived from `SUPABASE_SECRET_KEY`. Never publish either.
Keep the signing key stable across deploys; changing it makes previous receipts
unverifiable. Configure a dedicated verification key before rotating Supabase's
secret. No additional database migration is required: private verification
receipts are stored in the existing splits JSON. They are excluded from game API
responses and public boards. Owners can still read their own raw rows under the
existing RLS policy; knowing a signature does not let them mint or reuse it.

## Enforcement

- The public run API rejects checkpoint/play/heartbeat claims. The monotonic
  stopwatch runs inside the trusted server engine. Pause/loading/fades stop it;
  database transit and screenshot work cannot change its durations. Progress
  saves about once a second and each receipt/advance commits in one conditional
  update bound to owner, token and current stage. Disconnect can lose the latest
  unsaved fraction of the current stage; completed splits commit immediately.
- Control packets use Supabase signature/expiry-verified claims bound to the
  existing user's session. Start/resume/profile/stream verify the user with Auth.
  Revoked JWTs can remain valid until their expiry; deleting an account also
  removes its run and invalidates the engine's next conditional save.
- No player-supplied scripts, positions, game variables, layouts, stage claims,
  URLs, or time values enter the server engine. Inputs are validated and ordered.
- The engine can load only fixed bundled assets through intercepted requests.
  It has no actual network access, Supabase credentials, account cookies, or
  editor overrides. Each context has its own storage and game state.
- Only the engine's genuine exit hook can cause a checkpoint. The server signs
  the engine's measured duration in a receipt bound to account, run, stage, time,
  and the rules snapshot. All 49 receipts are required for verified rankings.
- Old completed runs remain available as unverified scores and are excluded from
  automatic reward eligibility. Resuming an old partial run preserves progress,
  but earlier unverified stages cannot qualify it; start a new challenge.
- Pausing also pauses simulation. Six seconds without controls freezes gameplay;
  after 90 seconds the context is removed. Refresh/restart/server failover resumes
  at the saved stage's beginning, retaining accumulated time, with a new token.
- Row-level security and service-only mutation remain in force. If an engine,
  token, database write, receipt, or stream fails, it does not fall back to trusting
  the player's game. Saved progress can be resumed.

This prevents unsolved completion claims and client physics/timer edits. It does
not prove that a human played: legitimate input bots, account farms, engine logic
bugs, compromised server credentials, and X/wallet ownership need separate
controls. Rewards still require eligibility/ownership review. No payouts are
automated by this change.

## Verification

`npm test` covers protocol injection, signed proof forgery/reuse, stage order,
duplicate inputs, disconnects, clock/simulation pause, and fail-closed transitions.
`npm run verify:authority` exercises the real isolated engine and live app with
disposable QA accounts. Accounts and runs are removed afterwards. Full-stage
loading is smoke coverage, not proof of manually solving every puzzle.
