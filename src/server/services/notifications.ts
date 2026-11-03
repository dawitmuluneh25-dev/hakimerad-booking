import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  getCurrentUserDoc,
  logAudit,
  requireRole,
  requireUser,
  type Ctx,
} from "../context.ts";
import { allRows, dataDir, getRow, newId, run } from "../db.ts";
import { AppError } from "../errors.ts";
import type { NotificationItem, Page, PaginationOpts } from "../types.ts";
import { getSetting } from "./settings.ts";

export const NOTIFICATION_KINDS = [
  "referral_submitted",
  "referral_received",
  "info_requested",
  "info_provided",
  "referral_approved",
  "referral_deferred",
  "referral_declined",
  "appointment_scheduled",
  "appointment_rescheduled",
  "appointment_cancelled",
  "preparation_issued",
  "appointment_reminder",
  "procedure_completed",
  "follow_up",
  "urgent_case",
  "urgent_acknowledged",
  "urgent_decision",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  notification_id: string;
  channel: string;
  status: string;
  attempts: number;
  detail: string | null;
  updated_at: string;
};

/**
 * Delivery adapters. Nothing here reaches a third party: the email adapter
 * writes an `.eml` file into the local outbox, and the SMS/WhatsApp adapters
 * only record the attempt. Enabling a real provider means replacing one
 * adapter, not changing the workflow.
 */
