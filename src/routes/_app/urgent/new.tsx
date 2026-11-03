import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, SirenIcon } from "lucide-react";
import { toast } from "sonner";
import AppPage from "@/components/app-page.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { api, useMutation } from "@/lib/api.ts";
import { useOnlineStatus } from "@/hooks/use-online.ts";
import { errorMessage } from "@/lib/errors.ts";
import {
  REFERRING_DEPARTMENTS,
  REFERRING_DEPARTMENT_LABELS,
} from "@/shared/workflow.ts";

export const Route = createFileRoute("/_app/urgent/new")({
  head: () => ({
    meta: [{ title: "Start urgent coordination | HakimeRAD IR Booking" }],
  }),
  component: NewUrgentCasePage,
});

function NewUrgentCasePage() {
  const navigate = useNavigate();
  const create = useMutation(api.urgent.create);
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    department: "emergency_department",
    facilityName: "",
    facilityPhone: "",
    clinicianName: "",
    clinicianPhone: "",
    patientName: "",
    dateOfBirth: "",
    guardianName: "",
    guardianPhone: "",
    presentation: "",
    imagingAvailable: "unknown",
    imagingDetail: "",
    coordinationTime: "",
    notes: "",
  });
  const [warning, setWarning] = useState(false);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <AppPage
      title="Start urgent coordination"
      description="For hospital clinicians and HakimeRAD staff coordinating suspected intussusception. The app records the request; it does not diagnose or decide treatment."
      actions={
        <Button
          variant="ghost"
          size="sm"
          render={<Link to="/urgent" />}
          nativeButton={false}
        >
          <ArrowLeftIcon />
          All cases
        </Button>
      }
    >
      <div className="space-y-6">
        <UrgentNotice />

        <form
          className="space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const result = await create({
                department: form.department,
                facilityName: form.facilityName,
                facilityPhone: form.facilityPhone,
                clinicianName: form.clinicianName,
                clinicianPhone: form.clinicianPhone,
                patient: {
                  fullName: form.patientName,
                  dateOfBirth: form.dateOfBirth,
                  guardianName: form.guardianName || undefined,
                  guardianPhone: form.guardianPhone || undefined,
                },
                clinical: {
                  presentation: form.presentation,
                  imagingAvailable: form.imagingAvailable as never,
                  imagingDetail: form.imagingDetail || undefined,
                  coordinationTime: form.coordinationTime || undefined,
                  notes: form.notes || undefined,
                },
                acknowledgeWarning: warning,
              });
              toast.success(
                `Case ${result.reference} sent to the radiology team.`,
              );
              void navigate({
                to: "/urgent/$reference",
                params: { reference: result.reference },
              });
            } catch (error) {
              toast.error(
                errorMessage(error, "The case could not be created."),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <section className="space-y-4 rounded-xl border bg-background p-5">
            <h2 className="font-semibold">Referring team</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="department">Referring department</Label>
                <NativeSelect
                  id="department"
                  className="w-full"
                  value={form.department}
                  onChange={(event) => set("department", event.target.value)}
                >
                  {REFERRING_DEPARTMENTS.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {REFERRING_DEPARTMENT_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="facility">Referring facility</Label>
                <Input
                  id="facility"
                  required
                  value={form.facilityName}
                  onChange={(e) => set("facilityName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="facility-phone">Facility phone</Label>
                <Input
                  id="facility-phone"
                  required
                  value={form.facilityPhone}
                  onChange={(e) => set("facilityPhone", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clinician">Referring clinician</Label>
                <Input
                  id="clinician"
                  required
                  value={form.clinicianName}
                  onChange={(e) => set("clinicianName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clinician-phone">Clinician direct phone</Label>
                <Input
                  id="clinician-phone"
                  required
                  value={form.clinicianPhone}
                  onChange={(e) => set("clinicianPhone", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-background p-5">
            <h2 className="font-semibold">Child and guardian</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="patient">Patient name</Label>
                <Input
                  id="patient"
                  required
                  value={form.patientName}
                  onChange={(e) => set("patientName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  required
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guardian">Guardian name</Label>
                <Input
                  id="guardian"
                  value={form.guardianName}
                  onChange={(e) => set("guardianName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guardian-phone">Guardian phone</Label>
                <Input
                  id="guardian-phone"
                  value={form.guardianPhone}
                  onChange={(e) => set("guardianPhone", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-background p-5">
            <h2 className="font-semibold">Clinical coordination</h2>
            <div className="space-y-1">
              <Label htmlFor="presentation">
                Presentation and current status
              </Label>
              <Textarea
                id="presentation"
                required
                rows={4}
                value={form.presentation}
                onChange={(e) => set("presentation", e.target.value)}
                placeholder="What the referring team has found so far. Do not wait for this form in an emergency."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="imaging">Imaging available</Label>
                <NativeSelect
                  id="imaging"
                  className="w-full"
                  value={form.imagingAvailable}
                  onChange={(event) =>
                    set("imagingAvailable", event.target.value)
                  }
                >
                  <NativeSelectOption value="yes">Yes</NativeSelectOption>
                  <NativeSelectOption value="no">No</NativeSelectOption>
                  <NativeSelectOption value="unknown">
                    Not sure
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="coordination-time">
                  Planned coordination time
                </Label>
                <Input
                  id="coordination-time"
                  type="datetime-local"
                  value={form.coordinationTime}
                  onChange={(e) => set("coordinationTime", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="imaging-detail">Imaging detail</Label>
                <Input
                  id="imaging-detail"
                  value={form.imagingDetail}
                  onChange={(e) => set("imagingDetail", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="notes">Other coordination notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={warning}
              onCheckedChange={(checked) => setWarning(checked === true)}
            />
            <span>
              I understand this pathway is urgent hospital coordination, not a
              routine appointment, and that the team must still speak to the
              referring clinician directly.
            </span>
          </label>

          <Button type="submit" disabled={busy || !warning || !online}>
            <SirenIcon />
            Send to the radiology team
          </Button>
        </form>
      </div>
    </AppPage>
  );
}
