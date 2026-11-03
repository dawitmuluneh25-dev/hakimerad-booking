import {
  findProfileByUserId,
  getCurrentUserDoc,
  logAudit,
  requireRole,
  requireUser,
  type Ctx,
} from "../context.ts";
import { allRows, getRow, newId, run, transaction } from "../db.ts";
import { AppError, bad } from "../errors.ts";
import type {
  Guardian,
  Page,
  PaginationOpts,
  UrgentCaseDetail,
  UrgentCaseSummary,
  UrgentClinical,
  UrgentPatient,
} from "../types.ts";
import { optionalText, requirePhone, requireText } from "../validate.ts";
import {
  REFERRING_DEPARTMENTS,
  URGENT_STATUSES,
  canTransitionUrgent,
  type UrgentStatus,
} from "@/shared/workflow.ts";
import { isCalendarDate } from "@/shared/referrals.ts";
import { notifyUsers, urgentAlertRecipients } from "./notifications.ts";

const STAFF = ["receptionist", "radiologist", "coordinator", "admin"] as const;
const CLINICAL = ["radiologist"] as const;
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

type UrgentRow = {
  id: string;
  reference: string;
  status: UrgentStatus;
  department: string;
  facility_name: string;
  facility_phone: string;
  clinician_name: string;
  clinician_phone: string;
  patient_json: string;
  guardian_json: string | null;
  clinical_json: string;
  created_by_id: string;
  acknowledged_by_id: string | null;
  acknowledged_at: string | null;
  decision: string | null;
  decision_note: string | null;
  decided_by_id: string | null;
  decided_at: string | null;
  scheduled_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateReference(ctx: Ctx): string {
  const datePart = todayUtc().slice(2).replaceAll("-", "");
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix +=
        REFERENCE_ALPHABET[
          Math.floor(Math.random() * REFERENCE_ALPHABET.length)
        ];
    }
    const reference = `IR-${datePart}-${suffix}`;
    if (
      !getRow<{ id: string }>(
        ctx.db,
        "SELECT id FROM urgent_cases WHERE reference = ?",
        reference,
      )
    ) {
      return reference;
    }
  }
  throw new AppError(
    "CONFLICT",
    "Could not create a reference. Please try again.",
  );
}

function toSummary(row: UrgentRow): UrgentCaseSummary {
  const patient = JSON.parse(row.patient_json) as UrgentPatient;
  return {
    _id: row.id,
    reference: row.reference,
    status: row.status,
    patientName: patient.fullName,
    facilityName: row.facility_name,
    department: row.department,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
  };
}

function nameOf(ctx: Ctx, id: string | null): string | null {
  if (!id) return null;
  const row = getRow<{ full_name: string | null; email: string | null }>(
    ctx.db,
    "SELECT full_name, email FROM users WHERE id = ?",
    id,
  );
  return row?.full_name ?? row?.email ?? null;
}

function eventList(ctx: Ctx, caseId: string) {
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
    "SELECT * FROM urgent_events WHERE case_id = ? ORDER BY at ASC LIMIT 200",
    caseId,
  ).map((row) => ({
    _id: row.id,
    type: row.type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    actor: nameOf(ctx, row.actor_id) ?? "System",
    at: row.at,
  }));
}

