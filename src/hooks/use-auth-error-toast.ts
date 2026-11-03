import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

const AUTH_ERROR_PARAM = "auth_error";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  sign_in_expired: "That sign-in expired. Please sign in again.",
  state_mismatch: "That sign-in could not be verified. Please sign in again.",
  missing_subject: "The provider did not return an account. Please try again.",
  callback_failed: "Sign-in didn't complete. Please try again.",
  not_configured: "Sign-in is not set up yet. Ask an administrator to configure it.",
};

/** Toasts why a sign-in failed (`?auth_error=`), then drops it from the URL. */
export function useAuthErrorToast(signedIn: boolean) {
  const router = useRouter();
  useEffect(() => {
    const url = new URL(window.location.href);
    const reason = url.searchParams.get(AUTH_ERROR_PARAM);
    if (reason === null) return;
    // A reloaded callback can land here already signed in: nothing to report.
    if (!signedIn) {
      // An id, so StrictMode's second run in dev replaces the toast.
      toast.error(
        AUTH_ERROR_MESSAGES[reason] ??
          "Sign-in didn't complete. Please try again.",
        { id: "auth-error" },
      );
    }
    url.searchParams.delete(AUTH_ERROR_PARAM);
    router.history.replace(url.pathname + url.search + url.hash);
  }, [router, signedIn]);
}
