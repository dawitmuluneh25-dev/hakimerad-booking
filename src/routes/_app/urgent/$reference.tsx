import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  PhoneIcon,
  SirenIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import AppPage from "@/components/app-page.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { api, useMutation, useQuery } from "@/lib/api.ts";
import { useMe } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import {
  URGENT_STATUS_LABELS,
  REFERRING_DEPARTMENT_LABELS,
  type UrgentStatus,
} from "@/shared/workflow.ts";
import { YES_NO_UNKNOWN_LABELS } from "@/shared/referrals.ts";
import {
  DetailCard,
  Row,
  Timeline,
  formatWhen,
} from "../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/urgent/$reference")({
  head: ({ params }) => ({
    meta: [{ title: `Urgent case ${params.reference} | HakimeRAD IR Booking` }],
  }),
  component: UrgentDetailPage,
});

function UrgentDetailPage() {
  const { reference } = Route.useParams();
  const me = useMe();
  const detail = useQuery(api.urgent.detail, { reference });
  const acknowledge = useMutation(api.urgent.acknowledge);
  const decide = useMutation(api.urgent.decide);
  const schedule = useMutation(api.urgent.schedule);
  const close = useMutation(api.urgent.close);

  const [decisionNote, setDecisionNote] = useState("");
  const [slot, setSlot] = useState("");
  const [closeNote, setCloseNote] = useState("");

  const back = (
    <Button
      variant="ghost"
      size="sm"
      render={<Link to="/urgent" />}
      nativeButton={false}
    >
      <ArrowLeftIcon />
      All cases
    </Button>
  );

  if (detail === undefined) {
    return (
      <AppPage title={`Case ${reference}`} actions={back}>
        <Skeleton className="h-64 w-full" />
      </AppPage>
    );
  }
  if (detail === null) {
    return (
      <AppPage title="Case not available" actions={back}>
        <p className="text-muted-foreground">
          This case does not exist, or your account cannot open it.
        </p>
      </AppPage>
    );
  }

  const role = me?.role ?? null;
  const staff =
    role !== null &&
    ["receptionist", "radiologist", "coordinator", "admin"].includes(role);
  const isRadiologist = role === "radiologist";
  const canAcknowledge =
    role !== null && ["radiologist", "coordinator", "admin"].includes(role);

  const act = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
    } catch (error) {
      toast.error(errorMessage(error, "That change could not be saved."));
    }
  };

  return (
    <AppPage
      title={`Urgent case ${detail.reference}`}
      description={URGENT_STATUS_LABELS[detail.status as UrgentStatus]}
      actions={back}
    >
      <div className="space-y-6">
        <UrgentNotice compact />

        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-5">
          <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
            {URGENT_STATUS_LABELS[detail.status as UrgentStatus] ??
              detail.status}
          </span>
          <span className="text-sm text-muted-foreground">
            Started {formatWhen(detail.createdAt)}
          </span>
          {detail.acknowledgedBy ? (
            <span className="text-sm text-muted-foreground">
              Acknowledged by {detail.acknowledgedBy} ·{" "}
              {formatWhen(detail.acknowledgedAt)}
            </span>
          ) : (
            <span className="text-sm font-medium text-destructive">
              Not yet acknowledged
            </span>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              render={<a href={`tel:${detail.clinicianPhone}`} />}
              nativeButton={false}
            >
              <PhoneIcon />
              Call referring clinician
            </Button>
            <Button
              size="sm"
              variant="secondary"
              render={<a href={`tel:${detail.facilityPhone}`} />}
              nativeButton={false}
            >
              <PhoneIcon />
              Call facility
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="Referral">
            <Row
              label="Department"
              value={
                REFERRING_DEPARTMENT_LABELS[detail.department as never] ??
                detail.department
              }
            />
            <Row label="Facility" value={detail.facilityName} />
            <Row label="Facility phone" value={detail.facilityPhone} />
            <Row label="Referring clinician" value={detail.clinicianName} />
            <Row label="Clinician phone" value={detail.clinicianPhone} />
          </DetailCard>

          <DetailCard title="Patient">
            <Row label="Name" value={detail.patient.fullName} />
            <Row
              label="Date of birth"
              value={format(
                new Date(`${detail.patient.dateOfBirth}T00:00:00`),
                "d MMM yyyy",
              )}
            />
            {detail.guardian ? (
              <Row
                label="Guardian"
                value={`${detail.guardian.fullName} (${detail.guardian.relationship}) ${detail.guardian.phone}`}
              />
            ) : null}
            {detail.patient.guardianName ? (
              <Row
                label="Guardian on referral"
                value={`${detail.patient.guardianName} ${detail.patient.guardianPhone ?? ""}`}
              />
            ) : null}
          </DetailCard>

          <DetailCard title="Clinical coordination">
            <Row label="Presentation" value={detail.clinical.presentation} />
            <Row
              label="Imaging available"
              value={YES_NO_UNKNOWN_LABELS[detail.clinical.imagingAvailable]}
            />
            <Row label="Imaging detail" value={detail.clinical.imagingDetail} />
            <Row
              label="Planned coordination"
              value={
                detail.clinical.coordinationTime
                  ? formatWhen(detail.clinical.coordinationTime)
                  : undefined
              }
            />
            <Row label="Notes" value={detail.clinical.notes} />
          </DetailCard>

          <DetailCard title="Decision">
            {detail.decision ? (
              <>
                <Row
                  label="Decision"
                  value={
                    detail.decision === "accept"
                      ? "Accepted for coordination"
                      : "Not accepted here"
                  }
                />
                <Row label="Note" value={detail.decisionNote} />
                <Row
                  label="Recorded by"
                  value={detail.decidedBy ?? undefined}
                />
                <Row
                  label="Recorded at"
                  value={
                    detail.decidedAt ? formatWhen(detail.decidedAt) : undefined
                  }
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                The responsible radiologist has not recorded a decision yet.
                Acknowledgement is not acceptance.
              </p>
            )}
            {detail.scheduledAt ? (
              <Row
                label="Procedure slot"
                value={formatWhen(detail.scheduledAt)}
              />
            ) : null}
          </DetailCard>
        </div>

        {canAcknowledge && detail.status === "new" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-50 p-4 dark:bg-amber-500/10">
            <p className="text-sm">
              Radiology has not acknowledged this referral. Acknowledge it once
              you have seen it — this tells the referring team the alert reached
              someone.
            </p>
            <Button
              size="sm"
              onClick={() =>
                act(
                  () => acknowledge({ reference: detail.reference }),
                  "Case acknowledged.",
                )
              }
            >
              <CheckCircle2Icon />
              Acknowledge
            </Button>
          </div>
        ) : null}

        {isRadiologist &&
        (detail.status === "acknowledged" || detail.status === "new") ? (
          <DetailCard title="Record the coordination decision">
            <Textarea
              rows={3}
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="What was agreed on the call, and with whom."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={decisionNote.trim().length < 2}
                onClick={() =>
                  act(
                    () =>
                      decide({
                        reference: detail.reference,
                        decision: "accept",
                        note: decisionNote,
                      }),
                    "Case accepted for coordination.",
                  )
                }
              >
                <CheckCircle2Icon />
                Accept for coordination
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={decisionNote.trim().length < 2}
                onClick={() =>
                  act(
                    () =>
                      decide({
                        reference: detail.reference,
                        decision: "decline",
                        note: decisionNote,
                      }),
                    "Decision recorded.",
                  )
                }
              >
                <XCircleIcon />
                Not accepted here
              </Button>
            </div>
          </DetailCard>
        ) : null}

        {staff && detail.status === "accepted" ? (
          <DetailCard title="Arrange the procedure slot">
            <p className="text-sm text-muted-foreground">
              Only after direct clinical coordination. This is recorded on the
              urgent pathway, not the elective calendar.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="urgent-slot">Date and time</Label>
                <Input
                  id="urgent-slot"
                  type="datetime-local"
                  value={slot}
                  onChange={(event) => setSlot(event.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={!slot}
                onClick={() =>
                  act(
                    () =>
                      schedule({
                        reference: detail.reference,
                        scheduledAt: slot,
                      }),
                    "Procedure slot recorded.",
                  )
                }
              >
                <SirenIcon />
                Record slot
              </Button>
            </div>
          </DetailCard>
        ) : null}

        <DetailCard title="Case history">
          <Timeline events={detail.events} />
          {staff && detail.status !== "closed" ? (
            <div className="flex flex-wrap items-end gap-2 border-t pt-3">
              <div className="min-w-48 flex-1 space-y-1">
                <Label htmlFor="close-note">Closing note</Label>
                <Input
                  id="close-note"
                  value={closeNote}
                  onChange={(event) => setCloseNote(event.target.value)}
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  act(
                    () =>
                      close({
                        reference: detail.reference,
                        note: closeNote || undefined,
                      }),
                    "Case closed.",
                  )
                }
              >
                Close case
              </Button>
            </div>
          ) : null}
        </DetailCard>
      </div>
    </AppPage>
  );
}
