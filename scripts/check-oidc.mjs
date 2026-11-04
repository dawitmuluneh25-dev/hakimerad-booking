#!/usr/bin/env node
// Checks that the configured OpenID Connect provider is usable before launch,
// and prints the redirect URI to register there.
//
//   pnpm check-oidc                                  # uses AUTH_ISSUER_URL
//   pnpm check-oidc https://login.example.com/realms/hakimerad
//
// A managed provider fails in four usual ways: the issuer string does not match
// its discovery document exactly, PKCE is not offered, the client is registered
// as public while the app sends a secret, or the redirect URI registered there
// differs from AUTH_REDIRECT_URI by a slash. This checks the first three and
// shows the value for the fourth.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function envFromFile() {
  if (process.env.AUTH_ISSUER_URL) return;
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (match && process.env[match[1]] === undefined) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // No file: fall through to the environment.
    }
  }
}

envFromFile();

const issuer = (process.argv[2] ?? process.env.AUTH_ISSUER_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

if (!issuer) {
  console.error("No issuer. Pass it as an argument or set AUTH_ISSUER_URL.");
  process.exit(2);
}

const problems = [];
const notes = [];
function check(ok, label, detail) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
}
function note(text) {
  notes.push(text);
}

let document;
try {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  document = await response.json();
} catch (error) {
  console.error(`FAIL discovery document could not be read from ${issuer}`);
  console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

console.log(`\nProvider: ${issuer}\n`);

// The app compares the issuer claim during the token exchange, so an exact match
// matters. Trailing slashes are the usual mismatch.
if (document.issuer === issuer) {
  check(true, "issuer matches the discovery document");
} else if (document.issuer === `${issuer}/`) {
  check(true, "issuer matches apart from a trailing slash", document.issuer);
  note(`Set AUTH_ISSUER_URL to ${document.issuer} to match exactly.`);
} else {
  check(false, "issuer matches the discovery document", `document says ${document.issuer}`);
}

check(Boolean(document.authorization_endpoint), "authorization endpoint present");
check(Boolean(document.token_endpoint), "token endpoint present");
check(Boolean(document.jwks_uri), "signing keys endpoint present");

const challenges = document.code_challenge_methods_supported ?? [];
check(challenges.includes("S256"), "PKCE S256 supported", challenges.join(", ") || "none advertised");

const responseTypes = document.response_types_supported ?? [];
check(responseTypes.includes("code"), "authorization code flow supported");

const scopes = document.scopes_supported ?? [];
check(scopes.includes("openid"), "openid scope supported");
for (const scope of ["profile", "email"]) {
  if (!scopes.includes(scope)) note(`Provider does not list the "${scope}" scope; check what it returns for name and email.`);
}

const authMethods = document.token_endpoint_auth_methods_supported ?? [];
if (process.env.AUTH_CLIENT_SECRET) {
  const usable = authMethods.includes("client_secret_post") || authMethods.includes("client_secret_basic");
  check(usable, "provider accepts a client secret at the token endpoint", authMethods.join(", ") || "none advertised");
} else if (!authMethods.includes("none")) {
  note("No AUTH_CLIENT_SECRET is set, but the provider does not advertise the public-client method. A confidential client needs the secret.");
}

const redirect =
  process.env.AUTH_REDIRECT_URI?.trim() ||
  `${(process.env.VITE_SITE_URL ?? "https://<your-host>").replace(/\/+$/, "")}/auth/callback`;

console.log(`\nRegister exactly this redirect URI at the provider:\n  ${redirect}\n`);
console.log(`Client ID:  ${process.env.AUTH_CLIENT_ID ?? "(AUTH_CLIENT_ID is not set)"}`);
console.log(`Scopes:     ${process.env.AUTH_SCOPE?.trim() || "openid profile email"}`);
console.log(`Client type: ${process.env.AUTH_CLIENT_SECRET ? "confidential (secret set)" : "public (PKCE only)"}`);

if (notes.length) {
  console.log("\nNotes:");
  for (const text of notes) console.log(`  - ${text}`);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s) found. Fix them before launch.`);
  process.exit(1);
}
console.log("\nProvider looks usable.");
