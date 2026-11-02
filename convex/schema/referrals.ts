import { defineTable } from "convex/server";
import { v } from "convex/values";

export const referralProcedureValidator = v.union(
  v.literal("biopsy-fnac"),
  v.literal("abscess-drainage"),
);

export const referralStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("in_review"),
  v.literal("info_requested"),
  v.literal("approved"),
  v.literal("deferred"),
  v.literal("declined"),
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("withdrawn"),
);

export const documentKindValidator = v.union(
  v.literal("referral_letter"),
  v.literal("imaging_report"),
  v.literal("lab_result"),
  v.literal("other"),
);

export const yesNoUnknownValidator = v.union(v.literal("yes"), v.literal("no"), v.literal("unknown"));

export const patientValidator = v.object({
  fullName: v.string(),
  dateOfBirth: v.string(), // YYYY-MM-DD
  sex: v.union(v.literal("female"), v.literal("male")),
  phone: v.string(),
  email: v.optional(v.string()),
  address: v.optional(v.string()),
  idNumber: v.optional(v.string()),
});

export const guardianValidator = v.object({
  fullName: v.string(),
  relationship: v.string(),
  phone: v.string(),
});

export const referrerInputValidator = v.object({
  name: v.string(),
  facility: v.string(),
  phone: v.optional(v.string()),
});

export const clinicalValidator = v.object({
  indication: v.string(),
  site: v.string(), // biopsy target area or location of the collection
  requestedMethod: v.string(),
  urgency: v.union(v.literal("routine"), v.literal("soon"), v.literal("urgent")),
  previousBiopsy: v.optional(v.string()),
  bloodThinners: yesNoUnknownValidator,
  allergies: v.optional(v.string()),
  otherConditions: v.optional(v.string()),
});

export const imagingValidator = v.object({
  modality: v.union(
    v.literal("ultrasound"),
    v.literal("ct"),
    v.literal("mri"),
    v.literal("xray"),
    v.literal("other"),
  ),
  studyDate: v.optional(v.string()), // YYYY-MM-DD
  facility: v.optional(v.string()),
  pacsReference: v.optional(v.string()),
  findings: v.optional(v.string()),
});

export const referralsTable = defineTable({
  reference: v.string(),
  procedure: referralProcedureValidator,
  status: referralStatusValidator,
  submittedById: v.id("users"),
  submitterRole: v.union(v.literal("patient"), v.literal("physician")),
  forDependent: v.boolean(),
  patient: patientValidator,
  guardian: v.optional(guardianValidator),
  referrer: v.object({
    name: v.string(),
    facility: v.string(),
    phone: v.optional(v.string()),
    physicianProfileId: v.optional(v.id("physicianProfiles")),
  }),
  clinical: clinicalValidator,
  imaging: imagingValidator,
  submittedAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_reference", ["reference"])
  .index("by_submittedById_and_submittedAt", ["submittedById", "submittedAt"])
  .index("by_status_and_submittedAt", ["status", "submittedAt"]);

export const referralDocumentsTable = defineTable({
  referralId: v.id("referrals"),
  storageId: v.id("_storage"),
  fileName: v.string(),
  kind: documentKindValidator,
  uploadedById: v.id("users"),
  uploadedAt: v.string(),
})
  .index("by_referralId", ["referralId"])
  .index("by_storageId", ["storageId"]);
