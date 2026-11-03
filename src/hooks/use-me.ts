import { api, useAuthStatus, useQuery } from "@/lib/api.ts";

/** The signed-in user's account summary; undefined while loading, null when signed out. */
export function useMe() {
  const { isAuthenticated } = useAuthStatus();
  return useQuery(api.users.me, isAuthenticated ? {} : "skip");
}

export type Me = NonNullable<ReturnType<typeof useMe>>;