function deliver(
  ctx: Ctx,
  notification: NotificationRow,
  channel: "in_app" | "email" | "sms" | "whatsapp",
  recipient: string,
): { status: string; detail: string } {
  if (channel === "in_app")
    return { status: "sent", detail: "Shown in the app" };

  const settings = getSetting(ctx.db, "notifications.channels");
  if (channel === "email") {
    if (!settings.email.enabled)
      return { status: "skipped", detail: "Email channel disabled" };
    try {
      const dir = resolve(dataDir(), "outbox");
      mkdirSync(dir, { recursive: true });
      const file = resolve(dir, `${notification.id}.eml`);
      const body = [
        `To: ${recipient}`,
        `From: ${settings.email.from || "no-reply@localhost"}`,
        `Subject: ${notification.title}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        notification.body,
        "",
        "Sent by the local HakimeRAD IR Booking outbox adapter.",
      ].join("\n");
      appendFileSync(file, body, "utf8");
      return {
        status: "logged",
        detail: `Written to the local outbox (${file})`,
      };
    } catch (error) {
      return {
        status: "failed",
        detail: error instanceof Error ? error.message : "Write failed",
      };
    }
  }

  const channelSettings = channel === "sms" ? settings.sms : settings.whatsapp;
  if (!channelSettings.enabled)
    return { status: "skipped", detail: `${channel} channel disabled` };
  return {
    status: "logged",
    detail: `No ${channel} provider configured; the message was logged locally only`,
  };
}

export type NotifyInput = {
  kind: NotificationKind;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  link?: string;
};

/**
 * Creates one in-app notification per recipient, plus a delivery row for each
 * configured channel. A messaging failure never throws: the workflow continues
 * and the failure is recorded against the delivery.
 */
export function notifyUsers(
  ctx: Ctx,
  userIds: string[],
  input: NotifyInput,
): string[] {
  const unique = [...new Set(userIds.filter(Boolean))];
  const created: string[] = [];
  for (const userId of unique) {
    const user = getRow<{
      id: string;
      email: string | null;
      phone: string | null;
    }>(ctx.db, "SELECT id, email, phone FROM users WHERE id = ?", userId);
    if (!user) continue;
    const notificationId = newId();
    const now = new Date().toISOString();
    run(
      ctx.db,
      `INSERT INTO notifications (id, user_id, kind, title, body, entity_type, entity_id, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      notificationId,
      userId,
      input.kind,
      input.title,
      input.body,
      input.entityType ?? null,
      input.entityId ?? null,
      input.link ?? null,
      now,
    );
    const row: NotificationRow = {
      id: notificationId,
      user_id: userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      link: input.link ?? null,
      read_at: null,
      created_at: now,
    };
    const channels: Array<["in_app" | "email" | "sms" | "whatsapp", string]> = [
      ["in_app", ""],
      ["email", user.email ?? ""],
      ["sms", user.phone ?? ""],
      ["whatsapp", user.phone ?? ""],
    ];
    for (const [channel, recipient] of channels) {
      const result = deliver(ctx, row, channel, recipient);
      run(
        ctx.db,
        `INSERT INTO notification_deliveries (id, notification_id, channel, status, attempts, detail, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        newId(),
        notificationId,
        channel,
        result.status,
        result.detail,
        now,
      );
    }
    created.push(notificationId);
  }
  return created;
}

/** Ids of every user holding one of the given roles. */
export function userIdsWithRoles(ctx: Ctx, roles: readonly string[]): string[] {
  if (roles.length === 0) return [];
  const placeholders = roles.map(() => "?").join(", ");
  return allRows<{ id: string }>(
    ctx.db,
    `SELECT id FROM users WHERE role IN (${placeholders})`,
    ...roles,
  ).map((row) => row.id);
}

/** Radiologists and coordinators are alerted for urgent coordination cases. */
export function urgentAlertRecipients(ctx: Ctx): string[] {
  return userIdsWithRoles(ctx, ["radiologist", "coordinator", "admin"]);
}

function toItem(
  row: NotificationRow,
  deliveries: DeliveryRow[],
): NotificationItem {
  return {
    _id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
    deliveries: deliveries.map((entry) => ({
      _id: entry.id,
      channel: entry.channel,
      status: entry.status,
      attempts: entry.attempts,
      detail: entry.detail,
    })),
  };
}

/** The signed-in user's notifications, newest first. Empty for anonymous callers. */
export function listMine(
  ctx: Ctx,
  opts: PaginationOpts & { unreadOnly?: boolean },
): Page<NotificationItem> {
  const user = getCurrentUserDoc(ctx);
  if (!user) return { page: [], isDone: true, continueCursor: "" };
  const offset = Number(opts.cursor ?? 0) || 0;
  const limit = Math.max(1, Math.min(opts.numItems, 100));
  const rows = allRows<NotificationRow>(
    ctx.db,
    `SELECT * FROM notifications
      WHERE user_id = ?${opts.unreadOnly ? " AND read_at IS NULL" : ""}
      ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    user.id,
    limit + 1,
    offset,
  );
  const isDone = rows.length <= limit;
  const items = (isDone ? rows : rows.slice(0, limit)).map((row) =>
    toItem(
      row,
      allRows<DeliveryRow>(
        ctx.db,
        "SELECT * FROM notification_deliveries WHERE notification_id = ? ORDER BY channel",
        row.id,
      ),
    ),
  );
  return {
    page: items,
    isDone,
    continueCursor: isDone ? "" : String(offset + limit),
  };
}

export function unreadCount(ctx: Ctx): number {
  const user = getCurrentUserDoc(ctx);
  if (!user) return 0;
  const row = getRow<{ count: number }>(
    ctx.db,
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL",
    user.id,
  );
  return row?.count ?? 0;
}

export function markRead(ctx: Ctx, args: { notificationId: string }): null {
  const user = requireUser(ctx);
  run(
    ctx.db,
    "UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL",
    new Date().toISOString(),
    args.notificationId,
    user.id,
  );
  return null;
}

export function markAllRead(ctx: Ctx): null {
  const user = requireUser(ctx);
  run(
    ctx.db,
    "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL",
    new Date().toISOString(),
    user.id,
  );
  return null;
}

/** Staff can retry a failed or skipped delivery; the attempt is logged. */
export function resend(ctx: Ctx, args: { deliveryId: string }): null {
  const staff = requireRole(ctx, [
    "receptionist",
    "radiologist",
    "coordinator",
    "admin",
  ]);
  const delivery = getRow<DeliveryRow>(
    ctx.db,
    "SELECT * FROM notification_deliveries WHERE id = ?",
    args.deliveryId,
  );
  if (!delivery) throw new AppError("NOT_FOUND", "Delivery not found.");
  const notification = getRow<NotificationRow>(
    ctx.db,
    "SELECT * FROM notifications WHERE id = ?",
    delivery.notification_id,
  );
  if (!notification) throw new AppError("NOT_FOUND", "Notification not found.");
  const user = getRow<{ email: string | null; phone: string | null }>(
    ctx.db,
    "SELECT email, phone FROM users WHERE id = ?",
    notification.user_id,
  );
  const recipient =
    delivery.channel === "email" ? (user?.email ?? "") : (user?.phone ?? "");
  const channel = delivery.channel as "in_app" | "email" | "sms" | "whatsapp";
  const result = deliver(ctx, notification, channel, recipient);
  run(
    ctx.db,
    "UPDATE notification_deliveries SET status = ?, attempts = attempts + 1, detail = ?, updated_at = ? WHERE id = ?",
    result.status,
    result.detail,
    new Date().toISOString(),
    delivery.id,
  );
  logAudit(ctx, {
    actorId: staff.id,
    action: "notification.resent",
    entityType: "notification",
    entityId: notification.id,
    summary: `Resent ${channel} notification "${notification.title}": ${result.status}`,
  });
  return null;
}

/** Staff view of what was sent about one record. */
export function deliveriesForEntity(
  ctx: Ctx,
  args: { entityType: string; entityId: string },
): NotificationItem[] {
  const user = getCurrentUserDoc(ctx);
  if (
    !user ||
    !["receptionist", "radiologist", "coordinator", "admin"].includes(
      user.role ?? "",
    )
  ) {
    return [];
  }
  const rows = allRows<NotificationRow>(
    ctx.db,
    "SELECT * FROM notifications WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 50",
    args.entityType,
    args.entityId,
  );
  return rows.map((row) =>
    toItem(
      row,
      allRows<DeliveryRow>(
        ctx.db,
        "SELECT * FROM notification_deliveries WHERE notification_id = ? ORDER BY channel",
        row.id,
      ),
    ),
  );
}
