import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, SirenIcon } from "lucide-react";
import { PROCEDURES } from "@/lib/procedures.ts";
import { cn } from "@/lib/utils.ts";

/** Biopsy and drainage start an online form; intussusception never does. */
export default function ProcedureChooser({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {PROCEDURES.map((p) =>
        p.urgent ? (
          <Link
            key={p.slug}
            to="/procedures/$slug"
            params={{ slug: p.slug }}
            className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-5 transition-colors hover:border-destructive"
          >
            <SirenIcon className="size-5 text-destructive" />
            <p className="font-semibold">{p.shortName}</p>
            <p className="text-sm text-muted-foreground">Urgent hospital coordination only. Not bookable online.</p>
            <p className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-destructive">
              See emergency contacts
              <ArrowRightIcon className="size-4" />
            </p>
          </Link>
        ) : (
          <Link
            key={p.slug}
            to="/requests/new/$procedure"
            params={{ procedure: p.slug }}
            className="group flex cursor-pointer flex-col gap-2 rounded-xl border bg-background p-5 transition-colors hover:border-primary/60"
          >
            <p.icon className="size-5 text-primary" />
            <p className="font-semibold">{p.shortName}</p>
            <p className="text-sm text-muted-foreground">{p.summary}</p>
            <p className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
              Start request
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        ),
      )}
    </div>
  );
}
