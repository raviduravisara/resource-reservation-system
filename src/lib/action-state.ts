import type { z } from "zod";

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export const idle: ActionState = {};

export function fieldErrors(error: z.ZodError): ActionState {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (errors[key] ??= []).push(issue.message);
  }
  return { ok: false, message: "Please fix the highlighted fields.", errors };
}

export class DomainError extends Error {}
