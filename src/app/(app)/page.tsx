import { ArrowRight, CalendarCheck, CalendarDays, Clock, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UtilizationList } from "@/components/dashboard/utilization-list";
import { ReservationList } from "@/components/reservations/reservation-list";
import { StatusBadge } from "@/components/reservations/status-badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { formatIn, zoned } from "@/lib/time";
import { listDaySchedule, listReservations } from "@/server/queries/reservations";
import { getOverviewCounts, getUtilization } from "@/server/queries/stats";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function Dashboard() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const now = new Date();

  const [counts, upcoming, today, utilization] = await Promise.all([
    getOverviewCounts(now, isAdmin ? undefined : user.id),
    listReservations({ userId: user.id, view: "upcoming", activeOnly: true, now, limit: 5 }),
    listDaySchedule(now),
    isAdmin ? getUtilization(now) : Promise.resolve([]),
  ]);

  const stats: { label: string; value: number; icon: LucideIcon; href: string }[] = isAdmin
    ? [
        { label: "Bookings today", value: counts.today, icon: CalendarDays, href: "/reservations?scope=all" },
        { label: "Confirmed next 7 days", value: counts.nextWeek, icon: CalendarCheck, href: "/reservations?scope=all" },
        { label: "Awaiting approval", value: counts.pending, icon: ShieldCheck, href: "/approvals" },
        { label: "Active resources", value: counts.activeResources, icon: Clock, href: "/resources" },
      ]
    : [
        { label: "Your bookings today", value: counts.today, icon: CalendarDays, href: "/reservations" },
        { label: "Confirmed next 7 days", value: counts.nextWeek, icon: CalendarCheck, href: "/reservations" },
        { label: "Awaiting approval", value: counts.pending, icon: ShieldCheck, href: "/reservations?status=pending" },
        { label: "Resources available", value: counts.activeResources, icon: Clock, href: "/resources" },
      ];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{formatIn(now, "EEEE, d MMMM yyyy")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting(zoned(now).getHours())}, {user.name.split(" ")[0]}
          </h1>
        </div>
        <Link href="/availability" className={buttonStyles()}>
          Book a resource
          <ArrowRight />
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-brand-200"
          >
            <div className="flex items-center justify-between text-zinc-500">
              <p className="text-sm">{stat.label}</p>
              <stat.icon className="size-4" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid min-w-0 content-start gap-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Your upcoming reservations</h2>
              <Link href="/reservations" className="text-sm font-medium text-brand-700 hover:underline">
                View all
              </Link>
            </div>
            {upcoming.length ? (
              <ReservationList reservations={upcoming} viewer={user} now={now} />
            ) : (
              <EmptyState
                icon={CalendarCheck}
                title="Nothing booked yet"
                description="Find a free room, piece of equipment or vehicle for when you need it."
                action={
                  <Link href="/availability" className={buttonStyles({ variant: "secondary" })}>
                    Find a slot
                  </Link>
                }
              />
            )}
          </section>

          {isAdmin && (
            <Card>
              <CardHeader
                title="Utilization, last 30 days"
                description="Share of opening hours covered by confirmed bookings."
              />
              <CardBody>
                <UtilizationList rows={utilization} />
              </CardBody>
            </Card>
          )}
        </div>

        <Card className="content-start self-start">
          <CardHeader title="Today across the organization" description={`${today.length} active bookings`} />
          {today.length ? (
            <ul className="max-h-[560px] divide-y divide-zinc-100 overflow-y-auto">
              {today.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <p className="w-16 shrink-0 text-xs font-medium text-zinc-500 tabular-nums">
                    {formatIn(r.startsAt, "h:mm a")}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{r.resourceName}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {r.title} · {r.userId === user.id ? "You" : r.userName} · until {formatIn(r.endsAt, "h:mm a")}
                    </p>
                  </div>
                  <StatusBadge status={r.status} startsAt={r.startsAt} endsAt={r.endsAt} now={now} />
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <p className="text-sm text-zinc-500">No bookings today.</p>
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-8 h-8 w-64" />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </>
  );
}
