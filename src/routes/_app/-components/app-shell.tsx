import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import Logo from "@/components/logo.tsx";
import ThemeToggle from "@/components/theme-toggle.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { ROLE_LABELS, type Role } from "@/convex/shared/roles.ts";
import { navForRole } from "@/lib/app-nav.ts";

/** Sidebar on desktop, bottom tab bar on mobile. */
export default function AppShell({
  role,
  name,
  children,
}: {
  role: Role | null;
  name: string;
  children: ReactNode;
}) {
  const nav = navForRole(role);
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="App">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-3 border-t p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name || "Your account"}</p>
            {role ? (
              <Badge variant="secondary" className="mt-1">
                {ROLE_LABELS[role]}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SignInButton variant="secondary" size="sm" className="flex-1" />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <Logo />
          <ThemeToggle />
        </header>
        <main id="main" className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-background md:hidden"
        aria-label="App mobile"
      >
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-medium" }}
          >
            <item.icon className="size-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
