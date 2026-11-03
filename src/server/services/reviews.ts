import {
  getCurrentUserDoc,
  logAudit,
  requireRole,
  requireUser,
  type Ctx,
} from "../context.ts";
import { allRows, getRow, newId, run, transaction } from "../db.ts";
import { AppError, bad } from "../errors.ts";
import type {
  ChecklistRecord,
  Page,
  PaginationOpts,
  QueueItem,
  ReferralDetail,
  ReferralEvent,
  ReferralNote,
  ReferralReview,
  StaffReferralDetail,
} from "../types.ts";
import { optionalText, requireText } from "../validate.ts";
import {
  DECISION_STATUS,
  canTransition,
  type ReviewDecision,
} from "@/shared/workflow.ts";
import type { ReferralStatus } from "@/shared/referrals.ts";
import { getByReference } from "./referrals.ts";
import { appointmentForReferral, recordEvent } from "./scheduling.ts";
import { notifyUsers, userIdsWithRoles } from "./notifications.ts";
import { loadCareRecord } from "./care.ts";

const STAFF = ["receptionist", "radiologist", "coordinator", "admin"] as const;
const CLINICAL = ["radiologist"] as const;

type ReferralRow = {
  id: string;
  reference: string;
  procedure: string;
  status: ReferralStatus;
  submitted_by_id: string;
  submitter_role: "patient" | "physician";
  priority: string | null;
  review_modality: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  redirect_to: string | null;
  payment_status: string;
  fee_cents: number | null;
  payment_note: string | null;
  patient_json: string;
  clinical_json: string;
  submitted_at: string;
};

/** The staff work queue: live statuses, newest and most urgent first. */
export function queue(
  ctx: Ctx,
  args: { status?: string; procedure?: string; paginationOpts: PaginationOpts },
): Page<QueueItem> {
  const user = getCurrentUserDoc(ctx);
  if (!user?.role || !STAFF.includes(user.role as never)) {
    return { page: [], isDone: true, continueCursor: "" };
  }
  const offset = Number(args.paginationOpts.cursor ?? 0) || 0;
  const limit = Math.max(1, Math.min(args.paginationOpts.numItems, 100));
  const where: string[] = [];
  const params: Array<string | number | null> = [];
  if (args.status) {
    where.push("r.status = ?");
    params.push(args.status);
  } else {
    where.push(
      "r.status IN ('submitted','in_review','info_requested','approved','deferred')",
    );
  }
  if (args.procedure) {
    where.push("r.procedure = ?");
    params.push(args.procedure);
  }
  const rows = allRows<ReferralRow & { has_appointment: number }>(
    ctx.db,
    `SELECT r.*, (SELECT COUNT(*) FROM appointments a WHERE a.referral_id = r.id AND a.status != 'cancelled') AS has_appointment
       FROM referrals r
      WHERE ${where.join(" AND ")}
      ORDER BY CASE r.priority WHEN 'urgent' THEN 0 WHEN 'soon' THEN 1 WHEN 'routine' THEN 2 ELSE 3 END,
               r.submitted_at ASC
      LIMIT ? OFFSET ?`,
    ...params,
    limit + 1,
    offset,
  );
  const isDone = rows.length <= limit;
  const page = (isDone ? rows : rows.slice(0, limit)).map((row) => ({
    _id: row.id,
    reference: row.reference,
    procedure: row.procedure as QueueItem["procedure"],
    status: row.status,
    urgency: (
      JSON.parse(row.clinical_json) as { urgency: QueueItem["urgency"] }
    ).urgency,
    priority: row.priority,
    patientName: (JSON.parse(row.patient_json) as { fullName: string })
      .fullName,
    submittedAt: row.submitted_at,
    hasAppointment: row.has_appointment > 0,
  }));
  return { page, isDone, continueCursor: isDone ? "" : String(offset + limit) };
}

function actorName(ctx: Ctx, actorId: string | null): string {
  if (!actorId) return "System";
  const user = getRow<{ full_name: string | null; email: string | null }>(
    ctx.db,
    "SELECT full_name, email FROM users WHERE id = ?",
    actorId,
  );
  return user?.full_name ?? user?.email ?? "User";
}

