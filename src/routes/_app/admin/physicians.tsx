import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api, useMutation, usePaginatedQuery } from "@/lib/api.ts";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheckIcon } from "lucide-react";
import { toast } from "sonner";
import AppPage from "@/components/app-page.tsx";
import PhysicianStatusBadge from "@/components/physician-status-badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { Id } from "@/lib/ids.ts";
import {
  PHYSICIAN_STATUSES,
  PHYSICIAN_STATUS_LABELS,
  type PhysicianStatus,
} from "@/shared/roles.ts";
import { errorMessage } from "@/lib/errors.ts";
import RequireRole from "../-components/require-role.tsx";

export const Route = createFileRoute("/_app/admin/physicians")({
  head: () => ({
    meta: [{ title: "Verify physicians | HakimeRAD IR Booking" }],
  }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <PhysiciansPage />
    </RequireRole>
  ),
});

type Decision = "verified" | "rejected" | "suspended";
type Pending = {
  profileId: Id<"physicianProfiles">;
  name: string;
  decision: Decision;
} | null;

const DECISION_COPY: Record<Decision, { title: string; button: string }> = {
  verified: { title: "Verify physician", button: "Verify" },
  rejected: { title: "Decline verification", button: "Decline" },
  suspended: { title: "Suspend referral access", button: "Suspend" },
};

function PhysiciansPage() {
  const [status, setStatus] = useState<PhysicianStatus>("pending");
  const [pending, setPending] = useState<Pending>(null);
  const {
    results,
    status: loadStatus,
    loadMore,
  } = usePaginatedQuery(
    api.admin.accounts.listPhysicians,
    { status },
    { initialNumItems: 25 },
  );

  return (
    <AppPage
      title="Verify physicians"
      description="Check registration details before granting referral access."
    >
      <Tabs
        value={status}
        onValueChange={(value: PhysicianStatus) => setStatus(value)}
      >
        <TabsList className="mb-6 flex-wrap">
          {PHYSICIAN_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="cursor-pointer">
              {PHYSICIAN_STATUS_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loadStatus === "LoadingFirstPage" ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : loadStatus === "Exhausted" && results.length === 0 ? (
        <Empty className="rounded-xl border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BadgeCheckIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing here</EmptyTitle>
            <EmptyDescription>
              No physician profiles are{" "}
              {PHYSICIAN_STATUS_LABELS[status].toLowerCase()}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {results.map((p) => (
            <div key={p._id} className="rounded-xl border bg-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.fullName}</p>
                    <PhysicianStatusBadge status={p.status} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {p.email} {"·"} {p.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted{" "}
                    {formatDistanceToNow(new Date(p.submittedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {p.status !== "verified" && p.status !== "suspended" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        setPending({
                          profileId: p._id,
                          name: p.fullName,
                          decision: "verified",
                        })
                      }
                    >
                      Verify
                    </Button>
                  ) : null}
                  {p.status === "pending" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPending({
                          profileId: p._id,
                          name: p.fullName,
                          decision: "rejected",
                        })
                      }
                    >
                      Decline
                    </Button>
                  ) : null}
                  {p.status === "verified" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setPending({
                          profileId: p._id,
                          name: p.fullName,
                          decision: "suspended",
                        })
                      }
                    >
                      Suspend
                    </Button>
                  ) : null}
                  {p.status === "suspended" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        setPending({
                          profileId: p._id,
                          name: p.fullName,
                          decision: "verified",
                        })
                      }
                    >
                      Restore
                    </Button>
                  ) : null}
                </div>
              </div>
              <dl className="grid gap-3 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Registration number"
                  value={p.registrationNumber}
                />
                <Field label="Licensing body" value={p.licensingBody} />
                <Field label="Specialty" value={p.specialty} />
                <Field label="Facility" value={p.facilityName} />
                <Field label="Facility address" value={p.facilityAddress} />
                {p.reviewNote ? (
                  <Field label="Review note" value={p.reviewNote} />
                ) : null}
              </dl>
            </div>
          ))}
          {loadStatus === "CanLoadMore" ? (
            <Button variant="secondary" onClick={() => loadMore(25)}>
              Load more
            </Button>
          ) : null}
        </div>
      )}

      <DecisionDialog pending={pending} onClose={() => setPending(null)} />
    </AppPage>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}

function DecisionDialog({
  pending,
  onClose,
}: {
  pending: Pending;
  onClose: () => void;
}) {
  const review = useMutation(api.admin.accounts.reviewPhysician);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const needsNote = pending?.decision !== "verified";

  const close = () => {
    setNote("");
    onClose();
  };

  const onConfirm = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await review({
        profileId: pending.profileId,
        decision: pending.decision,
        note: note.trim() || undefined,
      });
      toast.success("Decision saved");
      close();
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the decision."));
    } finally {
      setSaving(false);
    }
  };

  const copy = pending ? DECISION_COPY[pending.decision] : null;
  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy?.title}</DialogTitle>
          <DialogDescription>{pending?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="review-note">
            {needsNote ? "Reason (shown to the physician)" : "Note (optional)"}
          </Label>
          <Textarea
            id="review-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              needsNote
                ? "Registration number could not be confirmed with the licensing body."
                : "Checked with licensing register."
            }
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving || (needsNote && note.trim().length < 2)}
            variant={
              pending?.decision === "verified" ? "default" : "destructive"
            }
          >
            {saving ? <Spinner /> : null}
            {copy?.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
