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
  ConsentRecord,
  FollowUpRecord,
  PreparationRecord,
  ProcedureStepRecord,
  SpecimenRecord,
} from "../types.ts";
import { optionalText, requireText } from "../validate.ts";
import { PROCEDURE_STEPS, type ProcedureStep } from "@/shared/workflow.ts";
import { isCalendarDate } from "@/shared/referrals.ts";
import { recordEvent } from "./scheduling.ts";
import { notifyUsers } from "./notifications.ts";

const STAFF = ["receptionist", "radiologist", "coordinator", "admin"] as const;

export type CareRecord = {
  preparation: PreparationRecord | null;
  consent: ConsentRecord | null;
  steps: ProcedureStepRecord[];
  specimens: SpecimenRecord[];
  followUps: FollowUpRecord[];
};

function nameOf(ctx: Ctx, id: string | null): string | null {
  if (!id) return null;
  const row = getRow<{ full_name: string | null; email: string | null }>(
    ctx.db,
    "SELECT full_name, email FROM users WHERE id = ?",
    id,
  );
  return row?.full_name ?? row?.email ?? null;
}

/** Everything recorded around the procedure day for one referral. */
export function loadCareRecord(ctx: Ctx, referralId: string): CareRecord {
  const prep = getRow<{
    id: string;
    instructions: string;
    state: string;
    issued_by_id: string;
    issued_at: string;
    acknowledged_at: string | null;
    completed_at: string | null;
    review_note: string | null;
  }>(ctx.db, "SELECT * FROM preparation WHERE referral_id = ?", referralId);

  const consent = getRow<{
    id: string;
    status: string;
    note: string | null;
    recorded_by_id: string;
    at: string;
  }>(
    ctx.db,
    "SELECT * FROM consent_records WHERE referral_id = ? ORDER BY at DESC LIMIT 1",
    referralId,
  );

  const appointment = getRow<{ id: string }>(
    ctx.db,
    "SELECT id FROM appointments WHERE referral_id = ?",
    referralId,
  );

  const steps = appointment
    ? allRows<{
        id: string;
        step: string;
        at: string;
        by_id: string;
        note: string | null;
      }>(
        ctx.db,
        "SELECT * FROM procedure_steps WHERE appointment_id = ? ORDER BY at ASC",
        appointment.id,
      ).map((row) => ({
        _id: row.id,
        step: row.step,
        at: row.at,
        by: nameOf(ctx, row.by_id) ?? "Staff",
        note: row.note,
      }))
    : [];

  const specimens = allRows<{
    id: string;
    collection_type: string;
    identifier: string;
    containers: number;
    destination: string | null;
    status: string;
    dispatched_at: string | null;
    responsible_id: string | null;
  }>(
    ctx.db,
    "SELECT * FROM specimens WHERE referral_id = ? ORDER BY updated_at DESC",
    referralId,
  ).map((row) => ({
    _id: row.id,
    collectionType: row.collection_type,
    identifier: row.identifier,
    containers: row.containers,
    destination: row.destination,
    status: row.status,
    dispatchedAt: row.dispatched_at,
    responsible: nameOf(ctx, row.responsible_id),
  }));

  const followUps = allRows<{
    id: string;
    title: string;
    due_date: string | null;
    status: string;
    note: string | null;
    assignee_id: string | null;
  }>(
    ctx.db,
    "SELECT * FROM follow_up_tasks WHERE referral_id = ? ORDER BY status, due_date",
    referralId,
  ).map((row) => ({
    _id: row.id,
    title: row.title,
    dueDate: row.due_date,
    status: row.status,
    note: row.note,
    assignee: nameOf(ctx, row.assignee_id),
  }));

  return {
    preparation: prep
      ? {
          _id: prep.id,
          instructions: prep.instructions,
          state: prep.state,
          issuedBy: nameOf(ctx, prep.issued_by_id) ?? "Clinician",
          issuedAt: prep.issued_at,
          acknowledgedAt: prep.acknowledged_at,
          completedAt: prep.completed_at,
          reviewNote: prep.review_note,
        }
      : null,
    consent: consent
      ? {
          _id: consent.id,
          status: consent.status,
          note: consent.note,
          recordedBy: nameOf(ctx, consent.recorded_by_id) ?? "Clinician",
          at: consent.at,
        }
      : null,
    steps,
    specimens,
    followUps,
  };
}

