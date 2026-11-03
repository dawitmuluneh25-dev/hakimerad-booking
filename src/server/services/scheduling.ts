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
  AppointmentSummary,
  BookableReferral,
  Page,
  PaginationOpts,
  ProcedureSetting,
  Resource,
  ScheduleException,
} from "../types.ts";
import { optionalText, requireText } from "../validate.ts";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  CLINICAL_PRIORITY_LABELS,
  type ClinicalPriority,
} from "@/shared/workflow.ts";
import {
  PROCEDURE_LABELS,
  type ReferralProcedure,
} from "@/shared/referrals.ts";
import {
  WEEKDAYS,
  clockToMinutes,
  minutesToClock,
  type Weekday,
} from "@/shared/settings.ts";
import { notifyUsers } from "./notifications.ts";
import { getSetting } from "./settings.ts";

/**
 * Appointment times are clinic wall-clock strings: `YYYY-MM-DDTHH:MM`. Keeping
 * them free of a time-zone suffix means opening hours, conflicts and the
 * calendar all compare the same strings, with no conversion library.
 */
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

const STAFF = ["receptionist", "radiologist", "coordinator", "admin"] as const;
const BOOKING_ROLES = ["receptionist", "coordinator", "admin"] as const;

function nowLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function parseLocal(
  value: string,
  label: string,
): { date: string; minutes: number } {
  if (!LOCAL_TIME.test(value))
    bad(`${label} must be a date and time such as 2026-05-04T09:30.`);
  const [date, time] = value.split("T");
  return { date, minutes: clockToMinutes(time) };
}

function weekdayOf(date: string): Weekday {
  const day = new Date(`${date}T00:00:00`).getDay();
  return WEEKDAYS[(day + 6) % 7];
}

export function workingWindow(
  db: Parameters<typeof getSetting>[0],
  date: string,
): { open: number; close: number } | null {
  const hours = getSetting(db, "schedule.workingHours");
  const day = hours[weekdayOf(date)];
  if (!day) return null;
  return { open: clockToMinutes(day.open), close: clockToMinutes(day.close) };
}

