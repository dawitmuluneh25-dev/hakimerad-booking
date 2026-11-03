import { useCallback, useMemo, useState } from "react";
import { SessionContext, type AuthState } from "@/hooks/use-auth.ts";
import type { SessionUser } from "@/server/auth.ts";

/**
 * `initialUser` comes from the root route's `beforeLoad`, so `useAuth()` is
 * already correct in the server-rendered HTML.
 */
export default function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/auth/sign-out", { method: "POST", credentials: "same-origin" });
      window.location.assign("/");
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user: initialUser, loading, signOut }),
    [initialUser, loading, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
