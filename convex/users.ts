import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { logAudit } from "./lib/audit";
import { getCurrentUserDoc, requireRole, requireUser } from "./lib/auth";
import { requirePhone, requireText } from "./lib/validate";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      return user._id;
    }
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

/**
 * The signed-in user's row, or `null` when signed out. Throws `USER_NOT_FOUND`
 * if `/auth/callback` failed to create it (see `src/lib/sync-current-user.ts`).
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await getCurrentUserDoc(ctx);
    if (user === null) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message:
          "The signed-in user has no account record yet. Sign out and sign in again.",
      });
    }
    return user;
  },
});

async function adminExists(ctx: QueryCtx): Promise<boolean> {
  const admin = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .first();
  return admin !== null;
}

/** Everything the app shell needs about the signed-in user. Null when signed out. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserDoc(ctx);
    if (!user) return null;
    const physicianProfile =
      user.role === "physician"
        ? await ctx.db
            .query("physicianProfiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique()
        : null;
    return {
      id: user._id,
      email: user.email ?? "",
      fullName: user.fullName ?? user.name ?? "",
      phone: user.phone ?? "",
      role: user.role ?? null,
      physicianProfile,
      adminExists: await adminExists(ctx),
    };
  },
});

/** First-use role choice. Only patient/guardian or physician can be self-selected. */
export const completeOnboarding = mutation({
  args: {
    role: v.union(v.literal("patient"), v.literal("physician")),
    fullName: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Your account type is already set. Contact an administrator to change it.",
      });
    }
    await ctx.db.patch("users", user._id, {
      role: args.role,
      fullName: requireText(args.fullName, "Full name", 120),
      phone: requirePhone(args.phone),
      onboardedAt: new Date().toISOString(),
    });
    await logAudit(ctx, {
      actorId: user._id,
      action: "user.onboarded",
      entityType: "user",
      entityId: user._id,
      summary: `Chose account type: ${args.role}`,
    });
    return null;
  },
});

export const updateContactDetails = mutation({
  args: { fullName: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch("users", user._id, {
      fullName: requireText(args.fullName, "Full name", 120),
      phone: requirePhone(args.phone),
    });
    return null;
  },
});

/** Creates or resubmits the physician profile; any change goes back for verification. */
export const submitPhysicianProfile = mutation({
  args: {
    fullName: v.string(),
    registrationNumber: v.string(),
    licensingBody: v.string(),
    specialty: v.string(),
    facilityName: v.string(),
    facilityAddress: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["physician"]);
    const existing = await ctx.db
      .query("physicianProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existing?.status === "suspended") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Your profile is suspended. Contact HakimeRAD to restore access.",
      });
    }
    const fields = {
      fullName: requireText(args.fullName, "Full name", 120),
      registrationNumber: requireText(args.registrationNumber, "Registration number", 60),
      licensingBody: requireText(args.licensingBody, "Licensing body", 120),
      specialty: requireText(args.specialty, "Specialty", 120),
      facilityName: requireText(args.facilityName, "Facility name", 160),
      facilityAddress: requireText(args.facilityAddress, "Facility address", 300),
      phone: requirePhone(args.phone),
      status: "pending" as const,
      submittedAt: new Date().toISOString(),
      reviewNote: undefined,
      reviewedById: undefined,
      reviewedAt: undefined,
    };
    let profileId = existing?._id;
    if (profileId) {
      await ctx.db.patch("physicianProfiles", profileId, fields);
    } else {
      profileId = await ctx.db.insert("physicianProfiles", { userId: user._id, ...fields });
    }
    await logAudit(ctx, {
      actorId: user._id,
      action: existing ? "physician.resubmitted" : "physician.submitted",
      entityType: "physicianProfile",
      entityId: profileId,
      summary: `Profile submitted for verification (${fields.registrationNumber})`,
    });
    return null;
  },
});

/**
 * Lets the first signed-in user become admin while no admin exists yet.
 * Once any admin exists this always fails, so only the owner can use it before launch.
 */
export const claimFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (await adminExists(ctx)) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "An administrator already exists.",
      });
    }
    await ctx.db.patch("users", user._id, {
      role: "admin",
      onboardedAt: user.onboardedAt ?? new Date().toISOString(),
    });
    await logAudit(ctx, {
      actorId: user._id,
      action: "admin.claimed",
      entityType: "user",
      entityId: user._id,
      summary: "Became the first administrator",
    });
    return null;
  },
});
