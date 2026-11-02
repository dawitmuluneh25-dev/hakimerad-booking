import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

/** The signed-in user's account summary; undefined while loading, null when signed out. */
export function useMe() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.users.me, isAuthenticated ? {} : "skip");
}

export type Me = NonNullable<ReturnType<typeof useMe>>;
