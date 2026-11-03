import type {
  DocumentKind,
  Modality,
  ReferralProcedure,
  ReferralStatus,
  Sex,
  Urgency,
  YesNoUnknown,
} from "@/shared/referrals.ts";
import type { PhysicianStatus, Role } from "@/shared/roles.ts";

export type Patient = {
  fullName: string;
  dateOfBirth: string;
  sex: Sex;
  phone: string;
  email?: string;
  address?: string;
  idNumber?: string;
};

export type Guardian = {
  fullName: string;
  relationship: string;
  phone: string;
};

export type Referrer = {
  name: string;
  facility: string;
  phone?: string;
  physicianProfileId?: string;
};

export type Clinical = {
  indication: string;
  site: string;
  requestedMethod: string;
  urgency: Urgency;
  previousBiopsy?: string;
  bloodThinners: YesNoUnknown;
  allergies?: string;
  otherConditions?: string;
};

export type Imaging = {
  modality: Modality;
  studyDate?: string;
  facility?: string;
  pacsReference?: string;
  findings?: string;
};

export type User = {
  id: string;
  tokenIdentifier: string;
  name?: string;
  email?: string;
  role?: Role;
  fullName?: string;
  phone?: string;
  onboardedAt?: string;
};

export type PhysicianProfile = {
  _id: string;
  id: string;
  userId: string;
  fullName: string;
  registrationNumber: string;
  licensingBody: string;
  specialty: string;
  facilityName: string;
  facilityAddress: string;
  phone: string;
  status: PhysicianStatus;
  submittedAt: string;
  reviewNote?: string;
  reviewedById?: string;
  reviewedAt?: string;
};

/** Everything the app shell needs about the signed-in user. */
export type Me = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role | null;
  physicianProfile: PhysicianProfile | null;
  adminExists: boolean;
};

export type Referral = {
  _id: string;
  id: string;
  reference: string;
  procedure: ReferralProcedure;
  status: ReferralStatus;
  submittedById: string;
  submitterRole: "patient" | "physician";
  forDependent: boolean;
  patient: Patient;
  guardian?: Guardian;
  referrer: Referrer;
  clinical: Clinical;
  imaging: Imaging;
  submittedAt: string;
  updatedAt: string;
};

export type ReferralDocument = {
  _id: string;
  id: string;
  fileName: string;
  kind: DocumentKind;
  uploadedAt: string;
  size: number;
  url: string | null;
};

export type ReferralDetail = Referral & {
  documents: ReferralDocument[];
  canEdit: boolean;
  /** Present for the submitter: their own status history and care details. */
  events?: ReferralEvent[];
  notes?: ReferralNote[];
  appointment?: AppointmentSummary | null;
  preparation?: PreparationRecord | null;
};

export type ReferralSummary = {
  _id: string;
  reference: string;
  procedure: ReferralProcedure;
  status: ReferralStatus;
  patientName: string;
  urgency: Urgency;
  submittedAt: string;
};

/** Cursor page, same shape the Convex queries returned. */
export type Page<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};

export type PaginationOpts = { numItems: number; cursor: string | null };

export const EMPTY_PAGE: Page<never> = {
  page: [],
  isDone: true,
  continueCursor: "",
};

export type DocumentInput = {
  storageId: string;
  fileName: string;
  kind: DocumentKind;
};

// ---------------------------------------------------------------------------
// Clinical review (M5)
// ---------------------------------------------------------------------------

export type ChecklistRecord = Record<string, boolean>;

export type ReferralEvent = {
  _id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  at: string;
};

export type ReferralReview = {
  _id: string;
  decision: string;
  priority: string | null;
  modality: string | null;
  redirectTo: string | null;
  checklist: ChecklistRecord;
  note: string | null;
  reviewer: string;
  at: string;
};

export type ReferralNote = {
  _id: string;
  body: string;
  visibility: "staff" | "submitter";
  author: string;
  at: string;
};

export type QueueItem = {
  _id: string;
  reference: string;
  procedure: ReferralProcedure;
  status: ReferralStatus;
  urgency: Urgency;
  priority: string | null;
  patientName: string;
  submittedAt: string;
  hasAppointment: boolean;
};

