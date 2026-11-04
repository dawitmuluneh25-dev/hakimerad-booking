# CI/CD and deployment

Two GitHub Actions workflows back this repository:

| Workflow | File                           | Triggers                                | What it does                                                                                                                                           |
| -------- | ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CI       | `.github/workflows/ci.yml`     | push to `main`, pull requests to `main` | Installs from the frozen lockfile, `typecheck`, `lint`, `test`, builds `dist/`, boots the build and smoke tests every public route, uploads the build. |
| Deploy   | `.github/workflows/deploy.yml` | CI success on `main`, manual dispatch   | Re-builds the tested commit, smoke tests it, stages a release bundle, then (only when enabled) deploys over SSH and smoke tests the live URL.          |

Both run on Node 22 (`.nvmrc`) with pnpm from `packageManager` in
`package.json`, and need **no repository secrets** — the test suite runs on
in-memory SQLite and the build reads no environment variables.

The smoke test is the deployment check: it starts the real production build and
asserts that `/`, `/contact`, `/procedures/biopsy-fnac`, `/how-it-works`,
`/referrers`, `/privacy`, `/booking-policy`, `/offline`,
`/manifest.webmanifest` and `/favicon.svg` answer `200` server-side, with the
published email, phone number and location code present in the contact page.
Run it against a local build with:

```bash
pnpm build
pnpm preview --host 127.0.0.1 --port 4173 &
pnpm smoke http://127.0.0.1:4173
```

## Repository settings that need a human

These cannot be set through the API surface available to an agent; do them once
in the GitHub UI:

1. **Visibility** — the repository holds client contact details and a clinical
   workflow, so keep it private.
2. **Branch protection on `main`** — require a pull request before merging,
   require the status checks `Typecheck, lint and test` and
   `Build and smoke test`, and disallow force pushes.
3. **Actions → General** — keep the default token permissions read-only; the
   workflows already declare `permissions: contents: read`.
4. **Environments** — create `production` under Settings → Environments and add
   required reviewers if a human should approve releases.

## Enabling the deploy job

The deploy job is inert until `DEPLOY_ENABLED` is `true`. Add these under
Settings → Secrets and variables → Actions.

| Kind     | Name                 | Example / notes                                               |
| -------- | -------------------- | ------------------------------------------------------------- |
| Variable | `DEPLOY_ENABLED`     | `true` — anything else keeps the job skipped                  |
| Variable | `DEPLOY_HOST`        | `booking.example.org`                                         |
| Variable | `DEPLOY_USER`        | `deploy`                                                      |
| Variable | `DEPLOY_PATH`        | `/srv/hakimerad-booking` (must be writable by `DEPLOY_USER`)  |
| Variable | `DEPLOY_RESTART_CMD` | `sudo systemctl restart hakimerad-booking`                    |
| Variable | `DEPLOY_URL`         | `https://booking.example.org` — smoke tested after release    |
| Secret   | `DEPLOY_SSH_KEY`     | Private key (ed25519) allowed to log in as `DEPLOY_USER`      |
| Secret   | `DEPLOY_KNOWN_HOSTS` | Optional; without it the job trusts the host key on first use |

The release bundle is `dist/` plus `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, `.nvmrc` and `scripts/`, rsynced with `--delete`.
Dependencies are installed on the host, so the host needs Node 22.5+, pnpm 12
(`corepack enable`) and network access to the npm registry.

## Host prerequisites

1. **Persistent data.** `data/app.db` and `data/uploads` hold every request and
   document. Put them on persistent storage and back them up; a release never
   deletes them because they live outside the release directory. Point the app
   at them explicitly:

   ```ini
   DATABASE_PATH=/var/lib/hakimerad/app.db
   DATA_DIR=/var/lib/hakimerad
   ```

2. **Process.** One long-lived Node process. A systemd unit that fits the
   current build:

   ```ini
   [Unit]
   Description=HakimeRAD IR Booking
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/srv/hakimerad-booking
   EnvironmentFile=/etc/hakimerad/booking.env
   ExecStart=/usr/bin/pnpm preview --host 127.0.0.1 --port 3000 --strictPort
   Restart=always
   RestartSec=5
   User=deploy

   [Install]
   WantedBy=multi-user.target
   ```

   Run exactly **one** instance: SQLite allows a single writer and uploads are
   local files, so a second replica would diverge.

3. **TLS proxy.** Terminate TLS in nginx/Caddy and forward to
   `127.0.0.1:3000`. Set `AUTH_REDIRECT_URI` to the public callback and register
   it with the identity provider.

4. **Production environment file** (`/etc/hakimerad/booking.env`, mode `0600`):

   | Variable             | Required | Notes                                                                             |
   | -------------------- | -------- | --------------------------------------------------------------------------------- |
   | `NODE_ENV`           | yes      | `production` — also disables `/auth/dev-login` (404)                              |
   | `AUTH_ISSUER_URL`    | yes      | `{issuer}/.well-known/openid-configuration` must resolve                          |
   | `AUTH_CLIENT_ID`     | yes      | OAuth client id                                                                   |
   | `AUTH_COOKIE_SECRET` | yes      | ≥32 random characters; the app refuses to start authenticated sessions without it |
   | `AUTH_CLIENT_SECRET` | no       | Confidential clients only                                                         |
   | `AUTH_REDIRECT_URI`  | yes      | `https://<host>/auth/callback` behind a proxy                                     |
   | `AUTH_SCOPE`         | no       | Defaults to `openid profile email`                                                |
   | `DATABASE_PATH`      | yes      | Absolute path on persistent storage                                               |
   | `DATA_DIR`           | yes      | Absolute path; uploads go to `uploads/`                                           |
   | `AUTH_DEV_LOGIN`     | no       | Never set in production                                                           |

## Known limitations of this deployment

- **Email, SMS and WhatsApp are not connected.** `deliver()` writes email as an
  `.eml` file into `DATA_DIR/outbox` and logs SMS/WhatsApp locally; every
  external channel defaults to `enabled: false` in the notification settings.
  Patients are not actually notified until a provider adapter is implemented
  and credentials are added.
- **No scheduler.** Nothing runs `appointment_reminder` or other timed jobs, so
  reminders never fire regardless of settings.
- **`vite preview` is a preview server.** It serves the built app correctly but
  is not a hardened production server (no clustering, no graceful reload). Adding
  a production Node adapter is a separate change; until then keep one instance
  behind the proxy and restart it on release.
- **Rollback** — redeploy an earlier `production-build` artifact, or revert the
  commit on `main`; the database is untouched by either.