function addMinutes(value: string, minutes: number): string {
  const { date, minutes: start } = {
    date: value.slice(0, 10),
    minutes: clockToMinutes(value.slice(11)),
  };
  const total = start + minutes;
  return `${date}T${minutesToClock(total)}`;
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function requireProcedureSetting(
  db: Parameters<typeof getSetting>[0],
  procedure: string,
): ProcedureSetting {
  const row = getRow<{
    procedure: string;
    duration_minutes: number;
    buffer_minutes: number;
    active: number;
  }>(db, "SELECT * FROM procedure_settings WHERE procedure = ?", procedure);
  if (!row || row.active !== 1) {
    throw new AppError(
      "BAD_REQUEST",
      "This procedure has no duration configured. Ask an administrator to set one in Admin → Procedures.",
    );
  }
  return {
    procedure: row.procedure,
    durationMinutes: row.duration_minutes,
    bufferMinutes: row.buffer_minutes,
    active: row.active === 1,
  };
}

export function listResources(ctx: Ctx): Resource[] {
  if (!getUserWithAnyRole(ctx, STAFF)) return [];
  return allRows<{
    id: string;
    kind: string;
    name: string;
    modality: string | null;
    active: number;
  }>(ctx.db, "SELECT * FROM resources ORDER BY kind, name").map((row) => ({
    _id: row.id,
    kind: row.kind,
    name: row.name,
    modality: row.modality,
    active: row.active === 1,
  }));
}

function getUserWithAnyRole(ctx: Ctx, roles: readonly string[]) {
  const user = getCurrentUserDoc(ctx);
  if (!user?.role || !roles.includes(user.role)) return null;
  return user;
}

export function saveResource(
  ctx: Ctx,
  args: {
    id?: string;
    kind: string;
    name: string;
    modality?: string;
    active?: boolean;
  },
): null {
  const admin = requireRole(ctx, ["admin"]);
  if (!["room", "equipment", "staff"].includes(args.kind))
    bad("Choose a resource type.");
  const name = requireText(args.name, "Resource name", 120);
  const modality = optionalText(args.modality, "Modality", 40) ?? null;
  const active = args.active === false ? 0 : 1;
  if (args.id) {
    run(
      ctx.db,
      "UPDATE resources SET kind = ?, name = ?, modality = ?, active = ? WHERE id = ?",
      args.kind,
      name,
      modality,
      active,
      args.id,
    );
    logAudit(ctx, {
      actorId: admin.id,
      action: "resource.updated",
      entityType: "resource",
      entityId: args.id,
      summary: `Resource updated: ${name}`,
    });
    return null;
  }
  const id = newId();
  run(
    ctx.db,
    "INSERT INTO resources (id, kind, name, modality, active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    args.kind,
    name,
    modality,
    active,
    new Date().toISOString(),
  );
  logAudit(ctx, {
    actorId: admin.id,
    action: "resource.created",
    entityType: "resource",
    entityId: id,
    summary: `Resource added: ${name}`,
  });
  return null;
}

export function listProcedureSettings(ctx: Ctx): ProcedureSetting[] {
  if (!getUserWithAnyRole(ctx, STAFF)) return [];
  return allRows<{
    procedure: string;
    duration_minutes: number;
    buffer_minutes: number;
    active: number;
  }>(ctx.db, "SELECT * FROM procedure_settings ORDER BY procedure").map(
    (row) => ({
      procedure: row.procedure,
      durationMinutes: row.duration_minutes,
      bufferMinutes: row.buffer_minutes,
      active: row.active === 1,
    }),
  );
}

export function saveProcedureSetting(
  ctx: Ctx,
  args: {
    procedure: string;
    durationMinutes: number;
    bufferMinutes: number;
    active?: boolean;
  },
): null {
  const admin = requireRole(ctx, ["admin"]);
  const duration = Math.round(args.durationMinutes);
  const buffer = Math.round(args.bufferMinutes);
  if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
    bad("Duration must be between 5 and 480 minutes.");
  }
  if (!Number.isFinite(buffer) || buffer < 0 || buffer > 240) {
    bad("Buffer must be between 0 and 240 minutes.");
  }
  run(
    ctx.db,
    `INSERT INTO procedure_settings (procedure, duration_minutes, buffer_minutes, active, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (procedure) DO UPDATE SET
       duration_minutes = excluded.duration_minutes,
       buffer_minutes = excluded.buffer_minutes,
       active = excluded.active,
       updated_at = excluded.updated_at`,
    args.procedure,
    duration,
    buffer,
    args.active === false ? 0 : 1,
    new Date().toISOString(),
  );
  logAudit(ctx, {
    actorId: admin.id,
    action: "procedureSetting.updated",
    entityType: "procedureSetting",
    entityId: args.procedure,
    summary: `${args.procedure}: ${duration} minutes, ${buffer} minute buffer`,
  });
  return null;
}

export function listExceptions(
  ctx: Ctx,
  args: { from: string; to: string },
): ScheduleException[] {
  if (!getUserWithAnyRole(ctx, STAFF)) return [];
  const rows = allRows<{
    id: string;
    kind: string;
    resource_id: string | null;
    resource_name: string | null;
    starts_at: string;
    ends_at: string;
    note: string | null;
  }>(
    ctx.db,
    `SELECT e.*, r.name AS resource_name FROM schedule_exceptions e
       LEFT JOIN resources r ON r.id = e.resource_id
      WHERE e.ends_at > ? AND e.starts_at < ?
      ORDER BY e.starts_at`,
    args.from,
    args.to,
  );
  return rows.map((row) => ({
    _id: row.id,
    kind: row.kind,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    note: row.note,
  }));
}

