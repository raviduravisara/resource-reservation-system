import Link from "next/link";
import type { UtilizationRow } from "@/server/queries/stats";

export function UtilizationList({ rows }: { rows: UtilizationRow[] }) {
  if (!rows.length) return <p className="text-sm text-zinc-500">No active resources yet.</p>;

  return (
    <ul className="grid gap-3.5">
      {rows.map((row) => {
        const percent = Math.round(row.rate * 100);
        return (
          <li
            key={row.id}
            title={`${row.name}: ${row.bookedHours} h booked of ${row.openHours} h open · ${row.bookings} bookings`}
            className="group"
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <Link href={`/resources/${row.id}`} className="truncate font-medium text-zinc-800 group-hover:text-brand-700">
                {row.name}
              </Link>
              <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                {row.bookedHours} h · <span className="font-semibold text-zinc-900">{percent}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100">
              <div
                className="h-2 rounded-full bg-brand-600 transition-[width] group-hover:bg-brand-700"
                style={{ width: `${Math.max(percent, row.bookedHours > 0 ? 2 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
