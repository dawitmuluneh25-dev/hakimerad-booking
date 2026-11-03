import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheckIcon, PlusIcon } from "lucide-react";
import { api, useMutation } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { errorMessage } from "@/lib/errors.ts";
import {
  CONSENT_STATUSES,
  CONSENT_STATUS_LABELS,
  PREPARATION_STATE_LABELS,
  PROCEDURE_STEPS,
  PROCEDURE_STEP_LABELS,
  SPECIMEN_DISPATCH_STATUSES,
  SPECIMEN_STATUS_LABELS,
  type ConsentStatus,
  type PreparationState,
  type SpecimenDispatchStatus,
} from "@/shared/workflow.ts";
import { DetailCard, formatWhen } from "./record-cards.tsx";
import type {
  ConsentRecord,
  FollowUpRecord,
  PreparationRecord,
  ProcedureStepRecord,
  SpecimenRecord,
} from "@/server/types.ts";

/** Preparation, consent, procedure-day steps, specimens and follow-ups (M7). */
export default function CarePanel({
  referralId,
  procedure,
  preparation,
  consent,
  steps,
  specimens,
  followUps,
  hasAppointment,
  canInstruct,
  canOperate,
}: {
  referralId: string;
  procedure: string;
  preparation: PreparationRecord | null;
  consent: ConsentRecord | null;
  steps: ProcedureStepRecord[];
  specimens: SpecimenRecord[];
  followUps: FollowUpRecord[];
  hasAppointment: boolean;
  canInstruct: boolean;
  canOperate: boolean;
}) {
  const issue = useMutation(api.care.issuePreparation);
  const setPrepState = useMutation(api.care.setPreparationState);
  const recordConsent = useMutation(api.care.recordConsent);
  const recordStep = useMutation(api.care.recordStep);
  const saveSpecimen = useMutation(api.care.saveSpecimen);
  const addFollowUp = useMutation(api.care.addFollowUp);
  const completeFollowUp = useMutation(api.care.completeFollowUp);

  const [instructions, setInstructions] = useState(
    preparation?.instructions ?? "",
  );
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(
    (consent?.status as ConsentStatus) ?? "recorded",
  );
  const [consentNote, setConsentNote] = useState("");
  const [specimenType, setSpecimenType] = useState("Core needle biopsy");
  const [specimenId, setSpecimenId] = useState("");
  const [specimenLab, setSpecimenLab] = useState("");
  const [specimenStatus, setSpecimenStatus] =
    useState<SpecimenDispatchStatus>("pending");
  const [followTitle, setFollowTitle] = useState("");
  const [followDate, setFollowDate] = useState("");

  const act = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
    } catch (error) {
      toast.error(errorMessage(error, "That change could not be saved."));
    }
  };

  return (
    <div className="space-y-6">
      <DetailCard title="Preparation instructions">
        {preparation ? (
          <div className="space-y-3">
            <p className="whitespace-pre-line rounded-lg border bg-muted/30 p-3 text-sm">
              {preparation.instructions}
            </p>
            <p className="text-xs text-muted-foreground">
              {PREPARATION_STATE_LABELS[
                preparation.state as PreparationState
              ] ?? preparation.state}{" "}
              · issued {formatWhen(preparation.issuedAt)} by{" "}
              {preparation.issuedBy}
              {preparation.acknowledgedAt
                ? ` · acknowledged ${formatWhen(preparation.acknowledgedAt)}`
                : ""}
            </p>
            {preparation.reviewNote ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {preparation.reviewNote}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No instructions issued yet.
          </p>
        )}

        {canInstruct ? (
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="prep-instructions">
              {preparation
                ? "Replace instructions"
                : "Write patient-specific instructions"}
            </Label>
            <Textarea
              id="prep-instructions"
              rows={4}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Arrival time, documents to bring, who to contact. Do not copy a generic protocol; write what this patient needs."
            />
            <Button
              size="sm"
              disabled={instructions.trim().length < 2}
              onClick={() =>
                act(
                  () => issue({ referralId, instructions }),
                  "Instructions issued.",
                )
              }
            >
              <ClipboardCheckIcon />
              Issue to the patient
            </Button>
          </div>
        ) : null}

        {canOperate && preparation ? (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                act(
                  () => setPrepState({ referralId, state: "completed" }),
                  "Preparation marked complete.",
                )
              }
            >
              Preparation completed
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                act(
                  () =>
                    setPrepState({
                      referralId,
                      state: "needs_review",
                      note: "Flagged at the desk",
                    }),
                  "Flagged for clinical review.",
                )
              }
            >
              Needs clinical review
            </Button>
          </div>
        ) : null}
      </DetailCard>

      <DetailCard title="Consent">
        <p className="text-sm">
          {consent
            ? `${CONSENT_STATUS_LABELS[consent.status as ConsentStatus] ?? consent.status} · ${formatWhen(consent.at)} · ${consent.recordedBy}`
            : "No consent record. Policy acceptance is not procedural consent."}
        </p>
        {consent?.note ? (
          <p className="text-sm text-muted-foreground">{consent.note}</p>
        ) : null}
        {canInstruct ? (
          <div className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="space-y-1">
              <Label htmlFor="consent-status">Record consent</Label>
              <NativeSelect
                id="consent-status"
                value={consentStatus}
                onChange={(event) =>
                  setConsentStatus(event.target.value as ConsentStatus)
                }
              >
                {CONSENT_STATUSES.map((status) => (
                  <NativeSelectOption key={status} value={status}>
                    {CONSENT_STATUS_LABELS[status]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="min-w-40 flex-1 space-y-1">
              <Label htmlFor="consent-note">Note</Label>
              <Input
                id="consent-note"
                value={consentNote}
                onChange={(event) => setConsentNote(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button
              size="sm"
              onClick={() =>
                act(
                  () =>
                    recordConsent({
                      referralId,
                      status: consentStatus,
                      note: consentNote || undefined,
                    }),
                  "Consent recorded.",
                )
              }
            >
              Save
            </Button>
          </div>
        ) : null}
      </DetailCard>

      <DetailCard title="Procedure day">
        {!hasAppointment ? (
          <p className="text-sm text-muted-foreground">
            Recorded once the appointment exists.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {PROCEDURE_STEPS.map((step) => {
                const done = steps.some((entry) => entry.step === step);
                return (
                  <Button
                    key={step}
                    size="sm"
                    variant={done ? "secondary" : "ghost"}
                    disabled={!canOperate || done}
                    onClick={() =>
                      act(
                        () => recordStep({ referralId, step }),
                        `${PROCEDURE_STEP_LABELS[step]} recorded.`,
                      )
                    }
                  >
                    {PROCEDURE_STEP_LABELS[step]}
                  </Button>
                );
              })}
            </div>
            <ul className="space-y-1 pt-2 text-sm">
              {steps.length === 0 ? (
                <li className="text-muted-foreground">
                  No steps recorded yet.
                </li>
              ) : (
                steps.map((entry) => (
                  <li key={entry._id}>
                    {PROCEDURE_STEP_LABELS[entry.step as never] ?? entry.step} ·{" "}
                    <span className="text-muted-foreground">
                      {formatWhen(entry.at)} · {entry.by}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </DetailCard>

      {procedure === "biopsy-fnac" ? (
        <DetailCard title="Specimen dispatch">
          {specimens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No specimens recorded.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {specimens.map((specimen) => (
                <li key={specimen._id} className="rounded-lg border p-3">
                  <p className="font-medium">
                    {specimen.collectionType} · {specimen.identifier} ·{" "}
                    {specimen.containers} container(s)
                  </p>
                  <p className="text-muted-foreground">
                    {SPECIMEN_STATUS_LABELS[
                      specimen.status as SpecimenDispatchStatus
                    ] ?? specimen.status}
                    {specimen.destination ? ` · ${specimen.destination}` : ""}
                    {specimen.dispatchedAt
                      ? ` · ${formatWhen(specimen.dispatchedAt)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {canOperate ? (
            <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="specimen-type">Specimen type</Label>
                <Input
                  id="specimen-type"
                  value={specimenType}
                  onChange={(e) => setSpecimenType(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="specimen-id">Specimen identifier</Label>
                <Input
                  id="specimen-id"
                  value={specimenId}
                  onChange={(e) => setSpecimenId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="specimen-lab">Destination laboratory</Label>
                <Input
                  id="specimen-lab"
                  value={specimenLab}
                  onChange={(e) => setSpecimenLab(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="specimen-status">Dispatch status</Label>
                <NativeSelect
                  id="specimen-status"
                  className="w-full"
                  value={specimenStatus}
                  onChange={(e) =>
                    setSpecimenStatus(e.target.value as SpecimenDispatchStatus)
                  }
                >
                  {SPECIMEN_DISPATCH_STATUSES.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {SPECIMEN_STATUS_LABELS[status]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <Button
                size="sm"
                className="sm:col-span-2"
                disabled={specimenId.trim().length < 1}
                onClick={() =>
                  act(
                    () =>
                      saveSpecimen({
                        referralId,
                        collectionType: specimenType,
                        identifier: specimenId,
                        destination: specimenLab || undefined,
                        status: specimenStatus,
                      }),
                    "Specimen recorded.",
                  )
                }
              >
                <PlusIcon />
                Record specimen
              </Button>
            </div>
          ) : null}
        </DetailCard>
      ) : null}

      <DetailCard title="Follow-up">
        {followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-up tasks.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {followUps.map((task) => (
              <li
                key={task._id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-muted-foreground">
                    {task.status === "done"
                      ? "Done"
                      : `Open${task.dueDate ? ` · due ${formatWhen(task.dueDate)}` : ""}`}
                    {task.note ? ` · ${task.note}` : ""}
                  </p>
                </div>
                {canOperate && task.status !== "done" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      act(
                        () => completeFollowUp({ taskId: task._id }),
                        "Follow-up completed.",
                      )
                    }
                  >
                    Done
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canOperate ? (
          <div className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="min-w-40 flex-1 space-y-1">
              <Label htmlFor="follow-title">Follow-up task</Label>
              <Input
                id="follow-title"
                value={followTitle}
                onChange={(event) => setFollowTitle(event.target.value)}
                placeholder="e.g. Review drain at one week"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="follow-date">Due</Label>
              <Input
                id="follow-date"
                type="date"
                value={followDate}
                onChange={(event) => setFollowDate(event.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={followTitle.trim().length < 2}
              onClick={() =>
                act(
                  () =>
                    addFollowUp({
                      referralId,
                      title: followTitle,
                      dueDate: followDate || undefined,
                    }),
                  "Follow-up added.",
                )
              }
            >
              Add
            </Button>
          </div>
        ) : null}
      </DetailCard>
    </div>
  );
}
