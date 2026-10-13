import { ArrowRight, CalendarSearch, MapPin, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { addDaysToKey, formatDateKey, isClock, isDateKey, parseClock, toDateKey, toInstant } from "@/lib/time";
import { cn, pluralize } from "@/lib/utils";
import { findAvailability } from "@/server/queries/availability";
import { listCategories } from "@/server/queries/resources";

export const metadata: Metadata = { title: "Find a slot" };

type SearchParams = PageProps<"/availability">["searchParams"];

export default function AvailabilityPage({ searchParams }: PageProps<"/availability">) {
  return (
    <>
      <PageHeader
        title="Find a slot"
        description="Pick a time and see which resources are free, closed, booked or under maintenance."
      />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <AvailabilitySearch searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AvailabilitySearch({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const now = new Date();
  const todayKey = toDateKey(now);

  const date = isDateKey(params.date) ? params.date : todayKey;
  const start = isClock(params.start) ? params.start : "10:00";
  const end = isClock(params.end) ? params.end : "11:00";
  const categoryId = typeof params.category === "string" && params.category ? params.category : undefined;
  const capacity = Number(params.capacity) > 0 ? Number(params.capacity) : undefined;
  const searched = isDateKey(params.date);

  const categories = await listCategories();
  const invalidRange = parseClock(end) <= parseClock(start);
  const startsAt = toInstant(date, start);
  const inPast = startsAt < now;
  const results =
    searched && !invalidRange
      ? await findAvailability({ startsAt, endsAt: toInstant(date, end), categoryId, minCapacity: capacity })
      : [];
  const freeCount = results.filter((r) => r.available).length;

  return (
    <div className="grid gap-6">
      <Card>
        <CardBody>
          <Form action="/availability" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.3fr_0.8fr_auto] lg:items-end">
            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" defaultValue={date} min={todayKey} max={addDaysToKey(todayKey, 90)} required />
            </Field>
            <Field label="From" htmlFor="start">
              <Input id="start" name="start" type="time" step={900} defaultValue={start} required />
            </Field>
            <Field label="To" htmlFor="end">
              <Input id="end" name="end" type="time" step={900} defaultValue={end} required />
            </Field>
            <Field label="Category" htmlFor="category">
              <Select id="category" name="category" defaultValue={categoryId ?? ""}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="People" htmlFor="capacity">
              <Input id="capacity" name="capacity" type="number" min={1} defaultValue={capacity ?? ""} placeholder="Any" />
            </Field>
            <button type="submit" className={buttonStyles({ className: "w-full lg:w-auto" })}>
              Search
            </button>
          </Form>
        </CardBody>
      </Card>

      {!searched ? (
        <EmptyState
          icon={CalendarSearch}
          title="When do you need something?"
          description="Choose a date and time above to see what's free."
        />
      ) : invalidRange ? (
        <Alert tone="error">The end time must be after the start time.</Alert>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{pluralize(freeCount, "resource")} free</span> on{" "}
            {formatDateKey(date, "EEEE, d MMMM")} from {start} to {end}
            {capacity ? ` for ${capacity}+ people` : ""}.
          </p>
          {inPast && <Alert>This time has already started, so it can&apos;t be booked.</Alert>}
          {results.length ? (
            <ul className="grid gap-2">
              {results.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "flex flex-wrap items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-xs",
                    r.available ? "border-zinc-200" : "border-zinc-100 opacity-70",
                  )}
                >
                  <span className={cn("size-2.5 shrink-0 rounded-full", r.available ? "bg-brand-500" : "bg-zinc-300")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/resources/${r.id}`} className="font-medium text-zinc-900 hover:text-brand-700">
                        {r.name}
                      </Link>
                      <span className="text-xs text-zinc-500">{r.categoryName}</span>
                      {r.requiresApproval && (
                        <Badge tone="amber">
                          <ShieldCheck />
                          Approval
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-500">
                      {r.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {r.location}
                        </span>
                      )}
                      {r.capacity && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" />
                          {r.capacity}
                        </span>
                      )}
                      {!r.available && <span className="text-zinc-600">{r.reason}</span>}
                    </div>
                  </div>
                  {r.available && !inPast && (
                    <Link
                      href={`/resources/${r.id}?date=${date}&start=${start}&end=${end}&week=${date}#book`}
                      className={buttonStyles({ size: "sm" })}
                    >
                      Book
                      <ArrowRight />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarSearch} title="No resources match these filters" />
          )}
        </div>
      )}
    </div>
  );
}
