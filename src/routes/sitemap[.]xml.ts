import { createFileRoute } from "@tanstack/react-router";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Served at `/sitemap.xml`. Lists public pages only: a URL that requires
 * sign-in cannot be crawled, and including it would only waste crawl budget.
 * No `<lastmod>` values, because a made-up date is worse than none.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { PUBLIC_ROUTES, requestOrigin } = await import("@/lib/seo.ts");
        const origin = requestOrigin(request);
        const entries = PUBLIC_ROUTES.map(({ path, priority, changefreq }) =>
          [
            "  <url>",
            `    <loc>${escapeXml(`${origin}${path}`)}</loc>`,
            `    <changefreq>${changefreq}</changefreq>`,
            `    <priority>${priority}</priority>`,
            "  </url>",
          ].join("\n"),
        ).join("\n");

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          entries,
          "</urlset>",
          "",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
