import { ConvexError, type Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type {
  clinicalValidator,
  documentKindValidator,
  guardianValidator,
  imagingValidator,
  patientValidator,
} from "../schema/referrals";
import {
  ADULT_AGE,
  ALLOWED_FILE_TYPES,
  MAX_DOCUMENTS,
  MAX_FILE_BYTES,
  PROCEDURE_CODES,
  REQUESTED_METHODS,
  ageOn,
  isCalendarDate,
  type ReferralProcedure,
} from "../shared/referrals";
import { optionalText, requirePhone, requireText } from "./validate";

type Patient = Infer<typeof patientValidator>;
type Guardian = Infer<typeof guardianValidator>;
type Clinical = Infer<typeof clinicalValidator>;
type Imaging = Infer<typeof imagingValidator>;
export type DocumentInput = {
  storageId: Id<"_storage">;
  fileName: string;
  kind: Infer<typeof documentKindValidator>;
};

function bad(message: string): never {
  throw new ConvexError({ code: "BAD_REQUEST", message });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function requirePastDate(value: string, label: string): string {
  if (!isCalendarDate(value)) bad(`${label} must be a valid date.`);
  if (value > todayUtc()) bad(`${label} cannot be in the future.`);
  return value;
}

export function cleanPatient(p: Patient): Patient {
  const email = p.email?.trim();
  if (email && !EMAIL_PATTERN.test(email)) bad("Enter a valid patient email address.");
  return {
    fullName: requireText(p.fullName, "Patient full name", 120),
    dateOfBirth: requirePastDate(p.dateOfBirth, "Date of birth"),
    sex: p.sex,
    phone: requirePhone(p.phone),
    email: email || undefined,
    address: optionalText(p.address, "Address", 300),
    idNumber: optionalText(p.idNumber, "ID or medical record number", 60),
  };
}

/** A guardian is required for minors and whenever the request is made for someone else. */
export function cleanGuardian(
  guardian: Guardian | undefined,
  patient: Patient,
  forDependent: boolean,
): Guardian | undefined {
  const isMinor = ageOn(patient.dateOfBirth, todayUtc()) < ADULT_AGE;
  if (!guardian) {
    if (isMinor) bad("Guardian details are required for patients under 18.");
    if (forDependent) bad("Add your details as the guardian or carer.");
    return undefined;
  }
  return {
    fullName: requireText(guardian.fullName, "Guardian full name", 120),
    relationship: requireText(guardian.relationship, "Relationship to patient", 60),
    phone: requirePhone(guardian.phone),
  };
}

export function cleanClinical(c: Clinical, procedure: ReferralProcedure): Clinical {
  if (!(c.requestedMethod in REQUESTED_METHODS[procedure])) {
    bad("Choose a requested procedure type.");
  }
  const siteLabel = procedure === "biopsy-fnac" ? "Target area" : "Location of the collection";
  return {
    indication: requireText(c.indication, "Clinical indication", 2000),
    site: requireText(c.site, siteLabel, 300),
    requestedMethod: c.requestedMethod,
    urgency: c.urgency,
    previousBiopsy: optionalText(c.previousBiopsy, "Previous biopsy history", 1000),
    bloodThinners: c.bloodThinners,
    allergies: optionalText(c.allergies, "Allergies", 500),
    otherConditions: optionalText(c.otherConditions, "Other conditions", 1000),
  };
}

export function cleanImaging(i: Imaging): Imaging {
  const studyDate = i.studyDate?.trim();
  return {
    modality: i.modality,
    studyDate: studyDate ? requirePastDate(studyDate, "Imaging date") : undefined,
    facility: optionalText(i.facility, "Imaging facility", 160),
    pacsReference: optionalText(i.pacsReference, "PACS or accession reference", 100),
    findings: optionalText(i.findings, "Imaging findings", 2000),
  };
}

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Checks each uploaded file exists, is an allowed type and size, and is not attached elsewhere. */
export async function validateDocuments(
  ctx: MutationCtx,
  docs: DocumentInput[],
  existingCount: number,
): Promise<DocumentInput[]> {
  if (docs.length + existingCount > MAX_DOCUMENTS) {
    bad(`A request can have at most ${MAX_DOCUMENTS} documents.`);
  }
  const seen = new Set<string>();
  const cleaned: DocumentInput[] = [];
  for (const doc of docs) {
    if (seen.has(doc.storageId)) bad("The same file was attached twice.");
    seen.add(doc.storageId);
    const meta = await ctx.db.system.get("_storage", doc.storageId);
    if (!meta) bad("An uploaded file could not be found. Please upload it again.");
    // Fall back to the extension when the upload carried no content type.
    const contentType = meta.contentType ?? EXTENSION_TYPES[doc.fileName.split(".").pop()?.toLowerCase() ?? ""] ?? "";
    if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(contentType)) {
      bad("Only PDF, JPEG, PNG or WebP files can be attached.");
    }
    if (meta.size > MAX_FILE_BYTES) bad("Each file must be 15 MB or smaller.");
    const attached = await ctx.db
      .query("referralDocuments")
      .withIndex("by_storageId", (q) => q.eq("storageId", doc.storageId))
      .first();
    if (attached) bad("This file is already attached to a request.");
    cleaned.push({ ...doc, fileName: requireText(doc.fileName, "File name", 200) });
  }
  return cleaned;
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Human-friendly reference such as BX-261102-7KQ4, retried until unique. */
export async function generateReference(
  ctx: MutationCtx,
  procedure: ReferralProcedure,
): Promise<string> {
  const datePart = todayUtc().slice(2).replaceAll("-", "");
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
    }
    const reference = `${PROCEDURE_CODES[procedure]}-${datePart}-${suffix}`;
    const clash = await ctx.db
      .query("referrals")
      .withIndex("by_reference", (q) => q.eq("reference", reference))
      .first();
    if (!clash) return reference;
  }
  throw new ConvexError({ code: "CONFLICT", message: "Could not create a reference. Please try again." });
}
