import "server-only";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceWindows, reservations, resources } from "@/db/schema";
import { DomainError } from "@/lib/action-state";
import type { SessionUser } from "@/lib/auth";
import { ACTIVE_STATUSES } from "@/lib/booking-rules";
import { isConstraintViolation } from "../db-errors";

export type NewMaintenance = {
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
};

export async function scheduleMaintenance(admin: SessionUser, input: NewMaintenance) {
  if (input.endsAt <= input.startsAt) throw new DomainError("End time must be after the start time.");
  if (input.endsAt <= new Date()) throw new DomainError("Maintenance must end in the future.");

  try {
    return await db.transaction(async (tx) => {
      const [resource] = await tx
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.id, input.resourceId))
        .for("update");
      if (!resource) throw new DomainError("Resource not found.");

      await tx.insert(maintenanceWindows).values({ ...input, createdById: admin.id });

      const cancelled = await tx
        .update(reservations)
        .set({
          status: "cancelled",
          statusReason: `Resource unavailable: ${input.reason}`,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(reservations.resourceId, input.resourceId),
            inArray(reservations.status, ACTIVE_STATUSES),
            lt(reservations.startsAt, input.endsAt),
            gt(reservations.endsAt, input.startsAt),
          ),
        )
        .returning({ id: reservations.id });

      return { cancelledCount: cancelled.length };
    });
  } catch (error) {
    if (isConstraintViolation(error, "maintenance_windows_no_overlap")) {
      throw new DomainError("This overlaps another maintenance window for the same resource.");
    }
    throw error;
  }
}

export async function removeMaintenance(id: string) {
  const [removed] = await db
    .delete(maintenanceWindows)
    .where(eq(maintenanceWindows.id, id))
    .returning({ resourceId: maintenanceWindows.resourceId });
  if (!removed) throw new DomainError("Maintenance window not found.");
  return removed;
}
