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
import RequireRole from "../-components/require-role.tsx";
import { DetailCard } from "../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/admin/institutions")({
  head: () => ({
    meta: [{ title: "Referring institutions | HakimeRAD IR Booking" }],
  }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <InstitutionsPage />
    </RequireRole>
  ),
});

const KINDS = ["hospital", "clinic", "diagnostic_centre", "other"] as const;

function InstitutionsPage() {
  const institutions = useQuery(api.reports.listInstitutions, {});
  const save = useMutation(api.reports.saveInstitution);
  const [draft, setDraft] = useState({
    name: "",
    kind: "hospital",
    address: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });

  return (
    <AppPage
      title="Referring institutions"
      description="A directory of hospitals and clinics that refer patients. Referral records keep their own snapshot."
    >
      <div className="space-y-6">
        <DetailCard title="Directory">
          {institutions === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : institutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No institutions recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {institutions.map((entry) => (
                <li key={entry._id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {entry.name}
                    {entry.status === "inactive" ? " · inactive" : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {entry.kind.replaceAll("_", " ")}
                    {entry.address ? ` · ${entry.address}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {[entry.contactName, entry.contactPhone, entry.contactEmail]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <DetailCard title="Add an institution">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="institution-name">Name</Label>
              <Input
                id="institution-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="institution-kind">Type</Label>
              <NativeSelect
                id="institution-kind"
                className="w-full"
                value={draft.kind}
                onChange={(event) =>
                  setDraft({ ...draft, kind: event.target.value })
                }
              >
                {KINDS.map((kind) => (
                  <NativeSelectOption key={kind} value={kind}>
                    {kind.replaceAll("_", " ")}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="institution-address">Address</Label>
              <Input
                id="institution-address"
                value={draft.address}
                onChange={(event) =>
                  setDraft({ ...draft, address: event.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="institution-contact">Contact name</Label>
              <Input
                id="institution-contact"
                value={draft.contactName}
                onChange={(event) =>
                  setDraft({ ...draft, contactName: event.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="institution-phone">Contact phone</Label>
              <Input
                id="institution-phone"
                value={draft.contactPhone}
                onChange={(event) =>
                  setDraft({ ...draft, contactPhone: event.target.value })
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="institution-email">Contact email</Label>
              <Input
                id="institution-email"
                value={draft.contactEmail}
                onChange={(event) =>
                  setDraft({ ...draft, contactEmail: event.target.value })
                }
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={draft.name.trim().length < 2}
            onClick={async () => {
              try {
                await save(draft);
                setDraft({
                  name: "",
                  kind: draft.kind,
                  address: "",
                  contactName: "",
                  contactPhone: "",
                  contactEmail: "",
                });
                toast.success("Institution added.");
              } catch (error) {
                toast.error(
                  errorMessage(error, "Could not add the institution."),
                );
              }
            }}
          >
            <PlusIcon />
            Add institution
          </Button>
        </DetailCard>
      </div>
    </AppPage>
  );
}
