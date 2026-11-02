---
name: hakimerad-handoff
description: "Read FIRST before doing any work on the HakimeRAD IR Booking app: project state, non-negotiable rules, architecture map, conventions, and the remaining milestone plan (4-10) for finishing the PWA."
---
# HakimeRAD IR Booking: builder hand-off

You are continuing an in-progress build. Read this whole file before editing anything. Then read the initiative (`initiative_read initiative-1` with `milestoneExpand: true`) because milestone notes may be newer than this file.

## 1. What the app is
An installable web app (PWA) for **HakimeRAD Radiologic Consultancy** that handles interventional radiology referrals, clinical review, scheduling and procedure management for three pathways:
1. Image-Guided Biopsy / FNAC (code `BX`)
2. Image-Guided Abscess Drainage (code `DR`)
3. Hydrostatic Intussusception Reduction (urgent hospital coordination only)

The user's original spec asked for NestJS/Postgres/REST/Playwright. **That was superseded**: the user approved the Hercules stack (TanStack Start + Convex "Hercules Backend" + Hercules Auth + Vitest unit tests). Do not reintroduce the old stack.

## 2. Non-negotiable product rules (from the user's spec)
- "A submitted procedure request is not automatically a confirmed procedure." Only clinicians (radiologists) approve. Scheduling happens only AFTER approval. Never label a request as an appointment.
- Intussusception is never public time-slot booking. Always show `INTUSSUSCEPTION_WARNING` (from `src/lib/site.ts`) word for word, plus the emergency phone fallback (`src/components/urgent-notice.tsx`). Only authorized professionals/staff may create intussusception records.
- Roles: patient/guardian, verified referring physician, receptionist, interventional radiologist, coordinator, admin. **Enforce every permission on the backend.** A receptionist can never approve clinically.
- Hardcode NO clinical rules: no fasting times, anticoagulant guidance or procedure durations. Clinicians/admins configure them (data, not code). The only patient-facing medication line allowed is "do not change medication unless your doctor tells you".
- Patient documents go in Convex private storage only, and only the submitter and staff can access them.
- Full audit trail for every status change and sensitive action (`logAudit`).
- Prevent double-booking (milestone 6).
- Never invent outcomes, risk statistics, availability claims, accreditations, logos or official branding.
- Notifications carry minimal clinical detail.

## 3. Current status
- Done: M1 Public website and branding, M2 Roles and accounts, M3 Biopsy and drainage referrals.
- Remaining, in dependency order: M4 Intussusception coordination, M5 Clinical review, M6 Scheduling engine, M7 Preparation and procedure day, M8 Notifications, M9 Admin dashboard and reports, M10 Installable app and testing.
- Workflow the user expects: they say "Start this milestone @milestone-N". Mark it `in_progress`, build ONLY that milestone, run the checks (section 7), mark it `completed`, then stop with a short summary. Don't build ahead unless they tell you to.
- Last state: lint, build and 17 unit tests all pass (`convex/accounts.test.ts` 9, `convex/referrals.test.ts` 8).

## 4. Open items and blockers (ask or remind the user, don't invent)
- **Real business details are still missing.** In plan mode the user said they would paste them; they never did. `src/lib/site.ts` holds placeholders tagged with `PLACEHOLDER_MARK = "(to be confirmed)"` (phone, email, address, hours, emergency phone). When the user provides them, replace these values. M9 should move them into admin-editable settings (a `settings` table) and keep `site.ts` as a fallback.
- SMS and WhatsApp need the user's provider credentials for M8. Check `search_app_connector_catalog` first (for example Twilio), then fall back to Secrets. Email uses Hercules Email (`send-emails` skill), which needs a verified sender.
- No admin exists yet. The owner must sign in, pick any onboarding path, and use "Become administrator" (`claimFirstAdmin`, which only works while no admin exists). The preview account currently has no role, so signed-in screenshots show onboarding.
- Hercules Commerce is `pending_opt_in`. Optional fees/payment status (M9) must not use Commerce unless the user opts in. Default to a manual "payment status" field.

