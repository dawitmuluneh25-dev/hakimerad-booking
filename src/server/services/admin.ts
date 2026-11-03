import {
  findUserById,
  getUserWithRole,
  logAudit,
  requireRole,
  toProfile,
  type Ctx,
  type PhysicianProfileRow,
  type UserRow,
} from "../context.ts";
import { allRows, getRow, run } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Page, PaginationOpts, PhysicianProfile } from "../types.ts";
import { optionalText } from "../validate.ts";
import { ROLE_LABELS, type PhysicianStatus, type Role } from "@/shared/roles.ts";

const ADMIN = ["admin"] as const;

type PhysicianListItem = PhysicianProfile & { email: string };
type UserListItem = {
  _id: string;
  email: string;
  fullName: string;
  role: Role | null;
  joinedAt: string;
};

function emptyPage<T>(): Page<T> {
  return { page: [], isDone: true, continueCursor: "" };
}

function pageOf<T, R>(rows: T[], offset: number, limit: number, map: (row: T) => R): Page<R> {
  const isDone = rows.length <= limit;
  const items = (isDone ? rows : rows.slice(0, limit)).map(map);
  return { page: items, isDone, continueCursor: isDone ? "" : String(offset + limit) };
}

function offsetOf(opts: PaginationOpts): number {
  return Number(opts.cursor ?? 0) || 0;
}

function limitOf(opts: PaginationOpts): number {
  return Math.max(1, Math.min(opts.numItems, 100));
}

/** Physician profiles filtered by status, newest submissions first. */
export function listPhysicians(
  ctx: Ctx,
  args: { status: PhysicianStatus; paginationOpts: PaginationOpts },
): Page<PhysicianListItem> {
  if (!getUserWithRole(ctx, ADMIN)) return emptyPage();
  const offset = offsetOf(args.paginationOpts);
  const limit = limitOf(args.paginationOpts);
  const rows = allRows<PhysicianProfileRow>(
    ctx.db,
    "SELECT * FROM physician_profiles WHERE status = ? ORDER BY submitted_at DESC LIMIT ? OFFSET ?",
    args.status,
    limit + 1,
    offset,
  );
  return pageOf(rows, offset, limit, (row) => {
    const user = findUserById(ctx.db, row.user_id);
    return { ...toProfile(row), email: user?.email ?? "" };
  });
}

export function reviewPhysician(
  ctx: Ctx,
  args: { profileId: string; decision: "verified" | "rejected" | "suspended"; note?: string },
): null {
  const admin = requireRole(ctx, ADMIN);
  const profile = getRow<PhysicianProfileRow>(
    ctx.db,
    "SELECT * FROM physician_profiles WHERE id = ?",
    args.profileId,
  );
  if (!profile) throw new AppError("NOT_FOUND", "Profile not found.");
  const note = optionalText(args.note, "Note");
  if (args.decision !== "verified" && !note) {
    throw new AppError("BAD_REQUEST", "Add a short reason so the physician knows what to fix.");
  }
  run(
    ctx.db,
    `UPDATE physician_profiles
        SET status = ?, review_note = ?, reviewed_by_id = ?, reviewed_at = ?
      WHERE id = ?`,
    args.decision,
    note ?? null,
    admin.id,
    new Date().toISOString(),
    profile.id,
  );
  logAudit(ctx, {
    actorId: admin.id,
    action: `physician.${args.decision}`,
    entityType: "physicianProfile",
    entityId: profile.id,
    summary: `${profile.full_name}: ${args.decision}${note ? ` (${note})` : ""}`,
  });
  return null;
}

/** Users list for role management, optionally narrowed to one role or an email search. */
export function listUsers(
  ctx: Ctx,
  args: { role?: Role | "unassigned"; search?: string; paginationOpts: PaginationOpts },
): Page<UserListItem> {
  if (!getUserWithRole(ctx, ADMIN)) return emptyPage();
  const offset = offsetOf(args.paginationOpts);
  const limit = limitOf(args.paginationOpts);
  const search = args.search?.trim();

  const where: string[] = [];
  const params: Array<string | number | null> = [];
  if (args.role === "unassigned") {
    where.push("role IS NULL");
  } else if (args.role) {
    where.push("role = ?");
    params.push(args.role);
  }
  if (search) {
    where.push("(email LIKE ? OR full_name LIKE ? OR name LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const rows = allRows<UserRow>(
    ctx.db,
    `SELECT * FROM users ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit + 1,
    offset,
  );

  return pageOf(rows, offset, limit, (u) => ({
    _id: u.id,
    email: u.email ?? "",
    fullName: u.full_name ?? u.name ?? "",
    role: u.role ?? null,
    joinedAt: u.created_at,
  }));
}

export function setUserRole(ctx: Ctx, args: { userId: string; role: Role }): null {
  const admin = requireRole(ctx, ADMIN);
  const target = findUserById(ctx.db, args.userId);
  if (!target) throw new AppError("NOT_FOUND", "User not found.");
  if (target.role === args.role) return null;

  if (target.role === "admin") {
    const admins = allRows<{ id: string }>(ctx.db, "SELECT id FROM users WHERE role = 'admin' LIMIT 2");
    if (admins.length < 2) {
      throw new AppError("CONFLICT", "At least one administrator must remain.");
    }
  }

  run(
    ctx.db,
    "UPDATE users SET role = ?, onboarded_at = ? WHERE id = ?",
    args.role,
    target.onboarded_at ?? new Date().toISOString(),
    target.id,
  );
  logAudit(ctx, {
    actorId: admin.id,
    action: "user.roleChanged",
    entityType: "user",
    entityId: target.id,
    summary: `${target.email ?? "User"}: ${target.role ? ROLE_LABELS[target.role] : "No role"} to ${ROLE_LABELS[args.role]}`,
  });
  return null;
}

/** Recent audit entries for one record, for admin detail views. */
export function auditForEntity(
  ctx: Ctx,
  args: { entityType: string; entityId: string },
): Array<{ _id: string; at: string; summary: string; actor: string }> {
  if (!getUserWithRole(ctx, ADMIN)) return [];
  const entries = allRows<{
    id: string;
    actor_id: string | null;
    summary: string;
    at: string;
  }>(
    ctx.db,
    `SELECT id, actor_id, summary, at FROM audit_logs
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY at DESC LIMIT 20`,
    args.entityType,
    args.entityId,
  );
  return entries.map((entry) => {
    const actor = entry.actor_id ? findUserById(ctx.db, entry.actor_id) : undefined;
    return {
      _id: entry.id,
      at: entry.at,
      summary: entry.summary,
      actor: entry.actor_id ? (actor?.full_name ?? actor?.email ?? "User") : "System",
    };
  });
}