export type StaffReferralDetail = ReferralDetail & {
  priority: string | null;
  events: ReferralEvent[];
  reviews: ReferralReview[];
  notes: ReferralNote[];
  appointment: AppointmentSummary | null;
  preparation: PreparationRecord | null;
  consent: ConsentRecord | null;
  steps: ProcedureStepRecord[];
  specimens: SpecimenRecord[];
  followUps: FollowUpRecord[];
  payment: { status: string; feeCents: number | null; note: string | null };
  transitions: ReferralStatus[];
};

// ---------------------------------------------------------------------------
// Urgent intussusception coordination (M4)
// ---------------------------------------------------------------------------

export type UrgentPatient = {
  fullName: string;
  dateOfBirth: string;
  ageYears?: number;
  guardianName?: string;
  guardianPhone?: string;
};

export type UrgentClinical = {
  presentation: string;
  imagingAvailable: YesNoUnknown;
  imagingDetail?: string;
  coordinationTime?: string;
  notes?: string;
};

export type UrgentCaseSummary = {
  _id: string;
  reference: string;
  status: string;
  patientName: string;
  facilityName: string;
  department: string;
  createdAt: string;
  acknowledgedAt: string | null;
};

export type UrgentCaseDetail = UrgentCaseSummary & {
  facilityPhone: string;
  clinicianName: string;
  clinicianPhone: string;
  patient: UrgentPatient;
  guardian?: Guardian;
  clinical: UrgentClinical;
  acknowledgedBy: string | null;
  decision: string | null;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  scheduledAt: string | null;
  events: ReferralEvent[];
  transitions: string[];
};

// ---------------------------------------------------------------------------
// Scheduling (M6)
// ---------------------------------------------------------------------------

export type Resource = {
  _id: string;
  kind: string;
  name: string;
  modality: string | null;
  active: boolean;
};

export type ProcedureSetting = {
  procedure: string;
  durationMinutes: number;
  bufferMinutes: number;
  active: boolean;
};

export type ScheduleException = {
  _id: string;
  kind: string;
  resourceId: string | null;
  resourceName: string | null;
  startsAt: string;
  endsAt: string;
  note: string | null;
};

export type AppointmentSummary = {
  _id: string;
  referralId: string;
  reference: string;
  procedure: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  roomId: string | null;
  roomName: string | null;
  equipmentId: string | null;
  equipmentName: string | null;
  radiologistId: string | null;
  radiologistName: string | null;
  status: string;
  cancelReason: string | null;
};

export type BookableReferral = {
  _id: string;
  reference: string;
  procedure: string;
  patientName: string;
  priority: string | null;
};

// ---------------------------------------------------------------------------
// Preparation and procedure day (M7)
// ---------------------------------------------------------------------------

export type PreparationRecord = {
  _id: string;
  instructions: string;
  state: string;
  issuedAt: string;
  issuedBy: string;
  acknowledgedAt: string | null;
  completedAt: string | null;
  reviewNote: string | null;
};

export type ConsentRecord = {
  _id: string;
  status: string;
  note: string | null;
  recordedBy: string;
  at: string;
};

export type ProcedureStepRecord = {
  _id: string;
  step: string;
  at: string;
  by: string;
  note: string | null;
};

export type SpecimenRecord = {
  _id: string;
  collectionType: string;
  identifier: string;
  containers: number;
  destination: string | null;
  status: string;
  dispatchedAt: string | null;
  responsible: string | null;
};

export type FollowUpRecord = {
  _id: string;
  title: string;
  dueDate: string | null;
  status: string;
  note: string | null;
  assignee: string | null;
};

// ---------------------------------------------------------------------------
// Notifications (M8)
// ---------------------------------------------------------------------------

export type NotificationItem = {
  _id: string;
  kind: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  deliveries: Array<{
    _id: string;
    channel: string;
    status: string;
    attempts: number;
    detail: string | null;
  }>;
};

// ---------------------------------------------------------------------------
// Administration and reports (M9)
// ---------------------------------------------------------------------------

export type AuditEntry = {
  _id: string;
  at: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actor: string;
};

export type ReportTotals = {
  from: string;
  to: string;
  byProcedure: Array<{ procedure: string; status: string; count: number }>;
  totals: {
    requests: number;
    awaitingReview: number;
    approved: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    urgentOpen: number;
  };
  upcoming: Array<{ date: string; count: number }>;
};

export type InstitutionRecord = {
  _id: string;
  name: string;
  kind: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
};
