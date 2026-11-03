import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api, useAuthStatus, useMutation, useQuery } from "@/lib/api.ts";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeftIcon, CheckCircle2Icon, DownloadIcon, FileTextIcon, FileSearchIcon, PaperclipIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea.tsx";
import { errorMessage } from "@/lib/errors.ts";
import { DetailCard, Row, Timeline, formatWhen } from "../-components/record-cards.tsx";
import { z } from "zod";
import AppPage from "@/components/app-page.tsx";
import ReferralStatusBadge from "@/components/referral-status-badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  DOCUMENT_KIND_LABELS,
  MODALITY_LABELS,
  PROCEDURE_LABELS,
  REQUESTED_METHODS,
  SEX_LABELS,
  URGENCY_LABELS,
  YES_NO_UNKNOWN_LABELS,
} from "@/shared/referrals.ts";
import { formatBytes } from "./-lib/format.ts";
import { AddDocumentsDialog, WithdrawDialog } from "./-components/request-actions.tsx";

export const Route = createFileRoute("/_app/requests/$reference")({
  validateSearch: z.object({ submitted: z.boolean().optional().catch(undefined) }),
  head: ({ params }) => ({ meta: [{ title: `Request ${params.reference} | HakimeRAD IR Booking` }] }),
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { reference } = Route.useParams();
  const { submitted } = Route.useSearch();
  const { isAuthenticated } = useAuthStatus();
  const referral = useQuery(api.referrals.getByReference, isAuthenticated ? { reference } : "skip");
  const [addOpen, setAddOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const back = (
    <Button variant="ghost" size="sm" render={<Link to="/requests" />} nativeButton={false}>
      <ArrowLeftIcon />
      My requests
    </Button>
  );

  if (referral === undefined) {
    return (
      <AppPage title={`Request ${reference}`} actions={back}>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppPage>
    );
  }

  if (referral === null) {
    return (
      <AppPage title="Request not found" actions={back}>
        <Empty className="rounded-xl border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSearchIcon />
            </EmptyMedia>
            <EmptyTitle>We could not find this request</EmptyTitle>
            <EmptyDescription>Check the reference, or it may belong to another account.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/requests" />} nativeButton={false}>
              View my requests
            </Button>
          </EmptyContent>
        </Empty>
      </AppPage>
    );
  }

  const { patient, guardian, referrer, clinical, imaging } = referral;
  const methods: Record<string, string> = REQUESTED_METHODS[referral.procedure];

  return (
    <AppPage title={`Request ${referral.reference}`} description={PROCEDURE_LABELS[referral.procedure]} actions={back}>
      <div className="space-y-6">
        {submitted && referral.status === "submitted" ? (
          <div className="flex gap-4 rounded-xl border border-emerald-500/40 bg-emerald-50 p-5 dark:bg-emerald-500/10">
            <CheckCircle2Icon className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Request received</p>
              <p>
                Keep your reference <span className="font-mono font-semibold">{referral.reference}</span>. This is not a confirmed appointment: an interventional radiologist will review it and the team will contact you with the outcome.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 rounded-xl border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <ReferralStatusBadge status={referral.status} />
            <p className="text-sm text-muted-foreground">
              Submitted {format(new Date(referral.submittedAt), "d MMM yyyy, HH:mm")}
            </p>
          </div>
          {referral.canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
                <PaperclipIcon />
                Add documents
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setWithdrawOpen(true)}>
                Withdraw
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="Patient">
            <Row label="Name" value={patient.fullName} />
            <Row label="Date of birth" value={format(new Date(`${patient.dateOfBirth}T00:00:00`), "d MMM yyyy")} />
            <Row label="Sex" value={SEX_LABELS[patient.sex]} />
            <Row label="Phone" value={patient.phone} />
            <Row label="Email" value={patient.email} />
            <Row label="ID / record number" value={patient.idNumber} />
            <Row label="Address" value={patient.address} />
          </DetailCard>
          <div className="space-y-6">
            {guardian ? (
              <DetailCard title="Guardian">
                <Row label="Name" value={guardian.fullName} />
                <Row label="Relationship" value={guardian.relationship} />
                <Row label="Phone" value={guardian.phone} />
              </DetailCard>
            ) : null}
            <DetailCard title="Referring doctor">
              <Row label="Name" value={referrer.name} />
              <Row label="Facility" value={referrer.facility} />
              <Row label="Phone" value={referrer.phone} />
            </DetailCard>
          </div>
          <DetailCard title="Clinical details">
            <Row label="Indication" value={clinical.indication} />
            <Row label={referral.procedure === "biopsy-fnac" ? "Target area" : "Collection location"} value={clinical.site} />
            <Row label="Requested type" value={methods[clinical.requestedMethod] ?? clinical.requestedMethod} />
            <Row label="Requested urgency" value={URGENCY_LABELS[clinical.urgency]} />
            <Row label="Blood thinners" value={YES_NO_UNKNOWN_LABELS[clinical.bloodThinners]} />
            <Row label="Previous biopsy" value={clinical.previousBiopsy} />
            <Row label="Allergies" value={clinical.allergies} />
            <Row label="Other conditions" value={clinical.otherConditions} />
          </DetailCard>
          <DetailCard title="Imaging">
            <Row label="Type" value={MODALITY_LABELS[imaging.modality]} />
            <Row label="Date" value={imaging.studyDate ? format(new Date(`${imaging.studyDate}T00:00:00`), "d MMM yyyy") : undefined} />
            <Row label="Facility" value={imaging.facility} />
            <Row label="PACS / accession" value={imaging.pacsReference} />
            <Row label="Findings" value={imaging.findings} />
          </DetailCard>
        </div>

        <DetailCard title={`Documents (${referral.documents.length})`}>
          {referral.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents attached.</p>
          ) : (
            <ul className="space-y-2">
              {referral.documents.map((d) => (
                <li key={d._id} className="flex items-center gap-3 rounded-lg border p-3">
                  <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_KIND_LABELS[d.kind]} {"·"} {formatBytes(d.size)}
                    </p>
                  </div>
                  {d.url ? (
                    <Button variant="ghost" size="icon" aria-label={`Open ${d.fileName}`} render={<a href={d.url} target="_blank" rel="noreferrer" />} nativeButton={false}>
                      <DownloadIcon />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        {referral.appointment ? (
          <DetailCard title="Appointment">
            <Row label="Date and time" value={formatWhen(referral.appointment.startsAt)} />
            <Row label="Status" value={referral.appointment.status.replaceAll("_", " ")} />
            <Row label="Room" value={referral.appointment.roomName ?? undefined} />
            <p className="text-sm text-muted-foreground">
              Bring the documents your care team asked for. If you cannot attend, contact HakimeRAD as early as
              possible so the slot can be offered to another patient.
            </p>
          </DetailCard>
        ) : null}

        {referral.preparation ? (
          <DetailCard title="Preparation instructions from your care team">
            <p className="whitespace-pre-line rounded-lg border bg-muted/30 p-3 text-sm">
              {referral.preparation.instructions}
            </p>
            <p className="text-xs text-muted-foreground">
              Issued {formatWhen(referral.preparation.issuedAt)} by {referral.preparation.issuedBy}
            </p>
            {referral.preparation.acknowledgedAt ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                You confirmed these instructions on {formatWhen(referral.preparation.acknowledgedAt)}.
              </p>
            ) : (
              <AcknowledgePreparation referralId={referral._id} />
            )}
          </DetailCard>
        ) : null}

        <InfoRequestThread
          referralId={referral._id}
          status={referral.status}
          notes={referral.notes ?? []}
        />

        <DetailCard title="Status history">
          <Timeline events={referral.events ?? []} />
        </DetailCard>
      </div>

      <AddDocumentsDialog referralId={referral._id} existingCount={referral.documents.length} open={addOpen} onOpenChange={setAddOpen} />
      <WithdrawDialog referralId={referral._id} reference={referral.reference} open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </AppPage>
  );
}

function AcknowledgePreparation({ referralId }: { referralId: string }) {
  const acknowledge = useMutation(api.care.acknowledgePreparation);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await acknowledge({ referralId });
          toast.success("Thank you. Your team can see you have read the instructions.");
        } catch (error) {
          toast.error(errorMessage(error, "Could not record your confirmation."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <CheckCircle2Icon />
      I have read these instructions
    </Button>
  );
}

function InfoRequestThread({
  referralId,
  status,
  notes,
}: {
  referralId: string;
  status: string;
  notes: Array<{ _id: string; body: string; author: string; at: string }>;
}) {
  const respond = useMutation(api.reviews.respondToInfo);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  if (notes.length === 0 && status !== "info_requested") return null;

  return (
    <DetailCard title="Messages about this request">
      <ul className="space-y-2">
        {notes.map((note) => (
          <li key={note._id} className="rounded-lg border p-3 text-sm">
            <p className="whitespace-pre-line">{note.body}</p>
            <p className="pt-1 text-xs text-muted-foreground">
              {formatWhen(note.at)} · {note.author}
            </p>
          </li>
        ))}
      </ul>
      {status === "info_requested" ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm">
            The clinical team asked for more information. Reply here and the request goes back into review.
          </p>
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={3}
            placeholder="Add the information they asked for."
          />
          <Button
            size="sm"
            disabled={busy || reply.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              try {
                await respond({ referralId, body: reply });
                setReply("");
                toast.success("Your reply was sent to the clinical team.");
              } catch (error) {
                toast.error(errorMessage(error, "Could not send your reply."));
              } finally {
                setBusy(false);
              }
            }}
          >
            Send reply
          </Button>
        </div>
      ) : null}
    </DetailCard>
  );
}
