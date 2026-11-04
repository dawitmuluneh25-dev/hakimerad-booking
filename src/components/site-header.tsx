import { Link } from "@tanstack/react-router";
import { LayoutDashboardIcon, MenuIcon } from "lucide-react";
import Logo from "@/components/logo.tsx";
import ThemeToggle from "@/components/theme-toggle.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { site } from "@/lib/site.ts";
import { useAuth } from "@/hooks/use-auth.ts";

export default function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {site.nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="cursor-pointer rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium", "aria-current": "page" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              render={<Link to="/dashboard" />}
              nativeButton={false}
            >
              <LayoutDashboardIcon />
              My account
            </Button>
          ) : (
            <SignInButton variant="ghost" size="sm" className="hidden sm:inline-flex" />
          )}
          <Button
            size="sm"
            className="hidden sm:inline-flex"
            render={<Link to="/request" />}
            nativeButton={false}
          >
            Start a request
          </Button>
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {site.nav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="cursor-pointer rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                    activeProps={{ "aria-current": "page", className: "bg-muted font-medium" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-2 px-4">
                <Button render={<Link to="/request" />} nativeButton={false}>
                  Start a request
                </Button>
                {user ? (
                  <Button variant="secondary" render={<Link to="/dashboard" />} nativeButton={false}>
                    My account
                  </Button>
                ) : null}
                <SignInButton variant="secondary" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
