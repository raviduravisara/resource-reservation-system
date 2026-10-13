import type { ReservationStatus } from "@/db/schema";
import { displayStatus, type DisplayStatus } from "@/lib/booking-rules";
import { Badge, type BadgeTone } from "../ui/badge";

const appearance: Record<DisplayStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Awaiting approval", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "green" },
  in_progress: { label: "In progress", tone: "blue" },
  completed: { label: "Completed", tone: "neutral" },
  rejected: { label: "Rejected", tone: "red" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

export function StatusBadge({
  status,
  startsAt,
  endsAt,
  now,
}: {
  status: ReservationStatus;
  startsAt: Date;
  endsAt: Date;
  now: Date;
}) {
  const { label, tone } = appearance[displayStatus(status, startsAt, endsAt, now)];
  return <Badge tone={tone}>{label}</Badge>;
}
