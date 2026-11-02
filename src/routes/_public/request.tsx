import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon, SirenIcon } from "lucide-react";
import PublicPage from "@/components/public-page.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PROCEDURES } from "@/lib/procedures.ts";
import { site } from "@/lib/site.ts";

export const Route = createFileRoute("/_public/request")({
  head: () => ({
    meta: [
      { title: `Start a procedure request | ${site.name}` },
      { name: "description", content: "Choose a procedure to begin a referral request." },
    ],
  }),
  component: RequestPage,
});

function RequestPage() {
  const elective = PROCEDURES.filter((p) => !p.urgent);
  const urgent = PROCEDURES.find((p) => p.urgent);
  return (
    <PublicPage
      eyebrow="New request"
      title="Start a procedure request"
      intro="Choose the procedure you are being referred for. A request is reviewed by our clinical team before any appointment is confirmed."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {elective.map((p) => (
          <div key={p.slug} className="flex flex-col gap-3 rounded-xl border bg-card p-6">
            <p.icon className="size-6 text-primary" />
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="flex-1 text-sm text-muted-foreground">{p.summary}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button render={<Link to="/requests/new/$procedure" params={{ procedure: p.slug }} />} nativeButton={false}>
                Start request
                <ArrowRightIcon />
              </Button>
              <Button variant="ghost" render={<Link to="/procedures/$slug" params={{ slug: p.slug }} />} nativeButton={false}>
                Details
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="pt-4 text-sm text-muted-foreground">
        You will be asked to sign in or create an account first so you can track your request. Referring doctors need a verified profile.
      </p>
      {urgent ? (
        <div className="space-y-4 pt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <SirenIcon className="size-5 text-destructive" />
            {urgent.name}
          </h2>
          <UrgentNotice />
        </div>
      ) : null}
    </PublicPage>
  );
}
