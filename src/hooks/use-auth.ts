import { createContext, useContext } from "react";
import type { SessionUser } from "@/server/auth.ts";

export type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

/** Provided by the root route from the SSR session snapshot. */
export const SessionContext = createContext<AuthState>({
  user: null,
  loading: false,
  signOut: async () => undefined,
});

export function useAuth(): AuthState {
  return useContext(SessionContext);
}

/** The authenticated user (or `null` when signed out), from {@link useAuth}. */
export function useUser(): SessionUser | null {
  return useAuth().user;
}
