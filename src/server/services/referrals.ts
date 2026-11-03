import {
  findProfileByUserId,
  getCurrentUserDoc,
  logAudit,
  requireUser,
  requireVerifiedPhysician,
  type Ctx,
  type UserRow,
} from "../context.ts";
import { allRows, getRow, newId, run } from "../db.ts";
import { AppError, bad } from "../errors.ts";
import { deleteFile, getFileMeta } from "../storage.ts";
import type {
  Clinical,
  DocumentInput,
  Guardian,
  Imaging,
  Page,
  PaginationOpts,
  Patient,
  Referral,
  ReferralDetail,
  ReferralSummary,
} from "../types.ts";
import { optionalText, requirePhone, requireText } from "../validate.ts";
import {
  ADULT_AGE,
  ALLOWED_FILE_TYPES,
  MAX_DOCUMENTS,
  MAX_FILE_BYTES,
  OPEN_STATUSES,
  PROCEDURE_CODES,
  PROCEDURE_LABELS,
  REQUESTED_METHODS,
  ageOn,
  isCalendarDate,
  type ReferralProcedure,
  type ReferralStatus,
} from "@/shared/referrals.ts";
import { isStaffRole } from "@/shared/roles.ts";
import { appointmentForReferral } from "./scheduling.ts";
import { loadCareRecord } from "./care.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const EMPTY_PAGE: Page<ReferralSummary> = {
  page: [],
  isDone: true,
  continueCursor: "",
};

type ReferralRow = {
  id: string;
  reference: string;
  procedure: ReferralProcedure;
  status: ReferralStatus;
  submitted_by_id: string;
  submitter_role: "patient" | "physician";
  for_dependent: number;
  patient_json: string;
  guardian_json: string | null;
  referrer_json: string;
  clinical_json: string;
  imaging_json: string;
  submitted_at: string;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  referral_id: string;
  storage_id: string;
  file_name: string;
  kind: DocumentInput["kind"];
  uploaded_by_id: string;
  uploaded_at: string;
};

export function toReferral(row: ReferralRow): Referral {
  return {
    _id: row.id,
    id: row.id,
    reference: row.reference,
    procedure: row.procedure,
    status: row.status,
    submittedById: row.submitted_by_id,
    submitterRole: row.submitter_role,
    forDependent: row.for_dependent === 1,
    patient: JSON.parse(row.patient_json) as Patient,
    guardian: row.guardian_json
      ? (JSON.parse(row.guardian_json) as Guardian)
      : undefined,
    referrer: JSON.parse(row.referrer_json) as Referral["referrer"],
    clinical: JSON.parse(row.clinical_json) as Clinical,
    imaging: JSON.parse(row.imaging_json) as Imaging,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

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
  if (email && !EMAIL_PATTERN.test(email))
    bad("Enter a valid patient email address.");
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
    relationship: requireText(
      guardian.relationship,
      "Relationship to patient",
      60,
    ),
    phone: requirePhone(guardian.phone),
  };
}

export function cleanClinical(
  c: Clinical,
  procedure: ReferralProcedure,
): Clinical {
  if (!(c.requestedMethod in REQUESTED_METHODS[procedure])) {
    bad("Choose a requested procedure type.");
  }
  const siteLabel =
    procedure === "biopsy-fnac" ? "Target area" : "Location of the collection";
  return {
    indication: requireText(c.indication, "Clinical indication", 2000),
    site: requireText(c.site, siteLabel, 300),
    requestedMethod: c.requestedMethod,
    urgency: c.urgency,
    previousBiopsy: optionalText(
      c.previousBiopsy,
      "Previous biopsy history",
      1000,
    ),
    bloodThinners: c.bloodThinners,
    allergies: optionalText(c.allergies, "Allergies", 500),
    otherConditions: optionalText(c.otherConditions, "Other conditions", 1000),
  };
}

