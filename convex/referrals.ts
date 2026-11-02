import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { logAudit } from "./lib/audit";
import { getCurrentUserDoc, requireUser, requireVerifiedPhysician } from "./lib/auth";
import {
  cleanClinical,
  cleanGuardian,
  cleanImaging,
  cleanPatient,
  generateReference,
  validateDocuments,
} from "./lib/referrals";
import { optionalText, requireText } from "./lib/validate";
import {
  clinicalValidator,
  documentKindValidator,
  guardianValidator,
  imagingValidator,
  patientValidator,
  referralProcedureValidator,
  referrerInputValidator,
} from "./schema/referrals";
import { isStaffRole } from "./shared/roles";
import { OPEN_STATUSES, PROCEDURE_LABELS } from "./shared/referrals";

const documentInputValidator = v.object({
  storageId: v.id("_storage"),
  fileName: v.string(),
  kind: documentKindValidator,
});

const EMPTY_PAGE = { page: [], isDone: true, continueCursor: "" };

/** Patients, and physicians only once verified, may submit or upload. */
async function requireSubmitter(ctx: QueryCtx) {
  const user = await requireUser(ctx);
  if (user.role === "patient") return { user, profile: null };
  if (user.role === "physician") return await requireVerifiedPhysician(ctx);
  throw new ConvexError({
    code: "FORBIDDEN",
    message: "Only patients, guardians and verified physicians can submit requests.",
  });
}

function canView(user: Doc<"users">, referral: Doc<"referrals">): boolean {
  return referral.submittedById === user._id || isStaffRole(user.role);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSubmitter(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Removes an upload that was never attached (e.g. the user removed it from the form). */
export const discardUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireSubmitter(ctx);
    const attached = await ctx.db
      .query("referralDocuments")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    if (attached) return null;
    const meta = await ctx.db.system.get("_storage", args.storageId);
    if (meta) await ctx.storage.delete(args.storageId);
    return null;
  },
});

export const submit = mutation({
  args: {
    procedure: referralProcedureValidator,
    forDependent: v.boolean(),
    patient: patientValidator,
    guardian: v.optional(guardianValidator),
    referrer: v.optional(referrerInputValidator),
    clinical: clinicalValidator,
    imaging: imagingValidator,
    documents: v.array(documentInputValidator),
    confirmNotAppointment: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ reference: string }> => {
    const { user, profile } = await requireSubmitter(ctx);
    if (!args.confirmNotAppointment) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Please confirm you understand a request is not a confirmed appointment.",
      });
    }
    const forDependent = user.role === "patient" ? args.forDependent : false;
    const patient = cleanPatient(args.patient);
    const guardian = cleanGuardian(args.guardian, patient, forDependent);

    let referrer: Doc<"referrals">["referrer"];
    if (profile) {
      referrer = {
        name: profile.fullName,
        facility: profile.facilityName,
        phone: profile.phone,
        physicianProfileId: profile._id,
      };
    } else {
      if (!args.referrer) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Add the referring doctor's details." });
      }
      referrer = {
        name: requireText(args.referrer.name, "Referring doctor", 120),
        facility: requireText(args.referrer.facility, "Referring facility", 160),
        phone: optionalText(args.referrer.phone, "Referring doctor phone", 30),
      };
    }

    const clinical = cleanClinical(args.clinical, args.procedure);
    const imaging = cleanImaging(args.imaging);
    const documents = await validateDocuments(ctx, args.documents, 0);
    const reference = await generateReference(ctx, args.procedure);
    const now = new Date().toISOString();

    const referralId = await ctx.db.insert("referrals", {
      reference,
      procedure: args.procedure,
      status: "submitted",
      submittedById: user._id,
      submitterRole: profile ? "physician" : "patient",
      forDependent,
      patient,
      guardian,
      referrer,
      clinical,
      imaging,
      submittedAt: now,
      updatedAt: now,
    });
    for (const doc of documents) {
      await ctx.db.insert("referralDocuments", {
        referralId,
        ...doc,
        uploadedById: user._id,
        uploadedAt: now,
      });
    }
    await logAudit(ctx, {
      actorId: user._id,
      action: "referral.submitted",
      entityType: "referral",
      entityId: referralId,
      summary: `${PROCEDURE_LABELS[args.procedure]} request ${reference} submitted with ${documents.length} document(s)`,
    });
    return { reference };
  },
});

