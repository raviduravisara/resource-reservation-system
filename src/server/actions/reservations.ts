"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type ActionState } from "@/lib/action-state";
import { requireAdmin, requireUser } from "@/lib/auth";
import { formatRange, toInstant } from "@/lib/time";
import {
  approveReservation,
  cancelReservation,
  createReservation,
  rejectReservation,
} from "../services/reservations";
import { clock, dateKey, formObject, handle, optionalPositiveInt, optionalText } from "./helpers";

const bookingSchema = z.object({
  resourceId: z.uuid(),
  title: z.string().trim().min(3, "Add a short title (3+ characters).").max(120),
  date: dateKey,
  start: clock,
  end: clock,
  attendees: optionalPositiveInt,
  notes: optionalText(1000),
});

export async function bookResource(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = bookingSchema.safeParse(formObject(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { date, start, end, ...rest } = parsed.data;

  return handle(async () => {
    const { reservation, resource } = await createReservation(user, {
      ...rest,
      startsAt: toInstant(date, start),
      endsAt: toInstant(date, end),
    });
    refresh();
    const when = formatRange(reservation.startsAt, reservation.endsAt);
    return {
      ok: true,
      message:
        reservation.status === "pending"
          ? `Request sent for ${resource.name} (${when}). An admin will review it shortly.`
          : `${resource.name} is booked for ${when}.`,
    };
  });
}

const idSchema = z.object({ id: z.uuid(), reason: optionalText(300) });

export async function cancelBooking(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  return handle(async () => {
    await cancelReservation(user, parsed.data.id, parsed.data.reason);
    refresh();
    return { ok: true, message: "Reservation cancelled." };
  });
}

export async function approveBooking(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = idSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  return handle(async () => {
    await approveReservation(admin, parsed.data.id);
    refresh();
    return { ok: true, message: "Approved." };
  });
}

const rejectSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(3, "Tell the requester why (3+ characters).").max(300),
});

export async function rejectBooking(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = rejectSchema.safeParse(formObject(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  return handle(async () => {
    await rejectReservation(admin, parsed.data.id, parsed.data.reason);
    refresh();
    return { ok: true, message: "Rejected." };
  });
}
