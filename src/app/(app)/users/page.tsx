import type { Metadata } from "next";
import { Suspense } from "react";
import { UserForm } from "@/components/admin/user-form";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { formatIn } from "@/lib/time";
import { initials } from "@/lib/utils";
import { toggleUserActive, updateRole } from "@/server/actions/users";
import { listUsers } from "@/server/queries/users";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" description="Who can sign in, and what they're allowed to do." />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Users />
      </Suspense>
    </>
  );
}

async function Users() {
  const admin = await requireAdmin();
  const users = await listUsers();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-zinc-100">
          {users.map((user) => {
            const self = user.id === admin.id;
            return (
              <li key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                  {initials(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-900">{user.name}</p>
                    {self && <Badge tone="blue">You</Badge>}
                    <Badge tone={user.role === "admin" ? "green" : "neutral"} className="capitalize">
                      {user.role}
                    </Badge>
                    {!user.isActive && <Badge tone="red">Deactivated</Badge>}
                  </div>
                  <p className="truncate text-sm text-zinc-500">
                    {user.email} · {user.reservationCount} bookings · joined {formatIn(user.createdAt, "d MMM yyyy")}
                  </p>
                </div>
                {!self && (
                  <div className="flex gap-2">
                    <ActionButton
                      action={updateRole}
                      fields={{ id: user.id, role: user.role === "admin" ? "member" : "admin" }}
                      confirm={user.role === "admin" ? `Remove admin rights from ${user.name}?` : `Make ${user.name} an admin?`}
                    >
                      {user.role === "admin" ? "Make member" : "Make admin"}
                    </ActionButton>
                    <ActionButton
                      action={toggleUserActive}
                      fields={{ id: user.id, active: String(!user.isActive) }}
                      confirm={user.isActive ? `Deactivate ${user.name}? They will be signed out.` : undefined}
                      variant={user.isActive ? "danger-ghost" : "secondary"}
                    >
                      {user.isActive ? "Deactivate" : "Reactivate"}
                    </ActionButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <Card className="self-start">
        <CardHeader title="Add user" description="There is no public sign-up; admins create accounts." />
        <CardBody>
          <UserForm />
        </CardBody>
      </Card>
    </div>
  );
}
