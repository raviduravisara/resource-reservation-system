import "server-only";
import { and, asc, count, eq, gt, gte, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  maintenanceWindows,
  reservations,
  resourceHours,
  resources,
} from "@/db/schema";
import {
  displayClock,
  formatIn,
  minutesIntoDay,
  parseClock,
  toDateKey,
  toInstant,
  weekdayOf,
} from "@/lib/time";

export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      resourceCount: count(resources.id),
    })
    .from(categories)
    .leftJoin(resources, eq(resources.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

export async function listResources(filter: {
  categoryId?: string;
  query?: string;
  includeInactive?: boolean;
}) {
  const conditions: (SQL | undefined)[] = [];
  if (!filter.includeInactive) conditions.push(eq(resources.isActive, true));
  if (filter.categoryId) conditions.push(eq(resources.categoryId, filter.categoryId));
  if (filter.query) {
    const pattern = `%${filter.query}%`;
    conditions.push(
      or(
        ilike(resources.name, pattern),
        ilike(resources.location, pattern),
        ilike(resources.description, pattern),
      ),
    );
  }

  return db
    .select({
      id: resources.id,
      name: resources.name,
      description: resources.description,
      location: resources.location,
      capacity: resources.capacity,
      requiresApproval: resources.requiresApproval,
      isActive: resources.isActive,
      categoryName: categories.name,
    })
    .from(resources)
    .innerJoin(categories, eq(resources.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(asc(categories.name), asc(resources.name));
}

export async function getResource(id: string) {
  return db.query.resources.findFirst({
    where: eq(resources.id, id),
    with: {
      category: true,
      hours: { orderBy: asc(resourceHours.weekday) },
    },
  });
}

export async function listUpcomingMaintenance(resourceId: string) {
  return db
    .select()
    .from(maintenanceWindows)
    .where(and(eq(maintenanceWindows.resourceId, resourceId), gt(maintenanceWindows.endsAt, new Date())))
    .orderBy(asc(maintenanceWindows.startsAt));
}

export type LiveStatus = {
  tone: "green" | "amber" | "red" | "neutral";
  label: string;
};

export async function getLiveStatuses(resourceIds: string[], now: Date) {
  const statuses = new Map<string, LiveStatus>();
  if (!resourceIds.length) return statuses;

  const todayKey = toDateKey(now);
  const dayStart = toInstant(todayKey, "00:00");
  const dayEnd = toInstant(todayKey, "23:59");
  const weekday = weekdayOf(now);
  const nowMinutes = minutesIntoDay(now);

  const [hours, bookings, maintenance] = await Promise.all([
    db
      .select()
      .from(resourceHours)
      .where(and(inArray(resourceHours.resourceId, resourceIds), eq(resourceHours.weekday, weekday))),
    db
      .select({
        resourceId: reservations.resourceId,
        startsAt: reservations.startsAt,
        endsAt: reservations.endsAt,
      })
      .from(reservations)
      .where(
        and(
          inArray(reservations.resourceId, resourceIds),
          eq(reservations.status, "confirmed"),
          gte(reservations.endsAt, now),
          lt(reservations.startsAt, dayEnd),
        ),
      )
      .orderBy(asc(reservations.startsAt)),
    db
      .select()
      .from(maintenanceWindows)
      .where(
        and(
          inArray(maintenanceWindows.resourceId, resourceIds),
          lt(maintenanceWindows.startsAt, now),
          gt(maintenanceWindows.endsAt, now),
        ),
      ),
  ]);

  for (const id of resourceIds) {
    const down = maintenance.find((m) => m.resourceId === id);
    if (down) {
      statuses.set(id, { tone: "red", label: `Maintenance until ${formatIn(down.endsAt, "h:mm a")}` });
      continue;
    }

    const today = hours.find((h) => h.resourceId === id);
    if (!today || nowMinutes >= parseClock(today.closesAt)) {
      statuses.set(id, { tone: "neutral", label: "Closed for today" });
      continue;
    }
    if (nowMinutes < parseClock(today.opensAt)) {
      statuses.set(id, { tone: "neutral", label: `Opens at ${displayClock(today.opensAt)}` });
      continue;
    }

    const own = bookings.filter((b) => b.resourceId === id && b.endsAt > dayStart);
    const current = own.find((b) => b.startsAt <= now && b.endsAt > now);
    if (current) {
      statuses.set(id, { tone: "amber", label: `In use until ${formatIn(current.endsAt, "h:mm a")}` });
      continue;
    }

    const next = own.find((b) => b.startsAt > now);
    statuses.set(id, {
      tone: "green",
      label: next
        ? `Free until ${formatIn(next.startsAt, "h:mm a")}`
        : `Free until ${displayClock(today.closesAt)}`,
    });
  }

  return statuses;
}
