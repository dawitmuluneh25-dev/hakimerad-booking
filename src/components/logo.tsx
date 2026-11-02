import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils.ts";

export default function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("group flex items-center gap-2.5 cursor-pointer", className)}
      aria-label="HakimeRAD home"
    >
      <span className="relative grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <span className="absolute inset-1.5 rounded-full border border-primary-foreground/50" />
        <span className="absolute h-px w-5 rotate-45 bg-primary-foreground" />
        <span className="size-1.5 rounded-full bg-primary-foreground" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-base font-semibold tracking-tight">
          Hakime<span className="text-primary">RAD</span>
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          IR Booking
        </span>
      </span>
    </Link>
  );
}