export function addException(
  ctx: Ctx,
  args: {
    kind: string;
    resourceId?: string;
    startsAt: string;
    endsAt: string;
    note?: string;
  },
): null {
  const admin = requireRole(ctx, ["admin", "coordinator"]);
  if (!["leave", "closure", "holiday"].includes(args.kind))
    bad("Choose an exception type.");
  parseLocal(args.startsAt, "Start");
  parseLocal(args.endsAt, "End");
  if (args.startsAt >= args.endsAt) bad("The end must be after the start.");
  const id = newId();
  run(
    ctx.db,
    `INSERT INTO schedule_exceptions (id, kind, resource_id, starts_at, ends_at, note, created_by_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    args.kind,
    args.resourceId || null,
    args.startsAt,
    args.endsAt,
    optionalText(args.note, "Note", 300) ?? null,
    admin.id,
    new Date().toISOString(),
  );
  logAudit(ctx, {
    actorId: admin.id,
    action: "schedule.exceptionAdded",
    entityType: "scheduleException",
    entityId: id,
    summary: `${args.kind} ${args.startsAt} to ${args.endsAt}`,
  });
  return null;
}

export function removeException(ctx: Ctx, args: { id: string }): null {
  const admin = requireRole(ctx, ["admin", "coordinator"]);
  run(ctx.db, "DELETE FROM schedule_exceptions WHERE id = ?", args.id);
  logAudit(ctx, {
    actorId: admin.id,
    action: "schedule.exceptionRemoved",
    entityType: "scheduleException",
    entityId: args.id,
    summary: "Schedule exception removed",
  });
  return null;
}

/** Approved referrals that do not have a booking yet. */
export function listBookable(ctx: Ctx): BookableReferral[] {
  if (!getUserWithAnyRole(ctx, BOOKING_ROLES)) return [];
  return allRows<{
    id: string;
    reference: string;
    procedure: string;
    patient_json: string;
    priority: string | null;
  }>(
    ctx.db,
    `SELECT r.id, r.reference, r.procedure, r.patient_json, r.priority FROM referrals r
       LEFT JOIN appointments a ON a.referral_id = r.id
      WHERE r.status = 'approved' AND a.id IS NULL
      ORDER BY r.priority = 'urgent' DESC, r.submitted_at ASC
      LIMIT 100`,
  ).map((row) => ({
    _id: row.id,
    reference: row.reference,
    procedure: row.procedure,
    patientName: (JSON.parse(row.patient_json) as { fullName: string })
      .fullName,
    priority: row.priority,
  }));
}

type AppointmentRow = {
  id: string;
  referral_id: string;
  reference: string;
  procedure: string;
  patient_json: string;
  starts_at: string;
  ends_at: string;
  room_id: string | null;
  room_name: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  radiologist_id: string | null;
  radiologist_name: string | null;
  status: string;
  cancel_reason: string | null;
};

const APPOINTMENT_SELECT = `SELECT a.*, r.reference, r.procedure, r.patient_json,
        room.name AS room_name, equipment.name AS equipment_name,
        radio.full_name AS radiologist_name
   FROM appointments a
   JOIN referrals r ON r.id = a.referral_id
   LEFT JOIN resources room ON room.id = a.room_id
   LEFT JOIN resources equipment ON equipment.id = a.equipment_id
   LEFT JOIN users radio ON radio.id = a.radiologist_id`;

function toAppointment(row: AppointmentRow): AppointmentSummary {
  return {
    _id: row.id,
    referralId: row.referral_id,
    reference: row.reference,
    procedure: row.procedure,
    patientName: (JSON.parse(row.patient_json) as { fullName: string })
      .fullName,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    roomId: row.room_id,
    roomName: row.room_name,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    radiologistId: row.radiologist_id,
    radiologistName: row.radiologist_name,
    status: row.status,
    cancelReason: row.cancel_reason,
  };
}

export function listAppointments(
  ctx: Ctx,
  args: { from: string; to: string },
): AppointmentSummary[] {
  if (!getUserWithAnyRole(ctx, STAFF)) return [];
  const rows = allRows<AppointmentRow>(
    ctx.db,
    `${APPOINTMENT_SELECT} WHERE a.starts_at >= ? AND a.starts_at < ? ORDER BY a.starts_at`,
    args.from,
    args.to,
  );
  return rows.map(toAppointment);
}

export function appointmentForReferral(
  ctx: Ctx,
  referralId: string,
): AppointmentSummary | null {
  const row = getRow<AppointmentRow>(
    ctx.db,
    `${APPOINTMENT_SELECT} WHERE a.referral_id = ?`,
    referralId,
  );
  return row ? toAppointment(row) : null;
}

type Conflict = { kind: string; name: string };

function findConflicts(
  db: Parameters<typeof getSetting>[0],
  input: {
    startsAt: string;
    endsAt: string;
    roomId?: string | null;
    equipmentId?: string | null;
    radiologistId?: string | null;
    ignoreAppointmentId?: string;
  },
): Conflict[] {
  const conflicts: Conflict[] = [];
  const statuses = ACTIVE_APPOINTMENT_STATUSES.map(() => "?").join(", ");
  const rows = allRows<{
    id: string;
    room_id: string | null;
    equipment_id: string | null;
    radiologist_id: string | null;
  }>(
    db,
    `SELECT id, room_id, equipment_id, radiologist_id FROM appointments
      WHERE status IN (${statuses}) AND starts_at < ? AND ends_at > ?`,
    ...ACTIVE_APPOINTMENT_STATUSES,
    input.endsAt,
    input.startsAt,
  );
  for (const row of rows) {
    if (input.ignoreAppointmentId && row.id === input.ignoreAppointmentId)
      continue;
    if (input.roomId && row.room_id === input.roomId)
      conflicts.push({ kind: "room", name: input.roomId });
    if (input.equipmentId && row.equipment_id === input.equipmentId)
      conflicts.push({ kind: "equipment", name: input.equipmentId });
    if (input.radiologistId && row.radiologist_id === input.radiologistId)
      conflicts.push({ kind: "radiologist", name: input.radiologistId });
  }

  const exceptions = allRows<{ resource_id: string | null; kind: string }>(
    db,
    `SELECT resource_id, kind FROM schedule_exceptions WHERE starts_at < ? AND ends_at > ?`,
    input.endsAt,
    input.startsAt,
  );
  for (const exception of exceptions) {
    if (!exception.resource_id)
      conflicts.push({ kind: "closure", name: exception.kind });
  }
  return conflicts;
}

function assertSchedulable(
  ctx: Ctx,
  input: {
    procedure: string;
    startsAt: string;
    roomId?: string | null;
    equipmentId?: string | null;
    radiologistId?: string | null;
    ignoreAppointmentId?: string;
  },
): { endsAt: string } {
  const setting = requireProcedureSetting(ctx.db, input.procedure);
  const { date, minutes } = parseLocal(input.startsAt, "Start time");
  const window = workingWindow(ctx.db, date);
  if (!window) bad("The clinic is closed on that day.");
  if (minutes < window.open) bad("That time is before opening hours.");
  const total = setting.durationMinutes + setting.bufferMinutes;
  if (minutes + setting.durationMinutes > window.close) {
    bad("That booking would run past closing time.");
  }
  const endsAt = addMinutes(input.startsAt, total);
  const conflicts = findConflicts(ctx.db, { ...input, endsAt });
  if (conflicts.length > 0) {
    const kinds = [...new Set(conflicts.map((conflict) => conflict.kind))].join(
      ", ",
    );
    throw new AppError(
      "CONFLICT",
      `That slot is already taken (${kinds}). Choose another time.`,
    );
  }
  return { endsAt };
}

export function book(
  ctx: Ctx,
  args: {
    referralId: string;
    startsAt: string;
    roomId?: string;
    equipmentId?: string;
    radiologistId?: string;
  },
): { appointmentId: string } {
  const staff = requireRole(ctx, [...BOOKING_ROLES, "radiologist"]);
  const referral = getRow<{
    id: string;
    reference: string;
    procedure: string;
    status: string;
    submitted_by_id: string;
  }>(
    ctx.db,
    "SELECT id, reference, procedure, status, submitted_by_id FROM referrals WHERE id = ?",
    args.referralId,
  );
  if (!referral) throw new AppError("NOT_FOUND", "Request not found.");
  if (referral.status !== "approved") {
    throw new AppError(
      "BAD_REQUEST",
      "Only a clinically approved request can be scheduled.",
    );
  }
  const existing = getRow<{ id: string }>(
    ctx.db,
    "SELECT id FROM appointments WHERE referral_id = ? AND status != 'cancelled'",
    referral.id,
  );
  if (existing)
    throw new AppError("CONFLICT", "This request already has an appointment.");

  const appointmentId = newId();
  transaction(ctx.db, () => {
    const { endsAt } = assertSchedulable(ctx, {
      procedure: referral.procedure,
      startsAt: args.startsAt,
      roomId: args.roomId,
      equipmentId: args.equipmentId,
      radiologistId: args.radiologistId,
    });
    const now = new Date().toISOString();
    run(
      ctx.db,
      `INSERT INTO appointments
         (id, referral_id, procedure, starts_at, ends_at, room_id, equipment_id, radiologist_id,
          status, created_by_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
      appointmentId,
      referral.id,
      referral.procedure,
      args.startsAt,
      endsAt,
      args.roomId || null,
      args.equipmentId || null,
      args.radiologistId || null,
      staff.id,
      now,
      now,
    );
    run(
      ctx.db,
      "UPDATE referrals SET status = 'scheduled', updated_at = ? WHERE id = ?",
      now,
      referral.id,
    );
    recordEvent(
      ctx,
      referral.id,
      "scheduled",
      referral.status,
      "scheduled",
      `Booked for ${args.startsAt}`,
      staff.id,
    );
    logAudit(ctx, {
      actorId: staff.id,
      action: "appointment.booked",
      entityType: "referral",
      entityId: referral.id,
      summary: `${referral.reference} scheduled for ${args.startsAt}`,
    });
  });

  notifyUsers(ctx, [referral.submitted_by_id], {
    kind: "appointment_scheduled",
    title: `Appointment scheduled for ${referral.reference}`,
    body: `Your procedure has been scheduled for ${args.startsAt.replace("T", " ")}. Please arrive at the time your care team confirms.`,
    entityType: "referral",
    entityId: referral.id,
    link: `/requests/${referral.reference}`,
  });
  return { appointmentId };
}

