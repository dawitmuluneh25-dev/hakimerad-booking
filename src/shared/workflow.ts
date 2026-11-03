// Pure workflow constants shared by server functions and the UI.
// Nothing here is clinical guidance: only state names, allowed transitions and
// labels for options that staff choose from.

import type { ReferralStatus } from "./referrals.ts";

/**
 * The one central transition table for referral statuses. Every status change
 * goes through `assertTransition` on the server, so a receptionist (or a stale
 * browser tab) cannot move a request into a state the workflow forbids.
 */
export const ALLOWED_TRANSITIONS: Record<
  ReferralStatus,
  readonly ReferralStatus[]
> = {
  submitted: [
    "in_review",
    "info_requested",
    "approved",
    "deferred",
    "declined",
    "withdrawn",
  ],
  in_review: [
    "info_requested",
    "approved",
    "deferred",
    "declined",
    "withdrawn",
  ],
  info_requested: [
    "in_review",
    "approved",
    "deferred",
    "declined",
    "withdrawn",
  ],
  approved: ["scheduled", "deferred", "declined"],
  deferred: ["in_review", "approved", "declined", "withdrawn"],
  declined: [],
  scheduled: ["completed", "approved"],
  completed: [],
  withdrawn: [],
};

export function canTransition(
  from: ReferralStatus,
  to: ReferralStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Statuses that are still "live" for a queue view. */
export const QUEUE_STATUSES: readonly ReferralStatus[] = [
  "submitted",
  "in_review",
  "info_requested",
  "approved",
  "deferred",
];

export const CLINICAL_PRIORITIES = ["routine", "soon", "urgent"] as const;
export type ClinicalPriority = (typeof CLINICAL_PRIORITIES)[number];

export const CLINICAL_PRIORITY_LABELS: Record<ClinicalPriority, string> = {
  routine: "Routine",
  soon: "Soon",
  urgent: "Urgent",
};

export type ReviewDecision =
  "approve" | "defer" | "decline" | "request_info" | "redirect";

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  approve: "Approve for scheduling",
  defer: "Defer for later review",
  decline: "Do not proceed",
  request_info: "Request more information",
  redirect: "Recommend a different pathway",
};

/** Decision → resulting referral status. `redirect` keeps the request open. */
export const DECISION_STATUS: Record<ReviewDecision, ReferralStatus> = {
  approve: "approved",
  defer: "deferred",
  decline: "declined",
  request_info: "info_requested",
  redirect: "in_review",
};

/** Procedure checklist keys. Staff record whether each item was reviewed. */
export const CHECKLIST_ITEMS = [
  "indication_reviewed",
  "referral_reviewed",
  "imaging_reviewed",
  "identity_verified",
  "additional_investigations",
  "medication_history",
  "anticoagulation",
  "allergies",
  "contrast_assessment",
  "sedation_assessment",
  "consent_documented",
  "resources_confirmed",
] as const;
export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];

export const CHECKLIST_LABELS: Record<ChecklistItem, string> = {
  indication_reviewed: "Clinical indication reviewed",
  referral_reviewed: "Referral documentation reviewed",
  imaging_reviewed: "Imaging reviewed",
  identity_verified: "Patient identity verified",
  additional_investigations: "Additional investigations reviewed, if required",
  medication_history: "Relevant medication history reviewed",
  anticoagulation:
    "Anticoagulant or antiplatelet therapy reviewed by the clinical team",
  allergies: "Relevant allergies reviewed",
  contrast_assessment: "Contrast-related assessment completed when applicable",
  sedation_assessment: "Anesthesia or sedation requirements assessed",
  consent_documented: "Informed consent status documented",
  resources_confirmed: "Procedural resources confirmed",
};

// ---------------------------------------------------------------------------
// Urgent intussusception coordination (M4). Deliberately separate from the
// elective referral statuses: this pathway is never scheduled as routine work.
// ---------------------------------------------------------------------------

export const URGENT_STATUSES = [
  "new",
  "acknowledged",
  "accepted",
  "declined",
  "scheduled",
  "closed",
] as const;
export type UrgentStatus = (typeof URGENT_STATUSES)[number];

