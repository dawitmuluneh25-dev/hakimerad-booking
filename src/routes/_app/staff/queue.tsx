import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon, ClipboardListIcon } from "lucide-react";
import AppPage from "@/components/app-page.tsx";
import ReferralStatusBadge from "@/components/referral-status-badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api, usePaginatedQuery } from "@/lib/api.ts";
import {
  CLINICAL_PRIORITY_LABELS,
  type ClinicalPriority,
} from "@/shared/workflow.ts";
import {
  PROCEDURE_LABELS,
  REFERRAL_PROCEDURES,
  REFERRAL_STATUSES,
  REFERRAL_STATUS_LABELS,
} from "@/shared/referrals.ts";
import { formatWhen } from "../-components/record-cards.tsx";
import RequireRole from "../-components/require-role.tsx";

export const Route = createFileRoute("/_app/staff/queue")({
  head: () => ({ meta: [{ title: "Work queue | HakimeRAD IR Booking" }] }),
  component: () => (
    <RequireRole
      roles={["receptionist", "radiologist", "coordinator", "admin"]}
    >
      <QueuePage />
    </RequireRole>
  ),
});

function QueuePage() {
  const [status, setStatus] = useState("");
  const [procedure, setProcedure] = useState("");
  const {
    results,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.reviews.queue,
    { status: status || undefined, procedure: procedure || undefined },
    { initialNumItems: 25 },
  );

  return (
    <AppPage
      title="Work queue"
      description="Every request waiting on the team: review, information, approval or a booking."
    >
      <div className="flex flex-col gap-3 pb-6 sm:flex-row">
        <NativeSelect
          aria-label="Filter by status"
          className="w-full sm:w-64"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <NativeSelectOption value="">All live requests</NativeSelectOption>
          {REFERRAL_STATUSES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {REFERRAL_STATUS_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter by procedure"
          className="w-full sm:w-64"
          value={procedure}
          onChange={(event) => setProcedure(event.target.value)}
        >
          <NativeSelectOption value="">All procedures</NativeSelectOption>
          {REFERRAL_PROCEDURES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {PROCEDURE_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {pageStatus === "LoadingFirstPage" ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Empty className="rounded-xl border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardListIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing waiting</EmptyTitle>
            <EmptyDescription>No request matches this filter.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {results.map((item) => (
            <li key={item._id}>
              <Link
                to="/staff/review/$reference"
                params={{ reference: item.reference }}
                className="flex flex-col gap-3 rounded-xl border bg-background p-4 transition-colors hover:border-primary/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {item.reference}
                    </span>
                    <ReferralStatusBadge status={item.status} />
                    {item.priority ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {CLINICAL_PRIORITY_LABELS[
                          item.priority as ClinicalPriority
                        ] ?? item.priority}
                      </span>
                    ) : null}
                    {item.hasAppointment ? (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Booked
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm">
                    {item.patientName} · {PROCEDURE_LABELS[item.procedure]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatWhen(item.submittedAt)} · requested urgency{" "}
                    {item.urgency}
                  </p>
                </div>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageStatus === "CanLoadMore" ? (
        <div className="pt-4">
          <Button variant="secondary" onClick={() => loadMore(25)}>
            Load more
          </Button>
        </div>
      ) : null}
    </AppPage>
  );
}
