import { Link } from "@tanstack/react-router";
import Logo from "@/components/logo.tsx";
import { PROCEDURES } from "@/lib/procedures.ts";
import { site } from "@/lib/site.ts";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-1">
          <Logo />
          <p className="text-sm text-muted-foreground">{site.organization}</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Procedures</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {PROCEDURES.map((p) => (
              <li key={p.slug}>
                <Link
                  to="/procedures/$slug"
                  params={{ slug: p.slug }}
                  className="cursor-pointer hover:text-foreground"
                >
                  {p.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Information</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {site.nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="cursor-pointer hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Policies</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/privacy" className="cursor-pointer hover:text-foreground">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/booking-policy" className="cursor-pointer hover:text-foreground">
                Booking policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {"©"} {year} {site.organization}. All rights reserved.
          </p>
          <p>This site does not provide emergency care. {site.contact.emergencyNote}</p>
        </div>
      </div>
    </footer>
  );
}
