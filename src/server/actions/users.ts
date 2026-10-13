"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import { changeUserRole, createUser, setUserActive } from "../services/users";
import { formObject, handle } from "./helpers";

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  role: z.enum(["admin", "member"]),
});

export async function addUser(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = userSchema.safeParse(formObject(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  return handle(async () => {
    await createUser(parsed.data);
    refresh();
    return { ok: true, message: `${parsed.data.name} can now sign in with ${parsed.data.email}.` };
  });
}

const roleSchema = z.object({ id: z.uuid(), role: z.enum(["admin", "member"]) });

export async function updateRole(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = roleSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  return handle(async () => {
    await changeUserRole(admin, parsed.data.id, parsed.data.role);
    refresh();
    return { ok: true };
  });
}

const activeSchema = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) });

export async function toggleUserActive(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = activeSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  return handle(async () => {
    await setUserActive(admin, parsed.data.id, parsed.data.active === "true");
    refresh();
    return { ok: true };
  });
}
