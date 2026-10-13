import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfWeek } from "date-fns";

export const TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Colombo";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DISPLAY_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function zoned(date: Date) {
  return new TZDate(date, TIMEZONE);
}

export function toInstant(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(new TZDate(year, month - 1, day, hours, minutes, TIMEZONE).getTime());
}

export function formatIn(date: Date, pattern: string) {
  return format(zoned(date), pattern);
}

export function toDateKey(date: Date) {
  return formatIn(date, "yyyy-MM-dd");
}

export function toTimeKey(date: Date) {
  return formatIn(date, "HH:mm");
}

export function weekdayOf(date: Date) {
  return zoned(date).getDay();
}

export function minutesIntoDay(date: Date) {
  const local = zoned(date);
  return local.getHours() * 60 + local.getMinutes();
}

export function parseClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function displayClock(value: string) {
  const minutes = parseClock(value);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function startOfDayInstant(dateKey: string) {
  return toInstant(dateKey, "00:00");
}

function calendarDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDaysToKey(dateKey: string, days: number) {
  return format(addDays(calendarDay(dateKey), days), "yyyy-MM-dd");
}

export function weekStartKey(dateKey: string) {
  return format(startOfWeek(calendarDay(dateKey), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function weekdayOfKey(dateKey: string) {
  return calendarDay(dateKey).getDay();
}

export function formatDateKey(dateKey: string, pattern: string) {
  return format(calendarDay(dateKey), pattern);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isClock(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatRange(start: Date, end: Date) {
  const sameDay = toDateKey(start) === toDateKey(end);
  const day = formatIn(start, "EEE, d MMM yyyy");
  const from = formatIn(start, "h:mm a");
  const to = sameDay ? formatIn(end, "h:mm a") : formatIn(end, "EEE, d MMM h:mm a");
  return `${day} · ${from} – ${to}`;
}

export function durationLabel(start: Date, end: Date) {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
