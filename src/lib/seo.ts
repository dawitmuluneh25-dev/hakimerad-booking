import { PROCEDURES } from "./procedures.ts";
import { site } from "./site.ts";

/**
 * Canonical origin for absolute links.
 *
 * Set `VITE_SITE_URL` to the deployment origin at build time (for example
 * `https://booking.hakimerad.com`) so canonicals, `og:url` and the sitemap all
 * agree. Until that is configured it falls back to the clinic's published site,
 * which is never worse than emitting no canonical at all.
 */
const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();

/**
 * The deployment origin, or null until it is configured. A canonical that points
 * at the wrong host is worse than no canonical at all, so `pageHead` omits the
 * absolute tags rather than guess: hakimerad.com is the clinic's marketing site,
 * not this application.
 */
export const SITE_URL: string | null = configured
  ? configured.replace(/\/+$/, "")
  : null;

export function absoluteUrl(path: string): string | null {
  if (!SITE_URL) return null;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? SITE_URL : `${SITE_URL}${clean}`;
}

/**
 * The origin this request actually arrived on, trusting the reverse proxy's
 * headers. Used by the generated `robots.txt` and `sitemap.xml` so those files
 * describe the host that served them even before `VITE_SITE_URL` is set.
 */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || url.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export const OG_IMAGE = { path: "/og-image.png", width: 1200, height: 630 };

export type PageSeo = {
  title: string;
  description?: string;
  /** Same-origin path, e.g. `/contact`. */
  path: string;
};

/**
 * Page metadata: title, description, canonical, and the Open Graph pair that
 * makes a shared link render. The root route supplies the parts that never
 * change (type, site name, image, Twitter card).
 */
export function pageHead({ title, description, path }: PageSeo) {
  const url = absoluteUrl(path);
  const image = absoluteUrl(OG_IMAGE.path);
  return {
    meta: [
      { title },
      ...(description ? [{ name: "description", content: description }] : []),
      { property: "og:title", content: title },
      ...(description ? [{ property: "og:description", content: description }] : []),
      ...(url ? [{ property: "og:url", content: url }] : []),
      ...(image ? [{ property: "og:image", content: image }] : []),
    ],
    links: url ? [{ rel: "canonical", href: url }] : [],
  };
}

/**
 * schema.org description of the clinic, for search engines and for assistants
 * that read structured data. Only facts that are already published on the site:
 * the contact details, the Plus Code as the street address, and the coordinates
 * that Plus Code resolves to. No opening hours are claimed, because the clinic
 * has not confirmed which hours it wants published.
 */
export function structuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: site.organization,
    alternateName: site.name,
    description: site.tagline,
    url: site.contact.website,
    telephone: site.contact.phone,
    email: site.contact.email,
    sameAs: [site.contact.website],
    hasMap: site.contact.maps,
    address: {
      "@type": "PostalAddress",
      // A Plus Code is a street address in Ethiopia's addressing system.
      streetAddress: "6HX48489+6C",
      addressLocality: "Harar",
      addressCountry: "ET",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 9.315563,
      longitude: 42.118562,
    },
    availableService: PROCEDURES.map((procedure) => ({
      "@type": "MedicalProcedure",
      name: procedure.name,
      description: procedure.summary,
    })),
  };
}

/** Public, indexable pages. Everything else is behind sign-in and disallowed. */
export const PUBLIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "monthly" },
  { path: "/procedures", priority: "0.9", changefreq: "monthly" },
  { path: "/procedures/biopsy-fnac", priority: "0.8", changefreq: "monthly" },
  { path: "/procedures/abscess-drainage", priority: "0.8", changefreq: "monthly" },
  { path: "/procedures/intussusception", priority: "0.8", changefreq: "monthly" },
  { path: "/how-it-works", priority: "0.7", changefreq: "monthly" },
  { path: "/referrers", priority: "0.7", changefreq: "monthly" },
  { path: "/request", priority: "0.7", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/booking-policy", priority: "0.3", changefreq: "yearly" },
] as const;

/** Private areas. Kept in one list so robots.txt and the sitemap cannot drift. */
export const PRIVATE_ROUTES = [
  "/admin",
  "/api/",
  "/auth/",
  "/account",
  "/dashboard",
  "/notifications",
  "/requests",
  "/schedule",
  "/staff",
  "/urgent",
] as const;
