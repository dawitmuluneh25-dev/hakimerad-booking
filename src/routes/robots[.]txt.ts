import { createFileRoute } from "@tanstack/react-router";

/**
 * Served at `/robots.txt`. The sitemap URL is written from the host that served
 * this request, so the file stays correct before and after the production
 * hostname is configured.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { PRIVATE_ROUTES, requestOrigin } = await import("@/lib/seo.ts");
        const origin = requestOrigin(request);
        const lines = [
          "# HakimeRAD IR Booking",
          "# Public pages are indexable. Anything behind sign-in is not.",
          "",
          "User-agent: *",
          "Allow: /",
          ...PRIVATE_ROUTES.map((path) => `Disallow: ${path}`),
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ];
        return new Response(lines.join("\n"), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
