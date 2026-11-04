import { afterEach, describe, expect, it } from "vitest";
import {
  clientAddress,
  consume,
  countFor,
  enforce,
  limitMessage,
  RATE_LIMITS,
  resetRateLimits,
  tooManyRequests,
} from "./rate-limit.ts";

afterEach(() => resetRateLimits());

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);

describe("consume", () => {
  it("allows exactly the configured number of attempts", () => {
    const limit = RATE_LIMITS["referral.submit"].limit;
    for (let i = 0; i < limit; i += 1) {
      expect(consume("referral.submit", "user-1", T0).ok).toBe(true);
    }
    const blocked = consume("referral.submit", "user-1", T0);
    expect(blocked.ok).toBe(false);
    expect(countFor("referral.submit", "user-1", T0)).toBe(limit);
  });

  it("returns a whole-number retry delay for a blocked caller", () => {
    const { limit, windowMs } = RATE_LIMITS["auth.sign-in"];
    for (let i = 0; i < limit; i += 1) consume("auth.sign-in", "203.0.113.9", T0);
    const blocked = consume("auth.sign-in", "203.0.113.9", T0 + 1000);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(Number.isInteger(blocked.retryAfterSeconds)).toBe(true);
    expect(blocked.retryAfterSeconds).toBe(Math.ceil((windowMs - 1000) / 1000));
  });

  it("starts a fresh window once the previous one expires", () => {
    const { limit, windowMs } = RATE_LIMITS["upload"];
    for (let i = 0; i < limit; i += 1) consume("upload", "user-2", T0);
    expect(consume("upload", "user-2", T0).ok).toBe(false);

    const later = T0 + windowMs;
    expect(consume("upload", "user-2", later).ok).toBe(true);
    expect(countFor("upload", "user-2", later)).toBe(1);
  });

  it("keeps subjects and policies in separate windows", () => {
    const limit = RATE_LIMITS["referral.submit"].limit;
    for (let i = 0; i < limit; i += 1) consume("referral.submit", "user-3", T0);
    expect(consume("referral.submit", "user-3", T0).ok).toBe(false);
    expect(consume("referral.submit", "user-4", T0).ok).toBe(true);
    expect(consume("upload", "user-3", T0).ok).toBe(true);
  });

  it("reports the remaining allowance", () => {
    const first = consume("auth.callback", "user-5", T0);
    expect(first.ok && first.remaining).toBe(RATE_LIMITS["auth.callback"].limit - 1);
  });
});

describe("clientAddress", () => {
  it("prefers x-real-ip", () => {
    const request = new Request("http://localhost/auth/sign-in", {
      headers: { "x-real-ip": "198.51.100.7", "x-forwarded-for": "10.0.0.1" },
    });
    expect(clientAddress(request)).toBe("198.51.100.7");
  });

  it("takes the last forwarded hop, which is the one the proxy wrote", () => {
    const request = new Request("http://localhost/auth/sign-in", {
      headers: { "x-forwarded-for": "1.2.3.4, 198.51.100.7" },
    });
    expect(clientAddress(request)).toBe("198.51.100.7");
  });

  it("falls back to a constant when no proxy header is present", () => {
    expect(clientAddress(new Request("http://localhost/auth/sign-in"))).toBe("unknown");
  });
});

describe("responses", () => {
  it("returns null while under the limit and a 429 once over it", () => {
    const request = new Request("http://localhost/auth/sign-in", {
      headers: { "x-real-ip": "198.51.100.20" },
    });
    const limit = RATE_LIMITS["auth.sign-in"].limit;
    for (let i = 0; i < limit; i += 1) expect(enforce("auth.sign-in", request)).toBeNull();

    const response = enforce("auth.sign-in", request);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });

  it("carries a readable message", async () => {
    const response = tooManyRequests({
      ok: false,
      retryAfterSeconds: 120,
      resetAt: T0,
    });
    expect(await response.json()).toEqual({
      message: "Too many attempts. Please try again in about 2 minutes.",
    });
    expect(limitMessage(30)).toContain("1 minute");
    expect(limitMessage(30)).not.toContain("minutes");
  });
});
