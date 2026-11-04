import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      // Streams a private document back to its uploader, the request's
      // submitter, or staff. Everyone else gets a 404, so the endpoint never
      // confirms that a file exists.
      GET: async ({ request, params }) => {
        const [
          { getDb, getRow },
          { identityFromSessionToken, readCookie, SESSION_COOKIE },
          { canReadFile, getFileMeta, readFile },
        ] = await Promise.all([
          import("@/server/db.ts"),
          import("@/server/auth.ts"),
          import("@/server/storage.ts"),
        ]);

        const identity = identityFromSessionToken(
          readCookie(request.headers.get("cookie"), SESSION_COOKIE),
        );
        if (!identity) return new Response("Not found", { status: 404 });

        const db = getDb();
        const user = getRow<{ id: string; role: string | null }>(
          db,
          "SELECT id, role FROM users WHERE token_identifier = ?",
          identity.tokenIdentifier,
        );
        if (!user) return new Response("Not found", { status: 404 });

        const meta = getFileMeta(db, params.id);
        if (!meta || !canReadFile(db, user, meta.id)) {
          return new Response("Not found", { status: 404 });
        }

        // Node's Uint8Array is a valid body at runtime; the DOM lib type is narrower.
        return new Response(readFile(meta.id) as unknown as BodyInit, {
          headers: {
            "content-type": meta.contentType,
            "content-length": String(meta.size),
            "content-disposition": `inline; filename="${meta.fileName.replace(/["\\]/g, "")}"`,
            "cache-control": "private, max-age=60",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
