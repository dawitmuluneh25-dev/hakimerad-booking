import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheckIcon,
  BellRingIcon,
  FileUpIcon,
  ListChecksIcon,
  MessagesSquareIcon,
  SirenIcon,
} from "lucide-react";
import PublicPage from "@/components/public-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { site } from "@/lib/site.ts";

const FEATURES = [
  { icon: ListChecksIcon, title: "Structured referrals", body: "Procedure-specific forms for biopsy/FNAC and abscess drainage." },
  { icon: FileUpIcon, title: "Secure attachments", body: "Upload referral letters and imaging reports to private storage." },
  { icon: BellRingIcon, title: "Status tracking", body: "Follow each referral through review, approval and scheduling." },
  { icon: MessagesSquareIcon, title: "Information requests", body: "Respond directly when the radiologist needs more details." },
  { icon: SirenIcon, title: "Urgent coordination", body: "Hospital teams can raise urgent intussusception coordination requests." },
  { icon: BadgeCheckIcon, title: "Professional verification", body: "Referral privileges are granted after your profile is verified." },
];

export const Route = createFileRoute("/_public/referrers")({
  head: () => ({
    meta: [
      { title: `For referring doctors | ${site.name}` },
      { name: "description", content: "Referral portal for physicians, hospitals and healthcare facilities." },
    ],
  }),
  component: ReferrersPage,
});

function ReferrerCta() {
  const { user } = useAuth();
  if (user) {
    return (
      <Button render={<Link to="/dashboard" />} nativeButton={false}>
        Go to my account
      </Button>
    );
  }
  return <SignInButton signInText="Sign in or register" />;
}

function ReferrersPage() {
  return (
    <PublicPage
      eyebrow="Referring physicians"
      title="A referral portal built for clinicians"
      intro="Register, verify your professional profile, and refer patients to HakimeRAD's interventional radiology team."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6">
            <f.icon className="size-5 text-primary" />
            <h2 className="pt-3 font-semibold">{f.title}</h2>
            <p className="pt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col items-start gap-4 rounded-xl border bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Sign in, choose "Referring physician", and submit your registration details. An administrator verifies your profile before referrals open.
        </p>
        <ReferrerCta />
      </div>
    </PublicPage>
  );
}
