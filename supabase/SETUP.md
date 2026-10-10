# VLADCAT cloud setup

The game is connected to project `gtqripybryylnkgcfmzt`. The public URL,
publishable key, and server secret are configured in the ignored `.env.local`.
On October 10, 2026, the hosted table and server-only function were verified,
the game was restarted, and live authentication, saved-stage resume, database
permissions, and the complete leaderboard protocol passed verification.
Email signup returns a session immediately, without confirmation. The two
temporary QA accounts and all their runs were removed after verification.

## Current project

Open the game at `http://127.0.0.1:3000`, choose **Create an account**, enter your
email and password, then enter your active X handle and start a ranked challenge.
Completed stages and accumulated stage time save automatically. Refresh and
choose **Resume challenge** to continue from the beginning of your saved stage.

## Setup reference for another deployment

1. Open [this project's SQL editor](https://supabase.com/dashboard/project/gtqripybryylnkgcfmzt/sql/new).
   Paste `migrations/202610100001_vladcat.sql` and run it. It creates only
   VLADCAT's table, indexes, policy, and server-only function. It does not alter
   unrelated project tables or existing local scores.
2. Public auth settings were checked on October 10, 2026: email login and
   signup are enabled, and `mailer_autoconfirm` is already true. No email
   confirmation is currently required. If settings change later, verify
   **Authentication → Sign In / Providers → Email → Confirm email** is off.
3. `SUPABASE_SECRET_KEY` is configured and verified in `.env.local`.
   Restart Next.js after changing environment variables. Keep the key out of chat,
   browser code, and any `NEXT_PUBLIC_` variable. Configure the same three
   variables in your deployment environment when deploying.
4. Create a player account through the game, start a ranked challenge, finish
   a stage, refresh, and choose **Resume challenge**. Check that its handle and
   completed stage times return. Finish the challenge or use the skull button
   to check the public leaderboard/list of shames.

## Security and timing

- Login uses Supabase email/password auth. The server verifies the user through
  `auth.getUser()` on every protected request. Auth tokens stay in HttpOnly,
  same-site cookies; the game receives only an opaque run token.
- Anonymous users have no access to the run table. Logged-in users can read
  only their own progress. Neither role has INSERT, UPDATE, DELETE, or RPC
  execution privileges. Public boards come from a server API that exposes
  handles and times, never emails or account IDs.
- The server-only RPC serializes run changes, verifies ownership/session and
  stage order, and calculates times from Postgres timestamps. Client-supplied
  totals and splits are ignored. Completed/abandoned runs cannot be reopened
  or overwritten through game APIs. Retried checkpoints add no duplicate split.
- Each completed stage is saved; the current stage clock is saved every four
  seconds. Resume reloads the beginning of the saved stage, retaining its
  accumulated time and completed splits. Failed attempts count. Pauses, menu
  puzzles, and loading do not run the stage clock. Unexpected disconnects can
  count up to 12 seconds after the last successful heartbeat; longer offline
  time is excluded. Network transit can slightly affect server-measured time.
- Resuming rotates the run token so an old tab cannot keep submitting changes.
  A failed sync pauses the game and offers to reload the server's saved stage.
- This protects database rows and rejects browser-edited timer values. It does
  **not** prove that a player solved a puzzle: a determined attacker can imitate
  stage-completion requests. Competitive rewards requiring strong anti-cheat
  need server-side gameplay validation or review of replay evidence.
- Disabling email confirmation means players can register an email address
  they do not own. This setting does not verify their X handle either.

## Validation

After login, the game asks for an active X handle and EVM wallet in a modal.
Players can close it and practice. The challenge button requires both details;
saving details alone does not start a challenge. There is no practice stage picker.
Details can be edited below the account email and persist across logins.
The authenticated `/api/profile` endpoint validates and saves the profile in
server-managed Auth `app_metadata.vladcat_profile`; no additional SQL migration
is needed. Start/resume re-check fresh account data, and new runs take their
handle from the saved profile instead of a browser-supplied name. Public boards
exclude wallet addresses. Address format/checksum validation does not prove
wallet ownership or verify an X account. Existing run handles remain unchanged.

`npm test` includes isolated Postgres tests of the actual migration: anonymous
and player write denial, ownership/read isolation, private RPC privileges,
server times, sequential checkpoints, replay idempotency, lease expiry,
session takeover, completion/abandonment finality, and ascending rankings.
These tests do not change your hosted Supabase database.

Profile flow results are in `../artifacts/profile-live-results.json`: login modal,
practice dismissal, missing-profile and metadata-spoof rejection, wallet validation,
same-origin enforcement, persistent details, challenge start/resume, caller-handle
override prevention, paused modal timing and mobile layout. All six checks passed,
with no browser errors; the disposable account and its runs were removed.

Live results are saved in `../artifacts/supabase-live-results.json`. Verification
covered immediate email signup, actual game login/logout and HttpOnly cookies,
the iframe checkpoint, refresh/resume, pause timing, direct write denial and
cross-player isolation, stale-session rejection, quit/shame persistence, and
49 ordered server checkpoints with immutable final timing and ascending ranks.
The full checkpoint sequence tests the server protocol; it does not demonstrate
solving all 49 puzzles. No browser JavaScript errors occurred. The server key
was also checked against 60 generated browser artifacts and was not exposed.

Reference: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[password authentication](https://supabase.com/docs/guides/auth/passwords),
[server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
