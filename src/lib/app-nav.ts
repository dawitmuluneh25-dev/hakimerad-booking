import {
  BadgeCheckIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  UserCogIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/convex/shared/roles.ts";
import type { RoutePath } from "@/router.tsx";

export type AppNavItem = {
  label: string;
  to: RoutePath;
  icon: LucideIcon;
  roles?: readonly Role[];
};

const APP_NAV: AppNavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Requests", to: "/requests", icon: ClipboardListIcon, roles: ["patient", "physician"] },
  { label: "Physicians", to: "/admin/physicians", icon: BadgeCheckIcon, roles: ["admin"] },
  { label: "Users & roles", to: "/admin/users", icon: UserCogIcon, roles: ["admin"] },
  { label: "My account", to: "/account", icon: UserRoundIcon },
];

export function navForRole(role: Role | null): AppNavItem[] {
  return APP_NAV.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
}
