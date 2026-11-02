import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRightIcon, CheckIcon, PhoneIcon } from "lucide-react";
import ContactDetails from "@/components/contact-details.tsx";
import PublicPage from "@/components/public-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { getProcedure } from "@/lib/procedures.ts";
import { site } from "@/lib/site.ts";

export const Route = createFileRoute("/_public/procedures/$slug")({
  loader: ({ params }) => {
    const procedure = getProcedure(params.slug);
    if (!procedure) throw notFound();
    return { title: procedure.name, description: procedure.summary };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Procedure"} | ${site.name}` },
      { name: "description", content: loaderData?.description ?? "" },
    ],
  }),
  component: ProcedurePage,
});

function ProcedurePage() {
  const { slug } = Route.useParams();
  const procedure = getProcedure(slug);
  if (!procedure) throw notFound();

  return (
    <PublicPage eyebrow={`Procedure ${procedure.code}`} title={procedure.name} intro={procedure.summary}>
      {procedure.urgent ? <UrgentNotice className="mb-10" /> : null}
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <Section title="Purpose of the service">
            <p className="text-muted-foreground leading-relaxed">{procedure.purpose}</p>
          </Section>
          <Section title={procedure.urgent ? "Coordination pathway" : "Procedure types"}>
            <CheckList items={procedure.variants} />
          </Section>
          <Section title="Who can submit a referral">
            <CheckList items={procedure.whoCanRefer} />
          </Section>
          <Section title="Information usually needed">
            <CheckList items={procedure.infoNeeded} />
          </Section>
          <Section title="How clinical review works">
            <p className="text-muted-foreground leading-relaxed">{procedure.review}</p>
          </Section>
          <Section title="What happens next">
            <ol className="space-y-3">
              {procedure.afterSubmit.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Contact HakimeRAD">
            <ContactDetails />
          </Section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-xl border bg-card p-6">
            {procedure.urgent ? (
              <>
                <h2 className="font-semibold">For hospital clinicians</h2>
                <p className="text-sm text-muted-foreground">
                  Authorized hospital teams coordinate this procedure directly with our radiology
                  team. Online time-slot booking is not available.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  render={<a href={`tel:${site.contact.emergencyPhone.replace(/[^\d+]/g, "")}`} />}
                  nativeButton={false}
                >
                  <PhoneIcon />
                  Call coordination line
                </Button>
              </>
            ) : (
              <>
                <h2 className="font-semibold">Ready to refer?</h2>
                <p className="text-sm text-muted-foreground">
                  Submitting a request does not confirm an appointment. Our team reviews it first.
                </p>
                <Button className="w-full" render={<Link to="/request" />} nativeButton={false}>
                  Start a request
                  <ArrowRightIcon />
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>
    </PublicPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
          <CheckIcon className="size-4 shrink-0 translate-y-0.5 text-primary" />
          {item}
        </li>
      ))}
    </ul>
  );
}
