import { PhoneIcon, SirenIcon } from "lucide-react";
import { INTUSSUSCEPTION_WARNING, site } from "@/lib/site.ts";
import { cn } from "@/lib/utils.ts";

/** The mandatory warning shown wherever intussusception reduction is presented. */
export default function UrgentNotice({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/40 bg-destructive/8 p-5 text-foreground dark:bg-destructive/15",
        className,
      )}
    >
      <div className="flex gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive text-white dark:bg-[oklch(0.5_0.19_27)]">
          <SirenIcon className="size-5" />
        </span>
        <div className="space-y-3">
          <p className="font-display font-semibold text-destructive">
            Urgent: Hydrostatic intussusception reduction
          </p>
          <p className={cn("text-sm leading-relaxed", compact && "line-clamp-3 sm:line-clamp-none")}>
            {INTUSSUSCEPTION_WARNING}
          </p>
          <a
            href={`tel:${site.contact.emergencyPhone.replace(/[^\d+]/g, "")}`}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-white hover:bg-destructive/90 dark:bg-[oklch(0.5_0.19_27)] dark:hover:bg-[oklch(0.45_0.19_27)]"
          >
            <PhoneIcon className="size-4" />
            Emergency coordination line: {site.contact.emergencyPhone}
          </a>
        </div>
      </div>
    </div>
  );
}
