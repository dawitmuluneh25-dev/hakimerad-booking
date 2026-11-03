import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sign-out")({
  server: {
    handlers: {
      // Clears the session cookie, then lets the provider end its own session.
      POST: async ({ request }) => {
        const { authConfig, signOutResponse } = await import("@/server/auth.ts");
        return signOutResponse(request, authConfig());
      },
      GET: async ({ request }) => {
        const { authConfig, signOutResponse } = await import("@/server/auth.ts");
        return signOutResponse(request, authConfig());
      },
    },
  },
});
