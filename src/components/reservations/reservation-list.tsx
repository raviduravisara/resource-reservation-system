import { CalendarDays, MapPin, UserRound, Users } from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { canCancel } from "@/lib/booking-rules";
import { durationLabel, formatIn } from "@/lib/time";
import { cancelBooking } from "@/server/actions/reservations";
import type { ReservationRow } from "@/server/queries/reservations";
import { ActionButton } from "../ui/action-button";
import { StatusBadge } from "./status-badge";

export function ReservationList({
  reservations,
  viewer,
  now,
  showBooker = false,
}: {
  reservations: ReservationRow[];
  viewer: SessionUser;
  now: Date;
  showBooker?: boolean;
}) {
  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      {reservations.map((r) => {
        const cancellable =
          canCancel(r.status, r.endsAt, now) && (r.userId === viewer.id || viewer.role === "admin");
        return (
          <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div className="w-full shrink-0 sm:w-28">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {formatIn(r.startsAt, "EEE, d MMM")}
              </p>
              <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                {formatIn(r.startsAt, "h:mm a")}
              </p>
              <p className="text-xs text-zinc-500">{durationLabel(r.startsAt, r.endsAt)}</p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-zinc-900">{r.title}</p>
                <StatusBadge status={r.status} startsAt={r.startsAt} endsAt={r.endsAt} now={now} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
                <Link href={`/resources/${r.resourceId}`} className="font-medium text-brand-700 hover:underline">
                  {r.resourceName}
                </Link>
                {r.resourceLocation && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {r.resourceLocation}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {formatIn(r.startsAt, "h:mm a")} – {formatIn(r.endsAt, "h:mm a")}
                </span>
                {r.attendees && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {r.attendees}
                  </span>
                )}
                {showBooker && (
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3.5" />
                    {r.userName}
                  </span>
                )}
              </div>
              {r.statusReason && (r.status === "rejected" || r.status === "cancelled") && (
                <p className="mt-1.5 text-xs text-zinc-500">Reason: {r.statusReason}</p>
              )}
            </div>

            {cancellable && (
              <ActionButton
                action={cancelBooking}
                fields={{ id: r.id }}
                confirm={`Cancel "${r.title}" on ${formatIn(r.startsAt, "d MMM 'at' h:mm a")}?`}
                variant="danger-ghost"
              >
                Cancel
              </ActionButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