function eventList(ctx: Ctx, referralId: string): ReferralEvent[] {
  return allRows<{
    id: string;
    type: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    actor_id: string | null;
    at: string;
  }>(
    ctx.db,
    "SELECT * FROM referral_events WHERE referral_id = ? ORDER BY at ASC LIMIT 200",
    referralId,
  ).map((row) => ({
    _id: row.id,
    type: row.type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    actor: actorName(ctx, row.actor_id),
    at: row.at,
  }));
}

function reviewList(ctx: Ctx, referralId: string): ReferralReview[] {
  return allRows<{
    id: string;
    decision: string;
    priority: string | null;
    modality: string | null;
    redirect_to: string | null;
    checklist_json: string;
    note: string | null;
    reviewer_id: string;
    at: string;
  }>(
    ctx.db,
    "SELECT * FROM referral_reviews WHERE referral_id = ? ORDER BY at DESC LIMIT 50",
    referralId,
  ).map((row) => ({
    _id: row.id,
    decision: row.decision,
    priority: row.priority,
    modality: row.modality,
    redirectTo: row.redirect_to,
    checklist: JSON.parse(row.checklist_json) as ChecklistRecord,
    note: row.note,
    reviewer: actorName(ctx, row.reviewer_id),
    at: row.at,
  }));
}

function noteList(
  ctx: Ctx,
  referralId: string,
  includeStaffNotes: boolean,
): ReferralNote[] {
  const rows = allRows<{
    id: string;
    author_id: string;
    body: string;
    visibility: "staff" | "submitter";
    at: string;
  }>(
    ctx.db,
    `SELECT * FROM referral_notes WHERE referral_id = ?
      ${includeStaffNotes ? "" : "AND visibility = 'submitter'"}
      ORDER BY at ASC LIMIT 200`,
    referralId,
  );
  return rows.map((row) => ({
    _id: row.id,
    body: row.body,
    visibility: row.visibility,
    author: actorName(ctx, row.author_id),
    at: row.at,
  }));
}

/** Full clinical record for staff: review history, notes, booking and care record. */
export function detail(
  ctx: Ctx,
  args: { reference: string },
): StaffReferralDetail | null {
  const user = getCurrentUserDoc(ctx);
  if (!user?.role || !STAFF.includes(user.role as never)) {
    // Submitters keep using the simpler own-record view.
    return null;
  }
  const base = getByReference(ctx, args);
  if (!base) return null;
  const row = getRow<ReferralRow>(
    ctx.db,
    "SELECT * FROM referrals WHERE id = ?",
    base.id,
  )!;
  const care = loadCareRecord(ctx, base.id);
  return {
    ...(base as ReferralDetail),
    priority: row.priority,
    events: eventList(ctx, base.id),
    reviews: reviewList(ctx, base.id),
    notes: noteList(ctx, base.id, true),
    appointment: appointmentForReferral(ctx, base.id),
    preparation: care.preparation,
    consent: care.consent,
    steps: care.steps,
    specimens: care.specimens,
    followUps: care.followUps,
    payment: {
      status: row.payment_status,
      feeCents: row.fee_cents,
      note: row.payment_note,
    },
    transitions: transitionsFrom(row.status),
  };
}

function transitionsFrom(status: ReferralStatus): ReferralStatus[] {
  const allowed: ReferralStatus[] = [];
  for (const candidate of [
    "in_review",
    "info_requested",
    "approved",
    "deferred",
    "declined",
    "scheduled",
    "completed",
    "withdrawn",
  ] as const) {
    if (canTransition(status, candidate)) allowed.push(candidate);
  }
  return allowed;
}

const APPROVE_CHECKLIST: readonly string[] = [
  "indication_reviewed",
  "referral_reviewed",
  "imaging_reviewed",
  "identity_verified",
  "consent_documented",
  "resources_confirmed",
];

