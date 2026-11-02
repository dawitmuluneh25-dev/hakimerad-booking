# HakimeRAD IR Booking

Installable web app for **HakimeRAD Radiologic Consultancy**: interventional
radiology referrals, clinical review, scheduling and procedure management for
three pathways (image-guided biopsy/FNAC `BX`, image-guided abscess drainage
`DR`, hydrostatic intussusception reduction as urgent coordination only).

An IR referral request is **not** an appointment: only a clinician approves, and
scheduling happens after approval.

Product rules, architecture notes and the remaining milestone plan live in
[docs/PROJECT-HANDOFF.md](docs/PROJECT-HANDOFF.md). Read it before changing
behaviour.

## Stack

| Layer      | Choice                                                             |
| ---------- | ------------------------------------------------------------------ |
| UI         | React 19, TanStack Start (SSR) + TanStack Router, Tailwind CSS v4  |
| Components | shadcn on Base UI (`render` prop, never `asChild`), lucide icons   |
| Backend    | Convex (schema, queries, mutations in `convex/`)                   |
| Auth       | Hercules Auth (`@usehercules/auth-tanstack`, OIDC)                 |
| Build      | Vite 8 via `@usehercules/vite-tanstack`; Cloudflare Workers target |
| Tests      | Vitest: `convex-test` project + jsdom/Testing Library project      |

## Requirements

- Node.js 22 (verified on v22.23.2)
- pnpm 12 (verified on 12.16.1; `packageManager`-less repo, lockfile is `pnpm-lock.yaml`)

## Setup

```bash
pnpm install
```

Then create your local env file:

```bash
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
```

Fill in the values as described in [`.env.example`](.env.example):

| Variable                        | Where   | Required | Notes                                                     |
| ------------------------------- | ------- | -------- | --------------------------------------------------------- |
| `VITE_CONVEX_URL`               | browser | yes      | Deployment URL from `pnpm exec convex dev`                |
| `HERCULES_AUTH_ISSUER_URL`      | server  | yes      | OIDC issuer (`{issuer}/.well-known/openid-configuration`) |
| `HERCULES_AUTH_CLIENT_ID`       | server  | yes      | OAuth client id                                           |
| `HERCULES_AUTH_COOKIE_PASSWORD` | server  | yes      | ≥32 random chars; derive from bytes, not a passphrase     |
| `HERCULES_AUTH_CLIENT_SECRET`   | server  | no       | Confidential clients only                                 |
| `HERCULES_AUTH_REDIRECT_URI`    | server  | no       | Positioned proxies only; defaults to the request URL      |

`convex/auth.config.ts` reads its issuer/client id from the **deployment**
environment, not from `.env.local`:

```bash
pnpm exec convex env set HERCULES_OIDC_AUTHORITY <issuer URL>
pnpm exec convex env set HERCULES_OIDC_CLIENT_ID <client id>
```

Run the Convex dev process alongside Vite in a second terminal:

```bash
pnpm exec convex dev
pnpm dev            # http://localhost:5173
```

The public site renders without Convex or auth credentials; `/auth/sign-in` and
any signed-in screen need the values above.

## Scripts

| Command                                     | What it does                                                         |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                                  | Vite dev server on :5173 (run `convex dev` beside it for data)       |
| `pnpm build`                                | Production build into `dist/`                                        |
| `pnpm preview`                              | Preview the production build                                         |
| `pnpm test`                                 | Vitest run (17 tests: `convex/accounts`, `convex/referrals`)         |
| `pnpm typecheck`                            | Regenerate the route tree, then `tsc --noEmit` for app and `convex/` |
| `pnpm lint`                                 | ESLint, zero warnings allowed                                        |
| `pnpm generate-routes`                      | Regenerate `src/routeTree.gen.ts` after adding a route file          |
| `pnpm prettier-check` / `pnpm prettier-fix` | Formatting check / rewrite                                           |

Tests are hermetic (no deployment, no network). The suite raises `testTimeout`
to 20s in `vitest.config.ts` because the first `convex-test` case in a file
builds a fresh in-memory backend and can exceed Vitest's 5s default on a cold
transform cache.

## Layout

```
convex/                 schema, queries, mutations, tests, shared validators
  schema/               per-domain tables assembled by schema.ts
  lib/                  auth, audit, validation, referral helpers
  shared/               pure code imported by both Convex and the UI
src/
  routes/_public/       public site (home, procedures, how-it-works, request…)
  routes/_app/          signed-in app shell, dashboard, requests, admin
  components/           shadcn-based UI, logo, urgent notice
  lib/                  site copy, procedures content, helpers, hooks
  routeTree.gen.ts      generated by the router CLI — do not hand-edit
docs/                   project hand-off and archived notes
```

## Conventions

- Enforce every permission on the backend; never trust a user id from the client.
- Every state change calls `logAudit`.
- Read queries return `null`/empty pages for anonymous callers; mutations throw
  `ConvexError({ message, code })`.
- No clinical rules in code (fasting, medication, durations) — they are data.
- Do not edit `/auth/callback`, the `updateCurrentUser` args, auth env names,
  `vite.config.ts`, `wrangler.jsonc` or `tsconfig.json` (see the hand-off).
