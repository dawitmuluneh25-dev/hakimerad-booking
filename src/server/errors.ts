/** Errors that may cross the server-function boundary with a user-facing message. */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "USER_NOT_FOUND";

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function bad(message: string): never {
  throw new AppError("BAD_REQUEST", message);
}
