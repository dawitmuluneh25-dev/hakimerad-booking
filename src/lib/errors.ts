/**
 * Server functions send their failure as a JSON body; TanStack rethrows it as
 * an Error whose message is that body. Older call sites still pass a fallback.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message?.trim();
    if (!message) return fallback;
    try {
      const parsed: unknown = JSON.parse(message);
      if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
        return parsed.message;
      }
    } catch {
      // Not JSON: a plain message from the server or the network layer.
    }
    // Strip a leading "Error: " or "AppError: " prefix.
    return message.replace(/^[A-Za-z]*Error:\s*/, "") || fallback;
  }
  return fallback;
}
