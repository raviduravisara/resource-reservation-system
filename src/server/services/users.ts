import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role } from "@/db/schema";
import { DomainError } from "@/lib/action-state";
import type { SessionUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { revokeUserSessions } from "@/lib/session";
import { isConstraintViolation } from "../db-errors";

export async function authenticate(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) throw new DomainError("Incorrect email or password.");
  if (!user.isActive) throw new DomainError("This account has been deactivated.");
  return user;
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  try {
    await db.insert(users).values({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    });
  } catch (error) {
    if (isConstraintViolation(error, "users_email_unique")) {
      throw new DomainError("A user with this email already exists.");
    }
    throw error;
  }
}

function assertNotSelf(admin: SessionUser, userId: string) {
  if (admin.id === userId) throw new DomainError("You can't change your own account here.");
}

export async function changeUserRole(admin: SessionUser, userId: string, role: Role) {
  assertNotSelf(admin, userId);
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function setUserActive(admin: SessionUser, userId: string, isActive: boolean) {
  assertNotSelf(admin, userId);
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
  if (!isActive) await revokeUserSessions(userId);
}
