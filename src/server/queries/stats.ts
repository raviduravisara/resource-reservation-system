import "server-only";
import { and, asc, count, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { reservations, resourceHours, resources } from "@/db/schema";
import { ACTIVE_STATUSES } from "@/lib/booking-rules";
import { addDaysToKey, parseClock, toDateKey, toInstant, weekdayOfKey } from "@/lib/time";

export async function getOverviewCounts(now: Date, userId?: string) {
  const todayKey = toDateKey(now);
  const dayStart = toInstant(todayKey, "00:00");
  const dayEnd = toInstant(addDaysToKey(todayKey, 1), "00:00");
  const weekEnd = toInstant(addDaysToKey(todayKey, 7), "00:00");
  const owner = userId ? eq(reservations.userId, userId) : undefined;

  const [[activeResources], [today], [nextWeek], [pending]] = await Promise.all([
    db.select({ total: count() }).from(resources).where(eq(resources.isActive, true)),
    db
      .select({ total: count() })
      .from(reservations)
      .where(
        and(
          owner,
          inArray(reservations.status, ACTIVE_STATUSES),
          lt(reservations.startsAt, dayEnd),
          gt(reservations.endsAt, dayStart),
        ),
      ),
    db
      .select({ total: count() })
      .from(reservations)
      .where(
        and(
          owner,
          eq(reservations.status, "confirmed"),
          gt(reservations.startsAt, now),
          lt(reservations.startsAt, weekEnd),
        ),
      ),
    db
      .select({ total: count() })
      .from(reservations)
      .where(and(owner, eq(reservations.status, "pending"), gt(reservations.startsAt, now))),
  ]);

  return {
    activeResources: activeResources.total,
    today: today.total,
    nextWeek: nextWeek.total,
    pending: pending.total,
  };
}

export type UtilizationRow = {
  id: string;
  name: string;
  bookedHours: number;
  openHours: number;
  bookings: number;
  rate: number;
};

export async function getUtilization(now: Date, days = 30): Promise<UtilizationRow[]> {
  const todayKey = toDateKey(now);
  const fromKey = addDaysToKey(todayKey, -days);
  const from = toInstant(fromKey, "00:00");
  const to = toInstant(todayKey, "00:00");

  const [activeResources, hours, usage] = await Promise.all([
    db
      .select({ id: resources.id, name: resources.name })
      .from(resources)
      .where(eq(resources.isActive, true))
      .orderBy(asc(resources.name)),
    db.select().from(resourceHours),
    db
      .select({
        resourceId: reservations.resourceId,
        bookings: count(),
        bookedMinutes: sql<number>`coalesce(sum(extract(epoch from (least(${reservations.endsAt}, ${to}) - greatest(${reservations.startsAt}, ${from}))) / 60), 0)`.mapWith(Number),
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.status, "confirmed"),
          lt(reservations.startsAt, to),
          gt(reservations.endsAt, from),
        ),
      )
      .groupBy(reservations.resourceId),
  ]);

  const weekdayCounts = Array<number>(7).fill(0);
  for (let i = 0; i < days; i++) weekdayCounts[weekdayOfKey(addDaysToKey(fromKey, i))]++;

  return activeResources
    .map((resource) => {
      const openMinutes = hours
        .filter((h) => h.resourceId === resource.id)
        .reduce(
          (total, h) => total + (parseClock(h.closesAt) - parseClock(h.opensAt)) * weekdayCounts[h.weekday],
          0,
        );
      const used = usage.find((u) => u.resourceId === resource.id);
      const bookedMinutes = used?.bookedMinutes ?? 0;
      return {
        id: resource.id,
        name: resource.name,
        bookedHours: Math.round(bookedMinutes / 6) / 10,
        openHours: Math.round(openMinutes / 60),
        bookings: used?.bookings ?? 0,
        rate: openMinutes ? Math.min(1, bookedMinutes / openMinutes) : 0,
      };
    })
    .sort((a, b) => b.rate - a.rate);
}