export function reschedule(
  ctx: Ctx,
  args: {
    appointmentId: string;
    startsAt: string;
    roomId?: string;
    equipmentId?: string;
    radiologistId?: string;
  },
): null {
  const staff = requireRole(ctx, [...BOOKING_ROLES, "radiologist"]);
  const row = getRow<{
    id: string;
    referral_id: string;
    reference: string;
    procedure: string;
    status: string;
    submitted_by_id: string;
  }>(
    ctx.db,
    `SELECT a.id, a.referral_id, a.procedure, a.status, r.reference, r.submitted_by_id
       FROM appointments a JOIN referrals r ON r.id = a.referral_id WHERE a.id = ?`,
    args.appointmentId,
  );
  if (!row) throw new AppError("NOT_FOUND", "Appointment not found.");
  if (row.status === "cancelled" || row.status === "completed") {
    throw new AppError(
      "BAD_REQUEST",
      "This appointment can no longer be changed.",
    );
  }
  transaction(ctx.db, () => {
    const { endsAt } = assertSchedulable(ctx, {
      procedure: row.procedure,
      startsAt: args.startsAt,
      roomId: args.roomId,
      equipmentId: args.equipmentId,
      radiologistId: args.radiologistId,
      ignoreAppointmentId: row.id,
    });
    run(
      ctx.db,
      `UPDATE appointments SET starts_at = ?, ends_at = ?, room_id = ?, equipment_id = ?,
              radiologist_id = ?, updated_at = ? WHERE id = ?`,
      args.startsAt,
      endsAt,
      args.roomId || null,
      args.equipmentId || null,
      args.radiologistId || null,
      new Date().toISOString(),
      row.id,
    );
    recordEvent(
      ctx,
      row.referral_id,
      "rescheduled",
      row.status,
      row.status,
      `Moved to ${args.startsAt}`,
      staff.id,
    );
    logAudit(ctx, {
      actorId: staff.id,
      action: "appointment.rescheduled",
      entityType: "appointment",
      entityId: row.id,
      summary: `${row.reference} moved to ${args.startsAt}`,
    });
  });
  notifyUsers(ctx, [row.submitted_by_id], {
    kind: "appointment_rescheduled",
    title: `Appointment moved for ${row.reference}`,
    body: `The procedure is now booked for ${args.startsAt.replace("T", " ")}.`,
    entityType: "referral",
    entityId: row.referral_id,
    link: `/requests/${row.reference}`,
  });
  return null;
}

