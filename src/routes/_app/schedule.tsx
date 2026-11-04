import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import AppPage from "@/components/app-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api, useMutation, useQuery } from "@/lib/api.ts";
import { useMe } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import {
  APPOINTMENT_STATUS_LABELS,
  EXCEPTION_KIND_LABELS,
  EXCEPTION_KINDS,
  type AppointmentStatus,
} from "@/shared/workflow.ts";
import { PROCEDURE_LABELS } from "@/shared/referrals.ts";
import RequireRole from "./-components/require-role.tsx";
import SchedulePanel from "./-components/schedule-panel.tsx";
import { DetailCard, formatWhen } from "./-components/record-cards.tsx";

export const Route = createFileRoute("/_app/schedule")({
  head: () => ({ meta: [{ title: "Schedule | HakimeRAD IR Booking" }] }),
  component: () => (
    <RequireRole
      roles={["receptionist", "radiologist", "coordinator", "admin"]}
    >
      <SchedulePage />
    </RequireRole>
  ),
});

function isoDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function SchedulePage() {
  const me = useMe();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedReferral, setSelectedReferral] = useState("");
  const [exception, setException] = useState({
    kind: "closure",
    startsAt: "",
    endsAt: "",
    note: "",
  });

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const from = `${isoDay(weekStart)}T00:00`;
  const to = `${isoDay(addDays(weekStart, 7))}T00:00`;

  const appointments = useQuery(api.scheduling.list, { from, to });
  const bookable = useQuery(api.scheduling.listBookable, {});
  const resources = useQuery(api.scheduling.listResources, {});
  const exceptions = useQuery(api.scheduling.listExceptions, { from, to });
  const addException = useMutation(api.scheduling.addException);
  const removeException = useMutation(api.scheduling.removeException);

  const selected =
    bookable?.find((item) => item._id === selectedReferral) ?? null;
  const isAdmin = me?.role === "admin" || me?.role === "coordinator";

  return (
    <AppPage
      title="Schedule"
      description="Approved requests are booked here. Every booking is checked against room, equipment, staff and opening hours."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(addDays(anchor, -7))}
            aria-label="Previous week"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(new Date())}
          >
            This week
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(addDays(anchor, 7))}
            aria-label="Next week"
          >
            <ChevronRightIcon />
          </Button>
          <p className="pl-2 text-sm font-medium">
            {format(weekStart, "d MMM")} –{" "}
            {format(addDays(weekStart, 6), "d MMM yyyy")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {weekDays.map((day) => {
            const dayKey = isoDay(day);
            const items = (appointments ?? []).filter((item) =>
              item.startsAt.startsWith(dayKey),
            );
            return (
              <div
                key={dayKey}
                className="min-h-40 rounded-xl border bg-background p-3"
              >
                <p className="pb-2 text-sm font-semibold">
                  {format(day, "EEE d MMM")}
                  <span className="pl-2 font-normal text-muted-foreground">
                    {items.length}
                  </span>
                </p>
                {appointments === undefined ? (
                  <Skeleton className="h-16 w-full" />
                ) : items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No bookings</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item._id}
                        className="rounded-lg border bg-card p-2 text-xs"
                      >
                        <p className="font-medium">
                          {item.startsAt.slice(11)} · {item.patientName}
                        </p>
                        <p className="text-muted-foreground">
                          {PROCEDURE_LABELS[item.procedure as never] ??
                            item.procedure}
                        </p>
                        <p className="text-muted-foreground">
                          {APPOINTMENT_STATUS_LABELS[
                            item.status as AppointmentStatus
                          ] ?? item.status}
                          {item.roomName ? ` · ${item.roomName}` : ""}
                        </p>
                        <Link
                          to="/staff/review/$reference"
                          params={{ reference: item.reference }}
                          className="text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="Book an approved request">
            {bookable === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : bookable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved request is waiting for a date. Approve a request in
                clinical review first.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="bookable">Request</Label>
                  <NativeSelect
                    id="bookable"
                    className="w-full"
                    value={selectedReferral}
                    onChange={(event) =>
                      setSelectedReferral(event.target.value)
                    }
                  >
                    <NativeSelectOption value="">
                      Choose a request
                    </NativeSelectOption>
                    {bookable.map((item) => (
                      <NativeSelectOption key={item._id} value={item._id}>
                        {item.reference} · {item.patientName} ·{" "}
                        {PROCEDURE_LABELS[item.procedure as never] ??
                          item.procedure}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                {selected ? (
                  <SchedulePanel
                    referralId={selected._id}
                    procedure={selected.procedure}
                    status="approved"
                    appointment={null}
                    resources={resources ?? []}
                    canBook
                  />
                ) : null}
              </>
            )}
          </DetailCard>

          <DetailCard title="Closures, leave and holidays">
            {exceptions === undefined ? (
              <Skeleton className="h-16 w-full" />
            ) : exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exceptions this week.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {exceptions.map((entry) => (
                  <li
                    key={entry._id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2"
                  >
                    <div>
                      <p className="font-medium">
                        {EXCEPTION_KIND_LABELS[entry.kind as never] ??
                          entry.kind}
                        {entry.resourceName
                          ? ` · ${entry.resourceName}`
                          : " · whole clinic"}
                      </p>
                      <p className="text-muted-foreground">
                        {formatWhen(entry.startsAt)} –{" "}
                        {formatWhen(entry.endsAt)}
                      </p>
                    </div>
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await removeException({ id: entry._id });
                            toast.success("Exception removed.");
                          } catch (error) {
                            toast.error(
                              errorMessage(
                                error,
                                "Could not remove the exception.",
                              ),
                            );
                          }
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {isAdmin ? (
              <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="exception-kind">Type</Label>
                  <NativeSelect
                    id="exception-kind"
                    className="w-full"
                    value={exception.kind}
                    onChange={(event) =>
                      setException({ ...exception, kind: event.target.value })
                    }
                  >
                    {EXCEPTION_KINDS.map((kind) => (
                      <NativeSelectOption key={kind} value={kind}>
                        {EXCEPTION_KIND_LABELS[kind]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exception-note">Note</Label>
                  <Input
                    id="exception-note"
                    value={exception.note}
                    onChange={(event) =>
                      setException({ ...exception, note: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exception-start">From</Label>
                  <Input
                    id="exception-start"
                    type="datetime-local"
                    value={exception.startsAt}
                    onChange={(event) =>
                      setException({
                        ...exception,
                        startsAt: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exception-end">To</Label>
                  <Input
                    id="exception-end"
                    type="datetime-local"
                    value={exception.endsAt}
                    onChange={(event) =>
                      setException({ ...exception, endsAt: event.target.value })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  className="sm:col-span-2"
                  disabled={!exception.startsAt || !exception.endsAt}
                  onClick={async () => {
                    try {
                      await addException({
                        kind: exception.kind as never,
                        startsAt: exception.startsAt,
                        endsAt: exception.endsAt,
                        note: exception.note || undefined,
                      });
                      toast.success("Exception added.");
                      setException({
                        kind: "closure",
                        startsAt: "",
                        endsAt: "",
                        note: "",
                      });
                    } catch (error) {
                      toast.error(
                        errorMessage(error, "Could not add the exception."),
                      );
                    }
                  }}
                >
                  <PlusIcon />
                  Add exception
                </Button>
              </div>
            ) : null}
          </DetailCard>
        </div>
      </div>
    </AppPage>
  );
}
