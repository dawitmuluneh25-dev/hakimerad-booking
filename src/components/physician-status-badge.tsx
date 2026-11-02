import { Badge } from "@/components/ui/badge.tsx";
import { PHYSICIAN_STATUS_LABELS, type PhysicianStatus } from "@/convex/shared/roles.ts";
import { cn } from "@/lib/utils.ts";

const TONE: Record<PhysicianStatus, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  verified: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200",
  suspended: "bg-zinc-200 text-zinc-900 dark:bg-zinc-500/20 dark:text-zinc-200",
};

export default function PhysicianStatusBadge({ status }: { status: PhysicianStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-0", TONE[status])}>
      {PHYSICIAN_STATUS_LABELS[status]}
    </Badge>
  );
}
