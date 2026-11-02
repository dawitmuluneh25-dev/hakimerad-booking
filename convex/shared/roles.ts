// Pure role constants shared by Convex functions and the UI.

export const ROLES = [
  "patient",
  "physician",
  "receptionist",
  "radiologist",
  "coordinator",
  "admin",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles an end user may pick for themselves on first sign-in. */
export const SELF_SERVICE_ROLES = ["patient", "physician"] as const;
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

/** Roles only an admin can assign. */
export const STAFF_ROLES = [
  "receptionist",
  "radiologist",
  "coordinator",
  "admin",
] as const satisfies readonly Role[];

export const ROLE_LABELS: Record<Role, string> = {
  patient: "Patient / guardian",
  physician: "Referring physician",
  receptionist: "Receptionist",
  radiologist: "Interventional radiologist",
  coordinator: "Radiology coordinator",
  admin: "Administrator",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  patient:
    "Submit and follow requests for yourself or a child or family member you care for.",
  physician:
    "Refer patients as a verified doctor, hospital or healthcare facility.",
  receptionist: "Manage intake, documents and patient communication.",
  radiologist: "Review referrals and make clinical decisions.",
  coordinator: "Coordinate schedules, rooms and procedure-day logistics.",
  admin: "Manage accounts, verification, settings and reports.",
};

export function isStaffRole(role: Role | undefined): boolean {
  return role !== undefined && (STAFF_ROLES as readonly Role[]).includes(role);
}

export const PHYSICIAN_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "suspended",
] as const;
export type PhysicianStatus = (typeof PHYSICIAN_STATUSES)[number];

export const PHYSICIAN_STATUS_LABELS: Record<PhysicianStatus, string> = {
  pending: "Awaiting verification",
  verified: "Verified",
  rejected: "Not approved",
  suspended: "Suspended",
};
