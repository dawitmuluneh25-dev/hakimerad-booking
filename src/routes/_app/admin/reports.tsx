import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, startOfMonth } from "date-fns";
import {
  ActivityIcon,
  CalendarCheckIcon,
  ClipboardListIcon,
  SirenIcon,
} from "lucide-react";
import AppPage from "@/components/app-page.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api, useQuery } from "@/lib/api.ts";
import {
  PROCEDURE_LABELS,
  REFERRAL_STATUS_LABELS,
} from "@/shared/referrals.ts";
import RequireRole from "../-components/require-role.tsx";
import { DetailCard, formatWhen } from "../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/admin/reports")({
  head: () => ({ meta: [{ title: "Reports | HakimeRAD IR Booking" }] }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <ReportsPage />
    </RequireRole>
  ),
});

function ReportsPage() {
  const [from, setFrom] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const metrics = useQuery(api.reports.metrics, { from, to });

  return (
    <AppPage
      title="Reports"
      description="Counts come straight from the database for the selected dates."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>

        {metrics === undefined ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                icon={ClipboardListIcon}
                label="Requests received"
                value={metrics.totals.requests}
              />
              <Metric
                icon={ActivityIcon}
                label="Awaiting review"
                value={metrics.totals.awaitingReview}
              />
              <Metric
                icon={CalendarCheckIcon}
                label="Scheduled procedures"
                value={metrics.totals.scheduled}
              />
              <Metric
                icon={SirenIcon}
                label="Open urgent cases"
                value={metrics.totals.urgentOpen}
              />
            </div>

            <DetailCard title="By procedure and status">
              {metrics.byProcedure.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No requests in this range.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Procedure
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Status
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.byProcedure.map((row) => (
                        <tr
                          key={`${row.procedure}-${row.status}`}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 pr-4">
                            {PROCEDURE_LABELS[row.procedure as never] ??
                              row.procedure}
                          </td>
                          <td className="py-2 pr-4">
                            {REFERRAL_STATUS_LABELS[row.status as never] ??
                              row.status}
                          </td>
                          <td className="py-2">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailCard>

            <div className="grid gap-4 sm:grid-cols-3">
              <Summary label="Approved" value={metrics.totals.approved} />
              <Summary label="Completed" value={metrics.totals.completed} />
              <Summary label="Cancelled" value={metrics.totals.cancelled} />
            </div>

            <DetailCard title="Next appointments">
              {metrics.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled ahead.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {metrics.upcoming.map((row) => (
                    <li
                      key={row.date}
                      className="flex justify-between border-b py-1 last:border-0"
                    >
                      <span>{formatWhen(row.date)}</span>
                      <span className="font-medium">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </DetailCard>
          </>
        )}
      </div>
    </AppPage>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ActivityIcon;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
