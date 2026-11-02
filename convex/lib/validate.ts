import { ConvexError } from "convex/values";

/** Trims and checks a required free-text field. */
export function requireText(value: string, label: string, max = 200): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    throw new ConvexError({ code: "BAD_REQUEST", message: `${label} is required.` });
  }
  if (trimmed.length > max) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `${label} must be ${max} characters or fewer.`,
    });
  }
  return trimmed;
}

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export function requirePhone(value: string): string {
  const trimmed = value.trim();
  if (!PHONE_PATTERN.test(trimmed)) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Enter a valid phone number, e.g. +251 911 234 567.",
    });
  }
  return trimmed;
}

export function optionalText(
  value: string | undefined,
  label: string,
  max = 1000,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return requireText(trimmed, label, max);
}
