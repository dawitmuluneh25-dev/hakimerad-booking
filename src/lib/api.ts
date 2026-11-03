import { useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  useQuery as useTanStackQuery,
} from "@tanstack/react-query";
import {
  acknowledgePreparation,
  acknowledgeUrgentCase,
  addFollowUp,
  addReferralDocuments,
  addScheduleException,
  addStaffNote,
  appointmentAvailability,
  auditForEntity,
  auditLog,
  bookAppointment,
  cancelAppointment,
  claimFirstAdmin,
  closeUrgentCase,
  completeFollowUp,
  completeOnboarding,
  createUrgentCase,
  decideUrgentCase,
  discardUpload,
  getMe,
  getPublicContacts,
  getReferralByReference,
  getSession,
  getSettings,
  getUrgentCase,
  issuePreparationInstructions,
  listAppointments,
  listBookableReferrals,
  listInstitutions,
  listMyReferrals,
  listNotifications,
  listPhysicians,
  listProcedureSettings,
  listResources,
  listScheduleExceptions,
  listUrgentCases,
  listUsers,
  markAllNotificationsRead,
  markNotificationRead,
  notificationDeliveries,
  recordConsent,
  recordProcedureStep,
  removeScheduleException,
  reportMetrics,
  rescheduleAppointment,
  resendNotification,
  respondToInformationRequest,
  reviewPhysician,
  reviewReferral,
  reviewQueue,
  saveInstitution,
  saveProcedureSetting,
  saveResource,
  saveSetting,
  saveSpecimen,
  scheduleUrgentCase,
  setAppointmentStatus,
  setPaymentStatus,
  setPreparationState,
  setUserRole,
  staffReferralDetail,
  submitPhysicianProfile,
  submitReferral,
  unreadNotificationCount,
  updateContactDetails,
  withdrawReferral,
} from "@/server/api.ts";
import type { SettingKey, SettingsSnapshot } from "@/shared/settings.ts";
import type { SessionUser } from "@/server/auth.ts";
import type {
  AppointmentSummary,
  AuditEntry,
  BookableReferral,
  InstitutionRecord,
  Me,
  NotificationItem,
  Page,
  PhysicianProfile,
  PreparationRecord,
  ProcedureSetting,
  QueueItem,
  ReferralDetail,
  ReferralSummary,
  ReportTotals,
  Resource,
  ScheduleException,
  StaffReferralDetail,
  UrgentCaseDetail,
  UrgentCaseSummary,
} from "@/server/types.ts";
import type { Role } from "@/shared/roles.ts";
import type { PhysicianStatus } from "@/shared/roles.ts";
import { useAuth } from "@/hooks/use-auth.ts";

type PaginationOpts = { numItems: number; cursor: string | null };

/**
 * A typed handle to a server function. It mirrors the shape the Convex client
 * used (`api.users.me` passed to `useQuery`), so call sites read the same.
 */
export type ServerRef<TInput, TOutput> = {
  readonly name: string;
  readonly call: (opts: { data: TInput }) => Promise<TOutput>;
};

function ref<TInput, TOutput>(
  name: string,
  fn: (opts: { data: TInput }) => Promise<TOutput>,
): ServerRef<TInput, TOutput> {
  return { name, call: fn };
}

type Empty = Record<string, never>;

