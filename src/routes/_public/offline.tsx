import { createFileRoute } from "@tanstack/react-router";
import { WifiOffIcon } from "lucide-react";
import ContactDetails from "@/components/contact-details.tsx";
import PublicPage from "@/components/public-page.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { site } from "@/lib/site.ts";

export const Route = createFileRoute("/_public/offline")({
  head: () => ({
    meta: [
      { title: `Offline | ${site.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfflinePage,
});

/**
 * The only page the service worker can serve without the network. It holds
 * public information only: contacts, the emergency line and the urgent warning.
 */
function OfflinePage() {
  return (
    <PublicPage
      eyebrow="No connection"
      title="You are offline"
      intro="This copy of the app cannot reach HakimeRAD. Nothing you type here will be sent, and no request can be submitted until the connection returns."
    >
      <div className="space-y-10">
        <div className="flex gap-4 rounded-xl border bg-muted/40 p-5">
          <WifiOffIcon className="size-6 shrink-0 text-muted-foreground" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Requests, uploads and appointments need a connection.</p>
            <p className="text-muted-foreground">
              Reconnect and reload this page to sign in and continue. A page saved by the browser is never a
              confirmation that a request was received.
            </p>
          </div>
        </div>
        <ContactDetails />
        <UrgentNotice />
        <p className="text-sm text-muted-foreground">{site.contact.emergencyNote}</p>
      </div>
    </PublicPage>
  );
}
