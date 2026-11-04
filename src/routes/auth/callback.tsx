import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      // Creates the local user row before the browser lands in the app.
      GET: async ({ request }) => {
        const [{ authConfig, completeSignIn }, { enforce }] = await Promise.all([
          import("@/server/auth.ts"),
          import("@/server/rate-limit.ts"),
        ]);

        const limited = enforce("auth.callback", request);
        if (limited) return limited;

        const config = authConfig();
        if (!config) {
          return new Response(null, {
            status: 302,
            headers: { location: "/?auth_error=not_configured" },
          });
        }

        const { response, session } = await completeSignIn(request, config);
        if (session) {
          const [{ getDb }, { syncCurrentUser }] = await Promise.all([
            import("@/server/db.ts"),
            import("@/server/services/users.ts"),
          ]);
          syncCurrentUser({
            db: getDb(),
            identity: {
              tokenIdentifier: session.tokenIdentifier,
              subject: session.subject,
              email: session.email,
              name: session.name,
            },
          });
        }
        return response;
      },
      ANY: () => new Response(null, { status: 405, headers: { allow: "GET, HEAD" } }),
    },
  },
});
