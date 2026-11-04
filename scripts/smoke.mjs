#!/usr/bin/env node
// Deployment smoke test for a running build.
//
// Start the server first (`pnpm preview --port 4173`), then:
//   node scripts/smoke.mjs                       # defaults to 127.0.0.1:4173
//   node scripts/smoke.mjs https://example.org   # check a deployed instance
//   node scripts/smoke.mjs http://127.0.0.1:4173 --timeout=120000
//
// It waits for the server to accept connections, then checks that the public
// pages render server-side with the expected company details. Exit code 0 means
// every check passed; 1 means at least one route failed.

const DEFAULT_BASE = "http://127.0.0.1:4173";
const DEFAULT_TIMEOUT_MS = 60_000;

const args = process.argv.slice(2);
const baseArg = args.find((arg) => !arg.startsWith("--"));
const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
const base = (baseArg ?? DEFAULT_BASE).replace(/\/+$/, "");
const timeoutMs = timeoutArg
  ? Number(timeoutArg.split("=")[1])
  : DEFAULT_TIMEOUT_MS;

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("Invalid --timeout value; expected milliseconds.");
  process.exit(2);
}

const CHECKS = [
  {
    path: "/",
    type: "text/html",
    contains: ["HakimeRAD", "Image-guided", "Start a procedure request"],
  },
  {
    path: "/contact",
    type: "text/html",
    contains: ["book@hakimerad.com", "6HX48489+6C", "+251 906 373154"],
  },
  { path: "/procedures/biopsy-fnac", type: "text/html", contains: ["Biopsy"] },
  { path: "/how-it-works", type: "text/html", contains: ["referral"] },
  { path: "/referrers", type: "text/html", contains: [] },
  { path: "/privacy", type: "text/html", contains: ["Privacy policy"] },
  { path: "/booking-policy", type: "text/html", contains: [] },
  { path: "/offline", type: "text/html", contains: [] },
  {
    path: "/manifest.webmanifest",
    type: "application/manifest+json",
    contains: ["HakimeRAD"],
  },
  { path: "/favicon.svg", type: "image/svg+xml", contains: ["<svg"] },
  // Readiness: the database and the data directory must both work.
  {
    path: "/api/health",
    type: "application/json",
    contains: ['"status":"ok"', '"database"', '"storage"'],
  },
  // Crawling: robots must point at a sitemap that lists public pages only.
  { path: "/robots.txt", type: "text/plain", contains: ["Sitemap:", "Disallow: /admin"] },
  {
    path: "/sitemap.xml",
    type: "application/xml",
    contains: ["<urlset", "<loc>", "/procedures/biopsy-fnac"],
  },
  // Sharing: the card social platforms fetch.
  { path: "/og-image.png", type: "image/png", contains: [] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `vite preview` binds either 127.0.0.1 or ::1 depending on the platform, so a
// loopback base URL is tried against both literals before giving up.
function candidateBases() {
  const url = new URL(base);
  if (url.hostname === "127.0.0.1") {
    return [base, base.replace("127.0.0.1", "[::1]")];
  }
  if (url.hostname === "[::1]") {
    return [base, base.replace("[::1]", "127.0.0.1")];
  }
  if (url.hostname === "localhost") {
    return [
      base,
      base.replace("localhost", "127.0.0.1"),
      base.replace("localhost", "[::1]"),
    ];
  }
  return [base];
}

async function waitForServer() {
  const deadline = Date.now() + timeoutMs;
  const candidates = candidateBases();
  let lastError = "no attempt made";
  while (Date.now() < deadline) {
    for (const candidate of candidates) {
      try {
        const response = await fetch(`${candidate}/`, { redirect: "manual" });
        if (response.status > 0) {
          await response.arrayBuffer();
          return candidate;
        }
        lastError = `unexpected status ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    await sleep(1000);
  }
  throw new Error(
    `server at ${base} did not accept connections within ${timeoutMs}ms: ${lastError}`,
  );
}

async function check(origin, { path, type, contains }) {
  const url = `${origin}${path}`;
  const started = Date.now();
  let response;
  try {
    response = await fetch(url, { headers: { accept: type } });
  } catch (error) {
    return {
      path,
      ok: false,
      detail: `request failed: ${error instanceof Error ? error.message : error}`,
    };
  }

  const body = await response.text();
  const elapsed = Date.now() - started;
  const problems = [];

  if (response.status !== 200) problems.push(`status ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes(type))
    problems.push(`content-type "${contentType || "missing"}"`);
  if (body.length < 200) problems.push(`body only ${body.length} bytes`);

  for (const needle of contains) {
    if (!body.includes(needle)) problems.push(`missing "${needle}"`);
  }

  return {
    path,
    ok: problems.length === 0,
    detail:
      problems.length === 0
        ? `${response.status} in ${elapsed}ms`
        : problems.join(", "),
  };
}

async function main() {
  const origin = await waitForServer();
  console.log(`Smoke testing ${origin}`);

  const results = [];
  for (const entry of CHECKS) {
    results.push(await check(origin, entry));
  }

  const width = Math.max(...results.map((result) => result.path.length));
  for (const result of results) {
    console.log(
      `${result.ok ? "PASS" : "FAIL"}  ${result.path.padEnd(width)}  ${result.detail}`,
    );
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} of ${results.length} checks failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} checks passed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
