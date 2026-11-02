import { Badge } from "@/components/ui/badge.tsx";
import { REFERRAL_STATUS_LABELS, type ReferralStatus } from "@/convex/shared/referrals.ts";
import { cn } from "@/lib/utils.ts";

const TONE: Record<ReferralStatus, string> = {
  submitted: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200",
  in_review: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200",
  info_requested: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200",
  deferred: "bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-200",
  declined: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200",
  scheduled: "bg-teal-100 text-teal-900 dark:bg-teal-500/15 dark:text-teal-200",
  completed: "bg-zinc-200 text-zinc-900 dark:bg-zinc-500/20 dark:text-zinc-200",
  withdrawn: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
};

export default function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-0", TONE[status])}>
      {REFERRAL_STATUS_LABELS[status]}
    </Badge>
  );
}