function recordEvent(
  ctx: Ctx,
  caseId: string,
  type: string,
  fromStatus: string | null,
  toStatus: string | null,
  note: string | null,
  actorId: string | null,
): void {
  run(
    ctx.db,
    `INSERT INTO urgent_events (id, case_id, type, from_status, to_status, note, actor_id, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    caseId,
    type,
    fromStatus,
    toStatus,
    note,
    actorId,
    new Date().toISOString(),
  );
}

function requireCreator(ctx: Ctx): { id: string } {
  const user = requireUser(ctx);
  if (user.role === "physician") {
    const profile = findProfileByUserId(ctx.db, user.id);
    if (!profile || profile.status !== "verified") {
      throw new AppError(
        "FORBIDDEN",
        "Only verified physicians can start urgent coordination.",
      );
    }
    return { id: user.id };
  }
  if (user.role && (STAFF as readonly string[]).includes(user.role))
    return { id: user.id };
  throw new AppError(
    "FORBIDDEN",
    "Urgent coordination cases can only be created by hospital clinicians or HakimeRAD staff.",
  );
}

function loadCase(ctx: Ctx, reference: string): UrgentRow {
  const row = getRow<UrgentRow>(
    ctx.db,
    "SELECT * FROM urgent_cases WHERE reference = ?",
    reference.toUpperCase(),
  );
  if (!row) throw new AppError("NOT_FOUND", "Case not found.");
  return row;
}

function canView(ctx: Ctx, row: UrgentRow): boolean {
  const user = getCurrentUserDoc(ctx);
  if (!user) return false;
  if (row.created_by_id === user.id) return true;
  return user.role !== null && (STAFF as readonly string[]).includes(user.role);
}

export function create(
  ctx: Ctx,
  args: {
    department: string;
    facilityName: string;
    facilityPhone: string;
    clinicianName: string;
    clinicianPhone: string;
    patient: UrgentPatient;
    guardian?: Guardian;
    clinical: UrgentClinical;
    /** The referring clinician confirms they have read the urgent warning. */
    acknowledgeWarning: boolean;
  },
): { reference: string } {
  const creator = requireCreator(ctx);
  if (!args.acknowledgeWarning) {
    bad(
      "Confirm that this pathway is urgent coordination and not a routine booking.",
    );
  }
  if (!(REFERRING_DEPARTMENTS as readonly string[]).includes(args.department)) {
    bad("Choose the referring department.");
  }
  const patient: UrgentPatient = {
    fullName: requireText(args.patient.fullName, "Patient name", 120),
    dateOfBirth: args.patient.dateOfBirth,
    ageYears:
      args.patient.ageYears === undefined
        ? undefined
        : Math.max(0, Math.min(120, Math.round(args.patient.ageYears))),
    guardianName: optionalText(args.patient.guardianName, "Guardian name", 120),
    guardianPhone: args.patient.guardianPhone
      ? requirePhone(args.patient.guardianPhone)
      : undefined,
  };
  if (!isCalendarDate(patient.dateOfBirth)) bad("Enter a valid date of birth.");
  if (patient.dateOfBirth > todayUtc())
    bad("Date of birth cannot be in the future.");

  const guardian: Guardian | undefined = args.guardian
    ? {
        fullName: requireText(args.guardian.fullName, "Guardian name", 120),
        relationship: requireText(
          args.guardian.relationship,
          "Relationship",
          60,
        ),
        phone: requirePhone(args.guardian.phone),
      }
    : undefined;

  const coordinationTime = args.clinical.coordinationTime?.trim();
  if (coordinationTime && !LOCAL_TIME.test(coordinationTime)) {
    bad("Planned coordination time must look like 2026-05-04T09:30.");
  }

  const clinical: UrgentClinical = {
    presentation: requireText(
      args.clinical.presentation,
      "Clinical summary",
      2000,
    ),
    imagingAvailable: args.clinical.imagingAvailable,
    imagingDetail: optionalText(
      args.clinical.imagingDetail,
      "Imaging detail",
      1000,
    ),
    coordinationTime: coordinationTime || undefined,
    notes: optionalText(args.clinical.notes, "Coordination notes", 2000),
  };

  const reference = generateReference(ctx);
  const id = newId();
  const now = new Date().toISOString();
  run(
    ctx.db,
    `INSERT INTO urgent_cases
       (id, reference, status, department, facility_name, facility_phone, clinician_name, clinician_phone,
        patient_json, guardian_json, clinical_json, created_by_id, created_at, updated_at)
     VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    reference,
    args.department,
    requireText(args.facilityName, "Referring facility", 160),
    requirePhone(args.facilityPhone),
    requireText(args.clinicianName, "Referring clinician", 120),
    requirePhone(args.clinicianPhone),
    JSON.stringify(patient),
    guardian ? JSON.stringify(guardian) : null,
    JSON.stringify(clinical),
    creator.id,
    now,
    now,
  );
  recordEvent(
    ctx,
    id,
    "created",
    null,
    "new",
    "Urgent coordination requested",
    creator.id,
  );
  logAudit(ctx, {
    actorId: creator.id,
    action: "urgent.created",
    entityType: "urgentCase",
    entityId: id,
    summary: `Urgent case ${reference} created for ${patient.fullName}`,
  });

  notifyUsers(ctx, urgentAlertRecipients(ctx), {
    kind: "urgent_case",
    title: `Urgent intussusception referral ${reference}`,
    body: `${requireText(args.facilityName, "Referring facility", 160)} requested urgent hydrostatic reduction coordination. Contact the referring team directly; this alert is not a clinical acceptance.`,
    entityType: "urgentCase",
    entityId: id,
    link: `/urgent-cases/${reference}`,
  });

  return { reference };
}