export const api = {
  session: {
    get: ref<Empty, { user: SessionUser | null }>(
      "session.get",
      getSession as never,
    ),
  },
  users: {
    me: ref<Empty, Me | null>("users.me", getMe as never),
    completeOnboarding: ref<
      { role: "patient" | "physician"; fullName: string; phone: string },
      null
    >("users.completeOnboarding", completeOnboarding as never),
    updateContactDetails: ref<{ fullName: string; phone: string }, null>(
      "users.updateContactDetails",
      updateContactDetails as never,
    ),
    submitPhysicianProfile: ref<
      {
        fullName: string;
        registrationNumber: string;
        licensingBody: string;
        specialty: string;
        facilityName: string;
        facilityAddress: string;
        phone: string;
      },
      null
    >("users.submitPhysicianProfile", submitPhysicianProfile as never),
    claimFirstAdmin: ref<Empty, null>(
      "users.claimFirstAdmin",
      claimFirstAdmin as never,
    ),
  },
  referrals: {
    submit: ref<Record<string, unknown>, { reference: string }>(
      "referrals.submit",
      submitReferral as never,
    ),
    listMine: ref<{ paginationOpts: PaginationOpts }, Page<ReferralSummary>>(
      "referrals.listMine",
      listMyReferrals as never,
    ),
    getByReference: ref<{ reference: string }, ReferralDetail | null>(
      "referrals.getByReference",
      getReferralByReference as never,
    ),
    addDocuments: ref<
      {
        referralId: string;
        documents: Array<{ storageId: string; fileName: string; kind: string }>;
      },
      null
    >("referrals.addDocuments", addReferralDocuments as never),
    withdraw: ref<{ referralId: string; reason: string }, null>(
      "referrals.withdraw",
      withdrawReferral as never,
    ),
    discardUpload: ref<{ storageId: string }, null>(
      "referrals.discardUpload",
      discardUpload as never,
    ),
  },
  admin: {
    accounts: {
      listPhysicians: ref<
        { status: PhysicianStatus; paginationOpts: PaginationOpts },
        Page<PhysicianProfile & { email: string }>
      >("admin.listPhysicians", listPhysicians as never),
      reviewPhysician: ref<
        {
          profileId: string;
          decision: "verified" | "rejected" | "suspended";
          note?: string;
        },
        null
      >("admin.reviewPhysician", reviewPhysician as never),
      listUsers: ref<
        {
          role?: Role | "unassigned";
          search?: string;
          paginationOpts: PaginationOpts;
        },
        Page<{
          _id: string;
          email: string;
          fullName: string;
          role: Role | null;
          joinedAt: string;
        }>
      >("admin.listUsers", listUsers as never),
      setUserRole: ref<{ userId: string; role: Role }, null>(
        "admin.setUserRole",
        setUserRole as never,
      ),
      auditForEntity: ref<
        { entityType: string; entityId: string },
        Array<{ _id: string; at: string; summary: string; actor: string }>
      >("admin.auditForEntity", auditForEntity as never),
    },
  },
  reviews: {
    queue: ref<
      { status?: string; procedure?: string; paginationOpts: PaginationOpts },
      Page<QueueItem>
    >("reviews.queue", reviewQueue as never),
    detail: ref<{ reference: string }, StaffReferralDetail | null>(
      "reviews.detail",
      staffReferralDetail as never,
    ),
    review: ref<
      {
        referralId: string;
        decision: "approve" | "defer" | "decline" | "request_info" | "redirect";
        priority?: "routine" | "soon" | "urgent";
        modality?: string;
        redirectTo?: string;
        checklist: Record<string, boolean>;
        note?: string;
      },
      null
    >("reviews.review", reviewReferral as never),
    respondToInfo: ref<{ referralId: string; body: string }, null>(
      "reviews.respondToInfo",
      respondToInformationRequest as never,
    ),
    addNote: ref<{ referralId: string; body: string }, null>(
      "reviews.addNote",
      addStaffNote as never,
    ),
  },
  urgent: {
    create: ref<Record<string, unknown>, { reference: string }>(
      "urgent.create",
      createUrgentCase as never,
    ),
    list: ref<
      { status?: string; paginationOpts: PaginationOpts },
      Page<UrgentCaseSummary>
    >("urgent.list", listUrgentCases as never),
    detail: ref<{ reference: string }, UrgentCaseDetail | null>(
      "urgent.detail",
      getUrgentCase as never,
    ),
    acknowledge: ref<{ reference: string }, null>(
      "urgent.acknowledge",
      acknowledgeUrgentCase as never,
    ),
    decide: ref<
      { reference: string; decision: "accept" | "decline"; note: string },
      null
    >("urgent.decide", decideUrgentCase as never),
    schedule: ref<
      { reference: string; scheduledAt: string; note?: string },
      null
    >("urgent.schedule", scheduleUrgentCase as never),
    close: ref<{ reference: string; note?: string }, null>(
      "urgent.close",
      closeUrgentCase as never,
    ),
  },
  scheduling: {
    listResources: ref<Empty, Resource[]>(
      "scheduling.listResources",
      listResources as never,
    ),
    saveResource: ref<
      {
        id?: string;
        kind: "room" | "equipment" | "staff";
        name: string;
        modality?: string;
        active?: boolean;
      },
      null
    >("scheduling.saveResource", saveResource as never),
    listProcedureSettings: ref<Empty, ProcedureSetting[]>(
      "scheduling.listProcedureSettings",
      listProcedureSettings as never,
    ),
    saveProcedureSetting: ref<
      {
        procedure: string;
        durationMinutes: number;
        bufferMinutes: number;
        active?: boolean;
      },
      null
    >("scheduling.saveProcedureSetting", saveProcedureSetting as never),
    listExceptions: ref<{ from: string; to: string }, ScheduleException[]>(
      "scheduling.listExceptions",
      listScheduleExceptions as never,
    ),
    addException: ref<
      {
        kind: "leave" | "closure" | "holiday";
        resourceId?: string;
        startsAt: string;
        endsAt: string;
        note?: string;
      },
      null
    >("scheduling.addException", addScheduleException as never),
    removeException: ref<{ id: string }, null>(
      "scheduling.removeException",
      removeScheduleException as never,
    ),
    listBookable: ref<Empty, BookableReferral[]>(
      "scheduling.listBookable",
      listBookableReferrals as never,
    ),
    availability: ref<
      {
        date: string;
        procedure: string;
        roomId?: string;
        equipmentId?: string;
        radiologistId?: string;
      },
      Array<{ startsAt: string; available: boolean }>
    >("scheduling.availability", appointmentAvailability as never),
    book: ref<
      {
        referralId: string;
        startsAt: string;
        roomId?: string;
        equipmentId?: string;
        radiologistId?: string;
      },
      { appointmentId: string }
    >("scheduling.book", bookAppointment as never),
    reschedule: ref<
      {
        appointmentId: string;
        startsAt: string;
        roomId?: string;
        equipmentId?: string;
        radiologistId?: string;
      },
      null
    >("scheduling.reschedule", rescheduleAppointment as never),
    cancel: ref<{ appointmentId: string; reason: string }, null>(
      "scheduling.cancel",
      cancelAppointment as never,
    ),
    setStatus: ref<{ appointmentId: string; status: string }, null>(
      "scheduling.setStatus",
      setAppointmentStatus as never,
    ),
    list: ref<{ from: string; to: string }, AppointmentSummary[]>(
      "scheduling.list",
      listAppointments as never,
    ),
  },
  care: {
    issuePreparation: ref<{ referralId: string; instructions: string }, null>(
      "care.issuePreparation",
      issuePreparationInstructions as never,
    ),
    acknowledgePreparation: ref<{ referralId: string }, null>(
      "care.acknowledgePreparation",
      acknowledgePreparation as never,
    ),
    setPreparationState: ref<
      {
        referralId: string;
        state: "completed" | "needs_review";
        note?: string;
      },
      null
    >("care.setPreparationState", setPreparationState as never),
    recordConsent: ref<
      {
        referralId: string;
        status: "not_recorded" | "recorded" | "declined" | "unable";
        note?: string;
      },
      null
    >("care.recordConsent", recordConsent as never),
    recordStep: ref<{ referralId: string; step: string; note?: string }, null>(
      "care.recordStep",
      recordProcedureStep as never,
    ),
    saveSpecimen: ref<
      {
        referralId: string;
        collectionType: string;
        identifier: string;
        containers?: number;
        destination?: string;
        status: "pending" | "dispatched" | "received" | "not_applicable";
      },
      null
    >("care.saveSpecimen", saveSpecimen as never),
    addFollowUp: ref<
      { referralId: string; title: string; dueDate?: string; note?: string },
      null
    >("care.addFollowUp", addFollowUp as never),
    completeFollowUp: ref<{ taskId: string }, null>(
      "care.completeFollowUp",
      completeFollowUp as never,
    ),
  },
  notifications: {
    list: ref<
      { unreadOnly?: boolean; paginationOpts: PaginationOpts },
      Page<NotificationItem>
    >("notifications.list", listNotifications as never),
    unreadCount: ref<Empty, number>(
      "notifications.unreadCount",
      unreadNotificationCount as never,
    ),
    markRead: ref<{ notificationId: string }, null>(
      "notifications.markRead",
      markNotificationRead as never,
    ),
    markAllRead: ref<Empty, null>(
      "notifications.markAllRead",
      markAllNotificationsRead as never,
    ),
    resend: ref<{ deliveryId: string }, null>(
      "notifications.resend",
      resendNotification as never,
    ),
    deliveries: ref<
      { entityType: string; entityId: string },
      NotificationItem[]
    >("notifications.deliveries", notificationDeliveries as never),
  },
  reports: {
    metrics: ref<{ from: string; to: string }, ReportTotals>(
      "reports.metrics",
      reportMetrics as never,
    ),
    auditLog: ref<
      { search?: string; entityType?: string; paginationOpts: PaginationOpts },
      Page<AuditEntry>
    >("reports.auditLog", auditLog as never),
    listInstitutions: ref<Empty, InstitutionRecord[]>(
      "reports.listInstitutions",
      listInstitutions as never,
    ),
    saveInstitution: ref<
      {
        id?: string;
        name: string;
        kind: string;
        address?: string;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        status?: "active" | "inactive";
      },
      null
    >("reports.saveInstitution", saveInstitution as never),
    setPayment: ref<
      {
        referralId: string;
        status: "unset" | "due" | "paid" | "waived";
        feeCents?: number;
        note?: string;
      },
      null
    >("reports.setPayment", setPaymentStatus as never),
  },
  settings: {
    all: ref<Empty, SettingsSnapshot>("settings.all", getSettings as never),
    save: ref<{ key: SettingKey; value: unknown }, null>(
      "settings.save",
      saveSetting as never,
    ),
    contacts: ref<
      Empty,
      {
        phone: string;
        email: string;
        address: string;
        hours: string;
        emergencyPhone: string;
      }
    >("settings.contacts", getPublicContacts as never),
  },
};

