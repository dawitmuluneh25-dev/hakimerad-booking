import { useState } from "react";
import { toast } from "sonner";
import { StethoscopeIcon } from "lucide-react";
import { api, useMutation } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { errorMessage } from "@/lib/errors.ts";
import {
  CHECKLIST_ITEMS,
  CHECKLIST_LABELS,
  CLINICAL_PRIORITIES,
  CLINICAL_PRIORITY_LABELS,
  REVIEW_DECISION_LABELS,
  type ChecklistItem,
  type ReviewDecision,
} from "@/shared/workflow.ts";
import {
  MODALITY_LABELS,
  REFERRAL_PROCEDURES,
  PROCEDURE_LABELS,
} from "@/shared/referrals.ts";
import { DetailCard, formatWhen } from "./record-cards.tsx";
import type { ReferralReview } from "@/server/types.ts";

const DECISIONS: ReviewDecision[] = [
  "approve",
  "defer",
  "decline",
  "request_info",
  "redirect",
];

/** Clinical decision form. Only radiologists get a usable form; the server enforces it. */
export default function ClinicalReviewPanel({
  referralId,
  status,
  reviews,
  canReview,
}: {
  referralId: string;
  status: string;
  reviews: ReferralReview[];
  canReview: boolean;
}) {
  const submit = useMutation(api.reviews.review);
  const [decision, setDecision] = useState<ReviewDecision>("approve");
  const [priority, setPriority] = useState("routine");
  const [modality, setModality] = useState("ultrasound");
  const [redirectTo, setRedirectTo] = useState<string>(REFERRAL_PROCEDURES[0]);
  const [note, setNote] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const open = [
    "submitted",
    "in_review",
    "info_requested",
    "approved",
    "deferred",
  ].includes(status);

  return (
    <DetailCard title="Clinical review">
      {reviews.length > 0 ? (
        <div className="space-y-3 pb-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="rounded-lg border bg-muted/30 p-3 text-sm"
            >
              <p className="font-medium">
                {REVIEW_DECISION_LABELS[review.decision as ReviewDecision] ??
                  review.decision}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatWhen(review.at)} · {review.reviewer}
                {review.priority
                  ? ` · ${CLINICAL_PRIORITY_LABELS[review.priority as never]}`
                  : ""}
              </p>
              {review.note ? (
                <p className="pt-1 whitespace-pre-line">{review.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No clinical decision recorded yet.
        </p>
      )}

      {!open ? (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          This request is {status.replaceAll("_", " ")} and no longer takes a
          clinical decision.
        </p>
      ) : !canReview ? (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          Clinical decisions are recorded by an interventional radiologist. You
          can add documents and staff notes.
        </p>
      ) : (
        <form
          className="space-y-4 border-t pt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await submit({
                referralId,
                decision,
                priority:
                  decision === "approve" ? (priority as never) : undefined,
                modality:
                  decision === "approve" || decision === "defer"
                    ? modality
                    : undefined,
                redirectTo: decision === "redirect" ? redirectTo : undefined,
                checklist,
                note: note.trim() || undefined,
              });
              toast.success("Clinical decision recorded.");
              setNote("");
              setChecklist({});
            } catch (error) {
              toast.error(
                errorMessage(error, "The decision could not be saved."),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="decision">Decision</Label>
              <NativeSelect
                id="decision"
                className="w-full"
                value={decision}
                onChange={(event) =>
                  setDecision(event.target.value as ReviewDecision)
                }
              >
                {DECISIONS.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {REVIEW_DECISION_LABELS[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="priority">Clinical priority</Label>
              <NativeSelect
                id="priority"
                className="w-full"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {CLINICAL_PRIORITIES.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {CLINICAL_PRIORITY_LABELS[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="modality">Modality for scheduling</Label>
              <NativeSelect
                id="modality"
                className="w-full"
                value={modality}
                onChange={(event) => setModality(event.target.value)}
              >
                {Object.entries(MODALITY_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {decision === "redirect" ? (
              <div className="space-y-1">
                <Label htmlFor="redirect">Recommended pathway</Label>
                <NativeSelect
                  id="redirect"
                  className="w-full"
                  value={redirectTo}
                  onChange={(event) => setRedirectTo(event.target.value)}
                >
                  {REFERRAL_PROCEDURES.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {PROCEDURE_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="pb-1 text-sm font-medium">
              Review checklist
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHECKLIST_ITEMS.map((item: ChecklistItem) => (
                <label key={item} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={checklist[item] === true}
                    onCheckedChange={(checked) =>
                      setChecklist((current) => ({
                        ...current,
                        [item]: checked === true,
                      }))
                    }
                  />
                  <span>{CHECKLIST_LABELS[item]}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Approval requires the indication, referral, imaging, identity,
              consent and resource items.
            </p>
          </fieldset>

          <div className="space-y-1">
            <Label htmlFor="note">
              Note to the submitter (required to request information or decline)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Write in plain language; this is shown on the request."
            />
          </div>

          <Button type="submit" disabled={busy}>
            <StethoscopeIcon />
            Record decision
          </Button>
        </form>
      )}
    </DetailCard>
  );
}
