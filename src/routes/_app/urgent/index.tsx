import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon, PlusIcon, SirenIcon } from "lucide-react";
import AppPage from "@/components/app-page.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
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
import { URGENT_STATUSES, URGENT_STATUS_LABELS } from "@/shared/workflow.ts";
import { formatWhen } from "../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/urgent/")({
  head: () => ({
    meta: [{ title: "Urgent coordination | HakimeRAD IR Booking" }],
  }),
  component: UrgentListPage,
});

function UrgentListPage() {
  const [status, setStatus] = useState("");
  const {
    results,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.urgent.list,
    { status: status || undefined },
    { initialNumItems: 25 },
  );

  return (
    <AppPage
      title="Urgent coordination"
      description="Hydrostatic intussusception reduction is coordinated directly with the referring hospital. It is never a routine appointment."
      actions={
        <Button render={<Link to="/urgent/new" />} nativeButton={false}>
          <PlusIcon />
          New urgent case
        </Button>
      }
    >
      <div className="space-y-6">
        <UrgentNotice />

        <NativeSelect
          aria-label="Filter by status"
          className="w-full sm:w-72"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <NativeSelectOption value="">All states</NativeSelectOption>
          {URGENT_STATUSES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {URGENT_STATUS_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        {pageStatus === "LoadingFirstPage" ? (
          <Skeleton className="h-32 w-full" />
        ) : results.length === 0 ? (
          <Empty className="rounded-xl border bg-background">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SirenIcon />
              </EmptyMedia>
              <EmptyTitle>No coordination cases</EmptyTitle>
              <EmptyDescription>
                Urgent cases started by hospital clinicians appear here. For an
                active emergency, phone the emergency line instead of waiting
                for the app.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="space-y-3">
            {results.map((item) => (
              <li key={item._id}>
                <Link
                  to="/urgent/$reference"
                  params={{ reference: item.reference }}
                  className="flex flex-col gap-2 rounded-xl border bg-background p-4 transition-colors hover:border-primary/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {item.reference}
                      </span>
                      <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        {URGENT_STATUS_LABELS[item.status as never] ??
                          item.status}
                      </span>
                    </div>
                    <p className="text-sm">
                      {item.patientName} · {item.facilityName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started {formatWhen(item.createdAt)}
                      {item.acknowledgedAt
                        ? ` · acknowledged ${formatWhen(item.acknowledgedAt)}`
                        : " · not yet acknowledged"}
                    </p>
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pageStatus === "CanLoadMore" ? (
          <Button variant="secondary" onClick={() => loadMore(25)}>
            Load more
          </Button>
        ) : null}
      </div>
    </AppPage>
  );
}
