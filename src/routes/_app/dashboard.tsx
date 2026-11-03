import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BellIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  SirenIcon,
  UserCogIcon,
} from "lucide-react";
import AppPage from "@/components/app-page.tsx";
import PhysicianStatusBadge from "@/components/physician-status-badge.tsx";
import UrgentNotice from "@/components/urgent-notice.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { ROLE_LABELS, isStaffRole } from "@/shared/roles.ts";
import { useMe, type Me } from "@/hooks/use-me.ts";
import FirstAdminCard from "./-components/first-admin-card.tsx";
import PhysicianProfileForm from "./-components/physician-profile-form.tsx";
import ProcedureChooser from "./requests/-components/procedure-chooser.tsx";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | HakimeRAD IR Booking" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const me = useMe();
  if (!me) return null;
  const firstName = me.fullName.split(" ")[0] || "there";
  return (
    <AppPage
      title={`Welcome, ${firstName}`}
      description={me.role ? ROLE_LABELS[me.role] : undefined}
    >
      <div className="space-y-6">
        {!me.adminExists ? <FirstAdminCard /> : null}
        {me.role === "physician" ? <PhysicianPanel me={me} /> : null}
        {me.role === "patient" ? <PatientPanel /> : null}
        {me.role === "admin" ? <AdminPanel /> : null}
        {isStaffRole(me.role ?? undefined) && me.role !== "admin" ? (
          <StaffPanel />
        ) : null}
      </div>
    </AppPage>
  );
}

function PhysicianPanel({ me }: { me: Me }) {
  const profile = me.physicianProfile;
  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify your professional profile</CardTitle>
          <CardDescription>
            Referral privileges are granted after an administrator checks your
            registration details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhysicianProfileForm
            profile={null}
            defaultName={me.fullName}
            defaultPhone={me.phone}
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Professional profile</CardTitle>
          <PhysicianStatusBadge status={profile.status} />
        </div>
        <CardDescription>
          {profile.status === "pending" &&
            "Thanks. An administrator will review your details. You will be able to refer once verified."}
          {profile.status === "verified" &&
            "You are verified and can submit referrals."}
          {profile.status === "rejected" &&
            "Your profile was not approved. Update the details below and resubmit."}
          {profile.status === "suspended" &&
            "Your referral access is suspended. Please contact HakimeRAD."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.reviewNote ? (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <span className="font-medium">Note from administrator: </span>
            {profile.reviewNote}
          </div>
        ) : null}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail
            label="Registration number"
            value={profile.registrationNumber}
          />
          <Detail label="Licensing body" value={profile.licensingBody} />
          <Detail label="Specialty" value={profile.specialty} />
          <Detail label="Facility" value={profile.facilityName} />
        </dl>
        <Button
          variant="secondary"
          render={<Link to="/account" />}
          nativeButton={false}
        >
          Edit profile
        </Button>
        {profile.status === "verified" ? (
          <div className="space-y-3 border-t pt-5">
            <p className="text-sm font-medium">Refer a patient</p>
            <ProcedureChooser />
            <Button
              variant="ghost"
              render={<Link to="/requests" />}
              nativeButton={false}
            >
              View my referrals
              <ArrowRightIcon />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function PatientPanel() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardListIcon className="size-5 text-primary" />
            Your requests
          </CardTitle>
          <CardDescription>
            Start a request for biopsy/FNAC or abscess drainage. A submitted
            request is reviewed by a clinician and is not a confirmed
            appointment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProcedureChooser />
          <Button
            variant="secondary"
            render={<Link to="/requests" />}
            nativeButton={false}
          >
            Track my requests
            <ArrowRightIcon />
          </Button>
        </CardContent>
      </Card>
      <UrgentNotice />
    </>
  );
}

function AdminPanel() {
  const links = [
    {
      to: "/admin/physicians" as const,
      icon: BadgeCheckIcon,
      title: "Verify physicians",
      body: "Review registration details and grant referral access.",
    },
    {
      to: "/admin/users" as const,
      icon: UserCogIcon,
      title: "Users and roles",
      body: "Assign receptionist, radiologist, coordinator and admin roles.",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="group cursor-pointer rounded-xl border bg-card p-6 transition-colors hover:border-primary/60"
        >
          <l.icon className="size-5 text-primary" />
          <p className="pt-3 font-semibold">{l.title}</p>
          <p className="pt-1 text-sm text-muted-foreground">{l.body}</p>
        </Link>
      ))}
    </div>
  );
}

function StaffPanel() {
  const links = [
    {
      to: "/staff/queue" as const,
      icon: ClipboardListIcon,
      title: "Work queue",
      body: "Review incoming requests and approve, defer or request information.",
    },
    {
      to: "/schedule" as const,
      icon: CalendarDaysIcon,
      title: "Schedule",
      body: "Book approved requests and arrange procedure days.",
    },
    {
      to: "/urgent" as const,
      icon: SirenIcon,
      title: "Urgent coordination",
      body: "Hospital referrals for hydrostatic reduction.",
    },
    {
      to: "/notifications" as const,
      icon: BellIcon,
      title: "Notifications",
      body: "What the team has been sent, and any delivery that failed.",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="group cursor-pointer rounded-xl border bg-card p-6 transition-colors hover:border-primary/60"
        >
          <link.icon className="size-5 text-primary" />
          <p className="pt-3 font-semibold">{link.title}</p>
          <p className="pt-1 text-sm text-muted-foreground">{link.body}</p>
        </Link>
      ))}
    </div>
  );
}
