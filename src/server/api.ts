import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ROLES } from "@/shared/roles.ts";
import {
  DOCUMENT_KIND_LABELS,
  MODALITY_LABELS,
  REFERRAL_PROCEDURES,
  SEX_LABELS,
  URGENCY_LABELS,
  YES_NO_UNKNOWN_LABELS,
} from "@/shared/referrals.ts";

/**
 * Every mutation and query the UI needs. Handlers import the server runtime
 * lazily, so the SQLite layer never reaches the browser bundle.
 */

const patientSchema = z.object({
  fullName: z.string(),
  dateOfBirth: z.string(),
  sex: z.enum(
    Object.keys(SEX_LABELS) as [
      keyof typeof SEX_LABELS,
      ...Array<keyof typeof SEX_LABELS>,
    ],
  ),
  phone: z.string(),
  email: z.string().optional(),
  address: z.string().optional(),
  idNumber: z.string().optional(),
});

const guardianSchema = z.object({
  fullName: z.string(),
  relationship: z.string(),
  phone: z.string(),
});

const clinicalSchema = z.object({
  indication: z.string(),
  site: z.string(),
  requestedMethod: z.string(),
  urgency: z.enum(
    Object.keys(URGENCY_LABELS) as [
      keyof typeof URGENCY_LABELS,
      ...Array<keyof typeof URGENCY_LABELS>,
    ],
  ),
  previousBiopsy: z.string().optional(),
  bloodThinners: z.enum(
    Object.keys(YES_NO_UNKNOWN_LABELS) as [
      keyof typeof YES_NO_UNKNOWN_LABELS,
      ...Array<keyof typeof YES_NO_UNKNOWN_LABELS>,
    ],
  ),
  allergies: z.string().optional(),
  otherConditions: z.string().optional(),
});

const imagingSchema = z.object({
  modality: z.enum(
    Object.keys(MODALITY_LABELS) as [
      keyof typeof MODALITY_LABELS,
      ...Array<keyof typeof MODALITY_LABELS>,
    ],
  ),
  studyDate: z.string().optional(),
  facility: z.string().optional(),
  pacsReference: z.string().optional(),
  findings: z.string().optional(),
});

const documentSchema = z.object({
  storageId: z.string().min(1),
  fileName: z.string().min(1),
  kind: z.enum(
    Object.keys(DOCUMENT_KIND_LABELS) as [
      keyof typeof DOCUMENT_KIND_LABELS,
      ...Array<keyof typeof DOCUMENT_KIND_LABELS>,
    ],
  ),
});

const paginationSchema = z.object({
  numItems: z.number().int().positive().max(100),
  cursor: z.string().nullable(),
});

const physicianProfileSchema = z.object({
  fullName: z.string(),
  registrationNumber: z.string(),
  licensingBody: z.string(),
  specialty: z.string(),
  facilityName: z.string(),
  facilityAddress: z.string(),
  phone: z.string(),
});

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { currentCtx, services, toSessionUser } =
      await import("./runtime.ts");
    const { users } = services;
    const ctx = currentCtx();
    if (!ctx.identity) return { user: null };
    let me;
    try {
      me = users.me(ctx);
    } catch {
      return { user: null };
    }
    if (!me) return { user: null };
    return {
      user: toSessionUser({
        id: me.id,
        email: me.email,
        full_name: me.fullName,
      }),
    };
  },
);

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const { runWithCtx, services } = await import("./runtime.ts");
  return runWithCtx((ctx) => services.users.me(ctx));
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        role: z.enum(["patient", "physician"]),
        fullName: z.string(),
        phone: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.users.completeOnboarding(ctx, data));
  });

export const updateContactDetails = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ fullName: z.string(), phone: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.users.updateContactDetails(ctx, data));
  });

export const submitPhysicianProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => physicianProfileSchema.parse(data))
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) =>
      services.users.submitPhysicianProfile(ctx, data),
    );
  });

export const claimFirstAdmin = createServerFn({ method: "POST" }).handler(
  async () => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.users.claimFirstAdmin(ctx));
  },
);

export const submitReferral = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        procedure: z.enum(
          REFERRAL_PROCEDURES as unknown as [string, ...string[]],
        ),
        forDependent: z.boolean(),
        patient: patientSchema,
        guardian: guardianSchema.optional(),
        referrer: z
          .object({
            name: z.string(),
            facility: z.string(),
            phone: z.string().optional(),
          })
          .optional(),
        clinical: clinicalSchema,
        imaging: imagingSchema,
        documents: z.array(documentSchema),
        confirmNotAppointment: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.referrals.submit(ctx, data as never));
  });

export const listMyReferrals = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ paginationOpts: paginationSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) =>
      services.referrals.listMine(ctx, data.paginationOpts),
    );
  });

export const getReferralByReference = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ reference: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.referrals.getByReference(ctx, data));
  });

