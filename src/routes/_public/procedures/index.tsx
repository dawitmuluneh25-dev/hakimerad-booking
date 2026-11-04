import { createFileRoute } from "@tanstack/react-router";
import ProcedureCard from "@/components/procedure-card.tsx";
import PublicPage from "@/components/public-page.tsx";
import { PROCEDURES } from "@/lib/procedures.ts";
import { pageHead } from "@/lib/seo.ts";
import { site } from "@/lib/site.ts";

export const Route = createFileRoute("/_public/procedures/")({
  head: () =>
    pageHead({
      title: `Procedures | ${site.name}`,
      description:
        "Image-guided biopsy and FNAC, abscess drainage, and hydrostatic intussusception reduction coordination.",
      path: "/procedures",
    }),
  component: ProceduresPage,
});

function ProceduresPage() {
  return (
    <PublicPage
      eyebrow="Procedures"
      title="Interventional radiology services"
      intro="Minimally invasive, image-guided procedures. Each one follows its own referral and review pathway."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {PROCEDURES.map((p) => (
          <ProcedureCard key={p.slug} procedure={p} />
        ))}
      </div>
    </PublicPage>
  );
}
