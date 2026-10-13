import type { ReservationStatus } from "@/db/schema";
import { displayClock, minutesIntoDay, parseClock, toDateKey, WEEKDAYS, weekdayOf } from "./time";

export const SLOT_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;
export const MAX_ADVANCE_DAYS = 90;
export const ACTIVE_STATUSES = ["pending", "confirmed"] as const satisfies ReservationStatus[];

export type OpeningHours = { weekday: number; opensAt: string; closesAt: string };

export type DisplayStatus =
  | ReservationStatus
  | "in_progress"
  | "completed"
  | "expired";

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export function checkBookingWindow(start: Date, end: Date, now: Date): string | null {
  if (end <= start) return "End time must be after the start time.";
  if (end.getTime() - start.getTime() < MIN_DURATION_MINUTES * 60_000) {
    return `Reservations must be at least ${MIN_DURATION_MINUTES} minutes long.`;
  }
  if (minutesIntoDay(start) % SLOT_MINUTES !== 0 || minutesIntoDay(end) % SLOT_MINUTES !== 0) {
    return `Start and end times must be in ${SLOT_MINUTES}-minute steps.`;
  }
  if (start < now) return "You can't book a time that has already started.";
  if (start.getTime() - now.getTime() > MAX_ADVANCE_DAYS * 86_400_000) {
    return `Reservations can be made up to ${MAX_ADVANCE_DAYS} days in advance.`;
  }
  return null;
}

export function checkOpeningHours(hours: OpeningHours[], start: Date, end: Date): string | null {
  if (toDateKey(start) !== toDateKey(end)) {
    return "A reservation must start and end on the same day.";
  }
  const weekday = weekdayOf(start);
  const day = hours.find((h) => h.weekday === weekday);
  if (!day) return `This resource is closed on ${WEEKDAYS[weekday]}s.`;
  if (minutesIntoDay(start) < parseClock(day.opensAt) || minutesIntoDay(end) > parseClock(day.closesAt)) {
    return `On ${WEEKDAYS[weekday]}s this resource can be booked between ${displayClock(day.opensAt)} and ${displayClock(day.closesAt)}.`;
  }
  return null;
}

export function displayStatus(
  status: ReservationStatus,
  startsAt: Date,
  endsAt: Date,
  now: Date,
): DisplayStatus {
  if (status === "confirmed") {
    if (endsAt <= now) return "completed";
    if (startsAt <= now) return "in_progress";
  }
  if (status === "pending" && startsAt <= now) return "expired";
  return status;
}

export function canCancel(status: ReservationStatus, endsAt: Date, now: Date) {
  return (status === "pending" || status === "confirmed") && endsAt > now;
}