export const URGENT_STATUS_LABELS: Record<UrgentStatus, string> = {
  new: "Awaiting radiology acknowledgement",
  acknowledged: "Acknowledged, coordination in progress",
  accepted: "Accepted for hydrostatic reduction",
  declined: "Not accepted here",
  scheduled: "Procedure slot arranged",
  closed: "Closed",
};

export const URGENT_TRANSITIONS: Record<UrgentStatus, readonly UrgentStatus[]> =
  {
    new: ["acknowledged", "declined", "closed"],
    acknowledged: ["accepted", "declined", "closed"],
    accepted: ["scheduled", "closed"],
    declined: ["closed"],
    scheduled: ["closed"],
    closed: [],
  };

export function canTransitionUrgent(
  from: UrgentStatus,
  to: UrgentStatus,
): boolean {
  return URGENT_TRANSITIONS[from].includes(to);
}

export const REFERRING_DEPARTMENTS = [
  "emergency_department",
  "pediatrics",
  "referring_hospital",
  "pediatric_surgery",
  "general_surgery",
  "radiology",
  "other",
] as const;
export type ReferringDepartment = (typeof REFERRING_DEPARTMENTS)[number];

export const REFERRING_DEPARTMENT_LABELS: Record<ReferringDepartment, string> =
  {
    emergency_department: "Emergency department",
    pediatrics: "Pediatric department",
    referring_hospital: "Referring hospital",
    pediatric_surgery: "Pediatric surgeon",
    general_surgery: "General surgeon",
    radiology: "Radiology department",
    other: "Other authorized clinician",
  };

// ---------------------------------------------------------------------------
// Scheduling (M6)
// ---------------------------------------------------------------------------

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Did not attend",
};

/** A booking still occupies its resources until it is cancelled or completed. */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "checked_in",
  "in_progress",
];

export const RESOURCE_KINDS = ["room", "equipment", "staff"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  room: "Procedure room",
  equipment: "Equipment",
  staff: "Staff member",
};

export const EXCEPTION_KINDS = ["leave", "closure", "holiday"] as const;
export type ExceptionKind = (typeof EXCEPTION_KINDS)[number];

export const EXCEPTION_KIND_LABELS: Record<ExceptionKind, string> = {
  leave: "Staff leave",
  closure: "Temporary closure",
  holiday: "Holiday",
};

/** Procedure-day steps recorded in order (M7). */
export const PROCEDURE_STEPS = [
  "arrived",
  "identity_verified",
  "prepared",
  "in_progress",
  "completed",
  "discharged",
] as const;
export type ProcedureStep = (typeof PROCEDURE_STEPS)[number];

export const PROCEDURE_STEP_LABELS: Record<ProcedureStep, string> = {
  arrived: "Patient arrived",
  identity_verified: "Identity verified",
  prepared: "Ready for procedure",
  in_progress: "Procedure in progress",
  completed: "Procedure completed",
  discharged: "Left the department",
};

export const PREPARATION_STATES = [
  "not_issued",
  "issued",
  "acknowledged",
  "completed",
  "needs_review",
] as const;
export type PreparationState = (typeof PREPARATION_STATES)[number];

export const PREPARATION_STATE_LABELS: Record<PreparationState, string> = {
  not_issued: "Instructions not issued",
  issued: "Instructions issued",
  acknowledged: "Instructions acknowledged",
  completed: "Preparation completed",
  needs_review: "Needs clinical review",
};

export const CONSENT_STATUSES = [
  "not_recorded",
  "recorded",
  "declined",
  "unable",
] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  not_recorded: "Consent not recorded",
  recorded: "Consent documented",
  declined: "Consent declined",
  unable: "Unable to obtain",
};

export const SPECIMEN_DISPATCH_STATUSES = [
  "pending",
  "dispatched",
  "received",
  "not_applicable",
] as const;
export type SpecimenDispatchStatus =
  (typeof SPECIMEN_DISPATCH_STATUSES)[number];

export const SPECIMEN_STATUS_LABELS: Record<SpecimenDispatchStatus, string> = {
  pending: "Not dispatched",
  dispatched: "Dispatched",
  received: "Received by laboratory",
  not_applicable: "Not applicable",
};

export const PAYMENT_STATUSES = ["unset", "due", "paid", "waived"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unset: "Not set",
  due: "Payment due",
  paid: "Paid",
  waived: "Waived",
};
