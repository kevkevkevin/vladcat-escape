# Hostinger VPS deployment

This setup runs one persistent Next.js/Chromium container behind Caddy HTTPS.
Supabase continues to store users, profiles, progress and signed scores. The
default is **one active challenge** for KVM 1 pilot testing; it is not a tested
capacity guarantee. Practice runs in the player's browser. Do not add app
replicas or PM2 cluster mode: active game sessions live in one Node process.

## Production validation — 2026-10-11

The production image was built and deployed on the Ubuntu Hostinger VPS for
`https://vladcat.tech`. The non-root Chromium sandbox/canvas check passed without
weakening host protections. HTTPS and HTTP-to-HTTPS redirection passed; the
private environment file is root-owned with mode 600, and app port 3000 has no
host binding. UFW allows TCP 22, 80 and 443.

Ten production QA checks passed with zero browser errors and temporary account
cleanup confirmed. They cover real engine solves in stages 5 and 49, stage-1
physics, login/streaming, rejected forged checkpoints and premature finishes,
pause/refresh/resume, a signed stage-5 receipt, mobile layout, abandonment,
provisional unsigned scores and the personalized ending. Final ranking/ending
integration uses a QA-only seeded prefix; this does **not** claim a human solve
of all 49 puzzles. The one-active-challenge limit remains for the initial pilot.

## Connect and prepare the VPS

In Hostinger, open **VPS → Manage → Overview** and find the IP and SSH connection
details. Connect using an SSH key, or enter the password privately when SSH asks
for it. Do not send passwords or private keys in chat. Hostinger's Web Console is
also available if SSH is not configured yet.

Check the selected Ubuntu version and Docker installation:

```sh
cat /etc/os-release
docker --version
docker compose version
```

If Docker is missing, finish installing Docker Manager through Hostinger before
continuing. Use a fresh Ubuntu VPS, not a server already serving another site on
ports 80/443. Check `sudo ss -ltnp` first; existing Traefik/nginx/Caddy needs to be
integrated rather than replaced or stopped blindly. Do not reinstall the VPS OS
to fix a deployment error: that erases server data.

Allow incoming TCP 80/443 in the Hostinger firewall and keep the configured SSH
port reachable. App port 3000 remains inside the Docker network. Choose a DNS
name (for example `play.your-domain.com`), set its A record to the VPS IPv4, and
remove a stale AAAA record unless IPv6 also points to this VPS. Use direct DNS
while testing; another proxy/CDN can buffer or limit the game stream.

## Deploy the repository

The VPS must receive the commit containing Dockerfile, compose.yaml and deploy/.
After that commit is pushed, clone the repository as your deployment user:

```sh
git clone https://github.com/kevkevkevin/vladcat-escape.git
cd vladcat-escape
cp deploy/production.env.example deploy/production.env
chmod 600 deploy/production.env
nano deploy/production.env
```

Set `VLADCAT_DOMAIN` to the DNS name only, without a scheme or path. Copy the
Supabase URL, public key and server secret from the existing private `.env.local`
into this private file. Copy the existing verification key **only if already
configured**. Otherwise leave `VLADCAT_VERIFICATION_KEY` blank and keep the same
Supabase secret: changing either signing configuration invalidates previous
receipts. Public community links and the OpenAI key are optional. This file is
Git-ignored and excluded from Docker build context. Keep a private backup of
these secrets, especially the signing key; GitHub does not contain them.

The public `NEXT_PUBLIC_*` values are passed into the build because Next.js
embeds them in browser assets. Server secrets are injected only when the
container starts. Never put a server secret in a Docker build argument or a
variable prefixed `NEXT_PUBLIC_`. Do not paste `docker compose config` output into
chat: it can show resolved environment secrets. Use `config --quiet` instead.

```sh
docker compose --env-file deploy/production.env config --quiet
docker compose --env-file deploy/production.env build
docker compose --env-file deploy/production.env run --rm --no-deps app node deploy/check-browser.mjs
docker compose --env-file deploy/production.env up -d
docker compose --env-file deploy/production.env ps
```

Chromium is installed from the exact Playwright version in package-lock.json,
including Linux system dependencies. Node runs as the non-root `node` user.
`seccomp_profile.json` is the published Playwright v1.58.2 policy, which permits
the namespace operations required by Chromium's sandbox. Its upstream source is
https://github.com/microsoft/playwright/blob/v1.58.2/utils/docker/seccomp_profile.json
and license is in PLAYWRIGHT-LICENSE. The app uses private 512 MB shared memory,
an init process and restart-on-reboot. Caddy keeps certificates in named volumes
and passes streamed frames without buffering.

If the browser check fails with a user namespace, seccomp or AppArmor error,
stop and inspect the specific host denial (`sudo journalctl -k`). Fix the
container's targeted sandbox policy/profile rather than disabling the Chromium
sandbox, AppArmor globally, or using a privileged container. The browser check
must pass on the actual VPS before challenges are made public.

Caddy will request a public certificate after the domain resolves to this server
and ports 80/443 are reachable. Production auth cookies require HTTPS; an HTTP
IP URL is not a complete login/challenge test. In Supabase Auth URL settings, set
the production Site URL and any required allowed redirect URLs to the game
domain; leave email confirmation set as intended. The current email/password
flow uses same-origin API routes.

## Verify before launch

Open the HTTPS domain and verify login, profile, practice, a real challenge
completion, stage 5 dragging, pause/refresh/resume, audio, mobile controls and
leaderboard updates. Confirm game frames arrive continuously through the proxy.
Keep the one-session limit until actual CPU/RAM/frame latency measurements
support raising it. The healthcheck only checks the website; the separate
browser check tests Chromium startup/assets, not all puzzles or Supabase.

```sh
docker stats --no-stream
docker compose --env-file deploy/production.env logs --tail 80 app proxy
```

Review logs privately before sharing: URLs can include active stream identifiers.
No container build or sandbox check has been run locally when Docker is not
installed. The VPS build and browser check are required deployment validation.

## Update and recover

Pull the intended new commit, then repeat the build and browser check before
`up -d`. Updates/restarts disconnect active challenges; players resume at their
saved stage with accumulated time. Schedule updates when no challenges are
active. Rebuild after changing public environment values; restart the app after
changing server-only values, while preserving the signing key.

Do not delete the private environment file or Caddy volumes during updates.
Back up the VPS configuration privately and handle Supabase backups separately.
Automatic container restarts recover crashes, not a deployment or database
outage. The previous commit can be rebuilt for rollback, keeping the same
environment/signing configuration.

References:
- https://www.hostinger.com/support/5723772-how-to-connect-to-your-vps-via-ssh-at-hostinger/
- https://playwright.dev/docs/docker
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
