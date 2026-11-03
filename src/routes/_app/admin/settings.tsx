import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SaveIcon } from "lucide-react";
import { toast } from "sonner";
import AppPage from "@/components/app-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { api, useMutation, useQuery } from "@/lib/api.ts";
import { errorMessage } from "@/lib/errors.ts";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  type NotificationSettings,
  type SettingsSnapshot,
  type SiteContactSettings,
  type Weekday,
  type WorkingHours,
} from "@/shared/settings.ts";
import RequireRole from "../-components/require-role.tsx";
import { DetailCard } from "../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/admin/settings")({
  head: () => ({ meta: [{ title: "Settings | HakimeRAD IR Booking" }] }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <SettingsPage />
    </RequireRole>
  ),
});

function SettingsPage() {
  const settings = useQuery(api.settings.all, {});
  return (
    <AppPage
      title="Settings"
      description="Business details and booking rules. Placeholders on the public site are replaced by the values you save here."
    >
      {settings === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <SettingsForm settings={settings} />
      )}
    </AppPage>
  );
}

function SettingsForm({ settings }: { settings: SettingsSnapshot }) {
  const save = useMutation(api.settings.save);
  const [contact, setContact] = useState<SiteContactSettings>(settings.contact);
  const [hours, setHours] = useState<WorkingHours>(settings.workingHours);
  const [step, setStep] = useState(String(settings.slotStepMinutes ?? 15));
  const [channels, setChannels] = useState<NotificationSettings>(
    settings.channels,
  );
  const [allowPatients, setAllowPatients] = useState(
    settings.allowPatientRequests === true,
  );
  const [allowPhysicians, setAllowPhysicians] = useState(
    settings.allowPhysicianRequests === true,
  );

  const persist = async (key: string, value: unknown, message: string) => {
    try {
      await save({ key: key as never, value });
      toast.success(message);
    } catch (error) {
      toast.error(errorMessage(error, "The setting could not be saved."));
    }
  };

  return (
    <div className="space-y-6">
      <DetailCard title="Public contact details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Phone"
            value={contact.phone}
            onChange={(value) => setContact({ ...contact, phone: value })}
          />
          <Field
            label="Email"
            value={contact.email}
            onChange={(value) => setContact({ ...contact, email: value })}
          />
          <Field
            label="Address"
            value={contact.address}
            onChange={(value) => setContact({ ...contact, address: value })}
          />
          <Field
            label="Opening hours (text)"
            value={contact.hours}
            onChange={(value) => setContact({ ...contact, hours: value })}
          />
          <Field
            label="Emergency coordination line"
            value={contact.emergencyPhone}
            onChange={(value) =>
              setContact({ ...contact, emergencyPhone: value })
            }
          />
        </div>
        <Button
          size="sm"
          onClick={() =>
            persist("site.contact", contact, "Contact details saved.")
          }
        >
          <SaveIcon />
          Save contact details
        </Button>
        <p className="text-xs text-muted-foreground">
          Leave a field empty to keep the built-in placeholder on the public
          site. These values are shown on the contact page and the urgent
          warning.
        </p>
      </DetailCard>

      <DetailCard title="Opening hours">
        <div className="space-y-2">
          {WEEKDAYS.map((day: Weekday) => {
            const entry = hours[day];
            return (
              <div
                key={day}
                className="flex flex-wrap items-center gap-3 text-sm"
              >
                <span className="w-24">{WEEKDAY_LABELS[day]}</span>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(entry)}
                    onCheckedChange={(checked) =>
                      setHours((current) => {
                        const next = { ...current };
                        if (checked === true)
                          next[day] = { open: "08:00", close: "17:00" };
                        else delete next[day];
                        return next;
                      })
                    }
                  />
                  Open
                </label>
                {entry ? (
                  <>
                    <Input
                      type="time"
                      className="w-32"
                      value={entry.open}
                      onChange={(event) =>
                        setHours({
                          ...hours,
                          [day]: {
                            open: event.target.value,
                            close: entry.close,
                          },
                        })
                      }
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={entry.close}
                      onChange={(event) =>
                        setHours({
                          ...hours,
                          [day]: {
                            open: entry.open,
                            close: event.target.value,
                          },
                        })
                      }
                    />
                  </>
                ) : (
                  <span className="text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t pt-3">
          <div className="space-y-1">
            <Label htmlFor="slot-step">Slot step (minutes)</Label>
            <Input
              id="slot-step"
              className="w-32"
              value={step}
              onChange={(event) => setStep(event.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={async () => {
              await persist(
                "schedule.workingHours",
                hours,
                "Opening hours saved.",
              );
              await persist(
                "schedule.slotStepMinutes",
                Number(step),
                "Slot step saved.",
              );
            }}
          >
            <SaveIcon />
            Save hours
          </Button>
        </div>
      </DetailCard>

      <DetailCard title="Notification channels">
        <p className="text-sm text-muted-foreground">
          In-app notifications always work. Email is written to a local outbox
          file; SMS and WhatsApp need a provider and only log the attempt until
          one is connected.
        </p>
        <div className="space-y-4">
          <ChannelRow
            title="Email"
            enabled={channels.email.enabled}
            onToggle={(enabled) =>
              setChannels({
                ...channels,
                email: { ...channels.email, enabled },
              })
            }
          >
            <Field
              label="From address"
              value={channels.email.from}
              onChange={(value) =>
                setChannels({
                  ...channels,
                  email: { ...channels.email, from: value },
                })
              }
            />
            <Field
              label="Reply-to"
              value={channels.email.replyTo}
              onChange={(value) =>
                setChannels({
                  ...channels,
                  email: { ...channels.email, replyTo: value },
                })
              }
            />
          </ChannelRow>
          <ChannelRow
            title="SMS"
            enabled={channels.sms.enabled}
            onToggle={(enabled) =>
              setChannels({ ...channels, sms: { ...channels.sms, enabled } })
            }
          >
            <Field
              label="Sender name"
              value={channels.sms.sender}
              onChange={(value) =>
                setChannels({
                  ...channels,
                  sms: { ...channels.sms, sender: value },
                })
              }
            />
          </ChannelRow>
          <ChannelRow
            title="WhatsApp"
            enabled={channels.whatsapp.enabled}
            onToggle={(enabled) =>
              setChannels({
                ...channels,
                whatsapp: { ...channels.whatsapp, enabled },
              })
            }
          >
            <Field
              label="Business number"
              value={channels.whatsapp.sender}
              onChange={(value) =>
                setChannels({
                  ...channels,
                  whatsapp: { ...channels.whatsapp, sender: value },
                })
              }
            />
          </ChannelRow>
        </div>
        <Button
          size="sm"
          onClick={() =>
            persist(
              "notifications.channels",
              channels,
              "Channel settings saved.",
            )
          }
        >
          <SaveIcon />
          Save channels
        </Button>
      </DetailCard>

      <DetailCard title="Request sources">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Accept requests from patients and guardians</span>
          <Switch
            checked={allowPatients}
            onCheckedChange={(checked) => {
              setAllowPatients(checked);
              void persist(
                "booking.allowPatientRequests",
                checked,
                "Patient requests updated.",
              );
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Accept referrals from verified doctors</span>
          <Switch
            checked={allowPhysicians}
            onCheckedChange={(checked) => {
              setAllowPhysicians(checked);
              void persist(
                "booking.allowPhysicianRequests",
                checked,
                "Physician referrals updated.",
              );
            }}
          />
        </label>
      </DetailCard>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ChannelRow({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <label className="flex items-center justify-between gap-4 text-sm font-medium">
        <span>{title}</span>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </label>
      {enabled ? (
        <div className="grid gap-2 sm:grid-cols-2">{children}</div>
      ) : null}
    </div>
  );
}