export function cleanImaging(i: Imaging): Imaging {
  const studyDate = i.studyDate?.trim();
  return {
    modality: i.modality,
    studyDate: studyDate
      ? requirePastDate(studyDate, "Imaging date")
      : undefined,
    facility: optionalText(i.facility, "Imaging facility", 160),
    pacsReference: optionalText(
      i.pacsReference,
      "PACS or accession reference",
      100,
    ),
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
export function validateDocuments(
  ctx: Ctx,
  docs: DocumentInput[],
  existingCount: number,
): DocumentInput[] {
  if (docs.length + existingCount > MAX_DOCUMENTS) {
    bad(`A request can have at most ${MAX_DOCUMENTS} documents.`);
  }
  const seen = new Set<string>();
  const cleaned: DocumentInput[] = [];
  for (const doc of docs) {
    if (seen.has(doc.storageId)) bad("The same file was attached twice.");
    seen.add(doc.storageId);
    const meta = getFileMeta(ctx.db, doc.storageId);
    if (!meta)
      bad("An uploaded file could not be found. Please upload it again.");
    // Fall back to the extension when the upload carried no content type.
    const contentType =
      meta.contentType ||
      EXTENSION_TYPES[doc.fileName.split(".").pop()?.toLowerCase() ?? ""] ||
      "";
    if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(contentType)) {
      bad("Only PDF, JPEG, PNG or WebP files can be attached.");
    }
    if (meta.size > MAX_FILE_BYTES) bad("Each file must be 15 MB or smaller.");
    const attached = getRow<{ id: string }>(
      ctx.db,
      "SELECT id FROM referral_documents WHERE storage_id = ?",
      doc.storageId,
    );
    if (attached) bad("This file is already attached to a request.");
    cleaned.push({
      ...doc,
      fileName: requireText(doc.fileName, "File name", 200),
    });
  }
  return cleaned;
}

/** Human-friendly reference such as BX-261102-7KQ4, retried until unique. */
export function generateReference(
  ctx: Ctx,
  procedure: ReferralProcedure,
): string {
  const datePart = todayUtc().slice(2).replaceAll("-", "");
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix +=
        REFERENCE_ALPHABET[
          Math.floor(Math.random() * REFERENCE_ALPHABET.length)
        ];
    }
    const reference = `${PROCEDURE_CODES[procedure]}-${datePart}-${suffix}`;
    const clash = getRow<{ id: string }>(
      ctx.db,
      "SELECT id FROM referrals WHERE reference = ?",
      reference,
    );
    if (!clash) return reference;
  }
  throw new AppError(
    "CONFLICT",
    "Could not create a reference. Please try again.",
  );
}

/** Patients, and physicians only once verified, may submit or upload. */
function requireSubmitter(ctx: Ctx): {
  user: UserRow;
  profile: ReturnType<typeof findProfileByUserId>;
} {
  const user = requireUser(ctx);
  if (user.role === "patient") return { user, profile: undefined };
  if (user.role === "physician") return requireVerifiedPhysician(ctx);
  throw new AppError(
    "FORBIDDEN",
    "Only patients, guardians and verified physicians can submit requests.",
  );
}

function canView(user: UserRow, referral: ReferralRow): boolean {
  return (
    referral.submitted_by_id === user.id || isStaffRole(user.role ?? undefined)
  );
}

export type SubmitInput = {
  procedure: ReferralProcedure;
  forDependent: boolean;
  patient: Patient;
  guardian?: Guardian;
  referrer?: { name: string; facility: string; phone?: string };
  clinical: Clinical;
  imaging: Imaging;
  documents: DocumentInput[];
  confirmNotAppointment: boolean;
};

