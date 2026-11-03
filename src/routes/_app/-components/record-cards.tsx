import type { ReactNode } from "react";
import { format } from "date-fns";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import type { ReferralEvent } from "@/server/types.ts";

export function DetailCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="flex items-start justify-between gap-3 pb-4">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Row({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  if (!value) return null;
  return (
    <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-line">{value}</dd>
    </dl>
  );
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return format(new Date(`${value}T00:00:00`), "d MMM yyyy");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return format(new Date(`${value}:00`), "d MMM yyyy, HH:mm");
  }
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    submitted: "Request submitted",
    scheduled: "Appointment scheduled",
    rescheduled: "Appointment moved",
    cancelled: "Appointment cancelled",
    completed: "Procedure completed",
    "info.provided": "Information supplied",
    "preparation.issued": "Preparation instructions issued",
    "consent.recorded": "Consent recorded",
  };
  if (map[action]) return map[action];
  if (action.startsWith("review.")) {
    const decision = action.slice("review.".length);
    const labels: Record<string, string> = {
      approve: "Clinically approved",
      defer: "Review deferred",
      decline: "Not approved",
      request_info: "More information requested",
      redirect: "Different pathway recommended",
    };
    return labels[decision] ?? "Clinical review recorded";
  }
  return action.replaceAll(/[._]/g, " ");
}

/** Vertical, time-ordered status history. */
export function Timeline({ events }: { events: ReferralEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );
  }
  return (
    <ol className="space-y-4">
      {[...events].reverse().map((event) => (
        <li key={event._id} className="flex gap-3">
          <span className="pt-0.5 text-primary">
            {event.type === "completed" ? (
              <CheckCircle2Icon className="size-4" />
            ) : (
              <CircleIcon className="size-4" />
            )}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{humanizeAction(event.type)}</p>
            {event.note ? (
              <p className="text-sm text-muted-foreground">{event.note}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {formatWhen(event.at)} · {event.actor}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
