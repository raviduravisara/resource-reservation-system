import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { OpeningHours } from "@/lib/booking-rules";
import {
  addDaysToKey,
  formatClock,
  formatDateKey,
  formatIn,
  minutesIntoDay,
  parseClock,
  toDateKey,
  weekdayOfKey,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import type { getResourceSchedule } from "@/server/queries/reservations";
import { buttonStyles } from "../ui/button";

const HOUR_HEIGHT = 44;

type Schedule = Awaited<ReturnType<typeof getResourceSchedule>>;

type Block = {
  key: string;
  top: number;
  height: number;
  className: string;
  label: string;
  detail: string;
};

export function WeekSchedule({
  basePath,
  weekStart,
  hours,
  schedule,
  now,
  viewerId,
  bookable,
}: {
  basePath: string;
  weekStart: string;
  hours: OpeningHours[];
  schedule: Schedule;
  now: Date;
  viewerId: string;
  bookable: boolean;
}) {
  const todayKey = toDateKey(now);
  const nowMinutes = minutesIntoDay(now);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i));

  const opens = hours.map((h) => parseClock(h.opensAt));
  const closes = hours.map((h) => parseClock(h.closesAt));
  const rangeStart = opens.length ? Math.floor(Math.min(...opens) / 60) * 60 : 8 * 60;
  const rangeEnd = closes.length ? Math.ceil(Math.max(...closes) / 60) * 60 : 18 * 60;
  const hourMarks = Array.from({ length: (rangeEnd - rangeStart) / 60 }, (_, i) => rangeStart + i * 60);
  const toY = (minutes: number) => ((minutes - rangeStart) / 60) * HOUR_HEIGHT;

  function blocksFor(dayKey: string): Block[] {
    const clamp = (start: Date, end: Date) => {
      const from = toDateKey(start) < dayKey ? rangeStart : Math.max(rangeStart, minutesIntoDay(start));
      const to = toDateKey(end) > dayKey ? rangeEnd : Math.min(rangeEnd, minutesIntoDay(end));
      return to > from ? { top: toY(from), height: toY(to) - toY(from) } : null;
    };

    const blocks: Block[] = [];
    for (const m of schedule.maintenance) {
      if (toDateKey(m.startsAt) > dayKey || toDateKey(m.endsAt) < dayKey) continue;
      const box = clamp(m.startsAt, m.endsAt);
      if (box) {
        blocks.push({
          key: m.id,
          ...box,
          className: "bg-hatched border-red-300 bg-red-50 text-red-800",
          label: "Maintenance",
          detail: m.reason,
        });
      }
    }
    for (const b of schedule.bookings) {
      if (toDateKey(b.startsAt) !== dayKey) continue;
      const box = clamp(b.startsAt, b.endsAt);
      if (!box) continue;
      const mine = b.userId === viewerId;
      blocks.push({
        key: b.id,
        ...box,
        className:
          b.status === "pending"
            ? "border-dashed border-amber-400 bg-amber-50 text-amber-900"
            : mine
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-brand-200 bg-brand-100 text-brand-900",
        label: b.title,
        detail: `${formatIn(b.startsAt, "h:mm a")} – ${formatIn(b.endsAt, "h:mm a")} · ${mine ? "You" : b.userName}${b.status === "pending" ? " · awaiting approval" : ""}`,
      });
    }
    return blocks;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">
          {formatDateKey(days[0], "d MMM")} – {formatDateKey(days[6], "d MMM yyyy")}
        </p>
        <div className="flex items-center gap-1">
          <Link
            href={`${basePath}?week=${addDaysToKey(weekStart, -7)}`}
            scroll={false}
            className={buttonStyles({ variant: "secondary", size: "icon" })}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </Link>
          <Link href={basePath} scroll={false} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            This week
          </Link>
          <Link
            href={`${basePath}?week=${addDaysToKey(weekStart, 7)}`}
            scroll={false}
            className={buttonStyles({ variant: "secondary", size: "icon" })}
            aria-label="Next week"
          >
            <ChevronRight />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <div className="grid min-w-[680px] grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-zinc-200 bg-zinc-50" />
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "border-b border-l border-zinc-200 bg-zinc-50 px-2 py-2 text-center",
                day === todayKey && "bg-brand-50",
              )}
            >
              <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                {formatDateKey(day, "EEE")}
              </p>
              <p className={cn("text-sm font-semibold", day === todayKey ? "text-brand-700" : "text-zinc-900")}>
                {formatDateKey(day, "d")}
              </p>
            </div>
          ))}

          <div className="relative" style={{ height: hourMarks.length * HOUR_HEIGHT }}>
            {hourMarks.map((mark) => (
              <span
                key={mark}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-zinc-400 tabular-nums first:translate-y-0"
                style={{ top: toY(mark) }}
              >
                {formatClock(mark)}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const dayHours = hours.find((h) => h.weekday === weekdayOfKey(day));
            const open = dayHours ? parseClock(dayHours.opensAt) : null;
            const close = dayHours ? parseClock(dayHours.closesAt) : null;
            const isPast = day < todayKey;
            const pastUntil = isPast ? rangeEnd : day === todayKey ? Math.min(rangeEnd, nowMinutes) : rangeStart;

            return (
              <div key={day} className="relative border-l border-zinc-200" style={{ height: hourMarks.length * HOUR_HEIGHT }}>
                {hourMarks.map((mark) => {
                  const slotOpen =
                    bookable && open !== null && close !== null && mark >= open && mark + 60 <= close && mark >= pastUntil;
                  const cellClass = "absolute inset-x-0 border-t border-zinc-100";
                  return slotOpen ? (
                    <Link
                      key={mark}
                      href={`${basePath}?week=${weekStart}&date=${day}&start=${formatClock(mark)}&end=${formatClock(mark + 60)}#book`}
                      scroll={false}
                      title={`Book ${formatClock(mark)} – ${formatClock(mark + 60)}`}
                      className={cn(cellClass, "transition-colors hover:bg-brand-50")}
                      style={{ top: toY(mark), height: HOUR_HEIGHT }}
                    />
                  ) : (
                    <div key={mark} className={cellClass} style={{ top: toY(mark), height: HOUR_HEIGHT }} />
                  );
                })}

                {open === null || close === null ? (
                  <div className="bg-hatched pointer-events-none absolute inset-0 bg-zinc-50" />
                ) : (
                  <>
                    {open > rangeStart && (
                      <div className="bg-hatched pointer-events-none absolute inset-x-0 top-0 bg-zinc-50" style={{ height: toY(open) }} />
                    )}
                    {close < rangeEnd && (
                      <div
                        className="bg-hatched pointer-events-none absolute inset-x-0 bottom-0 bg-zinc-50"
                        style={{ top: toY(close) }}
                      />
                    )}
                  </>
                )}

                {pastUntil > rangeStart && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 bg-white/60" style={{ height: toY(pastUntil) }} />
                )}

                {blocksFor(day).map((block) => (
                  <div
                    key={block.key}
                    title={`${block.label}\n${block.detail}`}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-tight shadow-xs",
                      block.className,
                    )}
                    style={{ top: block.top + 1, height: Math.max(block.height - 2, 18) }}
                  >
                    <p className="truncate font-semibold">{block.label}</p>
                    {block.height > 34 && <p className="truncate opacity-80">{block.detail}</p>}
                  </div>
                ))}

                {day === todayKey && nowMinutes > rangeStart && nowMinutes < rangeEnd && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: toY(nowMinutes) }}>
                    <span className="absolute -top-[5px] -left-[5px] size-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <Legend className="border-brand-600 bg-brand-600">Your booking</Legend>
        <Legend className="border-brand-200 bg-brand-100">Booked</Legend>
        <Legend className="border-dashed border-amber-400 bg-amber-50">Awaiting approval</Legend>
        <Legend className="bg-hatched border-red-300 bg-red-50">Maintenance</Legend>
        <Legend className="bg-hatched border-zinc-200 bg-zinc-50">Closed</Legend>
        {bookable && <span>Click a free hour to start a booking.</span>}
      </div>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm border", className)} />
      {children}
    </span>
  );
}