/** Read query. Returns `undefined` while loading, like the Convex hook did. */
export function useQuery<TInput, TOutput>(
  serverRef: ServerRef<TInput, TOutput>,
  args: TInput | "skip",
): TOutput | undefined {
  const enabled = args !== "skip";
  const result = useTanStackQuery({
    queryKey: [serverRef.name, enabled ? args : null],
    queryFn: () => serverRef.call({ data: args as TInput }),
    enabled,
  });
  return result.data;
}

/** Mutation returns a callable, like `useMutation()` from the Convex client. */
export function useMutation<TInput, TOutput>(
  serverRef: ServerRef<TInput, TOutput>,
): (args?: TInput) => Promise<TOutput> {
  const queryClient = useQueryClient();
  return useCallback(
    async (args?: TInput) => {
      const result = await serverRef.call({ data: (args ?? {}) as TInput });
      await queryClient.invalidateQueries();
      return result;
    },
    [serverRef, queryClient],
  );
}

export type PaginationStatus =
  "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted";

/** Offset pagination with the same result shape the Convex `usePaginatedQuery` returned. */
export function usePaginatedQuery<
  TInput extends { paginationOpts: PaginationOpts },
  TItem,
>(
  serverRef: ServerRef<TInput, Page<TItem>>,
  args: Omit<TInput, "paginationOpts">,
  options: { initialNumItems: number },
): {
  results: TItem[];
  status: PaginationStatus;
  loadMore: (n: number) => void;
} {
  const query = useInfiniteQuery({
    queryKey: [serverRef.name, args, options.initialNumItems],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      serverRef.call({
        data: {
          ...args,
          paginationOpts: {
            numItems: options.initialNumItems,
            cursor: pageParam,
          },
        } as TInput,
      }),
    getNextPageParam: (last) => (last.isDone ? null : last.continueCursor),
  });

  const results = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.page),
    [query.data],
  );

  const status: PaginationStatus = query.isLoading
    ? "LoadingFirstPage"
    : query.isFetchingNextPage
      ? "LoadingMore"
      : query.hasNextPage
        ? "CanLoadMore"
        : "Exhausted";

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage)
      void query.fetchNextPage();
  }, [query]);

  return { results, status, loadMore };
}

/** Auth state from the root session snapshot. */
export function useAuthStatus(): {
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { user, loading } = useAuth();
  return { isAuthenticated: user !== null, isLoading: loading };
}
