import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomPKCECodeVerifier,
  randomState,
  type Configuration,
} from "openid-client";
import type { Identity } from "./context.ts";

/**
 * Standard OIDC authorization-code flow with PKCE, plus an encrypted session
 * cookie. No identity-provider SDK and no hosted auth service: any compliant
 * issuer (Cognito, Keycloak, Auth0, Entra ID) works through four env vars.
 */

export const SESSION_COOKIE = "hakimerad_session";
const TRANSACTION_COOKIE = "hakimerad_auth_tx";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const TRANSACTION_TTL_SECONDS = 60 * 10;

export type SessionUser = { id: string; email: string; name: string };
export type SessionPayload = {
  tokenIdentifier: string;
  subject: string;
  issuer: string;
  email?: string;
  name?: string;
  expiresAt: number;
};
type Transaction = {
  state: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: number;
  nonce: string;
};

const ISSUER_ALIASES = ["AUTH_ISSUER_URL", "HERCULES_AUTH_ISSUER_URL", "HERCULES_OIDC_AUTHORITY"];
const CLIENT_ID_ALIASES = ["AUTH_CLIENT_ID", "HERCULES_AUTH_CLIENT_ID", "HERCULES_OIDC_CLIENT_ID"];

function envValue(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export type AuthConfig = { issuer: string; clientId: string; clientSecret?: string };

/** Null when the environment has no issuer/client id: pages still render, sign-in is disabled. */
export function authConfig(): AuthConfig | null {
  const issuer = envValue(ISSUER_ALIASES);
  const clientId = envValue(CLIENT_ID_ALIASES);
  if (!issuer || !clientId) return null;
  return { issuer, clientId, clientSecret: envValue(["AUTH_CLIENT_SECRET", "HERCULES_AUTH_CLIENT_SECRET"]) };
}

let discoveryCache: { key: string; config: Promise<Configuration> } | undefined;

export function oidcConfig(config: AuthConfig): Promise<Configuration> {
  const key = `${config.issuer}|${config.clientId}`;
  if (discoveryCache?.key !== key) {
    discoveryCache = {
      key,
      config: discovery(new URL(config.issuer), config.clientId, config.clientSecret),
    };
  }
  return discoveryCache.config;
}

function cookieSecret(): Buffer {
  const value =
    envValue(["AUTH_COOKIE_SECRET", "HERCULES_AUTH_COOKIE_PASSWORD"]) ??
    (process.env.NODE_ENV === "production" ? undefined : "local-development-only-cookie-secret");
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_COOKIE_SECRET must be set to at least 32 random characters (see .env.example).",
    );
  }
  return createHash("sha256").update(value).digest();
}

function seal<T extends object>(payload: T): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cookieSecret(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function unseal<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [version, iv, tag, ciphertext] = token.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", cookieSecret(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plain) as T;
  } catch {
    // Tampered, rotated key, or truncated cookie: treat as signed out.
    return null;
  }
}

export function serializeSession(payload: SessionPayload): string {
  return seal({ ...payload, kind: "session" });
}

export function parseSession(token: string | undefined): SessionPayload | null {
  const payload = unseal<SessionPayload & { kind?: string }>(token);
  if (!payload || payload.kind !== "session") return null;
  if (payload.expiresAt <= Date.now()) return null;
  return payload;
}

export function sessionCookie(token: string, secure: boolean): string {
  return cookieHeader(SESSION_COOKIE, token, SESSION_TTL_SECONDS, secure);
}

export function clearSessionCookie(secure: boolean): string {
  return cookieHeader(SESSION_COOKIE, "", 0, secure);
}

export function clearTransactionCookie(secure: boolean): string {
  return cookieHeader(TRANSACTION_COOKIE, "", 0, secure);
}

function cookieHeader(name: string, value: string, maxAge: number, secure: boolean): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

