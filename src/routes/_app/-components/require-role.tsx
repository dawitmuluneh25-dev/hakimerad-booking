import type { ReactNode } from "react";
import { ShieldAlertIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import type { Role } from "@/shared/roles.ts";
import { useMe } from "@/hooks/use-me.ts";

/** UI gate only; every backend function re-checks the role. */
export default function RequireRole({
  roles,
  message = "This area is for administrators only.",
  children,
}: {
  roles: readonly Role[];
  message?: string;
  children: ReactNode;
}) {
  const me = useMe();
  if (!me) return null;
  if (!me.role || !roles.includes(me.role)) {
    return (
      <Empty className="py-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlertIcon />
          </EmptyMedia>
          <EmptyTitle>No access</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <>{children}</>;
}
