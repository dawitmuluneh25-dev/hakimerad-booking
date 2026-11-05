# Deployment

## Topology (decided)

| Role | Where |
| --- | --- |
| Production | Hostinger Linux VPS — this app behind nginx, SQLite on local disk |
| Staging | This Windows machine |
| DNS and email | Yegara (`hakimerad.com`) |
| Identity | Auth0, Japan region — see `docs/IDENTITY.md` |

One application process per environment. SQLite allows a single writer and the rate limiter counts in memory, so a second process is not a second worker, it is a second set of bugs.

## First install on the VPS

```bash
# 1. Service account and directories
sudo adduser --system --group --home /var/www/hakimerad hakimerad
sudo mkdir -p /var/lib/hakimerad /etc/hakimerad
sudo chown -R hakimerad:hakimerad /var/www/hakimerad /var/lib/hakimerad

# 2. Node 22 and pnpm
#    Node 22 is required (>= 22.5); install from nodesource or nvm for the
#    service user, then confirm `node -v` and `pnpm -v` as hakimerad.

# 3. Code
sudo -u hakimerad git clone <repository> /var/www/hakimerad
sudo -u hakimerad pnpm install --frozen-lockfile
sudo -u hakimerad pnpm build
```

## Environment file

`/etc/hakimerad/env`, owned by root, mode `0600`, read by the service only.

```ini
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

DATABASE_PATH=/var/lib/hakimerad/app.db
DATA_DIR=/var/lib/hakimerad

AUTH_ISSUER_URL=https://<tenant>.jp.auth0.com
AUTH_CLIENT_ID=<client id>
AUTH_CLIENT_SECRET=<client secret>
AUTH_REDIRECT_URI=https://<host>/auth/callback
AUTH_SCOPE=openid profile email
AUTH_COOKIE_SECRET=<fresh secret, see below>

VITE_SITE_URL=https://<host>
```

`AUTH_COOKIE_SECRET` must be **different in every environment** and at least 32 characters. Generate it on the server, never reuse the staging one, and never paste it into a chat, an issue or a commit:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

`AUTH_DEV_LOGIN` must be absent. The dev-login route returns 404 when `NODE_ENV=production`, but the variable should not exist at all.

## Install and start

```bash
sudo -u hakimerad pnpm migrate            # or pnpm migrate --check to gate a release
sudo install -m 0644 deploy/hakimerad.service /etc/systemd/system/hakimerad.service
sudo systemctl daemon-reload && sudo systemctl enable --now hakimerad

sudo install -m 0644 deploy/nginx-hakimerad.conf /etc/nginx/sites-available/booking.hakimerad.com
sudo ln -s /etc/nginx/sites-available/booking.hakimerad.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Both files carry placeholders for the hostname; neither has been run against a live nginx yet, so read them once before installing.

## Verify

```bash
curl -fsS https://<host>/api/health | jq        # status, database, storage, schema
pnpm smoke https://<host>                        # 14 checks over the real build
pnpm check-oidc https://<tenant>.jp.auth0.com    # provider matches what the app needs
```

Then follow the go-live order in `docs/PRE-LAUNCH-ROADMAP.md`: create only the first administrator's Auth0 account, have them claim the administrator role, and only then create anyone else.

## Staging on Windows

Same build, different environment file, different database and a different cookie secret. Run from a task that starts at boot, bound to loopback:

```powershell
pnpm build
pnpm preview --host 127.0.0.1 --port 3000 --strictPort
```

Do not point staging at the production database or the production Auth0 client: a staging sign-in that shares a client would let a staging session look like a production one.

## Rollback

Keep the previous release directory and a database copy before each deploy:

```bash
sqlite3 /var/lib/hakimerad/app.db ".backup '/var/backups/hakimerad-$(date +%F).db'"
```

Roll back by switching the release directory symlink (or `git checkout <tag>`), restoring the database only when a migration is involved, and restarting the unit. Migrations are forward-only: a rollback that crosses one needs the matching database copy.
