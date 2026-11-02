import type { ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

/** Standard public content page: eyebrow, title, intro, then body. */
export default function PublicPage({
  eyebrow,
  title,
  intro,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20", className)}>
      <div className="max-w-3xl space-y-4 pb-10">
        {eyebrow ? (
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {intro ? <div className="text-lg text-muted-foreground">{intro}</div> : null}
      </div>
      {children}
    </div>
  );
}
