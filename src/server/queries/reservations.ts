import "server-only";
import { and, asc, count, desc, eq, gt, inArray, lt, lte, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  maintenanceWindows,
  reservations,
  resources,
  users,
  type ReservationStatus,
} from "@/db/schema";
import { ACTIVE_STATUSES } from "@/lib/booking-rules";
import { addDaysToKey, toDateKey, toInstant } from "@/lib/time";

const reviewers = alias(users, "reviewers");

const reservationColumns = {
  id: reservations.id,
  title: reservations.title,
  notes: reservations.notes,
  attendees: reservations.attendees,
  startsAt: reservations.startsAt,
  endsAt: reservations.endsAt,
  status: reservations.status,
  statusReason: reservations.statusReason,
  createdAt: reservations.createdAt,
  userId: reservations.userId,
  userName: users.name,
  userEmail: users.email,
  resourceId: resources.id,
  resourceName: resources.name,
  resourceLocation: resources.location,
  categoryName: categories.name,
};

function baseQuery() {
  return db
    .select(reservationColumns)
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .innerJoin(resources, eq(reservations.resourceId, resources.id))
    .innerJoin(categories, eq(resources.categoryId, categories.id));
}

export type ReservationRow = Awaited<ReturnType<typeof listReservations>>[number];

export type ReservationView = "upcoming" | "past" | "all";

export async function listReservations(filter: {
  userId?: string;
  view: ReservationView;
  status?: ReservationStatus;
  resourceId?: string;
  activeOnly?: boolean;
  now: Date;
  limit?: number;
}) {
  const conditions: (SQL | undefined)[] = [];
  if (filter.userId) conditions.push(eq(reservations.userId, filter.userId));
  if (filter.status) conditions.push(eq(reservations.status, filter.status));
  if (filter.activeOnly) conditions.push(inArray(reservations.status, ACTIVE_STATUSES));
  if (filter.resourceId) conditions.push(eq(reservations.resourceId, filter.resourceId));
  if (filter.view === "upcoming") conditions.push(gt(reservations.endsAt, filter.now));
  if (filter.view === "past") conditions.push(lte(reservations.endsAt, filter.now));

  return baseQuery()
    .where(and(...conditions))
    .orderBy(filter.view === "upcoming" ? asc(reservations.startsAt) : desc(reservations.startsAt))
    .limit(filter.limit ?? 200);
}

export async function listPendingApprovals(now: Date) {
  return baseQuery()
    .where(and(eq(reservations.status, "pending"), gt(reservations.startsAt, now)))
    .orderBy(asc(reservations.startsAt));
}

export async function countPendingApprovals(now: Date) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(reservations)
    .where(and(eq(reservations.status, "pending"), gt(reservations.startsAt, now)));
  return total;
}

export async function listRecentDecisions(limit = 10) {
  return db
    .select({ ...reservationColumns, reviewerName: reviewers.name, reviewedAt: reservations.reviewedAt })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .innerJoin(resources, eq(reservations.resourceId, resources.id))
    .innerJoin(categories, eq(resources.categoryId, categories.id))
    .innerJoin(reviewers, eq(reservations.reviewedById, reviewers.id))
    .where(inArray(reservations.status, ["confirmed", "rejected"]))
    .orderBy(desc(reservations.reviewedAt))
    .limit(limit);
}

export async function listDaySchedule(now: Date) {
  const todayKey = toDateKey(now);
  return baseQuery()
    .where(
      and(
        inArray(reservations.status, ACTIVE_STATUSES),
        lt(reservations.startsAt, toInstant(addDaysToKey(todayKey, 1), "00:00")),
        gt(reservations.endsAt, toInstant(todayKey, "00:00")),
      ),
    )
    .orderBy(asc(reservations.startsAt));
}

export async function getResourceSchedule(resourceId: string, from: Date, to: Date) {
  const [bookings, maintenance] = await Promise.all([
    db
      .select({
        id: reservations.id,
        title: reservations.title,
        startsAt: reservations.startsAt,
        endsAt: reservations.endsAt,
        status: reservations.status,
        userId: reservations.userId,
        userName: users.name,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .where(
        and(
          eq(reservations.resourceId, resourceId),
          inArray(reservations.status, ACTIVE_STATUSES),
          lt(reservations.startsAt, to),
          gt(reservations.endsAt, from),
        ),
      )
      .orderBy(asc(reservations.startsAt)),
    db
      .select()
      .from(maintenanceWindows)
      .where(
        and(
          eq(maintenanceWindows.resourceId, resourceId),
          lt(maintenanceWindows.startsAt, to),
          gt(maintenanceWindows.endsAt, from),
        ),
      )
      .orderBy(asc(maintenanceWindows.startsAt)),
  ]);

  return { bookings, maintenance };
}
