import { z } from "zod";
import { ADULT_AGE, ageOn } from "@/convex/shared/referrals.ts";
import { phoneSchema, requiredText } from "@/lib/form-schemas.ts";

const optionalText = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function needsGuardian(dateOfBirth: string, forDependent: boolean): boolean {
  if (forDependent) return true;
  return DATE.test(dateOfBirth) && ageOn(dateOfBirth, localToday()) < ADULT_AGE;
}

export const referralFormSchema = z
  .object({
    forDependent: z.boolean(),
    patient: z.object({
      fullName: requiredText("Patient full name", 120),
      dateOfBirth: z
        .string()
        .regex(DATE, "Enter the date of birth")
        .refine((v) => v <= localToday(), "Date of birth cannot be in the future"),
      sex: z.enum(["female", "male"], { message: "Choose one" }),
      phone: phoneSchema,
      email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
      address: optionalText(300),
      idNumber: optionalText(60),
    }),
    guardian: z.object({
      fullName: optionalText(120),
      relationship: optionalText(60),
      phone: z.string().trim(),
    }),
    referrer: z.object({
      name: optionalText(120),
      facility: optionalText(160),
      phone: optionalText(30),
    }),
    clinical: z.object({
      indication: requiredText("Clinical indication", 2000),
      site: requiredText("This field", 300),
      requestedMethod: z.string().min(1, "Choose a procedure type"),
      urgency: z.enum(["routine", "soon", "urgent"]),
      previousBiopsy: optionalText(1000),
      bloodThinners: z.enum(["yes", "no", "unknown"]),
      allergies: optionalText(500),
      otherConditions: optionalText(1000),
    }),
    imaging: z.object({
      modality: z.enum(["ultrasound", "ct", "mri", "xray", "other"]),
      studyDate: z.union([z.literal(""), z.string().regex(DATE)]),
      facility: optionalText(160),
      pacsReference: optionalText(100),
      findings: optionalText(2000),
    }),
    needsReferrer: z.boolean(),
    confirmNotAppointment: z.boolean().refine((v) => v, "Please confirm to continue"),
  })
  .superRefine((values, ctx) => {
    if (needsGuardian(values.patient.dateOfBirth, values.forDependent)) {
      const g = values.guardian;
      if (g.fullName.length < 2) ctx.addIssue({ code: "custom", path: ["guardian", "fullName"], message: "Guardian name is required" });
      if (g.relationship.length < 2) ctx.addIssue({ code: "custom", path: ["guardian", "relationship"], message: "Relationship is required" });
      if (!phoneSchema.safeParse(g.phone).success) ctx.addIssue({ code: "custom", path: ["guardian", "phone"], message: "Enter a valid phone number" });
    }
    if (values.needsReferrer) {
      if (values.referrer.name.length < 2) ctx.addIssue({ code: "custom", path: ["referrer", "name"], message: "Referring doctor is required" });
      if (values.referrer.facility.length < 2) ctx.addIssue({ code: "custom", path: ["referrer", "facility"], message: "Referring facility is required" });
    }
  });

export type ReferralFormValues = z.infer<typeof referralFormSchema>;