## 5. Architecture map
### Backend (`convex/`)
- `schema.ts` only assembles tables from `schema/users.ts` (users, physicianProfiles, auditLogs) and `schema/referrals.ts` (referrals, referralDocuments). Add new domains as `schema/<domain>.ts`.
- `shared/roles.ts`: `ROLES`, `SELF_SERVICE_ROLES` (patient, physician), `STAFF_ROLES`, labels, `isStaffRole`, physician statuses. `shared/referrals.ts`: procedures, `REFERRAL_STATUSES` (submitted, in_review, info_requested, approved, deferred, declined, scheduled, completed, withdrawn), `OPEN_STATUSES`, form label maps, file limits, `isCalendarDate`, `ageOn`. `shared/` is pure and imported by both Convex and the UI (`@/convex/shared/...`).
- `lib/auth.ts`: `getCurrentUserDoc`, `requireUser`, `requireRole(ctx, roles[])`, `getUserWithRole`, `requireVerifiedPhysician`. Use these in every function, and never accept a user id from the client for authorization.
- `lib/audit.ts`: `logAudit(ctx, {...})`. Call it in every state-changing mutation.
- `lib/validate.ts`: `requireText`, `requirePhone`, `optionalText`.
- `lib/referrals.ts`: input cleaners, `validateDocuments` (with a file-extension fallback, see Gotchas), `generateReference` (`BX-YYMMDD-XXXX`, uniqueness checked).
- `users.ts`: `updateCurrentUser` (auth sync, never add args), `me`, `completeOnboarding`, `updateContactDetails`, `submitPhysicianProfile`, `claimFirstAdmin`.
- `admin/accounts.ts`: `listPhysicians`, `reviewPhysician`, `listUsers`, `setUserRole`, `auditForEntity`.
- `referrals.ts`: `generateUploadUrl`, `discardUpload`, `submit` (requires `confirmNotAppointment`; a physician's referrer data comes from their verified profile), `listMine` (paginated), `getByReference` (submitter or staff, otherwise null), `addDocuments`, `withdraw` (reason required; open requests only).

### Frontend (`src/`)
- `routes/_public.tsx` plus `_public/*`: the public site (home, procedures/$slug, how-it-works, referrers, request, contact, privacy, booking-policy). Content lives in `lib/procedures.ts` (`PROCEDURES`, `REFERRAL_STEPS`, `FAQS`) and `lib/site.ts`.
- `routes/_app.tsx`: private gate in this order: signed out, then skeleton, then `Onboarding`, then `AppShell` (sidebar plus mobile nav). It sets `noindex`.
- `routes/_app/-components/`: app-shell, onboarding, physician-profile-form, first-admin-card, `require-role.tsx` (`<RequireRole roles={[...]} message?>`, which is presentational only).
- `routes/_app/`: dashboard (role panels), account, admin/physicians, admin/users, requests/ (index list, `new/$procedure` form, `$reference` detail with Add documents/Withdraw).
- `lib/app-nav.ts`: `APP_NAV` entries with an optional `roles`; `navForRole`. Add new staff pages here.
- Hooks: `use-me.ts` (current user + role + physician profile), `use-document-uploads.ts` (uploads on pick, discards on remove).
- Helpers: `lib/errors.ts` (`errorMessage(err)` for ConvexError toasts), `lib/form-schemas.ts` (`phoneSchema`, `requiredText`).
- Shared components: `referral-status-badge`, `physician-status-badge`, `app-page` (page container + header), `urgent-notice`, `contact-details`.

## 6. Conventions to keep
- shadcn on **Base UI**: use the `render` prop (never `asChild`); a link button needs `nativeButton={false}`. Forms use `react-hook-form` + zod + `NativeSelect` for selects. Never use `variant="outline"` buttons.
- Theme: teal/slate, fonts Sora (headings) + IBM Plex Sans, defined in `src/index.css` for both light and dark. Use semantic colors only.
- Read queries return `null` or an empty page for unauthorized or anonymous callers (SSR-safe); mutations throw `ConvexError({ message, code })`.
- Lists are paginated (`usePaginatedQuery`, "Load more"). Use indexes, never `.filter()` scans or `.collect().length` counts.
- Timestamps are ISO UTC strings; calendar days are `YYYY-MM-DD`. Display in local time on the client.
- Every new nav link needs its route file first (typed `Link`).
- Status changes need one central transition table (M5: put `ALLOWED_TRANSITIONS` in `shared/referrals.ts`), enforced by one helper in `lib/` and unit-tested.

## 7. Checks before finishing each milestone
1. After adding a new `convex/*.ts` module, run `run_build` target `convex` BEFORE `run_lint` (so the generated api includes it).
2. Run `run_lint` (all) and `run_build` (all), and `run_tests` (full suite). Add unit tests for every permission rule, status transition, and booking-conflict rule you add. Tests use `convexTest(schema, modules)` from `convex/test.setup.ts` and `t.withIdentity({ subject, tokenIdentifier: "test|<subject>", email })`.
3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/<route>` for new routes (200; 404 for intended not-found).
4. Screenshot public pages in light and dark mode.

## 8. Remaining milestone plan (guidance, verify against initiative notes)
- **M4 Intussusception coordination**: a new `urgentCases` table (or `referrals` with procedure `intussusception` and a separate status set; a separate table is cleaner). Reference `IR-YYMMDD-XXXX`. Only verified physicians and staff can create a case; patients see only the warning and emergency line. Creating a case alerts all radiologists/coordinators (in-app alert rows now; M8 adds channels). Record acknowledgement (who/when), a coordination decision record, and a time-stamped audit. `src/routes/_app/requests/new/$procedure.tsx` currently 404s for intussusception, and `procedure-chooser.tsx` links its card to the info page. Add a dedicated `/urgent/new` (or similar) route instead. Show the warning on every intussusception screen.
- **M5 Clinical review**: a staff queue (filter by status/procedure via indexes). The radiologist can approve/defer/decline/request info/redirect pathway, and set priority, modality and resources, with procedure-specific checklists configured as data. Receptionists can view and add documents/notes but are blocked from clinical decisions on the backend. The submitter answers info requests (`info_requested` back to `in_review`). Show status history on `$reference`.
- **M6 Scheduling engine**: configurable resources (staff, rooms, equipment), working hours, leave, closures, buffers, and procedure durations (admin data). Only `approved` referrals can be scheduled. Conflict detection must run inside the booking mutation (a transaction) over indexed time ranges per resource. Add day/week/month calendars plus reschedule/cancel/check-in, all audited.
- **M7 Preparation and procedure day**: clinician-written preparation instructions per booking, with patient acknowledgement. Consent status records separate from policy acceptance. Arrival, identity verification, in-progress and completed steps. Specimen dispatch tracking (biopsy) and drainage follow-up tasks.
- **M8 Notifications**: a `notifications` table (in-app) plus a delivery log with channel/status/attempts, retries via the scheduler (bounded), and staff resend. Email via Hercules Email; SMS/WhatsApp via the user's provider. Read the `send-emails` skill and the `cron-jobs-and-scheduling` skill (get user consent before adding crons). Keep message content minimal.
- **M9 Admin dashboard and reports**: metrics by procedure and date range using counter/summary docs (no full scans), plus management of users, staff, institutions, procedures, resources, booking rules, business settings (moves the `site.ts` contacts here) and optional fees/payment status. Include an audit log viewer (paginated).
- **M10 Installable app and testing**: follow `~/.hercules/skills/platform/add-pwa-support-tanstack-start/SKILL.md` exactly. Use the brand teal `#1f6f78` (already the theme-color). Generate PNG icons with `generate_image` (`output_format: "png"`), with no invented logos (a neutral mark based on the existing `src/components/logo.tsx` style). The offline page shows public info only (contacts, emergency line, intussusception warning). Add a connectivity indicator in the app shell. NO offline submissions: disable submit buttons while offline. Finally, round out the unit tests for permissions, status rules and booking conflicts.

## 9. Gotchas already hit
- convex-test does not record `contentType` for `ctx.storage.store` blobs. That is why `validateDocuments` falls back to the file extension. Keep that fallback.
- ESLint `no-useless-assignment` flags trailing counter increments such as `step++`.
- The `Select` from Base UI passes `null` to `onValueChange`; the forms use `NativeSelect` to avoid this.
- Never edit `/auth/callback`, `updateCurrentUser` args, auth env vars, `package.json` (use manage_packages), `vite.config.ts`, `wrangler.jsonc` or `tsconfig.json`.

## 10. Talking to the user
The user is non-technical. Keep messages short, use no jargon and no emojis, and keep the postamble to 5 lines or fewer. Remind them about the missing business details and provider keys when they become relevant.
