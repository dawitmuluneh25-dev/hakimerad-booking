import { Link, createFileRoute } from "@tanstack/react-router";
import { api, usePaginatedQuery } from "@/lib/api.ts";
import { format } from "date-fns";
import { ChevronRightIcon, ClipboardListIcon } from "lucide-react";
import AppPage from "@/components/app-page.tsx";
import ReferralStatusBadge from "@/components/referral-status-badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { PROCEDURE_LABELS } from "@/shared/referrals.ts";
import { useMe } from "@/hooks/use-me.ts";
import RequireRole from "../-components/require-role.tsx";
import ProcedureChooser from "./-components/procedure-chooser.tsx";

export const Route = createFileRoute("/_app/requests/")({
  head: () => ({ meta: [{ title: "My requests | HakimeRAD IR Booking" }] }),
  component: () => (
    <RequireRole roles={["patient", "physician"]} message="Requests are submitted by patients, guardians and verified physicians.">
      <RequestsPage />
    </RequireRole>
  ),
});

function RequestsPage() {
  const me = useMe();
  const isPhysician = me?.role === "physician";
  const canSubmit = !isPhysician || me?.physicianProfile?.status === "verified";
  const { results, status, loadMore } = usePaginatedQuery(api.referrals.listMine, {}, { initialNumItems: 20 });

  return (
    <AppPage
      title={isPhysician ? "My referrals" : "My requests"}
      description="Track every request you have submitted. A request becomes an appointment only after clinical approval and scheduling."
    >
      <div className="space-y-10">
        {canSubmit ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Start a new request</h2>
            <ProcedureChooser />
          </section>
        ) : (
          <div className="rounded-xl border bg-background p-5 text-sm">
            Your physician profile is awaiting verification. You can submit referrals once an administrator verifies it.{" "}
            <Link to="/dashboard" className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline">
              Check status
            </Link>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Submitted</h2>
          {status === "LoadingFirstPage" ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : status === "Exhausted" && results.length === 0 ? (
            <Empty className="rounded-xl border bg-background">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardListIcon />
                </EmptyMedia>
                <EmptyTitle>No requests yet</EmptyTitle>
                <EmptyDescription>Choose a procedure above to start your first request.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-background">
              {results.map((r) => (
                <li key={r._id}>
                  <Link
                    to="/requests/$reference"
                    params={{ reference: r.reference }}
                    className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{r.reference}</span>
                        <ReferralStatusBadge status={r.status} />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {PROCEDURE_LABELS[r.procedure]} {"·"} {r.patientName} {"·"} {format(new Date(r.submittedAt), "d MMM yyyy")}
                      </p>
                    </div>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {status === "CanLoadMore" ? (
            <Button variant="secondary" onClick={() => loadMore(20)}>
              Load more
            </Button>
          ) : null}
        </section>
      </div>
    </AppPage>
  );
}
