import { Outlet, createFileRoute } from "@tanstack/react-router";
import { LockIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useMe } from "@/hooks/use-me.ts";
import AppShell from "./_app/-components/app-shell.tsx";
import Onboarding from "./_app/-components/onboarding.tsx";

export const Route = createFileRoute("/_app")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

function AppLayout() {
  const { user } = useAuth();
  if (!user) return <SignedOut />;
  return <SignedInApp />;
}

function SignedInApp() {
  const me = useMe();
  if (me === undefined || me === null) return <ShellSkeleton />;
  if (!me.role) return <Onboarding me={me} />;
  return (
    <AppShell role={me.role} name={me.fullName || me.email}>
      <Outlet />
    </AppShell>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-64 border-r p-5 md:block">
        <Skeleton className="h-8 w-36" />
        <div className="space-y-2 pt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full max-w-3xl" />
      </div>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <Empty className="max-w-md rounded-xl border bg-background">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon />
          </EmptyMedia>
          <EmptyTitle>Sign in to continue</EmptyTitle>
          <EmptyDescription>
            Your requests and referrals are private. Sign in to view your account.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SignInButton />
        </EmptyContent>
      </Empty>
    </div>
  );
}
