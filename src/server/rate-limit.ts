/**
 * In-process, fixed-window rate limiting for the endpoints that create work or
 * accept credentials.
 *
 * Scope: one Node process serves the app, because SQLite allows a single
 * writer. An in-memory counter is therefore exact for this deployment and needs
 * no Redis and no extra service. A restart clears the counters, which can only
 * ever relax a limit, never lock anyone out permanently.
 *
 * The client address comes from the reverse proxy, never from the request body.
 * The app must listen on loopback only (see docs/DEPLOYMENT.md) so those headers
 * cannot be set by an untrusted caller.
 */

export type RateLimitName =
  | "auth.sign-in"
  | "auth.callback"
  | "referral.submit"
  | "upload";

export type RateLimitPolicy = { limit: number; windowMs: number };

/**
 * Limits are per subject (a user, or an address before sign-in). They are sized
 * from the real workload: ten documents per request, six requests per hour.
 */
export const RATE_LIMITS: Record<RateLimitName, RateLimitPolicy> = {
  // Sign-in and callback are keyed by address, and a hospital is one address
  // behind NAT: a whole department arriving on the first morning must not lock
  // itself out. There are no credentials to guess here — the provider does that
  // throttling — so the limit is set to stop sustained abuse, not a busy hour.
  "auth.sign-in": { limit: 60, windowMs: 10 * 60_000 },
  "auth.callback": { limit: 90, windowMs: 10 * 60_000 },
  // These write rows, files and notifications, and are keyed by account.
  "referral.submit": { limit: 6, windowMs: 60 * 60_000 },
  upload: { limit: 80, windowMs: 60 * 60_000 },
};

type Entry = { count: number; resetAt: number };

const windows = new Map<string, Entry>();

/** Hard ceiling on tracked subjects, so a rotating-key attack cannot exhaust memory. */
const MAX_KEYS = 10_000;

export type Verdict =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfterSeconds: number; resetAt: number };

function prune(now: number): void {
  if (windows.size <= MAX_KEYS) return;
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key);
  }
  // Still too many: drop the oldest subjects. This only relaxes limits.
  for (const key of windows.keys()) {
    if (windows.size <= MAX_KEYS) break;
    windows.delete(key);
  }
}

/**
 * Counts one attempt and returns whether it is allowed.
 *
 * `now` is injectable so the window can be tested without waiting.
 */
export function consume(
  name: RateLimitName,
  subject: string,
  now: number = Date.now(),
): Verdict {
  const policy = RATE_LIMITS[name];
  const key = `${name}\u0000${subject}`;
  prune(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + policy.windowMs;
    windows.set(key, { count: 1, resetAt });
    return { ok: true, remaining: policy.limit - 1, resetAt };
  }

  if (existing.count >= policy.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return { ok: true, remaining: policy.limit - existing.count, resetAt: existing.resetAt };
}

/** How many attempts fell inside the current window. Read-only, for tests and diagnostics. */
export function countFor(
  name: RateLimitName,
  subject: string,
  now: number = Date.now(),
): number {
  const entry = windows.get(`${name}\u0000${subject}`);
  return entry && entry.resetAt > now ? entry.count : 0;
}

/** Clears every window. Used by tests; never called by application code. */
export function resetRateLimits(): void {
  windows.clear();
}

/**
 * Subject for an unauthenticated request: the client address as recorded by the
 * proxy. `x-real-ip` is set by nginx; otherwise the last `x-forwarded-for` entry
 * is used, because a proxy appends rather than replaces and earlier entries are
 * client-controlled.
 */
export function clientAddress(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts.at(-1);
    if (last) return last;
  }
  return "unknown";
}

export function limitMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

/** A 429 for HTTP route handlers, with the headers a proxy and a client can act on. */
export function tooManyRequests(verdict: Verdict): Response {
  const retryAfter = verdict.ok ? 0 : verdict.retryAfterSeconds;
  return Response.json(
    { message: limitMessage(retryAfter) },
    {
      status: 429,
      headers: {
        "retry-after": String(Math.max(1, retryAfter)),
        "cache-control": "no-store",
      },
    },
  );
}

/**
 * Applies a policy to an HTTP request. Returns a 429 to send back, or null when
 * the request may continue.
 */
export function enforce(
  name: RateLimitName,
  request: Request,
  subject: string = clientAddress(request),
): Response | null {
  const verdict = consume(name, subject);
  return verdict.ok ? null : tooManyRequests(verdict);
}