export function cancel(
  ctx: Ctx,
  args: { appointmentId: string; reason: string },
): null {
  const staff = requireRole(ctx, [...BOOKING_ROLES, "radiologist"]);
  const reason = requireText(args.reason, "Reason", 300);
  const row = getRow<{
    id: string;
    referral_id: string;
    reference: string;
    submitted_by_id: string;
  }>(
    ctx.db,
    `SELECT a.id, a.referral_id, r.reference, r.submitted_by_id FROM appointments a
       JOIN referrals r ON r.id = a.referral_id WHERE a.id = ?`,
    args.appointmentId,
  );
  if (!row) throw new AppError("NOT_FOUND", "Appointment not found.");
  transaction(ctx.db, () => {
    run(
      ctx.db,
      "UPDATE appointments SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE id = ?",
      reason,
      new Date().toISOString(),
      row.id,
    );
    run(
      ctx.db,
      "UPDATE referrals SET status = 'approved', updated_at = ? WHERE id = ?",
      new Date().toISOString(),
      row.referral_id,
    );
    recordEvent(
      ctx,
      row.referral_id,
      "cancelled",
      "scheduled",
      "approved",
      reason,
      staff.id,
    );
    logAudit(ctx, {
      actorId: staff.id,
      action: "appointment.cancelled",
      entityType: "appointment",
      entityId: row.id,
      summary: `${row.reference} cancelled: ${reason}`,
    });
  });
  notifyUsers(ctx, [row.submitted_by_id], {
    kind: "appointment_cancelled",
    title: `Appointment cancelled for ${row.reference}`,
    body: "The team cancelled the appointment and will contact you about a new date.",
    entityType: "referral",
    entityId: row.referral_id,
    link: `/requests/${row.reference}`,
  });
  return null;
}

