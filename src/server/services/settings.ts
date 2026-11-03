import { allRows, getRow, run, type Db } from "../db.ts";
import { bad } from "../errors.ts";
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  WEEKDAYS,
  clockToMinutes,
  isClockTime,
  type SettingKey,
  type SettingsShape,
  type SettingsSnapshot,
  type Weekday,
  type WorkingHours,
} from "@/shared/settings.ts";
import type { Ctx } from "../context.ts";
import { requireRole } from "../context.ts";

type SettingRow = { key: string; value: string; updated_at: string };

function readValue<K extends SettingKey>(db: Db, key: K): SettingsShape[K] {
  const row = getRow<SettingRow>(
    db,
    "SELECT * FROM settings WHERE key = ?",
    key,
  );
  if (!row) return DEFAULT_SETTINGS[key];
  try {
    const parsed = JSON.parse(row.value) as SettingsShape[K];
    if (
      Array.isArray(parsed) ||
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return parsed;
    }
    // Merge so a newly added field keeps its default until an admin saves again.
    return {
      ...(DEFAULT_SETTINGS[key] as object),
      ...(parsed as object),
    } as SettingsShape[K];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export function getSetting<K extends SettingKey>(
  db: Db,
  key: K,
): SettingsShape[K] {
  return readValue(db, key);
}

/** Every setting, for the admin settings page. */
export function allSettings(ctx: Ctx): SettingsSnapshot {
  requireRole(ctx, ["admin"]);
  const result: SettingsSnapshot = {
    contact: readValue(ctx.db, "site.contact"),
    workingHours: readValue(ctx.db, "schedule.workingHours"),
    slotStepMinutes: readValue(ctx.db, "schedule.slotStepMinutes"),
    channels: readValue(ctx.db, "notifications.channels"),
    allowPatientRequests: readValue(ctx.db, "booking.allowPatientRequests"),
    allowPhysicianRequests: readValue(ctx.db, "booking.allowPhysicianRequests"),
  };
  return result;
}

export function saveSetting(
  ctx: Ctx,
  args: { key: SettingKey; value: unknown },
): null {
  requireRole(ctx, ["admin"]);
  if (!(SETTING_KEYS as readonly string[]).includes(args.key))
    bad("Unknown setting.");
  const validated = validateSetting(args.key, args.value);
  run(
    ctx.db,
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args.key,
    JSON.stringify(validated),
    new Date().toISOString(),
  );
  return null;
}

function validateSetting(key: SettingKey, value: unknown): unknown {
  if (key === "site.contact") {
    const input = (value ?? {}) as Record<string, unknown>;
    const field = (name: string) =>
      String(input[name] ?? "")
        .trim()
        .slice(0, 300);
    return {
      phone: field("phone"),
      email: field("email"),
      address: field("address"),
      hours: field("hours"),
      emergencyPhone: field("emergencyPhone"),
    };
  }
  if (key === "schedule.workingHours") {
    const input = (value ?? {}) as Record<string, unknown>;
    const hours: WorkingHours = {};
    for (const day of WEEKDAYS) {
      const entry = input[day] as { open?: string; close?: string } | undefined;
      if (!entry) continue;
      const open = String(entry.open ?? "");
      const close = String(entry.close ?? "");
      if (!isClockTime(open) || !isClockTime(close))
        bad("Opening hours must use HH:MM.");
      if (clockToMinutes(open) >= clockToMinutes(close)) {
        bad("Each closing time must be after its opening time.");
      }
      hours[day as Weekday] = { open, close };
    }
    return hours;
  }
  if (key === "schedule.slotStepMinutes") {
    const minutes = Math.round(Number(value));
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 120) {
      bad("Slot step must be between 5 and 120 minutes.");
    }
    return minutes;
  }
  if (key === "notifications.channels") {
    const input = (value ?? {}) as Record<
      string,
      Record<string, unknown> | undefined
    >;
    const channel = (name: string) => {
      const entry = input[name] ?? {};
      return {
        enabled: entry.enabled === true || entry.enabled === "true",
        ...("from" in entry ? { from: String(entry.from ?? "").trim() } : {}),
        ...("replyTo" in entry
          ? { replyTo: String(entry.replyTo ?? "").trim() }
          : {}),
        ...("sender" in entry
          ? { sender: String(entry.sender ?? "").trim() }
          : {}),
      };
    };
    return {
      email: channel("email") as {
        enabled: boolean;
        from: string;
        replyTo: string;
      },
      sms: channel("sms") as { enabled: boolean; sender: string },
      whatsapp: channel("whatsapp") as { enabled: boolean; sender: string },
    };
  }
  if (
    key === "booking.allowPatientRequests" ||
    key === "booking.allowPhysicianRequests"
  ) {
    return value === true || value === "true";
  }
  return value;
}

/** Public contact block: the configured values, with the built-in placeholders
 * kept for anything an administrator has not filled in yet. */
export function publicContacts(db: Db): SettingsShape["site.contact"] {
  const configured = readValue(db, "site.contact");
  return configured;
}

export function allRowsForSettings(ctx: Ctx): SettingRow[] {
  requireRole(ctx, ["admin"]);
  return allRows<SettingRow>(ctx.db, "SELECT * FROM settings ORDER BY key");
}