function referralForStaff(
  ctx: Ctx,
  referralId: string,
): { id: string; reference: string; submitted_by_id: string } {
  const row = getRow<{
    id: string;
    reference: string;
    submitted_by_id: string;
  }>(
    ctx.db,
    "SELECT id, reference, submitted_by_id FROM referrals WHERE id = ?",
    referralId,
  );
  if (!row) throw new AppError("NOT_FOUND", "Request not found.");
  return row;
}

/**
 * Issues patient-specific preparation instructions. Only a clinician writes
 * them: the app never generates fasting, medication or timing advice itself.
 */
export function issuePreparation(
  ctx: Ctx,
  args: { referralId: string; instructions: string },
): null {
  const clinician = requireRole(ctx, ["radiologist"]);
  const referral = referralForStaff(ctx, args.referralId);
  const instructions = requireText(
    args.instructions,
    "Preparation instructions",
    4000,
  );
  const now = new Date().toISOString();
  transaction(ctx.db, () => {
    const existing = getRow<{ id: string }>(
      ctx.db,
      "SELECT id FROM preparation WHERE referral_id = ?",
      referral.id,
    );
    if (existing) {
      run(
        ctx.db,
        `UPDATE preparation SET instructions = ?, state = 'issued', issued_by_id = ?, issued_at = ?,
                acknowledged_at = NULL, acknowledged_by_id = NULL, completed_at = NULL, completed_by_id = NULL,
                updated_at = ? WHERE id = ?`,
        instructions,
        clinician.id,
        now,
        now,
        existing.id,
      );
    } else {
      run(
        ctx.db,
        `INSERT INTO preparation (id, referral_id, instructions, state, issued_by_id, issued_at, updated_at)
         VALUES (?, ?, ?, 'issued', ?, ?, ?)`,
        newId(),
        referral.id,
        instructions,
        clinician.id,
        now,
        now,
      );
    }
    recordEvent(
      ctx,
      referral.id,
      "preparation.issued",
      null,
      null,
      "Preparation instructions issued",
      clinician.id,
    );
    logAudit(ctx, {
      actorId: clinician.id,
      action: "preparation.issued",
      entityType: "referral",
      entityId: referral.id,
      summary: `Preparation instructions issued for ${referral.reference}`,
    });
  });
  notifyUsers(ctx, [referral.submitted_by_id], {
    kind: "preparation_issued",
    title: `Preparation instructions for ${referral.reference}`,
    body: "Your care team has added preparation instructions to your request. Please read them and confirm you have seen them.",
    entityType: "referral",
    entityId: referral.id,
    link: `/requests/${referral.reference}`,
  });
  return null;
}

/** The submitter confirms they have read the instructions. */
export function acknowledgePreparation(
  ctx: Ctx,
  args: { referralId: string },
): null {
  const user = requireUser(ctx);
  const referral = getRow<{
    id: string;
    reference: string;
    submitted_by_id: string;
  }>(
    ctx.db,
    "SELECT id, reference, submitted_by_id FROM referrals WHERE id = ?",
    args.referralId,
  );
  if (!referral || referral.submitted_by_id !== user.id) {
    throw new AppError("NOT_FOUND", "Request not found.");
  }
  const prep = getRow<{ id: string; state: string }>(
    ctx.db,
    "SELECT id, state FROM preparation WHERE referral_id = ?",
    referral.id,
  );
  if (!prep)
    throw new AppError("BAD_REQUEST", "No instructions have been issued yet.");
  run(
    ctx.db,
    "UPDATE preparation SET state = 'acknowledged', acknowledged_at = ?, acknowledged_by_id = ?, updated_at = ? WHERE id = ?",
    new Date().toISOString(),
    user.id,
    new Date().toISOString(),
    prep.id,
  );
  logAudit(ctx, {
    actorId: user.id,
    action: "preparation.acknowledged",
    entityType: "referral",
    entityId: referral.id,
    summary: `${referral.reference}: preparation acknowledged by the submitter`,
  });
  return null;
}

