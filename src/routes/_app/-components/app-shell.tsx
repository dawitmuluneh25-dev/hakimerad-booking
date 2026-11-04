import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MenuIcon, XIcon } from "lucide-react";
import Logo from "@/components/logo.tsx";
import ThemeToggle from "@/components/theme-toggle.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { ROLE_LABELS, type Role } from "@/shared/roles.ts";
import { navForRole } from "@/lib/app-nav.ts";

/** How many destinations fit in the mobile tab bar; the rest go behind "More". */
const MOBILE_SLOTS = 4;

/** Sidebar on desktop, bottom tab bar plus a "More" dialog on mobile. */
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
  const [moreOpen, setMoreOpen] = useState(false);

  const mobilePrimary = nav.slice(0, MOBILE_SLOTS);
  const mobileOverflow = nav.slice(MOBILE_SLOTS);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* The sidebar can be long on a small screen and the tab bar comes last in
          source order, so keyboard users get a way past both. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
          aria-label="App"
        >
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{
                className:
                  "bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary",
                "aria-current": "page",
              }}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-3 border-t p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {name || "Your account"}
            </p>
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
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background md:hidden"
        aria-label="App mobile"
      >
        {mobilePrimary.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-medium", "aria-current": "page" }}
          >
            <item.icon className="size-5" />
            <span className="w-full truncate text-center">{item.label}</span>
          </Link>
        ))}

        {mobileOverflow.length > 0 ? (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted-foreground"
            aria-label="More destinations"
          >
            <MenuIcon className="size-5" />
            <span className="w-full truncate text-center">More</span>
          </button>
        ) : null}
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
            <DialogDescription>
              Everywhere your account can go. Use the bottom bar for the rest.
            </DialogDescription>
          </DialogHeader>
          <nav className="grid gap-1" aria-label="More destinations">
            {mobileOverflow.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{
                  className: "bg-primary/10 text-primary font-medium",
                  "aria-current": "page",
                }}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="space-y-3 border-t pt-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {name || "Your account"}
              </p>
              {role ? (
                <Badge variant="secondary" className="mt-1">
                  {ROLE_LABELS[role]}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <SignInButton variant="secondary" size="sm" className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
              >
                <XIcon />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
