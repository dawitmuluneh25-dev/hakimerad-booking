import { ConvexError } from "convex/values";

/** User-facing message from a Convex error, with a fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
      return data.message;
    }
  }
  return fallback;
}
