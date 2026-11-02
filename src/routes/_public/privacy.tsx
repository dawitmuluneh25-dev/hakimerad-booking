import { createFileRoute } from "@tanstack/react-router";
import PolicyBody from "@/components/policy-body.tsx";
import PublicPage from "@/components/public-page.tsx";
import { site } from "@/lib/site.ts";

const SECTIONS = [
  { title: "What we collect", body: "Identity and contact details, guardian details for minors, referral information and documents you or your referring doctor submit." },
  { title: "Why we collect it", body: "Only to review, schedule and coordinate the interventional radiology procedure you have been referred for." },
  { title: "Who can see it", body: "Authorized HakimeRAD staff involved in your request, according to their role. Documents are never available through public links." },
  { title: "Notifications", body: "Messages contain your reference number and minimal details. Clinical information is shared only inside your secure account." },
  { title: "Your rights", body: "You may ask to view or correct your information by contacting the booking team." },
];

export const Route = createFileRoute("/_public/privacy")({
  head: () => ({ meta: [{ title: `Privacy policy | ${site.name}` }] }),
  component: () => (
    <PublicPage eyebrow="Policies" title="Privacy policy" intro="Draft wording, pending legal review by HakimeRAD.">
      <PolicyBody sections={SECTIONS} />
    </PublicPage>
  ),
});
