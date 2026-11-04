import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sign-in")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [{ authConfig, createSignInRedirect, safeReturnTo }, { enforce }] =
          await Promise.all([import("@/server/auth.ts"), import("@/server/rate-limit.ts")]);

        // Unauthenticated, so the client address is the only stable subject.
        const limited = enforce("auth.sign-in", request);
        if (limited) return limited;

        const config = authConfig();
        if (!config) {
          return new Response(
            "Sign-in is not configured. Set AUTH_ISSUER_URL and AUTH_CLIENT_ID, then restart the server.",
            { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
          );
        }
        const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));
        return createSignInRedirect(request, config, returnTo);
      },
      ANY: () => new Response(null, { status: 405, headers: { allow: "GET, HEAD" } }),
    },
  },
});
