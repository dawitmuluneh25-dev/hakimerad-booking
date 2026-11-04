import { createFileRoute } from "@tanstack/react-router";
import PolicyBody from "@/components/policy-body.tsx";
import PublicPage from "@/components/public-page.tsx";
import { pageHead } from "@/lib/seo.ts";
import { site } from "@/lib/site.ts";

const SECTIONS = [
  { title: "Requests are not appointments", body: "Submitting a request does not confirm a procedure. An interventional radiologist must review and approve it before it is scheduled." },
  { title: "Clinical decisions", body: "The clinical team decides whether a procedure is appropriate, its priority and the method used." },
  { title: "Preparation", body: "Preparation instructions are issued by the clinical team for each patient. Do not change medication unless instructed by your doctor." },
  { title: "Consent", body: "Accepting this policy is not consent to a procedure. Procedural consent is obtained separately by the clinical team." },
  { title: "Rescheduling and cancellation", body: "You may request a change or cancellation through your account or by contacting the booking team." },
  { title: "Emergencies", body: site.contact.emergencyNote },
];

export const Route = createFileRoute("/_public/booking-policy")({
  head: () =>
    pageHead({
      title: `Booking policy | ${site.name}`,
      description:
        "How requests, clinical review, scheduling, consent and emergencies are handled.",
      path: "/booking-policy",
    }),
  component: () => (
    <PublicPage eyebrow="Policies" title="Booking policy" intro="Draft wording, pending confirmation by HakimeRAD.">
      <PolicyBody sections={SECTIONS} />
    </PublicPage>
  ),
});
