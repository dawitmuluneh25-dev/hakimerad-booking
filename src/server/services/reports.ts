import {
  getCurrentUserDoc,
  logAudit,
  requireRole,
  type Ctx,
} from "../context.ts";
import { allRows, getRow, newId, run } from "../db.ts";
import { AppError, bad } from "../errors.ts";
import type {
  AuditEntry,
  InstitutionRecord,
  Page,
  PaginationOpts,
  ReportTotals,
} from "../types.ts";
import { optionalText, requireText } from "../validate.ts";
import { isCalendarDate } from "@/shared/referrals.ts";
import { publicContacts } from "./settings.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function requireRange(args: { from: string; to: string }): {
  from: string;
  to: string;
} {
  if (!DATE.test(args.from) || !DATE.test(args.to))
    bad("Choose a valid date range.");
  if (args.from > args.to) bad("The start date must be before the end date.");
  return args;
}

/**
 * Operational totals for a date range. Every figure comes from an indexed
 * aggregate query; nothing loads the full table into memory.
 */
export function metrics(
  ctx: Ctx,
  args: { from: string; to: string },
): ReportTotals {
  requireRole(ctx, ["admin"]);
  const range = requireRange(args);
  const start = `${range.from}T00:00:00.000Z`;
  const end = `${range.to}T23:59:59.999Z`;

  const byProcedure = allRows<{
    procedure: string;
    status: string;
    count: number;
  }>(
    ctx.db,
    `SELECT procedure, status, COUNT(*) AS count FROM referrals
      WHERE submitted_at >= ? AND submitted_at <= ?
      GROUP BY procedure, status`,
    start,
    end,
  );

  const countOf = (
    sql: string,
    ...params: Array<string | number | null>
  ): number => getRow<{ count: number }>(ctx.db, sql, ...params)?.count ?? 0;

  const requests = countOf(
    "SELECT COUNT(*) AS count FROM referrals WHERE submitted_at >= ? AND submitted_at <= ?",
    start,
    end,
  );
  const awaitingReview = countOf(
    `SELECT COUNT(*) AS count FROM referrals
      WHERE status IN ('submitted','in_review','info_requested') AND submitted_at >= ? AND submitted_at <= ?`,
    start,
    end,
  );
  const approved = countOf(
    "SELECT COUNT(*) AS count FROM referrals WHERE status = 'approved' AND submitted_at >= ? AND submitted_at <= ?",
    start,
    end,
  );
  const scheduled = countOf(
    "SELECT COUNT(*) AS count FROM appointments WHERE status IN ('scheduled','checked_in','in_progress')",
  );
  const completed = countOf(
    "SELECT COUNT(*) AS count FROM appointments WHERE status = 'completed'",
  );
  const cancelled = countOf(
    "SELECT COUNT(*) AS count FROM appointments WHERE status = 'cancelled'",
  );
  const urgentOpen = countOf(
    "SELECT COUNT(*) AS count FROM urgent_cases WHERE status NOT IN ('closed','declined')",
  );

  const upcomingRows = allRows<{ day: string; count: number }>(
    ctx.db,
    `SELECT substr(starts_at, 1, 10) AS day, COUNT(*) AS count FROM appointments
      WHERE status IN ('scheduled','checked_in') AND starts_at >= ?
      GROUP BY day ORDER BY day LIMIT 14`,
    `${range.from}T00:00`,
  );

  return {
    from: range.from,
    to: range.to,
    byProcedure,
    totals: {
      requests,
      awaitingReview,
      approved,
      scheduled,
      completed,
      cancelled,
      urgentOpen,
    },
    upcoming: upcomingRows.map((row) => ({ date: row.day, count: row.count })),
  };
}

