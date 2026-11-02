import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../lib/audit";
import { getUserWithRole, requireRole } from "../lib/auth";
import { optionalText } from "../lib/validate";
import { physicianStatusValidator, roleValidator } from "../schema/users";
import { ROLE_LABELS } from "../shared/roles";

const ADMIN = ["admin"] as const;
const EMPTY_PAGE = { page: [], isDone: true, continueCursor: "" };

/** Physician profiles filtered by status, newest submissions first. */
export const listPhysicians = query({
  args: { status: physicianStatusValidator, paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    if (!(await getUserWithRole(ctx, ADMIN))) return EMPTY_PAGE;
    const result = await ctx.db
      .query("physicianProfiles")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (profile) => {
          const user = await ctx.db.get("users", profile.userId);
          return { ...profile, email: user?.email ?? "" };
        }),
      ),
    };
  },
});

export const reviewPhysician = mutation({
  args: {
    profileId: v.id("physicianProfiles"),
    decision: v.union(v.literal("verified"), v.literal("rejected"), v.literal("suspended")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ADMIN);
    const profile = await ctx.db.get("physicianProfiles", args.profileId);
    if (!profile) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Profile not found." });
    }
    const note = optionalText(args.note, "Note");
    if (args.decision !== "verified" && !note) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Add a short reason so the physician knows what to fix.",
      });
    }
    await ctx.db.patch("physicianProfiles", profile._id, {
      status: args.decision,
      reviewNote: note,
      reviewedById: admin._id,
      reviewedAt: new Date().toISOString(),
    });
    await logAudit(ctx, {
      actorId: admin._id,
      action: `physician.${args.decision}`,
      entityType: "physicianProfile",
      entityId: profile._id,
      summary: `${profile.fullName}: ${args.decision}${note ? ` (${note})` : ""}`,
    });
    return null;
  },
});

/** Users list for role management, optionally narrowed to one role or an email search. */
export const listUsers = query({
  args: {
    role: v.optional(v.union(roleValidator, v.literal("unassigned"))),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (!(await getUserWithRole(ctx, ADMIN))) return EMPTY_PAGE;
    const search = args.search?.trim();
    const role = args.role === "unassigned" ? undefined : args.role;
    const base = search
      ? ctx.db
          .query("users")
          .withSearchIndex("search_email", (q) => {
            const s = q.search("email", search);
            return args.role ? s.eq("role", role) : s;
          })
      : args.role
        ? ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", role))
        : ctx.db.query("users").order("desc");
    const result = await base.paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((u) => ({
        _id: u._id,
        email: u.email ?? "",
        fullName: u.fullName ?? u.name ?? "",
        role: u.role ?? null,
        joinedAt: u._creationTime,
      })),
    };
  },
});

async function countAdmins(ctx: MutationCtx): Promise<number> {
  // Bounded: we only need to know whether more than one admin remains
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .take(2);
  return admins.length;
}

export const setUserRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ADMIN);
    const target = await ctx.db.get("users", args.userId);
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found." });
    }
    if (target.role === args.role) return null;
    if (target.role === "admin" && (await countAdmins(ctx)) < 2) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "At least one administrator must remain.",
      });
    }
    await ctx.db.patch("users", target._id, {
      role: args.role,
      onboardedAt: target.onboardedAt ?? new Date().toISOString(),
    });
    await logAudit(ctx, {
      actorId: admin._id,
      action: "user.roleChanged",
      entityType: "user",
      entityId: target._id,
      summary: `${target.email ?? "User"}: ${target.role ? ROLE_LABELS[target.role] : "No role"} to ${ROLE_LABELS[args.role]}`,
    });
    return null;
  },
});

/** Recent audit entries for one record, for admin detail views. */
export const auditForEntity = query({
  args: { entityType: v.string(), entityId: v.string() },
  handler: async (ctx, args) => {
    if (!(await getUserWithRole(ctx, ADMIN))) return [];
    const entries = await ctx.db
      .query("auditLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId),
      )
      .order("desc")
      .take(20);
    const actorIds = [...new Set(entries.map((e) => e.actorId).filter((id): id is Id<"users"> => !!id))];
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get("users", id)));
    const names = new Map(actors.flatMap((a) => (a ? [[a._id, a.fullName ?? a.email ?? "User"]] : [])));
    return entries.map((e) => ({
      _id: e._id,
      at: e.at,
      summary: e.summary,
      actor: e.actorId ? (names.get(e.actorId) ?? "User") : "System",
    }));
  },
});