export function list(
  ctx: Ctx,
  args: { status?: string; paginationOpts: PaginationOpts },
): Page<UrgentCaseSummary> {
  const user = getCurrentUserDoc(ctx);
  if (!user) return { page: [], isDone: true, continueCursor: "" };
  const staff =
    user.role !== null && (STAFF as readonly string[]).includes(user.role);
  if (!staff && user.role !== "physician")
    return { page: [], isDone: true, continueCursor: "" };
  const offset = Number(args.paginationOpts.cursor ?? 0) || 0;
  const limit = Math.max(1, Math.min(args.paginationOpts.numItems, 100));
  const where: string[] = [];
  const params: Array<string | number | null> = [];
  if (!staff) {
    where.push("created_by_id = ?");
    params.push(user.id);
  }
  if (args.status) {
    where.push("status = ?");
    params.push(args.status);
  }
  const rows = allRows<UrgentRow>(
    ctx.db,
    `SELECT * FROM urgent_cases ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END, created_at DESC
      LIMIT ? OFFSET ?`,
    ...params,
    limit + 1,
    offset,
  );
  const isDone = rows.length <= limit;
  return {
    page: (isDone ? rows : rows.slice(0, limit)).map(toSummary),
    isDone,
    continueCursor: isDone ? "" : String(offset + limit),
  };
}

export function detail(
  ctx: Ctx,
  args: { reference: string },
): UrgentCaseDetail | null {
  const row = getRow<UrgentRow>(
    ctx.db,
    "SELECT * FROM urgent_cases WHERE reference = ?",
    args.reference.toUpperCase(),
  );
  if (!row || !canView(ctx, row)) return null;
  const transitions: string[] = [];
  for (const candidate of URGENT_STATUSES) {
    if (canTransitionUrgent(row.status, candidate)) transitions.push(candidate);
  }
  return {
    ...toSummary(row),
    facilityPhone: row.facility_phone,
    clinicianName: row.clinician_name,
    clinicianPhone: row.clinician_phone,
    patient: JSON.parse(row.patient_json) as UrgentPatient,
    guardian: row.guardian_json
      ? (JSON.parse(row.guardian_json) as Guardian)
      : undefined,
    clinical: JSON.parse(row.clinical_json) as UrgentClinical,
    acknowledgedBy: nameOf(ctx, row.acknowledged_by_id),
    decision: row.decision,
    decisionNote: row.decision_note,
    decidedBy: nameOf(ctx, row.decided_by_id),
    decidedAt: row.decided_at,
    scheduledAt: row.scheduled_at,
    events: eventList(ctx, row.id),
    transitions,
  };
}

function transition(
  ctx: Ctx,
  row: UrgentRow,
  to: UrgentStatus,
  type: string,
  note: string | null,
  actorId: string,
): void {
  if (!canTransitionUrgent(row.status, to)) {
    throw new AppError(
      "BAD_REQUEST",
      `A case that is ${row.status.replaceAll("_", " ")} cannot move to ${to.replaceAll("_", " ")}.`,
    );
  }
  run(
    ctx.db,
    "UPDATE urgent_cases SET status = ?, updated_at = ? WHERE id = ?",
    to,
    new Date().toISOString(),
    row.id,
  );
  recordEvent(ctx, row.id, type, row.status, to, note, actorId);
  logAudit(ctx, {
    actorId,
    action: `urgent.${type}`,
    entityType: "urgentCase",
    entityId: row.id,
    summary: `${row.reference}: ${row.status} to ${to}${note ? ` (${note})` : ""}`,
  });
}

