import "server-only";
import { and, asc, eq, gt, gte, inArray, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, maintenanceWindows, reservations, resourceHours, resources } from "@/db/schema";
import { ACTIVE_STATUSES, checkOpeningHours } from "@/lib/booking-rules";
import { formatIn } from "@/lib/time";

export type AvailabilityResult = {
  id: string;
  name: string;
  categoryName: string;
  location: string | null;
  capacity: number | null;
  requiresApproval: boolean;
  available: boolean;
  reason?: string;
};

export async function findAvailability(query: {
  startsAt: Date;
  endsAt: Date;
  categoryId?: string;
  minCapacity?: number;
}): Promise<AvailabilityResult[]> {
  const conditions: (SQL | undefined)[] = [eq(resources.isActive, true)];
  if (query.categoryId) conditions.push(eq(resources.categoryId, query.categoryId));
  if (query.minCapacity) conditions.push(gte(resources.capacity, query.minCapacity));

  const candidates = await db
    .select({
      id: resources.id,
      name: resources.name,
      location: resources.location,
      capacity: resources.capacity,
      requiresApproval: resources.requiresApproval,
      categoryName: categories.name,
    })
    .from(resources)
    .innerJoin(categories, eq(resources.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(asc(categories.name), asc(resources.name));

  if (!candidates.length) return [];
  const ids = candidates.map((c) => c.id);

  const [hours, conflicts, maintenance] = await Promise.all([
    db.select().from(resourceHours).where(inArray(resourceHours.resourceId, ids)),
    db
      .select({
        resourceId: reservations.resourceId,
        startsAt: reservations.startsAt,
        endsAt: reservations.endsAt,
      })
      .from(reservations)
      .where(
        and(
          inArray(reservations.resourceId, ids),
          inArray(reservations.status, ACTIVE_STATUSES),
          lt(reservations.startsAt, query.endsAt),
          gt(reservations.endsAt, query.startsAt),
        ),
      )
      .orderBy(asc(reservations.startsAt)),
    db
      .select({ resourceId: maintenanceWindows.resourceId, reason: maintenanceWindows.reason })
      .from(maintenanceWindows)
      .where(
        and(
          inArray(maintenanceWindows.resourceId, ids),
          lt(maintenanceWindows.startsAt, query.endsAt),
          gt(maintenanceWindows.endsAt, query.startsAt),
        ),
      ),
  ]);

  const results = candidates.map((candidate): AvailabilityResult => {
    const closed = checkOpeningHours(
      hours.filter((h) => h.resourceId === candidate.id),
      query.startsAt,
      query.endsAt,
    );
    if (closed) return { ...candidate, available: false, reason: "Closed during this time" };

    const down = maintenance.find((m) => m.resourceId === candidate.id);
    if (down) return { ...candidate, available: false, reason: `Maintenance: ${down.reason}` };

    const clashes = conflicts.filter((c) => c.resourceId === candidate.id);
    if (clashes.length) {
      const times = clashes
        .map((c) => `${formatIn(c.startsAt, "h:mm a")}–${formatIn(c.endsAt, "h:mm a")}`)
        .join(", ");
      return { ...candidate, available: false, reason: `Booked ${times}` };
    }

    return { ...candidate, available: true };
  });

  return results.sort((a, b) => Number(b.available) - Number(a.available));
}
