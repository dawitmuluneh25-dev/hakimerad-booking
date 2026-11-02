import { defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("patient"),
  v.literal("physician"),
  v.literal("receptionist"),
  v.literal("radiologist"),
  v.literal("coordinator"),
  v.literal("admin"),
);

export const physicianStatusValidator = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("rejected"),
  v.literal("suspended"),
);

export const usersTable = defineTable({
  // Saved as-is from `identity.tokenIdentifier`
  tokenIdentifier: v.string(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  // Unset until the user completes first-use onboarding
  role: v.optional(roleValidator),
  fullName: v.optional(v.string()),
  phone: v.optional(v.string()),
  onboardedAt: v.optional(v.string()),
})
  .index("by_token", ["tokenIdentifier"])
  .index("by_role", ["role"])
  .searchIndex("search_email", { searchField: "email", filterFields: ["role"] });

export const physicianProfilesTable = defineTable({
  userId: v.id("users"),
  fullName: v.string(),
  registrationNumber: v.string(),
  licensingBody: v.string(),
  specialty: v.string(),
  facilityName: v.string(),
  facilityAddress: v.string(),
  phone: v.string(),
  status: physicianStatusValidator,
  submittedAt: v.string(),
  reviewNote: v.optional(v.string()),
  reviewedById: v.optional(v.id("users")),
  reviewedAt: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_status_and_submittedAt", ["status", "submittedAt"]);

export const auditLogsTable = defineTable({
  actorId: v.optional(v.id("users")),
  action: v.string(),
  entityType: v.string(),
  entityId: v.string(),
  summary: v.string(),
  at: v.string(),
}).index("by_entity", ["entityType", "entityId"]);
