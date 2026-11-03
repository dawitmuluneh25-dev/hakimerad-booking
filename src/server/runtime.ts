import { getRequest } from "@tanstack/react-start/server";
import {
  identityFromSessionToken,
  readCookie,
  SESSION_COOKIE,
  toSessionUser,
} from "./auth.ts";
import type { Ctx } from "./context.ts";
import { getDb } from "./db.ts";
import * as adminService from "./services/admin.ts";
import * as careService from "./services/care.ts";
import * as notificationService from "./services/notifications.ts";
import * as referralService from "./services/referrals.ts";
import * as reportService from "./services/reports.ts";
import * as reviewService from "./services/reviews.ts";
import * as schedulingService from "./services/scheduling.ts";
import * as settingsService from "./services/settings.ts";
import * as urgentService from "./services/urgent.ts";
import * as userService from "./services/users.ts";

/**
 * Server-only runtime. Server functions import this module lazily inside their
 * handlers so the database and Node built-ins never enter the client bundle.
 */
export const services = {
  admin: adminService,
  care: careService,
  notifications: notificationService,
  referrals: referralService,
  reports: reportService,
  reviews: reviewService,
  scheduling: schedulingService,
  settings: settingsService,
  urgent: urgentService,
  users: userService,
};

/** Request-scoped context: one database connection, the session identity. */
export function currentCtx(): Ctx {
  const request = getRequest();
  const identity = identityFromSessionToken(
    readCookie(request.headers.get("cookie"), SESSION_COOKIE),
  );
  return { db: getDb(), identity };
}

export function runWithCtx<T>(fn: (ctx: Ctx) => T): T {
  return fn(currentCtx());
}

export { toSessionUser };
