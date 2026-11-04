import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils.ts";

/**
 * Official HakimeRAD mark: a broken ring with a 2x2 grid of squares, lifted
 * from the logo used on hakimerad.com (the same geometry as the site's header
 * and favicon). Brand colours are fixed here because this is the logo, not a
 * theme token: navy #0a2540, clinical blue #0077b6, cyan #00b4d8.
 */
const ARCS = [
  "M275.99 234.44A135.75 135.75 0 0 1 172.15 296.83",
  "M150.85 296.83A135.75 135.75 0 0 1 26.17 172.15",
  "M26.17 150.85A135.75 135.75 0 0 1 150.85 26.17",
  "M172.15 26.17A135.75 135.75 0 0 1 275.99 88.56",
] as const;

const SQUARES = [
  { x: 243, y: 95.5, fill: "#0077b6" },
  { x: 315, y: 95.5, fill: "#00b4d8" },
  { x: 243, y: 167.5, fill: "#00b4d8" },
  { x: 315, y: 167.5, fill: "#0077b6" },
] as const;

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 375 323"
      className={cn("size-6 text-white", className)}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth={51.5}>
        {ARCS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {SQUARES.map((square) => (
        <rect
          key={`${square.x}-${square.y}`}
          x={square.x}
          y={square.y}
          width={60}
          height={60}
          rx={12}
          fill={square.fill}
        />
      ))}
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("group flex items-center gap-2.5 cursor-pointer", className)}
      aria-label="HakimeRAD — home"
    >
      <LogoMark className="size-7 shrink-0 text-[#0077b6] dark:text-white" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[17px] font-bold tracking-tight">
          <span className="text-[#0a2540] dark:text-white">Hakim</span>
          <span className="text-[#0077b6] dark:text-[#00b4d8]">eRAD</span>
        </span>
        {/* Sized so the rendered tagline matches the wordmark's 102.7px ink
            width exactly: 7px at 0.1em tracking measures 103.25px. */}
        <span className="mt-[3px] whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Your Reliable Partner!
        </span>
      </span>
    </Link>
  );
}
