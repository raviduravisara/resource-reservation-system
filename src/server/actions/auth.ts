"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type ActionState } from "@/lib/action-state";
import { createSession, destroySession } from "@/lib/session";
import { authenticate } from "../services/users";
import { formObject, handle } from "./helpers";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

function safeRedirectPath(path?: string) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const result = await handle(async () => {
    const user = await authenticate(parsed.data.email, parsed.data.password);
    await createSession(user.id);
    return { ok: true };
  });
  if (!result.ok) return result;

  redirect(safeRedirectPath(parsed.data.next));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
