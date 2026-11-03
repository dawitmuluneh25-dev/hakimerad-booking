// Pure referral constants shared by server functions and the UI.
// No clinical guidance lives here: only labels for the options a referrer can pick.

export const REFERRAL_PROCEDURES = ["biopsy-fnac", "abscess-drainage"] as const;
export type ReferralProcedure = (typeof REFERRAL_PROCEDURES)[number];

export const PROCEDURE_CODES: Record<ReferralProcedure, string> = {
  "biopsy-fnac": "BX",
  "abscess-drainage": "DR",
};

export const PROCEDURE_LABELS: Record<ReferralProcedure, string> = {
  "biopsy-fnac": "Image-Guided Biopsy / FNAC",
  "abscess-drainage": "Image-Guided Abscess Drainage",
};

export function isReferralProcedure(value: string): value is ReferralProcedure {
  return (REFERRAL_PROCEDURES as readonly string[]).includes(value);
}

/** Full lifecycle; this milestone only uses "submitted" and "withdrawn". */
export const REFERRAL_STATUSES = [
  "submitted",
  "in_review",
  "info_requested",
  "approved",
  "deferred",
  "declined",
  "scheduled",
  "completed",
  "withdrawn",
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  submitted: "Submitted, awaiting review",
  in_review: "In clinical review",
  info_requested: "More information requested",
  approved: "Clinically approved",
  deferred: "Deferred",
  declined: "Not approved",
  scheduled: "Scheduled",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

/** Statuses where the submitter may still withdraw or add documents. */
export const OPEN_STATUSES: readonly ReferralStatus[] = ["submitted", "in_review", "info_requested"];

export const REQUESTED_METHODS: Record<ReferralProcedure, Record<string, string>> = {
  "biopsy-fnac": {
    us_fnac: "Ultrasound-guided FNAC",
    us_core: "Ultrasound-guided core needle biopsy",
    ct_biopsy: "CT-guided biopsy",
    unsure: "Not sure, radiologist to decide",
  },
  "abscess-drainage": {
    aspiration: "Image-guided aspiration",
    drain: "Percutaneous drainage / catheter placement",
    unsure: "Not sure, radiologist to decide",
  },
};

export const URGENCY_LABELS = {
  routine: "Routine",
  soon: "Soon",
  urgent: "Urgent",
} as const;
export type Urgency = keyof typeof URGENCY_LABELS;

export const MODALITY_LABELS = {
  ultrasound: "Ultrasound",
  ct: "CT",
  mri: "MRI",
  xray: "X-ray",
  other: "Other",
} as const;
export type Modality = keyof typeof MODALITY_LABELS;

export const SEX_LABELS = { female: "Female", male: "Male" } as const;
export type Sex = keyof typeof SEX_LABELS;

export const YES_NO_UNKNOWN_LABELS = { yes: "Yes", no: "No", unknown: "Not sure" } as const;
export type YesNoUnknown = keyof typeof YES_NO_UNKNOWN_LABELS;

export const DOCUMENT_KIND_LABELS = {
  referral_letter: "Referral letter",
  imaging_report: "Imaging report",
  lab_result: "Lab result",
  other: "Other",
} as const;
export type DocumentKind = keyof typeof DOCUMENT_KIND_LABELS;

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENTS = 10;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Whole years between a YYYY-MM-DD birth date and a YYYY-MM-DD "today". */
export function ageOn(dateOfBirth: string, today: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

export const ADULT_AGE = 18;
