import { Inbox, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReviewActions } from "@/components/reservations/review-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { formatIn, formatRange } from "@/lib/time";
import { listPendingApprovals, listRecentDecisions } from "@/server/queries/reservations";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader
        title="Approvals"
        description="Requests for resources that need sign-off. Pending requests hold their slot until you decide."
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <ApprovalQueue />
      </Suspense>
    </>
  );
}

async function ApprovalQueue() {
  await requireAdmin();
  const now = new Date();
  const [pending, recent] = await Promise.all([listPendingApprovals(now), listRecentDecisions(8)]);

  return (
    <div className="grid gap-8">
      {pending.length ? (
        <ul className="grid gap-3">
          {pending.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs lg:flex-row lg:items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-900">{r.title}</p>
                  <Badge tone="amber">Awaiting approval</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-700">{formatRange(r.startsAt, r.endsAt)}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
                  <Link href={`/resources/${r.resourceId}`} className="font-medium text-brand-700 hover:underline">
                    {r.resourceName}
                  </Link>
                  {r.resourceLocation && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {r.resourceLocation}
                    </span>
                  )}
                  {r.attendees && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {r.attendees} attendees
                    </span>
                  )}
                  <span>
                    Requested by <span className="font-medium text-zinc-700">{r.userName}</span>{" "}
                    {formatIn(r.createdAt, "d MMM, h:mm a")}
                  </span>
                </div>
                {r.notes && <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">{r.notes}</p>}
              </div>
              <ReviewActions id={r.id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Inbox} title="You're all caught up" description="New booking requests will appear here." />
      )}

      {recent.length > 0 && (
        <Card>
          <CardHeader title="Recent decisions" />
          <ul className="divide-y divide-zinc-100">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {r.title} <span className="font-normal text-zinc-500">· {r.resourceName}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {r.userName} · {formatRange(r.startsAt, r.endsAt)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={r.status === "confirmed" ? "green" : "red"}>
                    {r.status === "confirmed" ? "Approved" : "Rejected"}
                  </Badge>
                  <p className="mt-1 text-xs text-zinc-400">by {r.reviewerName}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
