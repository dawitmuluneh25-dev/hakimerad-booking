import { createFileRoute } from "@tanstack/react-router";
import ContactDetails from "@/components/contact-details.tsx";
import PublicPage from "@/components/public-page.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { pageHead } from "@/lib/seo.ts";
import { site } from "@/lib/site.ts";

export const Route = createFileRoute("/_public/contact")({
  head: () =>
    pageHead({
      title: `Contact | ${site.name}`,
      description: `Contact ${site.organization} about a referral, request or appointment.`,
      path: "/contact",
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <PublicPage
      eyebrow="Contact"
      title="Contact HakimeRAD"
      intro="Questions about a request, referral or appointment? Reach our booking team."
    >
      <div className="space-y-10">
        <ContactDetails />
        <UrgentNotice />
        <p className="text-sm text-muted-foreground">{site.contact.emergencyNote}</p>
      </div>
    </PublicPage>
  );
}
