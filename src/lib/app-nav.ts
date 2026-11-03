import {
  BadgeCheckIcon,
  BellIcon,
  BuildingIcon,
  CalendarDaysIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ScrollTextIcon,
  SettingsIcon,
  SirenIcon,
  UserCogIcon,
  UserRoundIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/shared/roles.ts";
import type { RoutePath } from "@/router.tsx";

export type AppNavItem = {
  label: string;
  to: RoutePath;
  icon: LucideIcon;
  roles?: readonly Role[];
};

const STAFF: readonly Role[] = [
  "receptionist",
  "radiologist",
  "coordinator",
  "admin",
];

const APP_NAV: AppNavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboardIcon },
  {
    label: "Work queue",
    to: "/staff/queue",
    icon: ListChecksIcon,
    roles: STAFF,
  },
  { label: "Schedule", to: "/schedule", icon: CalendarDaysIcon, roles: STAFF },
  {
    label: "Urgent",
    to: "/urgent",
    icon: SirenIcon,
    roles: ["physician", "receptionist", "radiologist", "coordinator", "admin"],
  },
  {
    label: "Requests",
    to: "/requests",
    icon: ClipboardListIcon,
    roles: ["patient", "physician"],
  },
  { label: "Notifications", to: "/notifications", icon: BellIcon },
  {
    label: "Reports",
    to: "/admin/reports",
    icon: ChartColumnIcon,
    roles: ["admin"],
  },
  {
    label: "Audit log",
    to: "/admin/audit",
    icon: ScrollTextIcon,
    roles: ["admin"],
  },
  {
    label: "Physicians",
    to: "/admin/physicians",
    icon: BadgeCheckIcon,
    roles: ["admin"],
  },
  {
    label: "Users & roles",
    to: "/admin/users",
    icon: UserCogIcon,
    roles: ["admin"],
  },
  {
    label: "Resources",
    to: "/admin/resources",
    icon: WrenchIcon,
    roles: ["admin"],
  },
  {
    label: "Institutions",
    to: "/admin/institutions",
    icon: BuildingIcon,
    roles: ["admin"],
  },
  {
    label: "Settings",
    to: "/admin/settings",
    icon: SettingsIcon,
    roles: ["admin"],
  },
  { label: "My account", to: "/account", icon: UserRoundIcon },
];

export function navForRole(role: Role | null): AppNavItem[] {
  return APP_NAV.filter(
    (item) => !item.roles || (role !== null && item.roles.includes(role)),
  );
}
