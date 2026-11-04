import { createFileRoute } from "@tanstack/react-router";

/**
 * Local test sign-in: /auth/dev-login?role=radiologist&subject=radio
 * Returns 404 unless AUTH_DEV_LOGIN=1 outside production.
 */
export const Route = createFileRoute("/auth/dev-login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { devLoginResponse } = await import("@/server/dev-login.ts");
        return devLoginResponse(request);
      },
      ANY: () =>
        new Response(null, { status: 405, headers: { allow: "GET, HEAD" } }),
    },
  },
});
