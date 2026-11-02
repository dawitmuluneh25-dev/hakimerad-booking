import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { site } from "@/lib/site.ts";

const ITEMS = [
  { icon: PhoneIcon, label: "Bookings phone", value: site.contact.phone },
  { icon: MailIcon, label: "Email", value: site.contact.email },
  { icon: MapPinIcon, label: "Address", value: site.contact.address },
  { icon: ClockIcon, label: "Opening hours", value: site.contact.hours },
];

export default function ContactDetails() {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex gap-3 rounded-xl border bg-card p-5">
          <item.icon className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-sm font-medium">{item.label}</dt>
            <dd className="break-words text-sm text-muted-foreground">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
