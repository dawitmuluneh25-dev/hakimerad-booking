import { createFileRoute } from "@tanstack/react-router";
import FaqList from "@/components/faq-list.tsx";
import PublicPage from "@/components/public-page.tsx";
import ReferralSteps from "@/components/referral-steps.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { pageHead } from "@/lib/seo.ts";
import { site } from "@/lib/site.ts";

const DISTINCTIONS = [
  { label: "Submitted request", body: "Your information has been received. Nothing is booked yet." },
  { label: "Clinically approved", body: "A radiologist has agreed the procedure is appropriate." },
  { label: "Scheduled", body: "A date, time and location have been assigned to you." },
  { label: "Completed", body: "The procedure has taken place." },
];

export const Route = createFileRoute("/_public/how-it-works")({
  head: () =>
    pageHead({
      title: `How referrals work | ${site.name}`,
      description:
        "From referral to clinical review, approval, scheduling and completion.",
      path: "/how-it-works",
    }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <PublicPage
      eyebrow="Referral process"
      title="How referrals work"
      intro="Every procedure request is reviewed by an interventional radiologist before a date is confirmed."
    >
      <div className="space-y-16">
        <ReferralSteps />
        <section className="space-y-5">
          <h2 className="text-2xl font-semibold">Four different things</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DISTINCTIONS.map((d) => (
              <div key={d.label} className="rounded-xl border bg-card p-5">
                <p className="font-semibold">{d.label}</p>
                <p className="pt-1 text-sm text-muted-foreground">{d.body}</p>
              </div>
            ))}
          </div>
        </section>
        <UrgentNotice />
        <section className="space-y-5">
          <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
          <FaqList />
        </section>
      </div>
    </PublicPage>
  );
}
