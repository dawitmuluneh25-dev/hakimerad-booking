import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import OfflineBanner from "@/components/offline-banner.tsx";
import SessionProvider from "@/components/providers/session.tsx";
import ThemeProvider from "@/components/providers/theme.tsx";
import RouteError from "@/components/route-error.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { useAuthErrorToast } from "@/hooks/use-auth-error-toast.ts";
import { getSession } from "@/server/api.ts";
import { OG_IMAGE, absoluteUrl, structuredData } from "@/lib/seo.ts";
import { site } from "@/lib/site.ts";
import appCss from "@/index.css?url";

/** Rendered once per document: search engines read it from `<head>`. */
const STRUCTURED_DATA = JSON.stringify(structuredData());

/** Absolute preview image, or null until VITE_SITE_URL names the deployment. */
const SHARE_IMAGE = absoluteUrl(OG_IMAGE.path);

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    // The session snapshot is read on the server for the first paint and then
    // re-read on client navigations, so signed-in chrome never flashes.
    beforeLoad: async () => {
      const session = await getSession();
      return { user: session.user };
    },
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1.0" },
        { title: site.name },
        { name: "description", content: site.tagline },
        { name: "theme-color", content: "#0a2540" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: site.organization },
        { property: "og:title", content: site.name },
        { property: "og:description", content: site.tagline },
        // Absolute URLs need VITE_SITE_URL; without it these are left out rather
        // than pointing a preview card at the wrong host.
        ...(SHARE_IMAGE
          ? [
              { property: "og:image", content: SHARE_IMAGE },
              { property: "og:image:width", content: String(OG_IMAGE.width) },
              { property: "og:image:height", content: String(OG_IMAGE.height) },
              {
                property: "og:image:alt",
                content: `${site.name} — the HakimeRAD mark on a navy card`,
              },
            ]
          : []),
        { name: "twitter:card", content: SHARE_IMAGE ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: site.name },
        { name: "twitter:description", content: site.tagline },
        ...(SHARE_IMAGE ? [{ name: "twitter:image", content: SHARE_IMAGE }] : []),
      ],
      links: [
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "stylesheet", href: appCss },
      ],
    }),
    errorComponent: RootRouteError,
    notFoundComponent: NotFound,
    component: RootComponent,
    shellComponent: RootDocument,
  },
);

function RootComponent() {
  const { user } = Route.useRouteContext();
  useAuthErrorToast(user !== null);
  useServiceWorker();
  return (
    <SessionProvider initialUser={user}>
      <OfflineBanner />
      <Outlet />
    </SessionProvider>
  );
}

/** Registers the service worker in production builds only. */
function useServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          // Static, build-time content: no user data reaches this script.
          dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }}
        />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            {children}
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootRouteError(props: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <RouteError {...props} />
    </div>
  );
}

function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <meta name="robots" content="noindex" />
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          This page does not exist.
        </p>
        <div className="pt-4">
          <Link to="/" className={buttonVariants()}>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