/** Staff mark preparation complete, or flag that it needs clinical review. */
export function setPreparationState(
  ctx: Ctx,
  args: {
    referralId: string;
    state: "completed" | "needs_review";
    note?: string;
  },
): null {
  const staff = requireRole(ctx, [...STAFF]);
  const referral = referralForStaff(ctx, args.referralId);
  const prep = getRow<{ id: string }>(
    ctx.db,
    "SELECT id FROM preparation WHERE referral_id = ?",
    referral.id,
  );
  if (!prep)
    throw new AppError(
      "BAD_REQUEST",
      "No preparation instructions exist for this request.",
    );
  run(
    ctx.db,
    "UPDATE preparation SET state = ?, review_note = ?, completed_at = ?, completed_by_id = ?, updated_at = ? WHERE id = ?",
    args.state,
    optionalText(args.note, "Note", 500) ?? null,
    args.state === "completed" ? new Date().toISOString() : null,
    staff.id,
    new Date().toISOString(),
    prep.id,
  );
  logAudit(ctx, {
    actorId: staff.id,
    action: `preparation.${args.state}`,
    entityType: "referral",
    entityId: referral.id,
    summary: `${referral.reference}: preparation ${args.state}`,
  });
  return null;
}

/** Consent is recorded explicitly and is never inferred from policy acceptance. */
export function recordConsent(
  ctx: Ctx,
  args: { referralId: string; status: string; note?: string },
): null {
  const clinician = requireRole(ctx, ["radiologist"]);
  const referral = referralForStaff(ctx, args.referralId);
  if (
    !["not_recorded", "recorded", "declined", "unable"].includes(args.status)
  ) {
    bad("Choose a valid consent status.");
  }
  run(
    ctx.db,
    `INSERT INTO consent_records (id, referral_id, status, note, recorded_by_id, at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId(),
    referral.id,
    args.status,
    optionalText(args.note, "Note", 500) ?? null,
    clinician.id,
    new Date().toISOString(),
  );
  recordEvent(
    ctx,
    referral.id,
    "consent.recorded",
    null,
    null,
    `Consent: ${args.status}`,
    clinician.id,
  );
  logAudit(ctx, {
    actorId: clinician.id,
    action: "consent.recorded",
    entityType: "referral",
    entityId: referral.id,
    summary: `${referral.reference}: consent ${args.status}`,
  });
  return null;
}

/** Records one procedure-day step (arrival, verification, completion…). */
export function recordStep(
  ctx: Ctx,
  args: { referralId: string; step: string; note?: string },
): null {
  const staff = requireRole(ctx, [...STAFF]);
  const referral = referralForStaff(ctx, args.referralId);
  if (!(PROCEDURE_STEPS as readonly string[]).includes(args.step))
    bad("Unknown procedure step.");
  const appointment = getRow<{ id: string; status: string }>(
    ctx.db,
    "SELECT id, status FROM appointments WHERE referral_id = ?",
    referral.id,
  );
  if (!appointment)
    throw new AppError("BAD_REQUEST", "This request has no appointment yet.");
  if (appointment.status === "cancelled")
    throw new AppError("BAD_REQUEST", "The appointment was cancelled.");
  transaction(ctx.db, () => {
    run(
      ctx.db,
      `INSERT INTO procedure_steps (id, appointment_id, step, at, by_id, note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (appointment_id, step) DO NOTHING`,
      newId(),
      appointment.id,
      args.step,
      new Date().toISOString(),
      staff.id,
      optionalText(args.note, "Note", 500) ?? null,
    );
    const nextStatus = stepToAppointmentStatus(args.step as ProcedureStep);
    if (nextStatus) {
      run(
        ctx.db,
        "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
        nextStatus,
        new Date().toISOString(),
        appointment.id,
      );
    }
    if (args.step === "completed") {
      run(
        ctx.db,
        "UPDATE referrals SET status = 'completed', updated_at = ? WHERE id = ?",
        new Date().toISOString(),
        referral.id,
      );
      recordEvent(
        ctx,
        referral.id,
        "completed",
        "scheduled",
        "completed",
        "Procedure completed",
        staff.id,
      );
      notifyUsers(ctx, [referral.submitted_by_id], {
        kind: "procedure_completed",
        title: `Procedure completed for ${referral.reference}`,
        body: "The procedure has been recorded as completed. Your care team will discuss any follow-up with you.",
        entityType: "referral",
        entityId: referral.id,
        link: `/requests/${referral.reference}`,
      });
    }
    logAudit(ctx, {
      actorId: staff.id,
      action: "procedure.step",
      entityType: "referral",
      entityId: referral.id,
      summary: `${referral.reference}: ${args.step}`,
    });
  });
  return null;
}

function stepToAppointmentStatus(step: ProcedureStep): string | null {
  switch (step) {
    case "arrived":
      return "checked_in";
    case "in_progress":
      return "in_progress";
    case "completed":
    case "discharged":
      return "completed";
    default:
      return null;
  }
}

/** Specimen logistics for biopsy/FNAC requests. */
export function saveSpecimen(
  ctx: Ctx,
  args: {
    referralId: string;
    collectionType: string;
    identifier: string;
    containers?: number;
    destination?: string;
    status: string;
    responsibleId?: string;
  },
): null {
  const staff = requireRole(ctx, [...STAFF]);
  const referral = referralForStaff(ctx, args.referralId);
  const containers = Math.max(
    1,
    Math.min(Math.round(args.containers ?? 1), 50),
  );
  const id = newId();
  const dispatchedAt =
    args.status === "dispatched" ? new Date().toISOString() : null;
  run(
    ctx.db,
    `INSERT INTO specimens
       (id, referral_id, collection_type, identifier, containers, destination, status, dispatched_at, responsible_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    referral.id,
    requireText(args.collectionType, "Specimen type", 120),
    requireText(args.identifier, "Specimen identifier", 60),
    containers,
    optionalText(args.destination, "Laboratory", 160) ?? null,
    args.status,
    dispatchedAt,
    args.responsibleId ?? staff.id,
    new Date().toISOString(),
  );
  logAudit(ctx, {
    actorId: staff.id,
    action: "specimen.recorded",
    entityType: "referral",
    entityId: referral.id,
    summary: `${referral.reference}: specimen ${args.identifier} (${args.status})`,
  });
  return null;
}

export function addFollowUp(
  ctx: Ctx,
  args: {
    referralId: string;
    title: string;
    dueDate?: string;
    note?: string;
    assigneeId?: string;
  },
): null {
  const staff = requireRole(ctx, [...STAFF]);
  const referral = referralForStaff(ctx, args.referralId);
  const dueDate = args.dueDate?.trim();
  if (dueDate && !isCalendarDate(dueDate))
    bad("Choose a valid follow-up date.");
  run(
    ctx.db,
    `INSERT INTO follow_up_tasks (id, referral_id, title, due_date, status, note, assignee_id, created_by_id, created_at)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
    newId(),
    referral.id,
    requireText(args.title, "Follow-up", 200),
    dueDate || null,
    optionalText(args.note, "Note", 500) ?? null,
    args.assigneeId || staff.id,
    staff.id,
    new Date().toISOString(),
  );
  logAudit(ctx, {
    actorId: staff.id,
    action: "followUp.added",
    entityType: "referral",
    entityId: referral.id,
    summary: `${referral.reference}: follow-up added — ${args.title}`,
  });
  return null;
}

export function completeFollowUp(ctx: Ctx, args: { taskId: string }): null {
  const staff = requireRole(ctx, [...STAFF]);
  run(
    ctx.db,
    "UPDATE follow_up_tasks SET status = 'done', completed_at = ? WHERE id = ?",
    new Date().toISOString(),
    args.taskId,
  );
  logAudit(ctx, {
    actorId: staff.id,
    action: "followUp.completed",
    entityType: "followUp",
    entityId: args.taskId,
    summary: "Follow-up marked done",
  });
  return null;
}

/** Preparation and consent the submitter can see on their own request page. */
export function previewForSubmitter(
  ctx: Ctx,
  referralId: string,
): CareRecord | null {
  const user = getCurrentUserDoc(ctx);
  if (!user) return null;
  const row = getRow<{ id: string; submitted_by_id: string }>(
    ctx.db,
    "SELECT id, submitted_by_id FROM referrals WHERE id = ?",
    referralId,
  );
  if (!row || row.submitted_by_id !== user.id) return null;
  const care = loadCareRecord(ctx, row.id);
  return {
    ...care,
    specimens: [],
    followUps: care.followUps.filter((task) => task.status === "open"),
  };
}
