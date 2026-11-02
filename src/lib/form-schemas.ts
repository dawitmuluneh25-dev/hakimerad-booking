import { z } from "zod";

export const PHONE_REGEX = /^\+?[0-9 ()-]{7,20}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_REGEX, "Enter a valid phone number, e.g. +251 911 234 567");

export const requiredText = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(2, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
