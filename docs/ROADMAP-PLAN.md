# Roadmap execution plan (local repository)

This plan rewrites the roadmap shown in the initiative screenshot onto the **self-contained local stack** in this repository. The three items marked complete on that screen (public website and branding, roles and accounts, biopsy and drainage referrals) are treated as done. Everything below is the remaining work, expressed as concrete changes to this codebase.

Stack in this repository: TanStack Start (React 19 SSR) + TanStack Router, Tailwind v4, Base UI/shadcn, server functions (`createServerFn`), `node:sqlite` for storage, local disk for documents, `openid-client` for sign-in. No hosted backend, no Cloudflare/Wrangler, no proprietary packages.

## Remaining roadmap items

### M4 — Intussusception coordination
- **Data**: `urgent_cases`, `urgent_events` (`src/server/db.ts`); reference format `IR-YYMMDD-XXXX`.
- **Behaviour** (`src/server/services/urgent.ts`): a separate pathway from elective referrals. Only verified physicians and HakimeRAD staff can create a case; patients only ever see the warning and the emergency line. Radiology acknowledges, a radiologist records the coordination decision, and a slot is arranged only after acceptance. Every transition is written to `urgent_events` and `audit_logs`; creation alerts radiologists, coordinators and administrators.
- **UI**: `/urgent` list, `/urgent/new` form, `/urgent/$reference` detail; the mandatory `INTUSSUSCEPTION_WARNING` and emergency number appear on all three.
- **Why separate**: the roadmap and the product rules forbid presenting intussusception as public time-slot booking.

### M5 — Clinical review
- **Data**: `referral_reviews`, `referral_notes`, `referral_events`, plus `priority`, `review_modality`, `reviewed_by`, `review_note` on `referrals`.
- **Behaviour** (`src/server/services/reviews.ts`): one central transition table in `src/shared/workflow.ts` (`ALLOWED_TRANSITIONS`) enforced by `canTransition`; radiologist-only decisions (`approve`, `defer`, `decline`, `request_info`, `redirect`); receptionists are refused by the server, not just the UI. Approval requires the six mandatory checklist items, a priority and a modality. Information requests create a submitter-visible note; the submitter's reply returns the request to `in_review`.
- **UI**: `/staff/queue` (filters, priority-first ordering) and `/staff/review/$reference` (checklist, decision, notes, history). The submitter's `/requests/$reference` shows the status timeline and the message thread.

### M6 — Scheduling engine
- **Data**: `resources` (rooms, equipment, staff), `procedure_settings` (duration + buffer, editable data), `appointments`, `schedule_exceptions`.
- **Rules** (`src/server/services/scheduling.ts`): only `approved` requests can be booked; the booking runs inside one `BEGIN IMMEDIATE` transaction that checks opening hours, closing time and conflicts across room, equipment and radiologist, plus closures/leave. Double booking is prevented by the transaction, never by the UI alone. Cancel returns the request to `approved`; complete marks it `completed`.
- **Appointment times** are stored as clinic wall-clock values (`YYYY-MM-DDTHH:MM`) so hours and conflicts compare directly without a time-zone library.
- **UI**: `/schedule` week view, slot picker, reschedule, cancel, check-in/status; `/admin/resources` for rooms, equipment, staff and durations; exceptions on the schedule page.

### M7 — Preparation and procedure day
- **Data**: `preparation`, `consent_records`, `procedure_steps`, `specimens`, `follow_up_tasks`.
- **Rules** (`src/server/services/care.ts`): instructions are written by a radiologist per patient (no fasting/medication templates in code), the submitter acknowledges them, staff mark preparation complete or flag it for clinical review. Consent is recorded explicitly and is separate from policy acceptance. Procedure steps record arrival, identity check, progress and completion. Specimen dispatch exists for biopsy/FNAC; follow-up tasks cover drainage follow-up.
- **UI**: care panel on `/staff/review/$reference`; preparation and acknowledgement on the submitter's request page.

### M8 — Notifications
- **Data**: `notifications`, `notification_deliveries`.
- **Behaviour** (`src/server/services/notifications.ts`): every event creates an in-app row plus one delivery row per channel. Email is written to a local outbox file (`data/outbox/*.eml`); SMS and WhatsApp log the attempt because no provider is configured — the log says exactly that rather than claiming delivery. Staff can resend a failed or skipped delivery; every resend is audited. Message bodies carry the reference and a minimal statement, never clinical detail.
- **UI**: `/notifications` with unread filter, delivery badges and staff resend.

### M9 — Admin dashboard and reports
- **Behaviour**: `metrics` aggregates by procedure and status over a date range using indexed queries; the audit log is paginated and searchable; settings cover public contacts, opening hours, slot step, notification channels and request sources; institutions are manageable; payment status is manual (`unset`, `due`, `paid`, `waived`) with no gateway.
- **UI**: `/admin/reports`, `/admin/audit`, `/admin/settings`, `/admin/resources`, `/admin/institutions`.
- **Note**: `src/lib/site.ts` keeps the placeholder contacts as a fallback; values saved in settings take precedence on the contact page.

### M10 — Installable app and testing
- **PWA**: `public/manifest.webmanifest`, icons generated by `scripts/generate-icons.mjs` (no image dependency), custom `public/sw.js`, `/offline` page, connectivity banner, and submit buttons that refuse to submit while offline.
- **Caching policy**: only the offline page and static assets are cached. Signed-in HTML, `/api/*`, uploads and every private route are never written to the cache, so a shared device cannot serve another patient's page.
- **Tests**: `src/server/services/workflow.test.ts` covers review permissions, checklist gating, information round-trips, booking conflicts, closing-time limits, cancellation, urgent-case permissions and sequencing, preparation permissions, and report access.

## Verification checklist
1. `pnpm typecheck` — route tree generation plus `tsc --noEmit`.
2. `pnpm lint` — ESLint with `--max-warnings=0`.
3. `pnpm test` — server and frontend Vitest projects.
4. `pnpm build` — production build; confirm the client bundle does not contain `node:sqlite` or `openid-client`.
5. `pnpm dev` — smoke-test every route over HTTP, including `/offline`, `/staff/queue`, `/schedule`, `/urgent`, `/notifications` and the admin pages.
6. Manual: sign in with an OIDC provider, walk one referral from submission to a booked slot, and confirm each change appears in the audit log.

## Still requires the client
- Real contact details, opening hours and the emergency number (now editable in `/admin/settings`).
- Provider credentials if SMS/WhatsApp/email should actually send; the adapters are in place.
- Administrator bootstrap: first sign-in → choose a role → “Become administrator”.
