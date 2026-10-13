import { Power, Trash2, Wrench } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MaintenanceForm } from "@/components/resources/maintenance-form";
import { ResourceForm } from "@/components/resources/resource-form";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { formatRange, toDateKey } from "@/lib/time";
import { deleteMaintenance, removeResource, toggleResourceActive } from "@/server/actions/resources";
import { getResource, listCategories, listUpcomingMaintenance } from "@/server/queries/resources";

export const metadata: Metadata = { title: "Manage resource" };

type Props = PageProps<"/resources/[id]/edit">;

export default function EditResourcePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[640px] rounded-xl" />}>
      <EditResource params={params} />
    </Suspense>
  );
}

async function EditResource({ params }: { params: Props["params"] }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [resource, categories, maintenance] = await Promise.all([
    getResource(id),
    listCategories(),
    listUpcomingMaintenance(id),
  ]);
  if (!resource) notFound();

  return (
    <>
      <PageHeader title={`Manage ${resource.name}`} description="Update details, opening hours and availability." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ResourceForm
          categories={categories}
          resource={{
            ...resource,
            hours: resource.hours.map((h) => ({ ...h, opensAt: h.opensAt.slice(0, 5), closesAt: h.closesAt.slice(0, 5) })),
          }}
        />

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Maintenance" description="Block the resource for servicing or repairs." />
            <CardBody className="grid gap-5">
              {maintenance.length > 0 && (
                <ul className="grid gap-3">
                  {maintenance.map((m) => (
                    <li key={m.id} className="flex items-start gap-3 text-sm">
                      <Wrench className="mt-0.5 size-4 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900">{m.reason}</p>
                        <p className="text-zinc-500">{formatRange(m.startsAt, m.endsAt)}</p>
                      </div>
                      <ActionButton
                        action={deleteMaintenance}
                        fields={{ id: m.id }}
                        confirm="Remove this maintenance window? Cancelled bookings are not restored."
                        variant="ghost"
                        size="icon"
                        title="Remove"
                      >
                        <Trash2 />
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
              <MaintenanceForm resourceId={id} today={toDateKey(new Date())} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Availability" />
            <CardBody className="grid gap-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <p className="text-zinc-600">
                  {resource.isActive
                    ? "Deactivating hides the resource and stops new bookings. Existing bookings stay as they are."
                    : "This resource is hidden from members and can't be booked."}
                </p>
                <ActionButton
                  action={toggleResourceActive}
                  fields={{ id, active: String(!resource.isActive) }}
                  variant="secondary"
                >
                  <Power />
                  {resource.isActive ? "Deactivate" : "Activate"}
                </ActionButton>
              </div>
              <div className="flex items-start justify-between gap-4 border-t border-zinc-100 pt-4">
                <p className="text-zinc-600">Delete permanently. Only possible if it was never booked.</p>
                <ActionButton
                  action={removeResource}
                  fields={{ id }}
                  confirm={`Delete ${resource.name} permanently?`}
                  variant="danger-ghost"
                >
                  <Trash2 />
                  Delete
                </ActionButton>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
