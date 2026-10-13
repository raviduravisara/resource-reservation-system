import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readSessionUser } from "./session";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof readSessionUser>>>;

export const getCurrentUser = cache(readSessionUser);

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
