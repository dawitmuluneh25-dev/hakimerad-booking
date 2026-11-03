import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  BuildingIcon,
  FileTextIcon,
  MessageSquareIcon,
  PhoneIcon,
} from "lucide-react";
import { toast } from "sonner";
import AppPage from "@/components/app-page.tsx";
import ReferralStatusBadge from "@/components/referral-status-badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { api, useMutation, useQuery } from "@/lib/api.ts";
import { useMe } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import {
  DOCUMENT_KIND_LABELS,
  MODALITY_LABELS,
  PROCEDURE_LABELS,
  REQUESTED_METHODS,
  SEX_LABELS,
  URGENCY_LABELS,
  YES_NO_UNKNOWN_LABELS,
} from "@/shared/referrals.ts";
import {
  CLINICAL_PRIORITY_LABELS,
  PAYMENT_STATUS_LABELS,
  type ClinicalPriority,
  type PaymentStatus,
} from "@/shared/workflow.ts";
import { isStaffRole } from "@/shared/roles.ts";
import RequireRole from "../../-components/require-role.tsx";
import ClinicalReviewPanel from "../../-components/clinical-review-panel.tsx";
import SchedulePanel from "../../-components/schedule-panel.tsx";
import CarePanel from "../../-components/care-panel.tsx";
import {
  DetailCard,
  Row,
  Timeline,
  formatWhen,
} from "../../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/staff/review/$reference")({
  head: ({ params }) => ({
    meta: [{ title: `Review ${params.reference} | HakimeRAD IR Booking` }],
  }),
  component: () => (
    <RequireRole
      roles={["receptionist", "radiologist", "coordinator", "admin"]}
    >
      <ReviewPage />
    </RequireRole>
  ),
});