/** Paginated audit log with an optional free-text search. */
export function auditLog(
  ctx: Ctx,
  args: {
    search?: string;
    entityType?: string;
    paginationOpts: PaginationOpts;
  },
): Page<AuditEntry> {
  if (!getCurrentUserDoc(ctx))
    return { page: [], isDone: true, continueCursor: "" };
  requireRole(ctx, ["admin"]);
  const offset = Number(args.paginationOpts.cursor ?? 0) || 0;
  const limit = Math.max(1, Math.min(args.paginationOpts.numItems, 100));
  const where: string[] = [];
  const params: Array<string | number | null> = [];
  if (args.entityType) {
    where.push("entity_type = ?");
    params.push(args.entityType);
  }
  const search = args.search?.trim();
  if (search) {
    where.push("(summary LIKE ? OR action LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like);
  }
  const rows = allRows<{
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    summary: string;
    at: string;
  }>(
    ctx.db,
    `SELECT * FROM audit_logs ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit + 1,
    offset,
  );
  const isDone = rows.length <= limit;
  const page = (isDone ? rows : rows.slice(0, limit)).map((row) => {
    const actor = row.actor_id
      ? getRow<{ full_name: string | null; email: string | null }>(
          ctx.db,
          "SELECT full_name, email FROM users WHERE id = ?",
          row.actor_id,
        )
      : undefined;
    return {
      _id: row.id,
      at: row.at,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      actor: row.actor_id
        ? (actor?.full_name ?? actor?.email ?? "User")
        : "System",
    };
  });
  return { page, isDone, continueCursor: isDone ? "" : String(offset + limit) };
}

export function listInstitutions(ctx: Ctx): InstitutionRecord[] {
  if (!getCurrentUserDoc(ctx)) return [];
  requireRole(ctx, ["admin", "coordinator", "receptionist"]);
  return allRows<{
    id: string;
    name: string;
    kind: string;
    address: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    status: string;
  }>(ctx.db, "SELECT * FROM institutions ORDER BY name").map((row) => ({
    _id: row.id,
    name: row.name,
    kind: row.kind,
    address: row.address,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    status: row.status,
  }));
}

export function saveInstitution(
  ctx: Ctx,
  args: {
    id?: string;
    name: string;
    kind: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    status?: string;
  },
): null {
  const admin = requireRole(ctx, ["admin"]);
  const name = requireText(args.name, "Institution name", 160);
  const kind = requireText(args.kind, "Institution type", 60);
  if (args.id) {
    run(
      ctx.db,
      `UPDATE institutions SET name = ?, kind = ?, address = ?, contact_name = ?, contact_phone = ?,
              contact_email = ?, status = ? WHERE id = ?`,
      name,
      kind,
      optionalText(args.address, "Address", 300) ?? null,
      optionalText(args.contactName, "Contact name", 120) ?? null,
      optionalText(args.contactPhone, "Contact phone", 40) ?? null,
      optionalText(args.contactEmail, "Contact email", 160) ?? null,
      args.status === "inactive" ? "inactive" : "active",
      args.id,
    );
    logAudit(ctx, {
      actorId: admin.id,
      action: "institution.updated",
      entityType: "institution",
      entityId: args.id,
      summary: `Institution updated: ${name}`,
    });
    return null;
  }
  const id = newId();
  run(
    ctx.db,
    `INSERT INTO institutions (id, name, kind, address, contact_name, contact_phone, contact_email, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    kind,
    optionalText(args.address, "Address", 300) ?? null,
    optionalText(args.contactName, "Contact name", 120) ?? null,
    optionalText(args.contactPhone, "Contact phone", 40) ?? null,
    optionalText(args.contactEmail, "Contact email", 160) ?? null,
    args.status === "inactive" ? "inactive" : "active",
    new Date().toISOString(),
  );
  logAudit(ctx, {
    actorId: admin.id,
    action: "institution.created",
    entityType: "institution",
    entityId: id,
    summary: `Institution added: ${name}`,
  });
  return null;
}

/** Manual payment status only: no gateway is configured or required. */
export function setPayment(
  ctx: Ctx,
  args: {
    referralId: string;
    status: string;
    feeCents?: number;
    note?: string;
  },
): null {
  const staff = requireRole(ctx, ["receptionist", "admin"]);
  if (!["unset", "due", "paid", "waived"].includes(args.status))
    bad("Choose a payment status.");
  const referral = getRow<{ id: string; reference: string }>(
    ctx.db,
    "SELECT id, reference FROM referrals WHERE id = ?",
    args.referralId,
  );
  if (!referral) throw new AppError("NOT_FOUND", "Request not found.");
  const fee =
    args.feeCents === undefined ? null : Math.max(0, Math.round(args.feeCents));
  run(
    ctx.db,
    "UPDATE referrals SET payment_status = ?, fee_cents = ?, payment_note = ?, updated_at = ? WHERE id = ?",
    args.status,
    fee,
    optionalText(args.note, "Note", 500) ?? null,
    new Date().toISOString(),
    referral.id,
  );
  logAudit(ctx, {
    actorId: staff.id,
    action: "payment.updated",
    entityType: "referral",
    entityId: referral.id,
    summary: `${referral.reference}: payment ${args.status}`,
  });
  return null;
}

/** Public contact block, so the public site reflects admin settings. */
export function contacts(ctx: Ctx): {
  phone: string;
  email: string;
  address: string;
  hours: string;
  emergencyPhone: string;
} {
  return publicContacts(ctx.db);
}

export function validateDate(value: string, label: string): string {
  if (!isCalendarDate(value)) bad(`${label} must be a valid date.`);
  return value;
}
