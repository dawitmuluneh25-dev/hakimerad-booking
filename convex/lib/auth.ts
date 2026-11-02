import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { Role } from "../shared/roles";

type ReadCtx = Pick<QueryCtx, "db" | "auth">;

/** The signed-in user's row, or null when signed out or not yet synced. */
export async function getCurrentUserDoc(
  ctx: ReadCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

export async function requireUser(ctx: ReadCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Please sign in." });
  }
  const user = await getCurrentUserDoc(ctx);
  if (!user) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Your account record is missing. Sign out and sign in again.",
    });
  }
  return user;
}

export async function requireRole(
  ctx: ReadCtx,
  roles: readonly Role[],
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!user.role || !roles.includes(user.role)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have permission to do this.",
    });
  }
  return user;
}

/** Returns the role-checked user, or null instead of throwing (for read-only UI queries). */
export async function getUserWithRole(
  ctx: ReadCtx,
  roles: readonly Role[],
): Promise<Doc<"users"> | null> {
  const user = await getCurrentUserDoc(ctx);
  if (!user?.role || !roles.includes(user.role)) return null;
  return user;
}

/** Physicians may only refer once an admin has verified their profile. */
export async function requireVerifiedPhysician(
  ctx: ReadCtx,
): Promise<{ user: Doc<"users">; profile: Doc<"physicianProfiles"> }> {
  const user = await requireRole(ctx, ["physician"]);
  const profile = await ctx.db
    .query("physicianProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (!profile || profile.status !== "verified") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Your physician profile must be verified before you can refer.",
    });
  }
  return { user, profile };
}