/**
 * Records a clinical decision. Only an interventional radiologist may call this:
 * receptionists and coordinators are blocked here, not just in the UI.
 */
export function review(
  ctx: Ctx,
  args: {
    referralId: string;
    decision: ReviewDecision;
    priority?: string;
    modality?: string;
    redirectTo?: string;
    checklist: ChecklistRecord;
    note?: string;
  },
): null {
  const reviewer = requireRole(ctx, CLINICAL);
  const row = getRow<ReferralRow>(
    ctx.db,
    "SELECT * FROM referrals WHERE id = ?",
    args.referralId,
  );
  if (!row) throw new AppError("NOT_FOUND", "Request not found.");
  if (
    ![
      "submitted",
      "in_review",
      "info_requested",
      "approved",
      "deferred",
    ].includes(row.status)
  ) {
    throw new AppError(
      "BAD_REQUEST",
      "This request is no longer open for clinical review.",
    );
  }

  const nextStatus = DECISION_STATUS[args.decision];
  if (!canTransition(row.status, nextStatus)) {
    throw new AppError(
      "BAD_REQUEST",
      `A request that is ${row.status.replaceAll("_", " ")} cannot move to ${nextStatus.replaceAll("_", " ")}.`,
    );
  }

  const note = optionalText(args.note, "Note", 2000);
  if (
    (args.decision === "request_info" || args.decision === "decline") &&
    !note
  ) {
    bad("Add a short note explaining the decision.");
  }
  if (args.decision === "approve") {
    const missing = APPROVE_CHECKLIST.filter(
      (item) => args.checklist[item] !== true,
    );
    if (missing.length > 0)
      bad("Complete the required checklist items before approving.");
    if (!args.priority) bad("Choose a clinical priority.");
    if (!args.modality) bad("Choose the imaging modality for scheduling.");
  }
  if (args.decision === "redirect" && !args.redirectTo) {
    bad("Say which pathway you are recommending.");
  }

  transaction(ctx.db, () => {
    const now = new Date().toISOString();
    run(
      ctx.db,
      `INSERT INTO referral_reviews
         (id, referral_id, decision, priority, modality, redirect_to, checklist_json, note, reviewer_id, at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      row.id,
      args.decision,
      args.priority ?? row.priority,
      args.modality ?? row.review_modality,
      args.redirectTo ?? null,
      JSON.stringify(args.checklist ?? {}),
      note ?? null,
      reviewer.id,
      now,
    );
    run(
      ctx.db,
      `UPDATE referrals SET status = ?, priority = COALESCE(?, priority),
              review_modality = COALESCE(?, review_modality), redirect_to = ?,
              reviewed_by_id = ?, reviewed_at = ?, review_note = ?, updated_at = ?
        WHERE id = ?`,
      nextStatus,
      args.priority ?? null,
      args.modality ?? null,
      args.redirectTo ?? null,
      reviewer.id,
      now,
      note ?? null,
      now,
      row.id,
    );
    recordEvent(
      ctx,
      row.id,
      `review.${args.decision}`,
      row.status,
      nextStatus,
      note ?? null,
      reviewer.id,
    );
    if (
      note &&
      (args.decision === "request_info" ||
        args.decision === "decline" ||
        args.decision === "redirect")
    ) {
      run(
        ctx.db,
        `INSERT INTO referral_notes (id, referral_id, author_id, body, visibility, at)
         VALUES (?, ?, ?, ?, 'submitter', ?)`,
        newId(),
        row.id,
        reviewer.id,
        note,
        now,
      );
    }
    logAudit(ctx, {
      actorId: reviewer.id,
      action: `referral.${args.decision}`,
      entityType: "referral",
      entityId: row.id,
      summary: `${row.reference}: ${args.decision}${note ? ` (${note})` : ""}`,
    });
  });

  const kindMap: Record<string, string> = {
    approve: "referral_approved",
    defer: "referral_deferred",
    decline: "referral_declined",
    request_info: "info_requested",
    redirect: "referral_deferred",
  };
  const titleMap: Record<string, string> = {
    approve: `Request ${row.reference} approved`,
    defer: `Request ${row.reference} deferred`,
    decline: `Request ${row.reference} not approved`,
    request_info: `More information needed for ${row.reference}`,
    redirect: `Pathway recommendation for ${row.reference}`,
  };
  notifyUsers(ctx, [row.submitted_by_id], {
    kind: kindMap[args.decision] as never,
    title: titleMap[args.decision],
    body: note
      ? `${titleMap[args.decision]}. Note from the clinical team: ${note}`
      : titleMap[args.decision],
    entityType: "referral",
    entityId: row.id,
    link: `/requests/${row.reference}`,
  });
  return null;
}

/** The submitter answers an information request; the request returns to review. */
export function respondToInfo(
  ctx: Ctx,
  args: { referralId: string; body: string },
): null {
  const user = requireUser(ctx);
  const row = getRow<ReferralRow>(
    ctx.db,
    "SELECT * FROM referrals WHERE id = ?",
    args.referralId,
  );
  if (!row || row.submitted_by_id !== user.id)
    throw new AppError("NOT_FOUND", "Request not found.");
  if (row.status !== "info_requested") {
    throw new AppError(
      "BAD_REQUEST",
      "This request is not waiting for information.",
    );
  }
  const body = requireText(args.body, "Your reply", 2000);
  transaction(ctx.db, () => {
    run(
      ctx.db,
      `INSERT INTO referral_notes (id, referral_id, author_id, body, visibility, at)
       VALUES (?, ?, ?, ?, 'submitter', ?)`,
      newId(),
      row.id,
      user.id,
      body,
      new Date().toISOString(),
    );
    run(
      ctx.db,
      "UPDATE referrals SET status = 'in_review', updated_at = ? WHERE id = ?",
      new Date().toISOString(),
      row.id,
    );
    recordEvent(
      ctx,
      row.id,
      "info.provided",
      "info_requested",
      "in_review",
      null,
      user.id,
    );
    logAudit(ctx, {
      actorId: user.id,
      action: "referral.infoProvided",
      entityType: "referral",
      entityId: row.id,
      summary: `${row.reference}: submitter replied to an information request`,
    });
  });
  notifyUsers(ctx, userIdsWithRoles(ctx, ["radiologist", "coordinator"]), {
    kind: "info_provided",
    title: `New information for ${row.reference}`,
    body: "The submitter replied to the information request. The request is back in clinical review.",
    entityType: "referral",
    entityId: row.id,
    link: `/staff/review/${row.reference}`,
  });
  return null;
}

/** Staff-only note, never shown to the submitter. */
export function addStaffNote(
  ctx: Ctx,
  args: { referralId: string; body: string },
): null {
  const staff = requireRole(ctx, STAFF);
  const body = requireText(args.body, "Note", 2000);
  const row = getRow<{ id: string; reference: string }>(
    ctx.db,
    "SELECT id, reference FROM referrals WHERE id = ?",
    args.referralId,
  );
  if (!row) throw new AppError("NOT_FOUND", "Request not found.");
  run(
    ctx.db,
    `INSERT INTO referral_notes (id, referral_id, author_id, body, visibility, at)
     VALUES (?, ?, ?, ?, 'staff', ?)`,
    newId(),
    row.id,
    staff.id,
    body,
    new Date().toISOString(),
  );
  logAudit(ctx, {
    actorId: staff.id,
    action: "referral.noteAdded",
    entityType: "referral",
    entityId: row.id,
    summary: `Staff note added to ${row.reference}`,
  });
  return null;
}

/** Submitter-facing thread (information requests and their replies). */
export function submitterNotes(ctx: Ctx, referralId: string): ReferralNote[] {
  const user = requireUser(ctx);
  const row = getRow<{ id: string; submitted_by_id: string }>(
    ctx.db,
    "SELECT id, submitted_by_id FROM referrals WHERE id = ?",
    referralId,
  );
  if (!row || row.submitted_by_id !== user.id) return [];
  return noteList(ctx, row.id, false);
}
