import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { categories, reservations, resourceHours, resources, users } from "../src/db/schema";
import { addDaysToKey, toDateKey, toInstant } from "../src/lib/time";
import { createReservation } from "../src/server/services/reservations";

const ATTEMPTS = 20;

async function main() {
  const people = await db.select().from(users).where(eq(users.isActive, true));
  const [category] = await db.select().from(categories).limit(1);
  if (!people.length || !category) throw new Error("Run `npm run db:seed` first.");

  const [resource] = await db
    .insert(resources)
    .values({ name: `Race test ${Date.now()}`, categoryId: category.id })
    .returning();

  const day = addDaysToKey(toDateKey(new Date()), 7);
  await db
    .insert(resourceHours)
    .values([0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ resourceId: resource.id, weekday, opensAt: "00:00", closesAt: "23:45" })));

  try {
    console.log(`Sending ${ATTEMPTS} simultaneous bookings for the same slot…`);
    const results = await Promise.allSettled(
      Array.from({ length: ATTEMPTS }, (_, i) => {
        const person = people[i % people.length];
        return createReservation(
          { id: person.id, name: person.name, email: person.email, role: "member" },
          {
            resourceId: resource.id,
            title: `Attempt ${i + 1}`,
            startsAt: toInstant(day, "10:00"),
            endsAt: toInstant(day, i % 2 ? "11:00" : "10:45"),
          },
        );
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected");
    console.log(`Succeeded: ${succeeded}, rejected: ${rejected.length}`);
    if (rejected[0]?.status === "rejected") console.log(`Example rejection: ${(rejected[0].reason as Error).message}`);

    if (succeeded !== 1) throw new Error(`Expected exactly 1 booking, got ${succeeded}.`);
    console.log("PASS: the database allowed exactly one booking.");
  } finally {
    await db.delete(reservations).where(eq(reservations.resourceId, resource.id));
    await db.delete(resources).where(eq(resources.id, resource.id));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
