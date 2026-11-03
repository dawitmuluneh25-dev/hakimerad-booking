import { useState } from "react";
import { toast } from "sonner";
import { CalendarClockIcon, CheckIcon, XIcon } from "lucide-react";
import { api, useMutation, useQuery } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { errorMessage } from "@/lib/errors.ts";
import {
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/shared/workflow.ts";
import { DetailCard, formatWhen } from "./record-cards.tsx";
import type { AppointmentSummary, Resource } from "@/server/types.ts";

const OPERATIONAL_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "checked_in",
  "in_progress",
  "completed",
  "no_show",
];

/** Booking, moving, cancelling and checking in — every change is audited server-side. */
export default function SchedulePanel({
  referralId,
  procedure,
  status,
  appointment,
  resources,
  canBook,
}: {
  referralId: string;
  procedure: string;
  status: string;
  appointment: AppointmentSummary | null;
  resources: Resource[];
  canBook: boolean;
}) {
  const book = useMutation(api.scheduling.book);
  const reschedule = useMutation(api.scheduling.reschedule);
  const cancel = useMutation(api.scheduling.cancel);
  const setStatus = useMutation(api.scheduling.setStatus);

  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [roomId, setRoomId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [radiologistId, setRadiologistId] = useState("");
  const [moving, setMoving] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const availability = useQuery(
    api.scheduling.availability,
    date
      ? {
          date,
          procedure,
          roomId: roomId || undefined,
          equipmentId: equipmentId || undefined,
          radiologistId: radiologistId || undefined,
        }
      : "skip",
  );

  const rooms = resources.filter((r) => r.kind === "room" && r.active);
  const equipment = resources.filter((r) => r.kind === "equipment" && r.active);
  const staff = resources.filter((r) => r.kind === "staff" && r.active);

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      setSlot("");
      setMoving(false);
      setCancelling(false);
      setReason("");
    } catch (error) {
      toast.error(errorMessage(error, "That change could not be saved."));
    }
  };

  const slotPicker = (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="booking-date">Date</Label>
          <Input
            id="booking-date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSlot("");
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-room">Room</Label>
          <NativeSelect
            id="booking-room"
            className="w-full"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
          >
            <NativeSelectOption value="">Any room</NativeSelectOption>
            {rooms.map((resource) => (
              <NativeSelectOption key={resource._id} value={resource._id}>
                {resource.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-equipment">Equipment</Label>
          <NativeSelect
            id="booking-equipment"
            className="w-full"
            value={equipmentId}
            onChange={(event) => setEquipmentId(event.target.value)}
          >
            <NativeSelectOption value="">Any equipment</NativeSelectOption>
            {equipment.map((resource) => (
              <NativeSelectOption key={resource._id} value={resource._id}>
                {resource.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor="booking-radiologist">Radiologist</Label>
          <NativeSelect
            id="booking-radiologist"
            className="w-full"
            value={radiologistId}
            onChange={(event) => setRadiologistId(event.target.value)}
          >
            <NativeSelectOption value="">Not assigned</NativeSelectOption>
            {staff.map((resource) => (
              <NativeSelectOption key={resource._id} value={resource._id}>
                {resource.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {!date ? (
        <p className="text-sm text-muted-foreground">
          Pick a date to see free slots.
        </p>
      ) : availability === undefined ? (
        <Skeleton className="h-10 w-full" />
      ) : availability.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          The clinic is closed on that day, or no duration is configured for
          this procedure.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availability.map((option) => (
            <Button
              key={option.startsAt}
              size="sm"
              variant={slot === option.startsAt ? "default" : "secondary"}
              disabled={!option.available}
              onClick={() => setSlot(option.startsAt)}
              title={option.available ? undefined : "Already booked"}
            >
              {option.startsAt.slice(11)}
            </Button>
          ))}
        </div>
      )}

      <Button
        size="sm"
        disabled={!slot}
        onClick={() =>
          run(
            () =>
              appointment
                ? reschedule({
                    appointmentId: appointment._id,
                    startsAt: slot,
                    roomId: roomId || undefined,
                    equipmentId: equipmentId || undefined,
                    radiologistId: radiologistId || undefined,
                  })
                : book({
                    referralId,
                    startsAt: slot,
                    roomId: roomId || undefined,
                    equipmentId: equipmentId || undefined,
                    radiologistId: radiologistId || undefined,
                  }),
            appointment ? "Appointment moved." : "Appointment booked.",
          )
        }
      >
        <CalendarClockIcon />
        {appointment ? "Move to this slot" : "Book this slot"}
      </Button>
    </div>
  );

  return (
    <DetailCard
      title="Scheduling"
      action={
        appointment ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMoving((value) => !value)}
          >
            {moving ? "Close" : "Reschedule"}
          </Button>
        ) : null
      }
    >
      {appointment ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">
              {formatWhen(appointment.startsAt)}
            </span>
            <span className="text-muted-foreground">
              to {formatWhen(appointment.endsAt).slice(-5)}
            </span>
          </div>
          <Row label="Room" value={appointment.roomName ?? "Not assigned"} />
          <Row
            label="Equipment"
            value={appointment.equipmentName ?? "Not assigned"}
          />
          <Row
            label="Radiologist"
            value={appointment.radiologistName ?? "Not assigned"}
          />
          <Row
            label="Status"
            value={
              APPOINTMENT_STATUS_LABELS[appointment.status as AppointmentStatus]
            }
          />
          {appointment.cancelReason ? (
            <Row label="Cancellation" value={appointment.cancelReason} />
          ) : null}
          {moving ? slotPicker : null}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {OPERATIONAL_STATUSES.filter(
              (value) => value !== appointment.status,
            ).map((value) => (
              <Button
                key={value}
                size="sm"
                variant="secondary"
                onClick={() =>
                  run(
                    () =>
                      setStatus({
                        appointmentId: appointment._id,
                        status: value,
                      }),
                    `Marked ${APPOINTMENT_STATUS_LABELS[value].toLowerCase()}.`,
                  )
                }
              >
                <CheckIcon />
                {APPOINTMENT_STATUS_LABELS[value]}
              </Button>
            ))}
            {cancelling ? (
              <div className="flex w-full flex-wrap items-end gap-2">
                <div className="min-w-48 flex-1 space-y-1">
                  <Label htmlFor="cancel-reason">Cancellation reason</Label>
                  <Input
                    id="cancel-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Why is the appointment cancelled?"
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={reason.trim().length < 2}
                  onClick={() =>
                    run(
                      () => cancel({ appointmentId: appointment._id, reason }),
                      "Appointment cancelled.",
                    )
                  }
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCancelling(false)}
                >
                  Keep
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setCancelling(true)}
              >
                <XIcon />
                Cancel appointment
              </Button>
            )}
          </div>
        </div>
      ) : status === "approved" ? (
        canBook ? (
          slotPicker
        ) : (
          <p className="text-sm text-muted-foreground">
            A receptionist or coordinator books the slot once the request is
            approved.
          </p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Only a clinically approved request can be scheduled. This request is{" "}
          {status.replaceAll("_", " ")}.
        </p>
      )}
    </DetailCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </dl>
  );
}