function ReviewPage() {
  const { reference } = Route.useParams();
  const me = useMe();
  const detail = useQuery(api.reviews.detail, { reference });
  const resources = useQuery(api.scheduling.listResources, {});
  const addNote = useMutation(api.reviews.addNote);
  const [note, setNote] = useState("");

  const back = (
    <Button
      variant="ghost"
      size="sm"
      render={<Link to="/staff/queue" />}
      nativeButton={false}
    >
      <ArrowLeftIcon />
      Work queue
    </Button>
  );

  if (detail === undefined) {
    return (
      <AppPage title={`Review ${reference}`} actions={back}>
        <Skeleton className="h-64 w-full" />
      </AppPage>
    );
  }
  if (detail === null) {
    return (
      <AppPage title="Request not available" actions={back}>
        <p className="text-muted-foreground">
          This request does not exist, or your role cannot open it.
        </p>
      </AppPage>
    );
  }

  const { patient, guardian, referrer, clinical, imaging } = detail;
  const methods: Record<string, string> = REQUESTED_METHODS[detail.procedure];
  const role = me?.role ?? null;
  const isRadiologist = role === "radiologist";
  const canBook =
    role === "receptionist" || role === "coordinator" || role === "admin";
  const canOperate = isStaffRole(role ?? undefined);

  return (
    <AppPage
      title={`Request ${detail.reference}`}
      description={PROCEDURE_LABELS[detail.procedure]}
      actions={back}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-5">
          <ReferralStatusBadge status={detail.status} />
          {detail.priority ? (
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
              {CLINICAL_PRIORITY_LABELS[detail.priority as ClinicalPriority] ??
                detail.priority}
            </span>
          ) : null}
          <span className="text-sm text-muted-foreground">
            Submitted{" "}
            {format(new Date(detail.submittedAt), "d MMM yyyy, HH:mm")}
          </span>
          {detail.appointment ? (
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {formatWhen(detail.appointment.startsAt)}
            </span>
          ) : null}
          <span className="ml-auto text-sm text-muted-foreground">
            Payment:{" "}
            {PAYMENT_STATUS_LABELS[detail.payment.status as PaymentStatus] ??
              detail.payment.status}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="Patient">
            <Row label="Name" value={patient.fullName} />
            <Row
              label="Date of birth"
              value={format(
                new Date(`${patient.dateOfBirth}T00:00:00`),
                "d MMM yyyy",
              )}
            />
            <Row label="Sex" value={SEX_LABELS[patient.sex]} />
            <Row label="Phone" value={patient.phone} />
            <Row label="Email" value={patient.email} />
            <Row label="ID / record number" value={patient.idNumber} />
            <Row label="Address" value={patient.address} />
            {guardian ? (
              <Row
                label="Guardian"
                value={`${guardian.fullName} (${guardian.relationship}) ${guardian.phone}`}
              />
            ) : null}
          </DetailCard>

          <DetailCard title="Referring team">
            <Row label="Doctor" value={referrer.name} />
            <Row label="Facility" value={referrer.facility} />
            <Row label="Phone" value={referrer.phone} />
            <div className="flex gap-2 pt-2">
              {referrer.phone ? (
                <Button
                  size="sm"
                  variant="secondary"
                  render={<a href={`tel:${referrer.phone}`} />}
                  nativeButton={false}
                >
                  <PhoneIcon />
                  Call
                </Button>
              ) : null}
            </div>
          </DetailCard>

          <DetailCard title="Clinical details">
            <Row label="Indication" value={clinical.indication} />
            <Row
              label={
                detail.procedure === "biopsy-fnac"
                  ? "Target area"
                  : "Collection location"
              }
              value={clinical.site}
            />
            <Row
              label="Requested type"
              value={
                methods[clinical.requestedMethod] ?? clinical.requestedMethod
              }
            />
            <Row
              label="Requested urgency"
              value={URGENCY_LABELS[clinical.urgency]}
            />
            <Row
              label="Blood thinners"
              value={YES_NO_UNKNOWN_LABELS[clinical.bloodThinners]}
            />
            <Row label="Previous biopsy" value={clinical.previousBiopsy} />
            <Row label="Allergies" value={clinical.allergies} />
            <Row label="Other conditions" value={clinical.otherConditions} />
          </DetailCard>

          <DetailCard title="Imaging">
            <Row label="Type" value={MODALITY_LABELS[imaging.modality]} />
            <Row
              label="Date"
              value={
                imaging.studyDate
                  ? format(
                      new Date(`${imaging.studyDate}T00:00:00`),
                      "d MMM yyyy",
                    )
                  : undefined
              }
            />
            <Row label="Facility" value={imaging.facility} />
            <Row label="PACS / accession" value={imaging.pacsReference} />
            <Row label="Findings" value={imaging.findings} />
          </DetailCard>
        </div>

        <DetailCard title={`Documents (${detail.documents.length})`}>
          {detail.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents attached.
            </p>
          ) : (
            <ul className="space-y-2">
              {detail.documents.map((document) => (
                <li
                  key={document._id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {document.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_KIND_LABELS[document.kind]}
                    </p>
                  </div>
                  {document.url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                      nativeButton={false}
                    >
                      Open
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <ClinicalReviewPanel
            referralId={detail._id}
            status={detail.status}
            reviews={detail.reviews}
            canReview={isRadiologist}
          />
          <SchedulePanel
            referralId={detail._id}
            procedure={detail.procedure}
            status={detail.status}
            appointment={detail.appointment}
            resources={resources ?? []}
            canBook={canBook || isRadiologist}
          />
        </div>

        <CarePanel
          referralId={detail._id}
          procedure={detail.procedure}
          preparation={detail.preparation}
          consent={detail.consent}
          steps={detail.steps}
          specimens={detail.specimens}
          followUps={detail.followUps}
          hasAppointment={detail.appointment !== null}
          canInstruct={isRadiologist}
          canOperate={canOperate}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="Status history">
            <Timeline events={detail.events} />
          </DetailCard>

          <DetailCard title="Staff notes">
            {detail.notes.filter((entry) => entry.visibility === "staff")
              .length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff notes.</p>
            ) : (
              <ul className="space-y-2">
                {detail.notes
                  .filter((entry) => entry.visibility === "staff")
                  .map((entry) => (
                    <li
                      key={entry._id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <p className="whitespace-pre-line">{entry.body}</p>
                      <p className="pt-1 text-xs text-muted-foreground">
                        {formatWhen(entry.at)} · {entry.author}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
            <div className="space-y-2 border-t pt-3">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Internal note. The submitter cannot see this."
              />
              <Button
                size="sm"
                disabled={note.trim().length < 2}
                onClick={async () => {
                  try {
                    await addNote({ referralId: detail._id, body: note });
                    setNote("");
                    toast.success("Note saved.");
                  } catch (error) {
                    toast.error(
                      errorMessage(error, "The note could not be saved."),
                    );
                  }
                }}
              >
                <MessageSquareIcon />
                Add note
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-3 text-sm">
              <Button
                size="sm"
                variant="ghost"
                render={<Link to="/urgent/new" />}
                nativeButton={false}
              >
                <BuildingIcon />
                Urgent coordination
              </Button>
            </div>
          </DetailCard>
        </div>
      </div>
    </AppPage>
  );
}