/** Radiology acknowledges the referral so the referring team sees a response. */
export function acknowledge(ctx: Ctx, args: { reference: string }): null {
  const staff = requireRole(ctx, ["radiologist", "coordinator", "admin"]);
  const row = loadCase(ctx, args.reference);
  transaction(ctx.db, () => {
    transition(
      ctx,
      row,
      "acknowledged",
      "acknowledged",
      "Radiology acknowledged the referral",
      staff.id,
    );
    run(
      ctx.db,
      "UPDATE urgent_cases SET acknowledged_by_id = ?, acknowledged_at = ? WHERE id = ?",
      staff.id,
      new Date().toISOString(),
      row.id,
    );
  });
  notifyUsers(ctx, [row.created_by_id], {
    kind: "urgent_acknowledged",
    title: `Case ${row.reference} acknowledged`,
    body: "The radiology team acknowledged your urgent referral and will coordinate directly. Acknowledgement is not a decision that the procedure will go ahead.",
    entityType: "urgentCase",
    entityId: row.id,
    link: `/urgent-cases/${row.reference}`,
  });
  return null;
}

/** Only a radiologist records the clinical coordination decision. */
export function decide(
  ctx: Ctx,
  args: { reference: string; decision: "accept" | "decline"; note: string },
): null {
  const clinician = requireRole(ctx, [...CLINICAL]);
  const row = loadCase(ctx, args.reference);
  const note = requireText(args.note, "Decision note", 1000);
  transaction(ctx.db, () => {
    transition(
      ctx,
      row,
      args.decision === "accept" ? "accepted" : "declined",
      args.decision === "accept" ? "accepted" : "declined",
      note,
      clinician.id,
    );
    run(
      ctx.db,
      `UPDATE urgent_cases SET decision = ?, decision_note = ?, decided_by_id = ?, decided_at = ? WHERE id = ?`,
      args.decision,
      note,
      clinician.id,
      new Date().toISOString(),
      row.id,
    );
  });
  notifyUsers(ctx, [row.created_by_id], {
    kind: "urgent_decision",
    title: `Coordination decision for ${row.reference}`,
    body: `The responsible clinical team recorded a decision: ${args.decision === "accept" ? "accepted for coordination" : "not accepted"}. ${note}`,
    entityType: "urgentCase",
    entityId: row.id,
    link: `/urgent-cases/${row.reference}`,
  });
  return null;
}

/** A procedure slot is arranged only after direct clinical coordination. */
export function scheduleSlot(
  ctx: Ctx,
  args: { reference: string; scheduledAt: string; note?: string },
): null {
  const staff = requireRole(ctx, [...STAFF]);
  const row = loadCase(ctx, args.reference);
  if (!LOCAL_TIME.test(args.scheduledAt))
    bad("Choose a date and time such as 2026-05-04T09:30.");
  if (row.status !== "accepted") {
    throw new AppError(
      "BAD_REQUEST",
      "A coordinator can only arrange a slot after the responsible clinician accepts the case.",
    );
  }
  transaction(ctx.db, () => {
    run(
      ctx.db,
      "UPDATE urgent_cases SET scheduled_at = ?, updated_at = ? WHERE id = ?",
      args.scheduledAt,
      new Date().toISOString(),
      row.id,
    );
    transition(
      ctx,
      row,
      "scheduled",
      "slot_arranged",
      optionalText(args.note, "Note", 500) ??
        `Procedure slot ${args.scheduledAt}`,
      staff.id,
    );
  });
  notifyUsers(ctx, [row.created_by_id], {
    kind: "urgent_decision",
    title: `Procedure slot arranged for ${row.reference}`,
    body: `The team arranged a procedure slot for ${args.scheduledAt.replace("T", " ")}. Contact the department directly to confirm transfer details.`,
    entityType: "urgentCase",
    entityId: row.id,
    link: `/urgent-cases/${row.reference}`,
  });
  return null;
}

export function close(
  ctx: Ctx,
  args: { reference: string; note?: string },
): null {
  const staff = requireRole(ctx, [...STAFF]);
  const row = loadCase(ctx, args.reference);
  transaction(ctx.db, () => {
    run(
      ctx.db,
      "UPDATE urgent_cases SET closed_at = ?, updated_at = ? WHERE id = ?",
      new Date().toISOString(),
      new Date().toISOString(),
      row.id,
    );
    transition(
      ctx,
      row,
      "closed",
      "closed",
      optionalText(args.note, "Note", 500) ?? null,
      staff.id,
    );
  });
  return null;
}