export function submit(ctx: Ctx, args: SubmitInput): { reference: string } {
  const { user, profile } = requireSubmitter(ctx);
  if (!args.confirmNotAppointment) {
    throw new AppError(
      "BAD_REQUEST",
      "Please confirm you understand a request is not a confirmed appointment.",
    );
  }
  const forDependent = user.role === "patient" ? args.forDependent : false;
  const patient = cleanPatient(args.patient);
  const guardian = cleanGuardian(args.guardian, patient, forDependent);

  let referrer: Referral["referrer"];
  if (profile) {
    referrer = {
      name: profile.full_name,
      facility: profile.facility_name,
      phone: profile.phone,
      physicianProfileId: profile.id,
    };
  } else {
    if (!args.referrer) {
      throw new AppError("BAD_REQUEST", "Add the referring doctor's details.");
    }
    referrer = {
      name: requireText(args.referrer.name, "Referring doctor", 120),
      facility: requireText(args.referrer.facility, "Referring facility", 160),
      phone: optionalText(args.referrer.phone, "Referring doctor phone", 30),
    };
  }

  const clinical = cleanClinical(args.clinical, args.procedure);
  const imaging = cleanImaging(args.imaging);
  const documents = validateDocuments(ctx, args.documents, 0);
  const reference = generateReference(ctx, args.procedure);
  const now = new Date().toISOString();
  const referralId = newId();

  run(
    ctx.db,
    `INSERT INTO referrals
       (id, reference, procedure, status, submitted_by_id, submitter_role, for_dependent,
        patient_json, guardian_json, referrer_json, clinical_json, imaging_json,
        submitted_at, updated_at)
     VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    referralId,
    reference,
    args.procedure,
    user.id,
    profile ? "physician" : "patient",
    forDependent ? 1 : 0,
    JSON.stringify(patient),
    guardian ? JSON.stringify(guardian) : null,
    JSON.stringify(referrer),
    JSON.stringify(clinical),
    JSON.stringify(imaging),
    now,
    now,
  );

  for (const doc of documents) {
    run(
      ctx.db,
      `INSERT INTO referral_documents (id, referral_id, storage_id, file_name, kind, uploaded_by_id, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      referralId,
      doc.storageId,
      doc.fileName,
      doc.kind,
      user.id,
      now,
    );
  }

  logAudit(ctx, {
    actorId: user.id,
    action: "referral.submitted",
    entityType: "referral",
    entityId: referralId,
    summary: `${PROCEDURE_LABELS[args.procedure]} request ${reference} submitted with ${documents.length} document(s)`,
  });

  return { reference };
}

/** The signed-in user's own requests, newest first. Empty for anonymous callers. */
export function listMine(
  ctx: Ctx,
  opts: PaginationOpts,
): Page<ReferralSummary> {
  const user = getCurrentUserDoc(ctx);
  if (!user) return EMPTY_PAGE;
  const offset = Number(opts.cursor ?? 0) || 0;
  const limit = Math.max(1, Math.min(opts.numItems, 100));
  const rows = allRows<ReferralRow>(
    ctx.db,
    "SELECT * FROM referrals WHERE submitted_by_id = ? ORDER BY submitted_at DESC LIMIT ? OFFSET ?",
    user.id,
    limit + 1,
    offset,
  );
  return pageOf(rows, offset, limit, (row) => {
    const referral = toReferral(row);
    return {
      _id: referral.id,
      reference: referral.reference,
      procedure: referral.procedure,
      status: referral.status,
      patientName: referral.patient.fullName,
      urgency: referral.clinical.urgency,
      submittedAt: referral.submittedAt,
    };
  });
}

function pageOf<T, R>(
  rows: T[],
  offset: number,
  limit: number,
  map: (row: T) => R,
): Page<R> {
  const isDone = rows.length <= limit;
  const items = (isDone ? rows : rows.slice(0, limit)).map(map);
  return {
    page: items,
    isDone,
    continueCursor: isDone ? "" : String(offset + limit),
  };
}

/** Full request detail for its submitter or staff; null when missing or not allowed. */
export function getByReference(
  ctx: Ctx,
  args: { reference: string },
): ReferralDetail | null {
  const user = getCurrentUserDoc(ctx);
  if (!user) return null;
  const row = getRow<ReferralRow>(
    ctx.db,
    "SELECT * FROM referrals WHERE reference = ?",
    args.reference.toUpperCase(),
  );
  if (!row || !canView(user, row)) return null;

  const referral = toReferral(row);
  const documents = allRows<DocumentRow>(
    ctx.db,
    "SELECT * FROM referral_documents WHERE referral_id = ? ORDER BY uploaded_at ASC LIMIT 50",
    row.id,
  ).map((doc) => {
    const meta = getFileMeta(ctx.db, doc.storage_id);
    return {
      _id: doc.id,
      id: doc.id,
      fileName: doc.file_name,
      kind: doc.kind,
      uploadedAt: doc.uploaded_at,
      size: meta?.size ?? 0,
      url: `/api/files/${doc.storage_id}`,
    };
  });

  return {
    ...referral,
    documents,
    canEdit:
      row.submitted_by_id === user.id && OPEN_STATUSES.includes(row.status),
    events: eventsForSubmitter(ctx, row.id),
    notes: submitterVisibleNotes(ctx, row.id),
    appointment: appointmentForReferral(ctx, row.id),
    preparation: loadCareRecord(ctx, row.id).preparation,
  };
}

