import "server-only";
import { z } from "zod";
import { DomainError, type ActionState } from "@/lib/action-state";

export async function handle(run: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.message };
    throw error;
  }
}

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => value || undefined);

export const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number("Enter a whole number.").int("Enter a whole number.").positive("Must be greater than zero.").max(100_000).optional(),
);

export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
export const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time.");

export function formObject(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([key]) => !key.startsWith("$ACTION")),
  );
}
