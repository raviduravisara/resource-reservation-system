import { MapPin, Pencil, ShieldCheck, Users, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingForm } from "@/components/reservations/booking-form";
import { WeekSchedule } from "@/components/resources/week-schedule";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { MAX_ADVANCE_DAYS } from "@/lib/booking-rules";
import {
  addDaysToKey,
  displayClock,
  DISPLAY_WEEKDAY_ORDER,
  formatRange,
  isClock,
  isDateKey,
  toDateKey,
  toInstant,
  WEEKDAYS,
  weekStartKey,
} from "@/lib/time";
import { getResourceSchedule } from "@/server/queries/reservations";
import { getResource, listUpcomingMaintenance } from "@/server/queries/resources";

export const metadata: Metadata = { title: "Resource" };

type Props = PageProps<"/resources/[id]">;

export default function ResourcePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ResourceSkeleton />}>
      <ResourceDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ResourceDetail({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const resource = await getResource(id);
  if (!resource || (!resource.isActive && user.role !== "admin")) notFound();

  const now = new Date();
  const todayKey = toDateKey(now);
  const weekStart = weekStartKey(isDateKey(query.week) ? query.week : todayKey);
  const [schedule, maintenance] = await Promise.all([
    getResourceSchedule(id, toInstant(weekStart, "00:00"), toInstant(addDaysToKey(weekStart, 7), "00:00")),
    listUpcomingMaintenance(id),
  ]);

  const prefill = {
    date: isDateKey(query.date) ? query.date : todayKey,
    start: isClock(query.start) ? query.start : "",
    end: isClock(query.end) ? query.end : "",
  };
  const hours = resource.hours.map((h) => ({ ...h, opensAt: h.opensAt.slice(0, 5), closesAt: h.closesAt.slice(0, 5) }));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-700">
            <Link href={`/resources?category=${resource.categoryId}`} className="hover:underline">
              {resource.category.name}
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{resource.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
            {resource.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {resource.location}
              </span>
            )}
            {resource.capacity && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4" />
                Up to {resource.capacity} people
              </span>
            )}
            {resource.requiresApproval && (
              <Badge tone="amber">
                <ShieldCheck />
                Requires approval
              </Badge>
            )}
            {!resource.isActive && <Badge>Inactive</Badge>}
          </div>
        </div>
        {user.role === "admin" && (
          <Link href={`/resources/${id}/edit`} className={buttonStyles({ variant: "secondary" })}>
            <Pencil />
            Manage
          </Link>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Weekly schedule" description="Existing bookings, maintenance and opening hours." />
            <CardBody>
              <WeekSchedule
                basePath={`/resources/${id}`}
                weekStart={weekStart}
                hours={hours}
                schedule={schedule}
                now={now}
                viewerId={user.id}
                bookable={resource.isActive}
              />
            </CardBody>
          </Card>

          {resource.description && (
            <Card>
              <CardHeader title="About" />
              <CardBody>
                <p className="text-sm whitespace-pre-line text-zinc-600">{resource.description}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card id="book" className="scroll-mt-6">
            <CardHeader title="Book this resource" />
            <CardBody>
              {resource.isActive ? (
                <BookingForm
                  key={`${prefill.date}-${prefill.start}-${prefill.end}`}
                  resourceId={id}
                  requiresApproval={resource.requiresApproval && user.role !== "admin"}
                  capacity={resource.capacity}
                  hours={hours}
                  defaults={prefill}
                  minDate={todayKey}
                  maxDate={addDaysToKey(todayKey, MAX_ADVANCE_DAYS)}
                />
              ) : (
                <Alert>This resource is inactive and can&apos;t be booked.</Alert>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Opening hours" />
            <CardBody>
              <dl className="grid gap-1.5 text-sm">
                {DISPLAY_WEEKDAY_ORDER.map((weekday) => {
                  const day = hours.find((h) => h.weekday === weekday);
                  return (
                    <div key={weekday} className="flex justify-between">
                      <dt className="text-zinc-500">{WEEKDAYS[weekday]}</dt>
                      <dd className={day ? "font-medium text-zinc-900" : "text-zinc-400"}>
                        {day ? `${displayClock(day.opensAt)} – ${displayClock(day.closesAt)}` : "Closed"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </CardBody>
          </Card>

          {maintenance.length > 0 && (
            <Card>
              <CardHeader title="Planned maintenance" />
              <CardBody className="grid gap-3">
                {maintenance.map((m) => (
                  <div key={m.id} className="flex gap-3 text-sm">
                    <Wrench className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <div>
                      <p className="font-medium text-zinc-900">{m.reason}</p>
                      <p className="text-zinc-500">{formatRange(m.startsAt, m.endsAt)}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function ResourceSkeleton() {
  return (
    <>
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[520px] rounded-xl" />
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    </>
  );
}
