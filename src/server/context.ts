import type { Db } from "./db.ts";
import { getRow, newId, run } from "./db.ts";
import { AppError } from "./errors.ts";
import type { PhysicianProfile, User } from "./types.ts";
import type { Role } from "@/shared/roles.ts";

/** The OIDC identity behind a request, or null when signed out. */
export type Identity = {
  /** `issuer|subject`, stable for one account at one provider. */
  tokenIdentifier: string;
  subject: string;
  email?: string;
  name?: string;
};

export type Ctx = { db: Db; identity: Identity | null };

export type UserRow = {
  id: string;
  token_identifier: string;
  name: string | null;
  email: string | null;
  role: Role | null;
  full_name: string | null;
  phone: string | null;
  onboarded_at: string | null;
  created_at: string;
};

export type PhysicianProfileRow = {
  id: string;
  user_id: string;
  full_name: string;
  registration_number: string;
  licensing_body: string;
  specialty: string;
  facility_name: string;
  facility_address: string;
  phone: string;
  status: PhysicianProfile["status"];
  submitted_at: string;
  review_note: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
};

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    tokenIdentifier: row.token_identifier,
    name: row.name ?? undefined,
    email: row.email ?? undefined,
    role: row.role ?? undefined,
    fullName: row.full_name ?? undefined,
    phone: row.phone ?? undefined,
    onboardedAt: row.onboarded_at ?? undefined,
  };
}

export function toProfile(row: PhysicianProfileRow): PhysicianProfile {
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    registrationNumber: row.registration_number,
    licensingBody: row.licensing_body,
    specialty: row.specialty,
    facilityName: row.facility_name,
    facilityAddress: row.facility_address,
    phone: row.phone,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewNote: row.review_note ?? undefined,
    reviewedById: row.reviewed_by_id ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

export function findUserById(db: Db, id: string): UserRow | undefined {
  return getRow<UserRow>(db, "SELECT * FROM users WHERE id = ?", id);
}

export function findProfileByUserId(db: Db, userId: string): PhysicianProfileRow | undefined {
  return getRow<PhysicianProfileRow>(db, "SELECT * FROM physician_profiles WHERE user_id = ?", userId);
}

/** The signed-in user's row, or null when signed out or not yet synced. */
export function getCurrentUserDoc(ctx: Ctx): UserRow | null {
  if (!ctx.identity) return null;
  return (
    getRow<UserRow>(ctx.db, "SELECT * FROM users WHERE token_identifier = ?", ctx.identity.tokenIdentifier) ?? null
  );
}

export function requireUser(ctx: Ctx): UserRow {
  if (!ctx.identity) throw new AppError("UNAUTHENTICATED", "Please sign in.");
  const user = getCurrentUserDoc(ctx);
  if (!user) {
    throw new AppError(
      "NOT_FOUND",
      "Your account record is missing. Sign out and sign in again.",
    );
  }
  return user;
}

export function requireRole(ctx: Ctx, roles: readonly Role[]): UserRow {
  const user = requireUser(ctx);
  if (!user.role || !roles.includes(user.role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to do this.");
  }
  return user;
}

/** Returns the role-checked user, or null instead of throwing (for read-only UI queries). */
export function getUserWithRole(ctx: Ctx, roles: readonly Role[]): UserRow | null {
  const user = getCurrentUserDoc(ctx);
  if (!user?.role || !roles.includes(user.role)) return null;
  return user;
}

/** Physicians may only refer once an admin has verified their profile. */
export function requireVerifiedPhysician(ctx: Ctx): { user: UserRow; profile: PhysicianProfileRow } {
  const user = requireRole(ctx, ["physician"]);
  const profile = findProfileByUserId(ctx.db, user.id);
  if (!profile || profile.status !== "verified") {
    throw new AppError("FORBIDDEN", "Your physician profile must be verified before you can refer.");
  }
  return { user, profile };
}

export function adminExists(db: Db): boolean {
  return getRow<{ id: string }>(db, "SELECT id FROM users WHERE role = 'admin' LIMIT 1") !== undefined;
}

export function logAudit(
  ctx: Ctx,
  entry: {
    actorId: string | undefined;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
  },
): void {
  run(
    ctx.db,
    "INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, summary, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    newId(),
    entry.actorId ?? null,
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.summary,
    new Date().toISOString(),
  );
}