export const addReferralDocuments = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        documents: z.array(documentSchema),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.referrals.addDocuments(ctx, data));
  });

export const withdrawReferral = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ referralId: z.string().min(1), reason: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.referrals.withdraw(ctx, data));
  });

export const discardUpload = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ storageId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.referrals.discardUpload(ctx, data));
  });

export const listPhysicians = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        status: z.enum(["pending", "verified", "rejected", "suspended"]),
        paginationOpts: paginationSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.admin.listPhysicians(ctx, data));
  });

export const reviewPhysician = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        profileId: z.string().min(1),
        decision: z.enum(["verified", "rejected", "suspended"]),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.admin.reviewPhysician(ctx, data));
  });

export const listUsers = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        role: z
          .enum([...ROLES, "unassigned"] as [string, ...string[]])
          .optional(),
        search: z.string().optional(),
        paginationOpts: paginationSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.admin.listUsers(ctx, data as never));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        userId: z.string().min(1),
        role: z.enum(ROLES as unknown as [string, ...string[]]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.admin.setUserRole(ctx, data as never));
  });

// ---------------------------------------------------------------------------
// Clinical review (M5)
// ---------------------------------------------------------------------------

export const reviewQueue = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        status: z.string().optional(),
        procedure: z.string().optional(),
        paginationOpts: paginationSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reviews.queue(ctx, data));
  });

export const staffReferralDetail = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ reference: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reviews.detail(ctx, data));
  });

const checklistSchema = z.record(z.string(), z.boolean());

export const reviewReferral = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        decision: z.enum([
          "approve",
          "defer",
          "decline",
          "request_info",
          "redirect",
        ]),
        priority: z.enum(["routine", "soon", "urgent"]).optional(),
        modality: z.string().optional(),
        redirectTo: z.string().optional(),
        checklist: checklistSchema,
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reviews.review(ctx, data as never));
  });

export const respondToInformationRequest = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ referralId: z.string().min(1), body: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reviews.respondToInfo(ctx, data));
  });

export const addStaffNote = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ referralId: z.string().min(1), body: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reviews.addStaffNote(ctx, data));
  });

// ---------------------------------------------------------------------------
// Urgent intussusception coordination (M4)
// ---------------------------------------------------------------------------

const urgentPatientSchema = z.object({
  fullName: z.string(),
  dateOfBirth: z.string(),
  ageYears: z.number().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

export const createUrgentCase = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        department: z.string(),
        facilityName: z.string(),
        facilityPhone: z.string(),
        clinicianName: z.string(),
        clinicianPhone: z.string(),
        patient: urgentPatientSchema,
        guardian: guardianSchema.optional(),
        clinical: z.object({
          presentation: z.string(),
          imagingAvailable: z.enum(["yes", "no", "unknown"]),
          imagingDetail: z.string().optional(),
          coordinationTime: z.string().optional(),
          notes: z.string().optional(),
        }),
        acknowledgeWarning: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.urgent.create(ctx, data as never));
  });

export const listUrgentCases = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        status: z.string().optional(),
        paginationOpts: paginationSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.urgent.list(ctx, data));
  });

export const getUrgentCase = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ reference: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.urgent.detail(ctx, data));
  });

export const acknowledgeUrgentCase = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ reference: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.urgent.acknowledge(ctx, data));
  });

export const decideUrgentCase = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        reference: z.string().min(1),
        decision: z.enum(["accept", "decline"]),
        note: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.urgent.decide(ctx, data));
  });

export const scheduleUrgentCase = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        reference: z.string().min(1),
        scheduledAt: z.string(),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.urgent.scheduleSlot(ctx, data));
  });

export const closeUrgentCase = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ reference: z.string().min(1), note: z.string().optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.urgent.close(ctx, data));
  });

// ---------------------------------------------------------------------------
// Scheduling (M6)
// ---------------------------------------------------------------------------

export const listResources = createServerFn({ method: "GET" }).handler(
  async () => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.listResources(ctx));
  },
);

export const saveResource = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        kind: z.enum(["room", "equipment", "staff"]),
        name: z.string(),
        modality: z.string().optional(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.saveResource(ctx, data));
  });

export const listProcedureSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.listProcedureSettings(ctx));
  },
);

export const saveProcedureSetting = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        procedure: z.string().min(1),
        durationMinutes: z.number(),
        bufferMinutes: z.number(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) =>
      services.scheduling.saveProcedureSetting(ctx, data),
    );
  });

export const listScheduleExceptions = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.listExceptions(ctx, data));
  });

export const addScheduleException = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        kind: z.enum(["leave", "closure", "holiday"]),
        resourceId: z.string().optional(),
        startsAt: z.string(),
        endsAt: z.string(),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.addException(ctx, data));
  });

export const removeScheduleException = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.removeException(ctx, data));
  });