export function setAppointmentStatus(
  ctx: Ctx,
  args: { appointmentId: string; status: string },
): null {
  const staff = requireRole(ctx, [...STAFF]);
  if (
    !ACTIVE_APPOINTMENT_STATUSES.includes(args.status as never) &&
    args.status !== "completed" &&
    args.status !== "no_show"
  ) {
    bad("Unknown appointment status.");
  }
  const row = getRow<{
    id: string;
    referral_id: string;
    reference: string;
    status: string;
  }>(
    ctx.db,
    `SELECT a.id, a.referral_id, a.status, r.reference FROM appointments a
       JOIN referrals r ON r.id = a.referral_id WHERE a.id = ?`,
    args.appointmentId,
  );
  if (!row) throw new AppError("NOT_FOUND", "Appointment not found.");
  transaction(ctx.db, () => {
    run(
      ctx.db,
      "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
      args.status,
      new Date().toISOString(),
      row.id,
    );
    if (args.status === "completed") {
      run(
        ctx.db,
        "UPDATE referrals SET status = 'completed', updated_at = ? WHERE id = ?",
        new Date().toISOString(),
        row.referral_id,
      );
      recordEvent(
        ctx,
        row.referral_id,
        "completed",
        "scheduled",
        "completed",
        "Procedure completed",
        staff.id,
      );
    }
    logAudit(ctx, {
      actorId: staff.id,
      action: "appointment.statusChanged",
      entityType: "appointment",
      entityId: row.id,
      summary: `${row.reference}: ${args.status}`,
    });
  });
  return null;
}

