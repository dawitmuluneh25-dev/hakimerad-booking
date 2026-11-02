import { REFERRAL_STEPS } from "@/lib/procedures.ts";

export default function ReferralSteps() {
  return (
    <ol className="grid gap-4 md:grid-cols-5">
      {REFERRAL_STEPS.map((step, i) => (
        <li key={step.title} className="relative rounded-xl border bg-card p-5">
          <span className="font-mono text-xs text-primary">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="pt-2 font-semibold">{step.title}</h3>
          <p className="pt-2 text-sm text-muted-foreground">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
