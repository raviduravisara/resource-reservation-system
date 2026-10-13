import { MapPin, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/server/queries/resources";
import { Badge } from "../ui/badge";

const dot = {
  green: "bg-brand-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  neutral: "bg-zinc-400",
};

export function ResourceCard({
  resource,
  status,
}: {
  resource: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    capacity: number | null;
    requiresApproval: boolean;
    isActive: boolean;
    categoryName: string;
  };
  status?: LiveStatus;
}) {
  return (
    <Link
      href={`/resources/${resource.id}`}
      className={cn(
        "group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-brand-200 hover:shadow-md",
        !resource.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{resource.categoryName}</p>
          <h3 className="mt-0.5 truncate font-semibold text-zinc-900 group-hover:text-brand-700">{resource.name}</h3>
        </div>
        {!resource.isActive ? (
          <Badge>Inactive</Badge>
        ) : (
          resource.requiresApproval && (
            <Badge tone="amber" title="Bookings need admin approval">
              <ShieldCheck />
              Approval
            </Badge>
          )
        )}
      </div>

      {resource.description && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{resource.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        {resource.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {resource.location}
          </span>
        )}
        {resource.capacity && (
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {resource.capacity} people
          </span>
        )}
      </div>

      {status && resource.isActive && (
        <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 text-xs font-medium text-zinc-700">
          <span className={cn("size-2 rounded-full", dot[status.tone])} />
          {status.label}
        </div>
      )}
    </Link>
  );
}
