"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth";
import type { OpeningHours } from "@/lib/booking-rules";
import { parseClock, toInstant } from "@/lib/time";
import { pluralize } from "@/lib/utils";
import { removeMaintenance, scheduleMaintenance } from "../services/maintenance";
import {
  createCategory,
  createResource,
  deleteCategory,
  deleteResource,
  setResourceActive,
  updateResource,
} from "../services/resources";
import { clock, dateKey, formObject, handle, optionalPositiveInt, optionalText } from "./helpers";

const resourceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Name is too short.").max(120),
  categoryId: z.uuid("Choose a category."),
  description: optionalText(1000),
  location: optionalText(160),
  capacity: optionalPositiveInt,
});

function parseHours(formData: FormData) {
  const hours: OpeningHours[] = [];
  const errors: Record<string, string[]> = {};

  for (let weekday = 0; weekday < 7; weekday++) {
    if (formData.get(`open-${weekday}`) !== "on") continue;
    const opensAt = clock.safeParse(formData.get(`opensAt-${weekday}`));
    const closesAt = clock.safeParse(formData.get(`closesAt-${weekday}`));
    if (!opensAt.success || !closesAt.success) {
      errors[`hours.${weekday}`] = ["Set both opening and closing times."];
    } else if (parseClock(closesAt.data) <= parseClock(opensAt.data)) {
      errors[`hours.${weekday}`] = ["Closing time must be after opening time."];
    } else {
      hours.push({ weekday, opensAt: opensAt.data, closesAt: closesAt.data });
    }
  }

  return { hours, errors };
}

export async function saveResource(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = resourceSchema.safeParse(formObject(formData));
  const { hours, errors: hourErrors } = parseHours(formData);

  if (!parsed.success || Object.keys(hourErrors).length) {
    const base = parsed.success ? {} : fieldErrors(parsed.error).errors;
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: { ...base, ...hourErrors },
    };
  }

  const { id, ...data } = parsed.data;
  const input = { ...data, requiresApproval: formData.get("requiresApproval") === "on", hours };

  let resourceId = id;
  const result = await handle(async () => {
    if (id) {
      await updateResource(id, input);
    } else {
      resourceId = (await createResource(input)).id;
    }
    return { ok: true };
  });
  if (!result.ok) return result;

  redirect(`/resources/${resourceId}`);
}

const idSchema = z.object({ id: z.uuid() });

export async function toggleResourceActive(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.extend({ active: z.enum(["true", "false"]) }).safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  await setResourceActive(parsed.data.id, parsed.data.active === "true");
  refresh();
  return { ok: true };
}

export async function removeResource(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const result = await handle(async () => {
    await deleteResource(parsed.data.id);
    return { ok: true };
  });
  if (!result.ok) return result;

  redirect("/resources");
}

const maintenanceSchema = z.object({
  resourceId: z.uuid(),
  startDate: dateKey,
  startTime: clock,
  endDate: dateKey,
  endTime: clock,
  reason: z.string().trim().min(3, "Describe the reason (3+ characters).").max(200),
});

export async function addMaintenance(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = maintenanceSchema.safeParse(formObject(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { resourceId, startDate, startTime, endDate, endTime, reason } = parsed.data;

  return handle(async () => {
    const { cancelledCount } = await scheduleMaintenance(admin, {
      resourceId,
      reason,
      startsAt: toInstant(startDate, startTime),
      endsAt: toInstant(endDate, endTime),
    });
    refresh();
    return {
      ok: true,
      message: cancelledCount
        ? `Maintenance scheduled. ${pluralize(cancelledCount, "overlapping reservation")} cancelled.`
        : "Maintenance scheduled.",
    };
  });
}

export async function deleteMaintenance(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  return handle(async () => {
    await removeMaintenance(parsed.data.id);
    refresh();
    return { ok: true };
  });
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(80),
  description: optionalText(300),
});

export async function addCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(formObject(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  return handle(async () => {
    await createCategory(parsed.data.name, parsed.data.description);
    refresh();
    return { ok: true, message: `Added "${parsed.data.name}".` };
  });
}

export async function removeCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  return handle(async () => {
    await deleteCategory(parsed.data.id);
    refresh();
    return { ok: true };
  });
}
