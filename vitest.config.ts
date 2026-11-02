import { defineVitestConfig } from "@usehercules/vite-tanstack/vitest";

// Two projects: "convex" (edge-runtime with convex-test) and "frontend"
// (jsdom with Testing Library). Keep tests hermetic: no real deployments or
// network calls.
//
// `testTimeout` is raised from Vitest's 5s default: the first `convex-test`
// case in a file builds a fresh in-memory backend and can take 5-8s on a cold
// transform cache or a slower local disk, which shows up as a false timeout.
export default defineVitestConfig({
  vitest: { test: { testTimeout: 20_000 } },
});
