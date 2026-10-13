import { CalendarX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReservationList } from "@/components/reservations/reservation-list";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { reservationStatus, type ReservationStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { listReservations, type ReservationView } from "@/server/queries/reservations";

export const metadata: Metadata = { title: "Reservations" };

type SearchParams = PageProps<"/reservations">["searchParams"];

const views: { value: ReservationView; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

const statusLabels: Record<ReservationStatus, string> = {
  pending: "Awaiting approval",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function ReservationsPage({ searchParams }: PageProps<"/reservations">) {
  return (
    <>
      <PageHeader
        title="Reservations"
        description="Track bookings, see their status and cancel what you no longer need."
        actions={
          <Link href="/availability" className={buttonStyles()}>
            Find a slot
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Reservations searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Reservations({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const isAdmin = user.role === "admin";
  const view = views.some((v) => v.value === params.view) ? (params.view as ReservationView) : "upcoming";
  const status = reservationStatus.enumValues.includes(params.status as ReservationStatus)
    ? (params.status as ReservationStatus)
    : undefined;
  const scope = isAdmin && params.scope === "all" ? "all" : "mine";
  const now = new Date();

  const reservations = await listReservations({
    userId: scope === "mine" ? user.id : undefined,
    view,
    status,
    now,
  });

  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { view, status, scope, ...changes };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    return `/reservations?${next}`;
  };
  const tab = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900",
    );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg bg-zinc-100 p-1">
            {views.map((v) => (
              <Link key={v.value} href={href({ view: v.value })} className={tab(view === v.value)}>
                {v.label}
              </Link>
            ))}
          </div>
          {isAdmin && (
            <div className="inline-flex rounded-lg bg-zinc-100 p-1">
              <Link href={href({ scope: "mine" })} className={tab(scope === "mine")}>
                Mine
              </Link>
              <Link href={href({ scope: "all" })} className={tab(scope === "all")}>
                Everyone
              </Link>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={href({ status: undefined })}
            className={cn("rounded-full px-2.5 py-1 text-xs font-medium", !status ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100")}
          >
            Any status
          </Link>
          {reservationStatus.enumValues.map((s) => (
            <Link
              key={s}
              href={href({ status: s })}
              className={cn("rounded-full px-2.5 py-1 text-xs font-medium", status === s ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100")}
            >
              {statusLabels[s]}
            </Link>
          ))}
        </div>
      </div>

      {reservations.length ? (
        <ReservationList reservations={reservations} viewer={user} now={now} showBooker={scope === "all"} />
      ) : (
        <EmptyState
          icon={CalendarX}
          title="No reservations here"
          description={view === "upcoming" ? "Find a free resource and book it in a few clicks." : "Try a different filter."}
          action={
            view === "upcoming" && (
              <Link href="/availability" className={buttonStyles({ variant: "secondary" })}>
                Find a slot
              </Link>
            )
          }
        />
      )}
    </div>
  );
}
