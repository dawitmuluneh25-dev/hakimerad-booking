import { useState } from "react";
import { api, useMutation } from "@/lib/api.ts";
import { ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { errorMessage } from "@/lib/errors.ts";

/** Shown only while no administrator exists, so the owner can claim the first admin seat. */
export default function FirstAdminCard() {
  const claim = useMutation(api.users.claimFirstAdmin);
  const [pending, setPending] = useState(false);

  const onClaim = async () => {
    setPending(true);
    try {
      await claim({});
      toast.success("You are now the administrator");
    } catch (error) {
      toast.error(
        errorMessage(error, "Could not set up the administrator account."),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium">No administrator yet</p>
          <p className="text-sm text-muted-foreground">
            If you run HakimeRAD, claim the administrator account now. This
            option disappears once an administrator exists.
          </p>
        </div>
      </div>
      <Button onClick={onClaim} disabled={pending} className="shrink-0">
        {pending ? <Spinner /> : null}
        Become administrator
      </Button>
    </div>
  );
}
