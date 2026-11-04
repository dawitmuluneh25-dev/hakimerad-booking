// Configurable business settings. Values live in the `settings` table and are
// edited by an administrator; this module only declares the keys, defaults and
// the shape the server validates against.

export type WorkingDay = { open: string; close: string };

/** Monday-first week. A missing day means the clinic is closed that day. */
export type WorkingHours = {
  mon?: WorkingDay;
  tue?: WorkingDay;
  wed?: WorkingDay;
  thu?: WorkingDay;
  fri?: WorkingDay;
  sat?: WorkingDay;
  sun?: WorkingDay;
};

export type SiteContactSettings = {
  phone: string;
  email: string;
  address: string;
  hours: string;
  emergencyPhone: string;
};

export type NotificationSettings = {
  /** In-app notifications are always on; these are the external channels. */
  email: { enabled: boolean; from: string; replyTo: string };
  sms: { enabled: boolean; sender: string };
  whatsapp: { enabled: boolean; sender: string };
};

export type SettingsShape = {
  "site.contact": SiteContactSettings;
  "schedule.workingHours": WorkingHours;
  "schedule.slotStepMinutes": number;
  "notifications.channels": NotificationSettings;
  "booking.allowPatientRequests": boolean;
  "booking.allowPhysicianRequests": boolean;
};

/** Serializable snapshot handed to the admin settings page. */
export type SettingsSnapshot = {
  contact: SiteContactSettings;
  workingHours: WorkingHours;
  slotStepMinutes: number;
  channels: NotificationSettings;
  allowPatientRequests: boolean;
  allowPhysicianRequests: boolean;
};

export const SETTING_KEYS = [
  "site.contact",
  "schedule.workingHours",
  "schedule.slotStepMinutes",
  "notifications.channels",
  "booking.allowPatientRequests",
  "booking.allowPhysicianRequests",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const SETTING_LABELS: Record<SettingKey, string> = {
  "site.contact": "Public contact details",
  "schedule.workingHours": "Opening hours",
  "schedule.slotStepMinutes": "Slot step (minutes)",
  "notifications.channels": "Notification channels",
  "booking.allowPatientRequests": "Accept patient requests",
  "booking.allowPhysicianRequests": "Accept referring doctor requests",
};

/** Days are stored with these keys so ordering is stable in the UI. */
export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DEFAULT_SETTINGS: SettingsShape = {
  // Contact details the clinic asked for; an administrator can replace them
  // in Admin -> Settings.
  "site.contact": {
    phone: "+251 906 373154",
    email: "book@hakimerad.com",
    address: "6HX48489+6C, Harar, Ethiopia",
    hours: "24/7 platform access, with after-hours and emergency cover.",
    emergencyPhone: "+251 906 373154",
  },
  "schedule.workingHours": {
    mon: { open: "08:00", close: "17:00" },
    tue: { open: "08:00", close: "17:00" },
    wed: { open: "08:00", close: "17:00" },
    thu: { open: "08:00", close: "17:00" },
    fri: { open: "08:00", close: "17:00" },
  },
  "schedule.slotStepMinutes": 15,
  "notifications.channels": {
    email: { enabled: false, from: "", replyTo: "" },
    sms: { enabled: false, sender: "" },
    whatsapp: { enabled: false, sender: "" },
  },
  "booking.allowPatientRequests": true,
  "booking.allowPhysicianRequests": true,
};

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isClockTime(value: string): boolean {
  return CLOCK.test(value);
}

/** "HH:MM" → minutes since midnight. */
export function clockToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToClock(total: number): string {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
