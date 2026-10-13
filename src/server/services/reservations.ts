import "server-only";
import { and, asc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceWindows, reservations, resourceHours, resources } from "@/db/schema";
import { DomainError } from "@/lib/action-state";
import type { SessionUser } from "@/lib/auth";
import {
  ACTIVE_STATUSES,
  canCancel,
  checkBookingWindow,
  checkOpeningHours,
} from "@/lib/booking-rules";
import { formatIn, formatRange } from "@/lib/time";
import { isConstraintViolation } from "../db-errors";

export type NewReservation = {
  resourceId: string;
  title: string;
  notes?: string;
  attendees?: number;
  startsAt: Date;
  endsAt: Date;
};

export async function createReservation(user: SessionUser, input: NewReservation) {
  const windowError = checkBookingWindow(input.startsAt, input.endsAt, new Date());
  if (windowError) throw new DomainError(windowError);

  try {
    return await db.transaction(async (tx) => {
      const [resource] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, input.resourceId))
        .for("share");

      if (!resource || !resource.isActive) {
        throw new DomainError("This resource is not available for booking.");
      }
      if (resource.capacity && input.attendees && input.attendees > resource.capacity) {
        throw new DomainError(`${resource.name} can hold up to ${resource.capacity} people.`);
      }

      const hours = await tx
        .select()
        .from(resourceHours)
        .where(eq(resourceHours.resourceId, resource.id));
      const hoursError = checkOpeningHours(hours, input.startsAt, input.endsAt);
      if (hoursError) throw new DomainError(hoursError);

      const [maintenance] = await tx
        .select()
        .from(maintenanceWindows)
        .where(
          and(
            eq(maintenanceWindows.resourceId, resource.id),
            lt(maintenanceWindows.startsAt, input.endsAt),
            gt(maintenanceWindows.endsAt, input.startsAt),
          ),
        )
        .limit(1);
      if (maintenance) {
        throw new DomainError(
          `${resource.name} is unavailable for maintenance (${maintenance.reason}) on ${formatRange(maintenance.startsAt, maintenance.endsAt)}.`,
        );
      }

      const autoConfirm = !resource.requiresApproval || user.role === "admin";
      const [reservation] = await tx
        .insert(reservations)
        .values({
          resourceId: resource.id,
          userId: user.id,
          title: input.title,
          notes: input.notes,
          attendees: input.attendees,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: autoConfirm ? "confirmed" : "pending",
        })
        .returning();

      return { reservation, resource };
    });
  } catch (error) {
    if (isConstraintViolation(error, "reservations_no_overlap")) {
      throw new DomainError(await describeConflict(input));
    }
    throw error;
  }
}

async function describeConflict({ resourceId, startsAt, endsAt }: NewReservation) {
  const [conflict] = await db
    .select({ startsAt: reservations.startsAt, endsAt: reservations.endsAt })
    .from(reservations)
    .where(
      and(
        eq(reservations.resourceId, resourceId),
        inArray(reservations.status, ACTIVE_STATUSES),
        lt(reservations.startsAt, endsAt),
        gt(reservations.endsAt, startsAt),
      ),
    )
    .orderBy(asc(reservations.startsAt))
    .limit(1);

  if (!conflict) return "Someone else just booked this slot. Please choose another time.";
  return `This time overlaps an existing booking from ${formatIn(conflict.startsAt, "h:mm a")} to ${formatIn(conflict.endsAt, "h:mm a")}. Please choose another time.`;
}

export async function approveReservation(admin: SessionUser, id: string) {
  const [updated] = await db
    .update(reservations)
    .set({ status: "confirmed", reviewedById: admin.id, reviewedAt: new Date(), statusReason: null })
    .where(
      and(
        eq(reservations.id, id),
        eq(reservations.status, "pending"),
        gt(reservations.startsAt, sql`now()`),
      ),
    )
    .returning({ id: reservations.id });

  if (!updated) throw new DomainError("This request was already handled or its start time has passed.");
}

export async function rejectReservation(admin: SessionUser, id: string, reason: string) {
  const [updated] = await db
    .update(reservations)
    .set({ status: "rejected", reviewedById: admin.id, reviewedAt: new Date(), statusReason: reason })
    .where(and(eq(reservations.id, id), eq(reservations.status, "pending")))
    .returning({ id: reservations.id });

  if (!updated) throw new DomainError("This request was already handled.");
}

export async function cancelReservation(user: SessionUser, id: string, reason?: string) {
  const [existing] = await db.select().from(reservations).where(eq(reservations.id, id));

  if (!existing) throw new DomainError("Reservation not found.");
  if (existing.userId !== user.id && user.role !== "admin") {
    throw new DomainError("You can only cancel your own reservations.");
  }
  if (!canCancel(existing.status, existing.endsAt, new Date())) {
    throw new DomainError("This reservation can no longer be cancelled.");
  }

  const cancelledByOther = existing.userId !== user.id;
  await db
    .update(reservations)
    .set({
      status: "cancelled",
      statusReason: reason || (cancelledByOther ? `Cancelled by ${user.name}` : null),
      reviewedById: cancelledByOther ? user.id : existing.reviewedById,
      reviewedAt: cancelledByOther ? new Date() : existing.reviewedAt,
    })
    .where(and(eq(reservations.id, id), inArray(reservations.status, ACTIVE_STATUSES)));
}
