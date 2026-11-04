import { ROLES, type Role } from "@/shared/roles.ts";
import {
  clearSessionCookie,
  safeReturnTo,
  serializeSession,
  sessionCookie,
} from "./auth.ts";
import { getDb, getRow, newId, run } from "./db.ts";

/**
 * Local test sign-in.
 *
 * This exists so the staff screens can be exercised without an identity
 * provider. It is disabled unless AUTH_DEV_LOGIN=1 *and* the process is not a
 * production build; otherwise it behaves as if the route does not exist.
 */
const DEV_ISSUER = "urn:hakimerad:dev";
const SUBJECT = /^[a-z0-9][a-z0-9_-]{0,39}$/;

function disabled(): Response {
  return new Response("Not found", { status: 404 });
}

function badRequest(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function devLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1"
  );
}

export async function devLoginResponse(request: Request): Promise<Response> {
  if (!devLoginEnabled()) return disabled();

  const url = new URL(request.url);
  const subject = (url.searchParams.get("subject") ?? "dev-admin")
    .trim()
    .toLowerCase();
  if (!SUBJECT.test(subject)) {
    return badRequest("subject must be 1-40 characters of a-z, 0-9, - or _");
  }

  const role = (url.searchParams.get("role") ?? "admin").trim() as Role;
  if (!ROLES.includes(role)) {
    return badRequest(`role must be one of: ${ROLES.join(", ")}`);
  }

  const name =
    (url.searchParams.get("name") ?? `Dev ${role}`).trim().slice(0, 80) ||
    `Dev ${role}`;
  const email = `${subject}@dev.local`;
  const tokenIdentifier = `${DEV_ISSUER}|${subject}`;

  const db = getDb();
  const now = new Date().toISOString();
  const existing = getRow<{ id: string }>(
    db,
    "SELECT id FROM users WHERE token_identifier = ?",
    tokenIdentifier,
  );

  if (existing) {
    run(
      db,
      "UPDATE users SET role = ?, full_name = ?, email = ?, onboarded_at = COALESCE(onboarded_at, ?) WHERE id = ?",
      role,
      name,
      email,
      now,
      existing.id,
    );
  } else {
    run(
      db,
      `INSERT INTO users (id, token_identifier, name, email, role, full_name, phone, onboarded_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      tokenIdentifier,
      name,
      email,
      role,
      name,
      "",
      now,
      now,
    );
  }

  const secure = url.protocol === "https:";
  const token = serializeSession({
    tokenIdentifier,
    subject,
    issuer: DEV_ISSUER,
    email,
    name,
    expiresAt: Date.now() + 60 * 60 * 8 * 1000,
  });

  return new Response(null, {
    status: 302,
    headers: {
      location: safeReturnTo(url.searchParams.get("returnTo") ?? "/dashboard"),
      "set-cookie": sessionCookie(token, secure),
    },
  });
}

export function devLogoutResponse(request: Request): Response {
  if (!devLoginEnabled()) return disabled();
  return new Response(null, {
    status: 302,
    headers: {
      location: "/",
      "set-cookie": clearSessionCookie(false),
    },
  });
}
