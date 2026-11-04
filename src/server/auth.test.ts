import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionCookie,
  identityFromSessionToken,
  originOf,
  parseSession,
  readCookie,
  redirectUri,
  safeReturnTo,
  serializeSession,
  sessionCookie,
  type SessionPayload,
} from "./auth.ts";

const SECRET = "test-cookie-secret-that-is-long-enough-0001";

function payload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    tokenIdentifier: "https://id.example.test|user-1",
    subject: "user-1",
    issuer: "https://id.example.test",
    email: "clinician@example.test",
    name: "Dr Test",
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("AUTH_COOKIE_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session cookie sealing", () => {
  it("round-trips a signed-in session", () => {
    const parsed = parseSession(serializeSession(payload()));
    expect(parsed?.tokenIdentifier).toBe("https://id.example.test|user-1");
    expect(parsed?.email).toBe("clinician@example.test");
  });

  it("rejects a tampered token", () => {
    const token = serializeSession(payload());
    const parts = token.split(".");
    // Flip the last character of the ciphertext.
    const last = parts[3];
    parts[3] = last.slice(0, -1) + (last.endsWith("A") ? "B" : "A");
    expect(parseSession(parts.join("."))).toBeNull();
  });

  it("rejects a token sealed with another secret", () => {
    const token = serializeSession(payload());
    vi.stubEnv(
      "AUTH_COOKIE_SECRET",
      "a-completely-different-secret-value-0002",
    );
    expect(parseSession(token)).toBeNull();
  });

  it("rejects an expired session even though the signature is valid", () => {
    const token = serializeSession(payload({ expiresAt: Date.now() - 1000 }));
    expect(parseSession(token)).toBeNull();
  });

  it("rejects non-session payloads and malformed tokens", () => {
    expect(parseSession(undefined)).toBeNull();
    expect(parseSession("")).toBeNull();
    expect(parseSession("v1.only-two-parts")).toBeNull();
    expect(parseSession("v2.a.b.c")).toBeNull();
  });
});

describe("identity mapping", () => {
  it("maps a valid session to an identity", () => {
    expect(identityFromSessionToken(serializeSession(payload()))).toEqual({
      tokenIdentifier: "https://id.example.test|user-1",
      subject: "user-1",
      email: "clinician@example.test",
      name: "Dr Test",
    });
  });

  it("returns null for an anonymous caller", () => {
    expect(identityFromSessionToken(undefined)).toBeNull();
  });
});

describe("cookie headers", () => {
  it("marks the session cookie HttpOnly, SameSite=Lax and path-scoped", () => {
    const header = sessionCookie("token", false);
    expect(header).toContain("hakimerad_session=token");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Path=/");
    expect(header).toContain("Max-Age=2592000");
    expect(header).not.toContain("Secure");
  });

  it("adds Secure over HTTPS and expires the cookie on sign-out", () => {
    expect(sessionCookie("token", true)).toContain("Secure");
    const cleared = clearSessionCookie(true);
    expect(cleared).toContain("hakimerad_session=");
    expect(cleared).toContain("Max-Age=0");
  });

  it("reads a named cookie out of a browser header", () => {
    const header = "a=1; hakimerad_session=abc.def.ghi; theme=dark";
    expect(readCookie(header, "hakimerad_session")).toBe("abc.def.ghi");
    expect(readCookie(header, "missing")).toBeUndefined();
    expect(readCookie(null, "hakimerad_session")).toBeUndefined();
  });

  it("keeps base64 padding and equals signs inside the value", () => {
    expect(readCookie("session=a=b=c", "session")).toBe("a=b=c");
  });
});

describe("return paths", () => {
  it("only allows same-origin paths and never an auth route", () => {
    expect(safeReturnTo("/staff/queue")).toBe("/staff/queue");
    expect(safeReturnTo("/requests/BX-260104-AB12?x=1")).toBe(
      "/requests/BX-260104-AB12?x=1",
    );
    expect(safeReturnTo(null)).toBe("/");
    expect(safeReturnTo("https://evil.test")).toBe("/");
    expect(safeReturnTo("//evil.test")).toBe("/");
    expect(safeReturnTo("/auth/sign-in")).toBe("/");
  });
});

describe("origin handling behind a proxy", () => {
  it("uses the forwarded host and protocol", () => {
    const request = new Request("http://internal:3000/auth/callback", {
      headers: {
        "x-forwarded-host": "booking.example.test",
        "x-forwarded-proto": "https",
      },
    });
    expect(originOf(request)).toBe("https://booking.example.test");
    expect(redirectUri(request)).toBe(
      "https://booking.example.test/auth/callback",
    );
  });

  it("prefers an explicit AUTH_REDIRECT_URI", () => {
    vi.stubEnv(
      "AUTH_REDIRECT_URI",
      "https://booking.example.test/auth/callback",
    );
    const request = new Request("http://localhost:5173/auth/callback");
    expect(redirectUri(request)).toBe(
      "https://booking.example.test/auth/callback",
    );
    expect(originOf(request)).toBe("https://booking.example.test");
  });
});
