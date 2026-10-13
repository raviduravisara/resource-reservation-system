import "server-only";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reservations, users } from "@/db/schema";

export async function listUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      reservationCount: count(reservations.id),
    })
    .from(users)
    .leftJoin(reservations, eq(reservations.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.isActive), asc(users.name));
}
