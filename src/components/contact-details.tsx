import {
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  type LucideIcon,
} from "lucide-react";
import { site } from "@/lib/site.ts";

const { contact } = site;

type ContactItem = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
};

const ITEMS: ContactItem[] = [
  {
    icon: PhoneIcon,
    label: "Telephone",
    value: contact.phone,
    href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
  },
  {
    icon: MailIcon,
    label: "Email",
    value: contact.email,
    href: `mailto:${contact.email}`,
  },
  {
    icon: GlobeIcon,
    label: "Website",
    value: contact.website.replace(/^https?:\/\//, ""),
    href: contact.website,
  },
  {
    icon: MessageCircleIcon,
    label: "WhatsApp",
    value: contact.phone,
    href: contact.whatsapp,
  },
  {
    icon: MapPinIcon,
    label: "Where we work",
    value: contact.address,
    href: contact.maps,
  },
  { icon: ClockIcon, label: "Availability", value: contact.hours },
];

export default function ContactDetails() {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex gap-3 rounded-xl border bg-card p-5">
          <item.icon className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <dt className="text-sm font-medium">{item.label}</dt>
            <dd className="break-words text-sm text-muted-foreground">
              {item.href ? (
                <a
                  href={item.href}
                  className="hover:text-foreground hover:underline"
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                >
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
