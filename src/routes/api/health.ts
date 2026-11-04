import { createFileRoute } from "@tanstack/react-router";

/**
 * Liveness and readiness in one answer, for the proxy, the deploy pipeline and
 * an uptime monitor.
 *
 * 200 means the process can read its database, write its data directory and is
 * running the schema it was built for. 503 means one of those is false and the
 * instance should be restarted or rolled back.
 *
 * The body deliberately carries no filesystem paths, no configuration values and
 * no row counts: it is unauthenticated.
 */

const startedAt = Date.now();

type CheckState = "ok" | "fail";
type Check = { status: CheckState; detail?: string };

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const { accessSync, constants, mkdirSync } = await import("node:fs");
        const checks: Record<string, Check> = {};

        let schema: { current: number; latest: number } | null = null;

        try {
          const { getDb, latestSchemaVersion, schemaVersion } = await import(
            "@/server/db.ts"
          );
          const db = getDb();
          db.prepare("SELECT 1").get();
          const current = schemaVersion(db);
          const latest = latestSchemaVersion();
          schema = { current, latest };
          checks.database =
            current === latest
              ? { status: "ok" }
              : {
                  status: "fail",
                  detail: `schema ${current} is behind ${latest}`,
                };
        } catch (error) {
          console.error("[health] database check failed:", error);
          checks.database = { status: "fail", detail: "database unavailable" };
        }

        try {
          const { dataDir } = await import("@/server/db.ts");
          const directory = dataDir();
          mkdirSync(directory, { recursive: true });
          accessSync(directory, constants.W_OK);
          checks.storage = { status: "ok" };
        } catch (error) {
          console.error("[health] storage check failed:", error);
          checks.storage = { status: "fail", detail: "data directory not writable" };
        }

        const healthy = Object.values(checks).every((check) => check.status === "ok");

        return Response.json(
          {
            status: healthy ? "ok" : "fail",
            checks,
            schema,
            version: process.env.APP_VERSION?.trim() || "0.0.0",
            commit: process.env.APP_COMMIT?.trim() || null,
            startedAt: new Date(startedAt).toISOString(),
            uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
          },
          {
            status: healthy ? 200 : 503,
            headers: {
              "cache-control": "no-store",
              // Failures are for operators, not for caches or search engines.
              "x-robots-tag": "noindex",
            },
          },
        );
      },
      ANY: () => new Response(null, { status: 405, headers: { allow: "GET, HEAD" } }),
    },
  },
});