export function originOf(request: Request): string {
  const configured = process.env.AUTH_REDIRECT_URI?.trim();
  if (configured) return configured.replace(/\/auth\/callback\/?$/, "");
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? url.host;
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function redirectUri(request: Request): string {
  const configured = process.env.AUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${originOf(request)}/auth/callback`;
}

/** Same-origin path to return to after sign-in, never an auth route. */
export function safeReturnTo(value: string | null): string {
  if (value === null || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.toLowerCase().startsWith("/auth/")) return "/";
  return value;
}

export async function createSignInRedirect(
  request: Request,
  config: AuthConfig,
  returnTo: string,
): Promise<Response> {
  const client = await oidcConfig(config);
  const state = randomState();
  const codeVerifier = randomPKCECodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
  const nonce = randomState();

  const authUrl = buildAuthorizationUrl(client, {
    redirect_uri: redirectUri(request),
    scope: process.env.AUTH_SCOPE?.trim() || "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const transaction: Transaction = {
    state,
    codeVerifier,
    returnTo,
    nonce,
    expiresAt: Date.now() + TRANSACTION_TTL_SECONDS * 1000,
  };

  return new Response(null, {
    status: 302,
    headers: {
      location: authUrl.href,
      "set-cookie": cookieHeader(
        TRANSACTION_COOKIE,
        seal({ ...transaction, kind: "transaction" }),
        TRANSACTION_TTL_SECONDS,
        new URL(request.url).protocol === "https:",
      ),
    },
  });
}

export async function completeSignIn(
  request: Request,
  config: AuthConfig,
): Promise<{ response: Response; session?: SessionPayload }> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const cookieHeaderValue = request.headers.get("cookie");
  const transaction = unseal<Transaction & { kind?: string }>(
    readCookie(cookieHeaderValue, TRANSACTION_COOKIE),
  );

  const fail = (reason: string) =>
    new Response(null, {
      status: 302,
      headers: {
        location: `/?auth_error=${encodeURIComponent(reason)}`,
        "set-cookie": clearTransactionCookie(secure),
      },
    });

  if (!transaction || transaction.kind !== "transaction" || transaction.expiresAt <= Date.now()) {
    return { response: fail("sign_in_expired") };
  }
  if (url.searchParams.get("error")) {
    return { response: fail(url.searchParams.get("error") ?? "access_denied") };
  }
  if (url.searchParams.get("state") !== transaction.state) {
    return { response: fail("state_mismatch") };
  }

  try {
    const client = await oidcConfig(config);
    const tokens = await authorizationCodeGrant(client, url, {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    const subject = claims?.sub;
    if (!subject) return { response: fail("missing_subject") };

    const issuer = String(claims.iss ?? config.issuer);
    const session: SessionPayload = {
      tokenIdentifier: `${issuer}|${subject}`,
      subject,
      issuer,
      email: typeof claims.email === "string" ? claims.email : undefined,
      name:
        typeof claims.name === "string"
          ? claims.name
          : typeof claims.preferred_username === "string"
            ? claims.preferred_username
            : undefined,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    };

    return {
      response: new Response(null, {
        status: 302,
        headers: {
          location: transaction.returnTo,
          "set-cookie": sessionCookie(serializeSession(session), secure),
        },
      }),
      session,
    };
  } catch (error) {
    console.error("[auth] Sign-in failed:", error);
    return { response: fail("callback_failed") };
  }
}

export async function signOutResponse(request: Request, config: AuthConfig | null): Promise<Response> {
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const headers = new Headers({
    location: "/",
    "set-cookie": clearSessionCookie(secure),
  });

  if (!config) return new Response(null, { status: 302, headers });

  try {
    const client = await oidcConfig(config);
    const endSession = buildEndSessionUrl(client, {
      post_logout_redirect_uri: `${originOf(request)}/`,
    });
    headers.set("location", endSession.href);
  } catch {
    // Issuer without an end-session endpoint: clearing the cookie is enough.
  }
  return new Response(null, { status: 302, headers });
}

export function identityFromSessionToken(token: string | undefined): Identity | null {
  const session = parseSession(token);
  if (!session) return null;
  return {
    tokenIdentifier: session.tokenIdentifier,
    subject: session.subject,
    email: session.email,
    name: session.name,
  };
}

export function toSessionUser(user: { id: string; email?: string | null; full_name?: string | null; name?: string | null }): SessionUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.full_name ?? user.name ?? "",
  };
}
