import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon, ShieldAlertIcon } from "lucide-react";
import AppPage from "@/components/app-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { PROCEDURE_LABELS, isReferralProcedure } from "@/convex/shared/referrals.ts";
import { useMe } from "@/hooks/use-me.ts";
import RequireRole from "../../-components/require-role.tsx";
import ReferralForm from "../-components/referral-form.tsx";

export const Route = createFileRoute("/_app/requests/new/$procedure")({
  loader: ({ params }) => {
    if (!isReferralProcedure(params.procedure)) throw notFound();
    return { title: PROCEDURE_LABELS[params.procedure] };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `New request: ${loaderData?.title ?? "Procedure"} | HakimeRAD IR Booking` }],
  }),
  component: () => (
    <RequireRole roles={["patient", "physician"]} message="Requests are submitted by patients, guardians and verified physicians.">
      <NewRequestPage />
    </RequireRole>
  ),
});

function NewRequestPage() {
  const { procedure } = Route.useParams();
  const me = useMe();
  if (!me || !isReferralProcedure(procedure)) return null;
  const blocked = me.role === "physician" && me.physicianProfile?.status !== "verified";

  return (
    <AppPage
      title={PROCEDURE_LABELS[procedure]}
      description="New request for clinical review. This is not a confirmed appointment."
      actions={
        <Button variant="ghost" size="sm" render={<Link to="/requests" />} nativeButton={false}>
          <ArrowLeftIcon />
          My requests
        </Button>
      }
    >
      {blocked ? (
        <Empty className="rounded-xl border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Verification needed</EmptyTitle>
            <EmptyDescription>
              Your physician profile must be verified by an administrator before you can submit referrals.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/dashboard" />} nativeButton={false}>
              Check my status
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="max-w-3xl">
          <ReferralForm procedure={procedure} me={me} />
        </div>
      )}
    </AppPage>
  );
}
