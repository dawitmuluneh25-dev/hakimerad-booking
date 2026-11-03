# HakimeRAD IR Booking

Installable web app for **HakimeRAD Radiologic Consultancy**: interventional
radiology referrals, clinical review, scheduling and procedure management for
three pathways (image-guided biopsy/FNAC `BX`, image-guided abscess drainage
`DR`, hydrostatic intussusception reduction as urgent coordination only).

An IR referral request is **not** an appointment: only a clinician approves, and
scheduling happens after approval.

Product rules, architecture notes and the remaining milestone plan live in
[docs/PROJECT-HANDOFF.md](docs/PROJECT-HANDOFF.md), which still describes the
original hosted backend. The current stack is fully self-contained (see below);
apply its product rules, not its infrastructure choices.

## Stack

| Layer      | Choice                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| UI         | React 19, TanStack Start (SSR) + TanStack Router, Tailwind CSS v4       |
| Components | shadcn on Base UI (`render` prop, never `asChild`), lucide icons        |
| Server     | TanStack server functions (`createServerFn`) over Node                  |
| Data       | SQLite through the built-in `node:sqlite` module, files on local disk   |
| Auth       | OIDC authorization code + PKCE (`openid-client`), encrypted cookie       |
| Build      | Plain Vite 8 with `@tanstack/react-start/plugin/vite`                   |
| Tests      | Vitest, in-memory SQLite per test                                      |

There is no hosted backend, no proprietary platform package, no database server
and no deploy CLI. Everything the app needs is installed by `pnpm install` and
runs on Node 22.

## Requirements

- Node.js 22.5+ (verified on v22.23.2; `node:sqlite` is built in)
- pnpm 12 (verified on 12.16.1)

## Setup

```bash
pnpm install
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
pnpm dev                     # http://localhost:5173
```

The database (`data/app.db`) and upload directory (`data/uploads`) are created
on first request. Delete `data/` to start from an empty install.

Sign-in needs an OIDC client; without one the public site still works and
`/auth/sign-in` returns 503 with a clear message. Configure:

| Variable               | Required | Notes                                                        |
| ---------------------- | -------- | ------------------------------------------------------------ |
| `AUTH_ISSUER_URL`      | for auth | `{issuer}/.well-known/openid-configuration` must resolve      |
| `AUTH_CLIENT_ID`       | for auth | OAuth client id                                              |
| `AUTH_COOKIE_SECRET`   | for auth | ≥32 random characters; encrypts the session cookie           |
| `AUTH_CLIENT_SECRET`   | no       | Confidential clients only                                    |
| `AUTH_REDIRECT_URI`    | no       | Defaults to the request origin; set behind a TLS proxy        |
| `AUTH_SCOPE`           | no       | Defaults to `openid profile email`                           |
| `DATABASE_PATH`        | no       | Defaults to `./data/app.db`                                  |
| `DATA_DIR`             | no       | Defaults to `./data` (uploads live in `uploads/`)             |

Register `http://localhost:5173/auth/callback` as an allowed redirect URI in the
provider.

## Scripts

| Command                | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `pnpm dev`             | Vite dev server on :5173                                            |
| `pnpm build`           | Production build into `dist/` (Node SSR bundle + client assets)     |
| `pnpm preview`         | Serve the production build                                          |
| `pnpm test`            | Vitest: server-side workflow tests over in-memory SQLite            |
| `pnpm typecheck`       | Regenerate the route tree, then `tsc --noEmit`                      |
| `pnpm lint`            | ESLint, zero warnings allowed                                       |
| `pnpm generate-routes` | Regenerate `src/routeTree.generated.ts` after adding a route file   |
| `pnpm prettier-check` / `pnpm prettier-fix` | Formatting check / rewrite                     |

## How the pieces fit

```
src/server/
  db.ts            SQLite connection, schema, row helpers
  context.ts       request context, permission helpers, audit log
  auth.ts          OIDC sign-in/callback/sign-out, sealed session cookie
  storage.ts       private uploads on disk + metadata rows
  services/        business rules (users, referrals, admin, reviews, urgent,
                   scheduling, care, notifications, reports) — unit-tested
  api.ts           server functions the UI calls
  runtime.ts       request-scoped wiring (lazy, server-only)
src/lib/api.ts     typed client handles + useQuery/useMutation/usePaginatedQuery
src/routes/        file routes; /api/upload and /api/files/$id serve documents
src/shared/        pure constants shared by server and UI
```

- Permissions are enforced in `services/`, never in the UI. Every state change
  writes an `audit_logs` row.
- Read helpers return `null`/empty pages for anonymous callers so SSR is safe;
  mutations throw an `AppError` with a user-facing message.
- Documents are private: `/api/files/$id` checks the session, the uploader, the
  request owner, or a staff role before streaming bytes.
- Nested form data (patient, clinical, imaging) is stored as JSON columns to
  keep the domain shape close to the UI; lists use indexed columns.

## Conventions

- No clinical rules in code (fasting, medication, durations) — they are data.
- Calendar dates are `YYYY-MM-DD`; timestamps are ISO UTC strings. Appointment
  times are clinic wall-clock (`YYYY-MM-DDTHH:MM`) so hours and conflicts
  compare without time-zone conversion.
- Status changes go through ONE transition table (`src/shared/workflow.ts`).
- `src/routeTree.gen.ts` is generated; never hand-edit it.

## Tests

`pnpm test` runs everything in a hermetic in-memory database:

- `src/server/services/accounts.test.ts` — onboarding, first admin, physician
  verification, role management.
- `src/server/services/referrals.test.ts` — submission, guardian rules, document
  validation, privacy, withdrawal.
- `src/server/services/workflow.test.ts` — clinical review permissions and
  checklist gating, information requests, booking conflicts and closing-time
  limits, cancellation, urgent-case sequencing, preparation permissions, reports.

## Screens

Public: `/`, `/procedures/*`, `/how-it-works`, `/referrers`, `/request`,
`/contact`, `/privacy`, `/booking-policy`, `/offline`.

Signed in: `/dashboard`, `/requests`, `/requests/$reference`, `/account`,
`/notifications`.

Staff: `/staff/queue`, `/staff/review/$reference`, `/schedule`, `/urgent`,
`/urgent/new`, `/urgent/$reference`.

Admin: `/admin/reports`, `/admin/audit`, `/admin/settings`, `/admin/resources`,
`/admin/institutions`, `/admin/physicians`, `/admin/users`.

## Installable app

`public/manifest.webmanifest` + `public/sw.js` + `/offline` make the app
installable. Only the offline page and static assets are cached; signed-in HTML,
`/api/*` and every private route stay out of the cache. Icons are generated by
`node scripts/generate-icons.mjs` with no image dependency. Submissions are
blocked while the browser reports no connection.

Add a test for every permission rule, status transition and booking-conflict
rule you introduce.
