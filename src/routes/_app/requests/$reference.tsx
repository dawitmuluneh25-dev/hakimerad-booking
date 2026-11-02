import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeftIcon, CheckCircle2Icon, DownloadIcon, FileTextIcon, FileSearchIcon, PaperclipIcon } from "lucide-react";
import { z } from "zod";
import AppPage from "@/components/app-page.tsx";
import ReferralStatusBadge from "@/components/referral-status-badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import {
  DOCUMENT_KIND_LABELS,
  MODALITY_LABELS,
  PROCEDURE_LABELS,
  REQUESTED_METHODS,
  SEX_LABELS,
  URGENCY_LABELS,
  YES_NO_UNKNOWN_LABELS,
} from "@/convex/shared/referrals.ts";
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
  const { isAuthenticated } = useConvexAuth();
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
      </div>

      <AddDocumentsDialog referralId={referral._id} existingCount={referral.documents.length} open={addOpen} onOpenChange={setAddOpen} />
      <WithdrawDialog referralId={referral._id} reference={referral.reference} open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </AppPage>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-background p-5">
      <h2 className="pb-4 font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-line">{value}</dd>
    </dl>
  );
}
