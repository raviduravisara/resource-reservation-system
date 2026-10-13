import "server-only";
import { count, eq } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { categories, reservations, resourceHours, resources } from "@/db/schema";
import { DomainError } from "@/lib/action-state";
import type { OpeningHours } from "@/lib/booking-rules";
import { isConstraintViolation, isForeignKeyViolation } from "../db-errors";

export type ResourceInput = {
  name: string;
  categoryId: string;
  description?: string;
  location?: string;
  capacity?: number;
  requiresApproval: boolean;
  hours: OpeningHours[];
};

function translate(error: unknown): never {
  if (isConstraintViolation(error, "resources_name_unique")) {
    throw new DomainError("Another resource already uses this name.");
  }
  if (isConstraintViolation(error, "resources_category_id_categories_id_fk")) {
    throw new DomainError("The selected category no longer exists.");
  }
  throw error;
}

async function replaceHours(tx: Transaction, resourceId: string, hours: OpeningHours[]) {
  await tx.delete(resourceHours).where(eq(resourceHours.resourceId, resourceId));
  if (hours.length) {
    await tx.insert(resourceHours).values(hours.map((h) => ({ ...h, resourceId })));
  }
}

export async function createResource({ hours, ...input }: ResourceInput) {
  try {
    return await db.transaction(async (tx) => {
      const [resource] = await tx.insert(resources).values(input).returning({ id: resources.id });
      await replaceHours(tx, resource.id, hours);
      return resource;
    });
  } catch (error) {
    translate(error);
  }
}

export async function updateResource(id: string, { hours, ...input }: ResourceInput) {
  try {
    await db.transaction(async (tx) => {
      const [resource] = await tx
        .update(resources)
        .set({
          ...input,
          description: input.description ?? null,
          location: input.location ?? null,
          capacity: input.capacity ?? null,
        })
        .where(eq(resources.id, id))
        .returning({ id: resources.id });
      if (!resource) throw new DomainError("Resource not found.");
      await replaceHours(tx, id, hours);
    });
  } catch (error) {
    translate(error);
  }
}

export async function setResourceActive(id: string, isActive: boolean) {
  await db.update(resources).set({ isActive }).where(eq(resources.id, id));
}

export async function deleteResource(id: string) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(reservations)
    .where(eq(reservations.resourceId, id));
  if (total > 0) {
    throw new DomainError(
      "This resource has reservation history, so it can't be deleted. Deactivate it instead.",
    );
  }
  await db.delete(resources).where(eq(resources.id, id));
}

export async function createCategory(name: string, description?: string) {
  try {
    await db.insert(categories).values({ name, description });
  } catch (error) {
    if (isConstraintViolation(error, "categories_name_unique")) {
      throw new DomainError("A category with this name already exists.");
    }
    throw error;
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.delete(categories).where(eq(categories.id, id));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new DomainError("Move or delete the resources in this category first.");
    }
    throw error;
  }
}