export const listBookableReferrals = createServerFn({ method: "GET" }).handler(
  async () => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.listBookable(ctx));
  },
);

export const appointmentAvailability = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        date: z.string(),
        procedure: z.string(),
        roomId: z.string().optional(),
        equipmentId: z.string().optional(),
        radiologistId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.availability(ctx, data));
  });

const bookingSchema = z.object({
  startsAt: z.string(),
  roomId: z.string().optional(),
  equipmentId: z.string().optional(),
  radiologistId: z.string().optional(),
});

export const bookAppointment = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    bookingSchema.extend({ referralId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.book(ctx, data));
  });

export const rescheduleAppointment = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    bookingSchema.extend({ appointmentId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.reschedule(ctx, data));
  });

export const cancelAppointment = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ appointmentId: z.string().min(1), reason: z.string() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.cancel(ctx, data));
  });

export const setAppointmentStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ appointmentId: z.string().min(1), status: z.string() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) =>
      services.scheduling.setAppointmentStatus(ctx, data),
    );
  });

export const listAppointments = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.scheduling.listAppointments(ctx, data));
  });

// ---------------------------------------------------------------------------
// Preparation and procedure day (M7)
// ---------------------------------------------------------------------------

export const issuePreparationInstructions = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ referralId: z.string().min(1), instructions: z.string() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.issuePreparation(ctx, data));
  });

export const acknowledgePreparation = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ referralId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.acknowledgePreparation(ctx, data));
  });

export const setPreparationState = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        state: z.enum(["completed", "needs_review"]),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.setPreparationState(ctx, data));
  });

export const recordConsent = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        status: z.enum(["not_recorded", "recorded", "declined", "unable"]),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.recordConsent(ctx, data));
  });

export const recordProcedureStep = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        step: z.string(),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.recordStep(ctx, data));
  });

export const saveSpecimen = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        collectionType: z.string(),
        identifier: z.string(),
        containers: z.number().optional(),
        destination: z.string().optional(),
        status: z.enum(["pending", "dispatched", "received", "not_applicable"]),
        responsibleId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.saveSpecimen(ctx, data));
  });

export const addFollowUp = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        title: z.string(),
        dueDate: z.string().optional(),
        note: z.string().optional(),
        assigneeId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.addFollowUp(ctx, data));
  });

export const completeFollowUp = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ taskId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.care.completeFollowUp(ctx, data));
  });

// ---------------------------------------------------------------------------
// Notifications (M8)
// ---------------------------------------------------------------------------

export const listNotifications = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        unreadOnly: z.boolean().optional(),
        paginationOpts: paginationSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) =>
      services.notifications.listMine(ctx, {
        ...data.paginationOpts,
        unreadOnly: data.unreadOnly,
      }),
    );
  });

export const unreadNotificationCount = createServerFn({
  method: "GET",
}).handler(async () => {
  const { runWithCtx, services } = await import("./runtime.ts");
  return runWithCtx((ctx) => services.notifications.unreadCount(ctx));
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ notificationId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.notifications.markRead(ctx, data));
  });

export const markAllNotificationsRead = createServerFn({
  method: "POST",
}).handler(async () => {
  const { runWithCtx, services } = await import("./runtime.ts");
  return runWithCtx((ctx) => services.notifications.markAllRead(ctx));
});

export const resendNotification = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ deliveryId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.notifications.resend(ctx, data));
  });

export const notificationDeliveries = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ entityType: z.string(), entityId: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) =>
      services.notifications.deliveriesForEntity(ctx, data),
    );
  });

// ---------------------------------------------------------------------------
// Administration and reports (M9)
// ---------------------------------------------------------------------------

export const reportMetrics = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reports.metrics(ctx, data));
  });

export const auditLog = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        search: z.string().optional(),
        entityType: z.string().optional(),
        paginationOpts: paginationSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reports.auditLog(ctx, data));
  });

export const listInstitutions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reports.listInstitutions(ctx));
  },
);

export const saveInstitution = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        name: z.string(),
        kind: z.string(),
        address: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reports.saveInstitution(ctx, data));
  });

export const setPaymentStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        referralId: z.string().min(1),
        status: z.enum(["unset", "due", "paid", "waived"]),
        feeCents: z.number().optional(),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reports.setPayment(ctx, data));
  });

export const getSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.settings.allSettings(ctx));
  },
);

export const saveSetting = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ key: z.string().min(1), value: z.unknown() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) =>
      services.settings.saveSetting(ctx, data as never),
    );
  });

export const getPublicContacts = createServerFn({ method: "GET" }).handler(
  async () => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.reports.contacts(ctx));
  },
);

export const auditForEntity = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ entityType: z.string(), entityId: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { runWithCtx, services } = await import("./runtime.ts");
    return runWithCtx((ctx) => services.admin.auditForEntity(ctx, data));
  });
