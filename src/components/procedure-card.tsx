import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import type { ProcedureInfo } from "@/lib/procedures.ts";
import { cn } from "@/lib/utils.ts";

export default function ProcedureCard({ procedure }: { procedure: ProcedureInfo }) {
  const Icon = procedure.icon;
  return (
    <Link
      to="/procedures/$slug"
      params={{ slug: procedure.slug }}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col gap-5 overflow-hidden rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        procedure.urgent ? "border-destructive/40 hover:border-destructive/70" : "hover:border-primary/50",
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid size-11 place-items-center rounded-lg",
            procedure.urgent ? "bg-destructive/10 text-destructive" : "bg-accent text-primary",
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="font-mono text-xs text-muted-foreground">{procedure.code}</span>
      </div>
      <div className="flex-1 space-y-2">
        <h3 className="text-lg font-semibold leading-snug">{procedure.name}</h3>
        <p className="text-sm text-muted-foreground">{procedure.summary}</p>
      </div>
      <div className="flex items-center justify-between">
        {procedure.urgent ? (
          <Badge variant="destructive">Urgent hospital coordination</Badge>
        ) : (
          <Badge variant="secondary">Referral and clinical review</Badge>
        )}
        <ArrowUpRightIcon className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </Link>
  );
}