function actorName(ctx: Ctx, actorId: string | null): string {
  if (!actorId) return "System";
  const actor = getRow<{ full_name: string | null; email: string | null }>(
    ctx.db,
    "SELECT full_name, email FROM users WHERE id = ?",
    actorId,
  );
  return actor?.full_name ?? actor?.email ?? "User";
}

function eventsForSubmitter(ctx: Ctx, referralId: string) {
  return allRows<{
    id: string;
    type: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    actor_id: string | null;
    at: string;
  }>(
    ctx.db,
    "SELECT * FROM referral_events WHERE referral_id = ? ORDER BY at ASC LIMIT 200",
    referralId,
  ).map((event) => ({
    _id: event.id,
    type: event.type,
    fromStatus: event.from_status,
    toStatus: event.to_status,
    note: event.note,
    actor: actorName(ctx, event.actor_id),
    at: event.at,
  }));
}

function submitterVisibleNotes(ctx: Ctx, referralId: string) {
  return allRows<{
    id: string;
    author_id: string;
    body: string;
    visibility: "staff" | "submitter";
    at: string;
  }>(
    ctx.db,
    "SELECT * FROM referral_notes WHERE referral_id = ? AND visibility = 'submitter' ORDER BY at ASC",
    referralId,
  ).map((note) => ({
    _id: note.id,
    body: note.body,
    visibility: note.visibility,
    author: actorName(ctx, note.author_id),
    at: note.at,
  }));
}

function loadOwnOpenReferral(
  ctx: Ctx,
  referralId: string,
): { user: UserRow; referral: ReferralRow } {
  const user = requireUser(ctx);
  const referral = getRow<ReferralRow>(
    ctx.db,
    "SELECT * FROM referrals WHERE id = ?",
    referralId,
  );
  if (!referral || referral.submitted_by_id !== user.id) {
    throw new AppError("NOT_FOUND", "Request not found.");
  }
  if (!OPEN_STATUSES.includes(referral.status)) {
    throw new AppError("BAD_REQUEST", "This request can no longer be changed.");
  }
  return { user, referral };
}

export function addDocuments(
  ctx: Ctx,
  args: { referralId: string; documents: DocumentInput[] },
): null {
  requireSubmitter(ctx);
  const { user, referral } = loadOwnOpenReferral(ctx, args.referralId);
  const existing = allRows<DocumentRow>(
    ctx.db,
    "SELECT * FROM referral_documents WHERE referral_id = ? LIMIT 50",
    referral.id,
  );
  const documents = validateDocuments(ctx, args.documents, existing.length);
  if (documents.length === 0) return null;
  const now = new Date().toISOString();
  for (const doc of documents) {
    run(
      ctx.db,
      `INSERT INTO referral_documents (id, referral_id, storage_id, file_name, kind, uploaded_by_id, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      referral.id,
      doc.storageId,
      doc.fileName,
      doc.kind,
      user.id,
      now,
    );
  }
  run(
    ctx.db,
    "UPDATE referrals SET updated_at = ? WHERE id = ?",
    now,
    referral.id,
  );
  logAudit(ctx, {
    actorId: user.id,
    action: "referral.documents_added",
    entityType: "referral",
    entityId: referral.id,
    summary: `Added ${documents.length} document(s)`,
  });
  return null;
}

export function withdraw(
  ctx: Ctx,
  args: { referralId: string; reason: string },
): null {
  const { user, referral } = loadOwnOpenReferral(ctx, args.referralId);
  const reason = requireText(args.reason, "Reason", 500);
  run(
    ctx.db,
    "UPDATE referrals SET status = 'withdrawn', updated_at = ? WHERE id = ?",
    new Date().toISOString(),
    referral.id,
  );
  logAudit(ctx, {
    actorId: user.id,
    action: "referral.withdrawn",
    entityType: "referral",
    entityId: referral.id,
    summary: `Withdrawn by submitter: ${reason}`,
  });
  return null;
}

/** Removes an upload that was never attached (e.g. the user removed it from the form). */
export function discardUpload(ctx: Ctx, args: { storageId: string }): null {
  requireSubmitter(ctx);
  const attached = getRow<{ id: string }>(
    ctx.db,
    "SELECT id FROM referral_documents WHERE storage_id = ?",
    args.storageId,
  );
  if (attached) return null;
  if (getFileMeta(ctx.db, args.storageId)) deleteFile(ctx.db, args.storageId);
  return null;
}
