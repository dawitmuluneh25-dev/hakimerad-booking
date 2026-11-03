import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
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
import { errorMessage } from "@/lib/errors.ts";
import {
  RESOURCE_KIND_LABELS,
  RESOURCE_KINDS,
  type ResourceKind,
} from "@/shared/workflow.ts";
import { PROCEDURE_LABELS, REFERRAL_PROCEDURES } from "@/shared/referrals.ts";
import { MODALITY_LABELS } from "@/shared/referrals.ts";
import RequireRole from "../-components/require-role.tsx";
import { DetailCard } from "../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/admin/resources")({
  head: () => ({
    meta: [{ title: "Resources and durations | HakimeRAD IR Booking" }],
  }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <ResourcesPage />
    </RequireRole>
  ),
});

function ResourcesPage() {
  const resources = useQuery(api.scheduling.listResources, {});
  const procedures = useQuery(api.scheduling.listProcedureSettings, {});
  const saveResource = useMutation(api.scheduling.saveResource);
  const saveProcedure = useMutation(api.scheduling.saveProcedureSetting);

  const [draft, setDraft] = useState({ kind: "room", name: "", modality: "" });

  return (
    <AppPage
      title="Resources and durations"
      description="Rooms, equipment and staff the schedule can use, and the duration each procedure occupies."
    >
      <div className="space-y-6">
        <DetailCard title="Resources">
          {resources === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resources yet. Add a room to start booking.
            </p>
          ) : (
            <ul className="space-y-2">
              {resources.map((resource) => (
                <li
                  key={resource._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{resource.name}</p>
                    <p className="text-muted-foreground">
                      {RESOURCE_KIND_LABELS[resource.kind as ResourceKind] ??
                        resource.kind}
                      {resource.modality
                        ? ` · ${MODALITY_LABELS[resource.modality as never] ?? resource.modality}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await saveResource({
                          id: resource._id,
                          kind: resource.kind as ResourceKind,
                          name: resource.name,
                          modality: resource.modality ?? undefined,
                          active: !resource.active,
                        });
                        toast.success(
                          resource.active
                            ? "Resource retired."
                            : "Resource active again.",
                        );
                      } catch (error) {
                        toast.error(
                          errorMessage(error, "Could not update the resource."),
                        );
                      }
                    }}
                  >
                    {resource.active ? "Retire" : "Reactivate"}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 border-t pt-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="resource-kind">Type</Label>
              <NativeSelect
                id="resource-kind"
                className="w-full"
                value={draft.kind}
                onChange={(event) =>
                  setDraft({ ...draft, kind: event.target.value })
                }
              >
                {RESOURCE_KINDS.map((kind) => (
                  <NativeSelectOption key={kind} value={kind}>
                    {RESOURCE_KIND_LABELS[kind]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resource-modality">Modality</Label>
              <NativeSelect
                id="resource-modality"
                className="w-full"
                value={draft.modality}
                onChange={(event) =>
                  setDraft({ ...draft, modality: event.target.value })
                }
              >
                <NativeSelectOption value="">Not specific</NativeSelectOption>
                {Object.entries(MODALITY_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Button
              size="sm"
              className="sm:col-span-4"
              disabled={draft.name.trim().length < 2}
              onClick={async () => {
                try {
                  await saveResource({
                    kind: draft.kind as ResourceKind,
                    name: draft.name,
                    modality: draft.modality || undefined,
                  });
                  setDraft({ kind: draft.kind, name: "", modality: "" });
                  toast.success("Resource added.");
                } catch (error) {
                  toast.error(
                    errorMessage(error, "Could not add the resource."),
                  );
                }
              }}
            >
              <PlusIcon />
              Add resource
            </Button>
          </div>
        </DetailCard>

        <DetailCard title="Procedure durations">
          <p className="text-sm text-muted-foreground">
            These are starting values an administrator can change. The
            scheduling engine reads them as data; no duration is fixed in the
            application code.
          </p>
          {procedures === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="space-y-3">
              {REFERRAL_PROCEDURES.map((procedure) => {
                const current = procedures.find(
                  (entry) => entry.procedure === procedure,
                );
                return (
                  <ProcedureRow
                    key={procedure}
                    procedure={procedure}
                    duration={current?.durationMinutes ?? 45}
                    buffer={current?.bufferMinutes ?? 15}
                    active={current?.active ?? true}
                    onSave={async (duration, buffer, active) => {
                      try {
                        await saveProcedure({
                          procedure,
                          durationMinutes: duration,
                          bufferMinutes: buffer,
                          active,
                        });
                        toast.success("Duration saved.");
                      } catch (error) {
                        toast.error(
                          errorMessage(error, "Could not save the duration."),
                        );
                      }
                    }}
                  />
                );
              })}
            </ul>
          )}
        </DetailCard>
      </div>
    </AppPage>
  );
}

function ProcedureRow({
  procedure,
  duration,
  buffer,
  active,
  onSave,
}: {
  procedure: string;
  duration: number;
  buffer: number;
  active: boolean;
  onSave: (duration: number, buffer: number, active: boolean) => Promise<void>;
}) {
  const [minutes, setMinutes] = useState(String(duration));
  const [bufferMinutes, setBufferMinutes] = useState(String(buffer));

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">
        {PROCEDURE_LABELS[procedure as never] ?? procedure}
        {active ? "" : " · inactive"}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${procedure}-duration`}>Duration</Label>
          <Input
            id={`${procedure}-duration`}
            className="w-24"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${procedure}-buffer`}>Buffer</Label>
          <Input
            id={`${procedure}-buffer`}
            className="w-24"
            value={bufferMinutes}
            onChange={(event) => setBufferMinutes(event.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSave(Number(minutes), Number(bufferMinutes), active)}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onSave(Number(minutes), Number(bufferMinutes), !active)
          }
        >
          {active ? "Disable" : "Enable"}
        </Button>
      </div>
    </li>
  );
}