/** Free start times for one day, filtered against bookings and openings. */
export function availability(
  ctx: Ctx,
  args: {
    date: string;
    procedure: string;
    roomId?: string;
    equipmentId?: string;
    radiologistId?: string;
  },
): Array<{ startsAt: string; available: boolean }> {
  if (!getUserWithAnyRole(ctx, BOOKING_ROLES)) return [];
  const setting = requireProcedureSetting(ctx.db, args.procedure);
  const window = workingWindow(ctx.db, args.date);
  if (!window) return [];
  const step = getSetting(ctx.db, "schedule.slotStepMinutes");
  const slots: Array<{ startsAt: string; available: boolean }> = [];
  const total = setting.durationMinutes + setting.bufferMinutes;
  for (
    let minutes = window.open;
    minutes + setting.durationMinutes <= window.close;
    minutes += step
  ) {
    const startsAt = `${args.date}T${minutesToClock(minutes)}`;
    const endsAt = addMinutes(startsAt, total);
    const conflicts = findConflicts(ctx.db, {
      startsAt,
      endsAt,
      roomId: args.roomId,
      equipmentId: args.equipmentId,
      radiologistId: args.radiologistId,
    });
    slots.push({ startsAt, available: conflicts.length === 0 });
  }
  return slots;
}

/** Pending urgent cases needing coordination are surfaced on the schedule page. */
export function listAppointmentsPage(
  ctx: Ctx,
  opts: PaginationOpts,
): Page<AppointmentSummary> {
  void opts;
  const user = getUserWithAnyRole(ctx, STAFF);
  if (!user) return { page: [], isDone: true, continueCursor: "" };
  const from = nowLocal().slice(0, 10);
  return {
    page: listAppointments(ctx, {
      from: `${from}T00:00`,
      to: `${from.slice(0, 4)}-99-99T00:00`,
    }),
    isDone: true,
    continueCursor: "",
  };
}

export function patientAppointment(ctx: Ctx): AppointmentSummary | null {
  const user = requireUser(ctx);
  const row = getRow<AppointmentRow>(
    ctx.db,
    `${APPOINTMENT_SELECT} WHERE r.submitted_by_id = ? AND a.status IN ('scheduled','checked_in','in_progress')
      ORDER BY a.starts_at LIMIT 1`,
    user.id,
  );
  return row ? toAppointment(row) : null;
}

export function recordEvent(
  ctx: Ctx,
  referralId: string,
  type: string,
  fromStatus: string | null,
  toStatus: string | null,
  note: string | null,
  actorId: string | null,
): void {
  run(
    ctx.db,
    `INSERT INTO referral_events (id, referral_id, type, from_status, to_status, note, actor_id, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    referralId,
    type,
    fromStatus,
    toStatus,
    note,
    actorId,
    new Date().toISOString(),
  );
}

export function procedureLabel(procedure: string): string {
  return PROCEDURE_LABELS[procedure as ReferralProcedure] ?? procedure;
}

export function priorityLabel(priority: string | null): string {
  return priority
    ? (CLINICAL_PRIORITY_LABELS[priority as ClinicalPriority] ?? priority)
    : "Not set";
}

export function procedureDurationLabel(ctx: Ctx, procedure: string): string {
  const setting = requireProcedureSetting(ctx.db, procedure);
  return `${setting.durationMinutes} min + ${setting.bufferMinutes} min buffer`;
}
