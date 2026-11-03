import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRightIcon,
  FileCheck2Icon,
  LockIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
} from "lucide-react";
import ContactDetails from "@/components/contact-details.tsx";
import FaqList from "@/components/faq-list.tsx";
import ProcedureCard from "@/components/procedure-card.tsx";
import ReferralSteps from "@/components/referral-steps.tsx";
import { Button } from "@/components/ui/button.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { PROCEDURES } from "@/lib/procedures.ts";
import { site } from "@/lib/site.ts";

/** Local asset so the app has no third-party image/CDN dependency. */
const HERO_IMAGE = "/hero-ultrasound.svg";

const PRINCIPLES = [
  {
    icon: StethoscopeIcon,
    title: "Clinician-led decisions",
    body: "Every request is reviewed by an interventional radiologist before anything is scheduled.",
  },
  {
    icon: FileCheck2Icon,
    title: "Clear status at every step",
    body: "Track your request from submission through review, approval and scheduling.",
  },
  {
    icon: LockIcon,
    title: "Private documents",
    body: "Referral letters and reports are stored privately and shared only with authorized staff.",
  },
];

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: `${site.name} | ${site.organization}` },
      { name: "description", content: site.tagline },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <UrgentNotice />
      </section>
      <section id="procedures" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Services"
          title="Three dedicated procedure pathways"
          body="Each procedure has its own referral form, review steps and scheduling rules."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {PROCEDURES.map((p) => (
            <ProcedureCard key={p.slug} procedure={p} />
          ))}
        </div>
      </section>
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="How referrals work"
            title="A request is not an appointment until it is approved"
            body="Your request goes through clinical review before a procedure date is confirmed."
          />
          <ReferralSteps />
          <div className="grid gap-5 pt-10 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="flex gap-3">
                <p.icon className="size-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="pt-1 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ReferrerBand />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="FAQ" title="Common questions" />
          <FaqList />
        </div>
        <div id="contact">
          <SectionHeading eyebrow="Contact" title="Get in touch" />
          <ContactDetails />
        </div>
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {site.organization}
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Image-guided procedures,{" "}
            <span className="text-primary">precisely coordinated.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Send a referral for biopsy, FNAC or abscess drainage. Our interventional radiology
            team reviews every request before scheduling, and keeps you informed at each step.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="px-5" render={<Link to="/request" />} nativeButton={false}>
              Start a procedure request
              <ArrowRightIcon />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="px-5"
              render={<Link to="/referrers" />}
              nativeButton={false}
            >
              For referring doctors
            </Button>
          </div>
        </div>
        <motion.div
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          <div className="overflow-hidden rounded-2xl border bg-[oklch(0.16_0.02_235)] shadow-2xl">
            <img
              src={HERO_IMAGE}
              alt="Abstract ultrasound scan with a needle guide line"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
            <ShieldCheckIcon className="size-5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Reviewed by a radiologist</p>
              <p className="text-xs text-muted-foreground">before any appointment is confirmed</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ReferrerBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <div className="flex flex-col gap-6 rounded-2xl bg-primary p-8 text-primary-foreground sm:p-12 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-semibold sm:text-3xl">Referring a patient?</h2>
          <p className="opacity-85">
            Verified doctors and hospitals can submit structured referrals, attach reports, respond
            to information requests and track every referral in one place.
          </p>
        </div>
        <Button
          size="lg"
          variant="secondary"
          className="px-5"
          render={<Link to="/referrers" />}
          nativeButton={false}
        >
          Referring doctor access
          <ArrowRightIcon />
        </Button>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl space-y-3 pb-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-semibold tracking-tight">{title}</h2>
      {body ? <p className="text-muted-foreground">{body}</p> : null}
    </div>
  );
}
