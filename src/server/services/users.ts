import {
  adminExists,
  findProfileByUserId,
  findUserById,
  getCurrentUserDoc,
  logAudit,
  requireRole,
  requireUser,
  toProfile,
  type Ctx,
  type PhysicianProfileRow,
  type UserRow,
} from "../context.ts";
import { getRow, newId, run } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Me } from "../types.ts";
import { requirePhone, requireText } from "../validate.ts";

/**
 * Creates the signed-in user's row if it is missing. Called right after the
 * OIDC callback succeeds, before the browser is sent into the app.
 */
export function syncCurrentUser(ctx: Ctx): string {
  if (!ctx.identity) {
    throw new AppError("UNAUTHENTICATED", "User not logged in");
  }
  const existing = getCurrentUserDoc(ctx);
  if (existing) return existing.id;
  const id = newId();
  run(
    ctx.db,
    "INSERT INTO users (id, token_identifier, name, email, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    ctx.identity.tokenIdentifier,
    ctx.identity.name ?? null,
    ctx.identity.email ?? null,
    new Date().toISOString(),
  );
  return id;
}

/**
 * The signed-in user's row, or `null` when signed out. Throws `USER_NOT_FOUND`
 * if the callback failed to create it.
 */
export function getCurrentUser(ctx: Ctx): UserRow | null {
  if (!ctx.identity) return null;
  const user = getCurrentUserDoc(ctx);
  if (!user) {
    throw new AppError(
      "USER_NOT_FOUND",
      "The signed-in user has no account record yet. Sign out and sign in again.",
    );
  }
  return user;
}

/** Everything the app shell needs about the signed-in user. Null when signed out. */
export function me(ctx: Ctx): Me | null {
  const user = getCurrentUserDoc(ctx);
  if (!user) return null;
  const profile =
    user.role === "physician" ? (findProfileByUserId(ctx.db, user.id) ?? null) : null;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: user.full_name ?? user.name ?? "",
    phone: user.phone ?? "",
    role: user.role ?? null,
    physicianProfile: profile ? toProfile(profile) : null,
    adminExists: adminExists(ctx.db),
  };
}

/** First-use role choice. Only patient/guardian or physician can be self-selected. */
export function completeOnboarding(
  ctx: Ctx,
  args: { role: "patient" | "physician"; fullName: string; phone: string },
): null {
  const user = requireUser(ctx);
  if (user.role) {
    throw new AppError(
      "CONFLICT",
      "Your account type is already set. Contact an administrator to change it.",
    );
  }
  run(
    ctx.db,
    "UPDATE users SET role = ?, full_name = ?, phone = ?, onboarded_at = ? WHERE id = ?",
    args.role,
    requireText(args.fullName, "Full name", 120),
    requirePhone(args.phone),
    new Date().toISOString(),
    user.id,
  );
  logAudit(ctx, {
    actorId: user.id,
    action: "user.onboarded",
    entityType: "user",
    entityId: user.id,
    summary: `Chose account type: ${args.role}`,
  });
  return null;
}

export function updateContactDetails(
  ctx: Ctx,
  args: { fullName: string; phone: string },
): null {
  const user = requireUser(ctx);
  run(
    ctx.db,
    "UPDATE users SET full_name = ?, phone = ? WHERE id = ?",
    requireText(args.fullName, "Full name", 120),
    requirePhone(args.phone),
    user.id,
  );
  return null;
}

/** Creates or resubmits the physician profile; any change goes back for verification. */
export function submitPhysicianProfile(
  ctx: Ctx,
  args: {
    fullName: string;
    registrationNumber: string;
    licensingBody: string;
    specialty: string;
    facilityName: string;
    facilityAddress: string;
    phone: string;
  },
): null {
  const user = requireRole(ctx, ["physician"]);
  const existing = findProfileByUserId(ctx.db, user.id);
  if (existing?.status === "suspended") {
    throw new AppError(
      "FORBIDDEN",
      "Your profile is suspended. Contact HakimeRAD to restore access.",
    );
  }
  const fields = {
    fullName: requireText(args.fullName, "Full name", 120),
    registrationNumber: requireText(args.registrationNumber, "Registration number", 60),
    licensingBody: requireText(args.licensingBody, "Licensing body", 120),
    specialty: requireText(args.specialty, "Specialty", 120),
    facilityName: requireText(args.facilityName, "Facility name", 160),
    facilityAddress: requireText(args.facilityAddress, "Facility address", 300),
    phone: requirePhone(args.phone),
    submittedAt: new Date().toISOString(),
  };

  let profileId: string;
  if (existing) {
    profileId = existing.id;
    run(
      ctx.db,
      `UPDATE physician_profiles
         SET full_name = ?, registration_number = ?, licensing_body = ?, specialty = ?,
             facility_name = ?, facility_address = ?, phone = ?, status = 'pending',
             submitted_at = ?, review_note = NULL, reviewed_by_id = NULL, reviewed_at = NULL
       WHERE id = ?`,
      fields.fullName,
      fields.registrationNumber,
      fields.licensingBody,
      fields.specialty,
      fields.facilityName,
      fields.facilityAddress,
      fields.phone,
      fields.submittedAt,
      profileId,
    );
  } else {
    profileId = newId();
    run(
      ctx.db,
      `INSERT INTO physician_profiles
         (id, user_id, full_name, registration_number, licensing_body, specialty,
          facility_name, facility_address, phone, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      profileId,
      user.id,
      fields.fullName,
      fields.registrationNumber,
      fields.licensingBody,
      fields.specialty,
      fields.facilityName,
      fields.facilityAddress,
      fields.phone,
      fields.submittedAt,
    );
  }

  logAudit(ctx, {
    actorId: user.id,
    action: existing ? "physician.resubmitted" : "physician.submitted",
    entityType: "physicianProfile",
    entityId: profileId,
    summary: `Profile submitted for verification (${fields.registrationNumber})`,
  });
  return null;
}

/**
 * Lets the first signed-in user become admin while no admin exists yet.
 * Once any admin exists this always fails.
 */
export function claimFirstAdmin(ctx: Ctx): null {
  const user = requireUser(ctx);
  if (adminExists(ctx.db)) {
    throw new AppError("FORBIDDEN", "An administrator already exists.");
  }
  run(
    ctx.db,
    "UPDATE users SET role = 'admin', onboarded_at = ? WHERE id = ?",
    user.onboarded_at ?? new Date().toISOString(),
    user.id,
  );
  logAudit(ctx, {
    actorId: user.id,
    action: "admin.claimed",
    entityType: "user",
    entityId: user.id,
    summary: "Became the first administrator",
  });
  return null;
}

export function findUserRow(db: Ctx["db"], id: string): UserRow | undefined {
  return findUserById(db, id);
}

export function findProfileRow(ctx: Ctx, userId: string): PhysicianProfileRow | undefined {
  return getRow<PhysicianProfileRow>(
    ctx.db,
    "SELECT * FROM physician_profiles WHERE user_id = ?",
    userId,
  );
}