/** The signed-in user's own requests, newest first. Empty for anonymous callers. */
export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx);
    if (!user) return EMPTY_PAGE;
    const result = await ctx.db
      .query("referrals")
      .withIndex("by_submittedById_and_submittedAt", (q) => q.eq("submittedById", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((r) => ({
        _id: r._id,
        reference: r.reference,
        procedure: r.procedure,
        status: r.status,
        patientName: r.patient.fullName,
        urgency: r.clinical.urgency,
        submittedAt: r.submittedAt,
      })),
    };
  },
});

/** Full request detail for its submitter or staff; null when missing or not allowed. */
export const getByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserDoc(ctx);
    if (!user) return null;
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference.toUpperCase()))
      .unique();
    if (!referral || !canView(user, referral)) return null;
    const docs = await ctx.db
      .query("referralDocuments")
      .withIndex("by_referralId", (q) => q.eq("referralId", referral._id))
      .take(50);
    const documents = await Promise.all(
      docs.map(async (d) => {
        const meta = await ctx.db.system.get("_storage", d.storageId);
        return {
          _id: d._id,
          fileName: d.fileName,
          kind: d.kind,
          uploadedAt: d.uploadedAt,
          size: meta?.size ?? 0,
          url: await ctx.storage.getUrl(d.storageId),
        };
      }),
    );
    return {
      ...referral,
      documents,
      canEdit: referral.submittedById === user._id && OPEN_STATUSES.includes(referral.status),
    };
  },
});

async function loadOwnOpenReferral(ctx: QueryCtx, referralId: Id<"referrals">) {
  const user = await requireUser(ctx);
  const referral = await ctx.db.get("referrals", referralId);
  if (!referral || referral.submittedById !== user._id) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Request not found." });
  }
  if (!OPEN_STATUSES.includes(referral.status)) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "This request can no longer be changed." });
  }
  return { user, referral };
}

export const addDocuments = mutation({
  args: { referralId: v.id("referrals"), documents: v.array(documentInputValidator) },
  handler: async (ctx, args) => {
    await requireSubmitter(ctx);
    const { user, referral } = await loadOwnOpenReferral(ctx, args.referralId);
    const existing = await ctx.db
      .query("referralDocuments")
      .withIndex("by_referralId", (q) => q.eq("referralId", referral._id))
      .take(50);
    const documents = await validateDocuments(ctx, args.documents, existing.length);
    if (documents.length === 0) return null;
    const now = new Date().toISOString();
    for (const doc of documents) {
      await ctx.db.insert("referralDocuments", { referralId: referral._id, ...doc, uploadedById: user._id, uploadedAt: now });
    }
    await ctx.db.patch("referrals", referral._id, { updatedAt: now });
    await logAudit(ctx, {
      actorId: user._id,
      action: "referral.documents_added",
      entityType: "referral",
      entityId: referral._id,
      summary: `Added ${documents.length} document(s)`,
    });
    return null;
  },
});

export const withdraw = mutation({
  args: { referralId: v.id("referrals"), reason: v.string() },
  handler: async (ctx, args) => {
    const { user, referral } = await loadOwnOpenReferral(ctx, args.referralId);
    const reason = requireText(args.reason, "Reason", 500);
    await ctx.db.patch("referrals", referral._id, { status: "withdrawn", updatedAt: new Date().toISOString() });
    await logAudit(ctx, {
      actorId: user._id,
      action: "referral.withdrawn",
      entityType: "referral",
      entityId: referral._id,
      summary: `Withdrawn by submitter: ${reason}`,
    });
    return null;
  },
});
