import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { logout } from "@/server/actions/auth";
import { countPendingApprovals } from "@/server/queries/reservations";
import { Skeleton } from "../ui/skeleton";
import { NavLinks, type NavItem } from "./nav-links";

export async function Navigation() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const pending = isAdmin ? await countPendingApprovals(new Date()) : 0;

  const items: NavItem[] = [
    { href: "/", label: "Dashboard", icon: "dashboard" },
    { href: "/resources", label: "Resources", icon: "resources" },
    { href: "/availability", label: "Find a slot", icon: "availability" },
    { href: "/reservations", label: isAdmin ? "Reservations" : "My reservations", icon: "reservations" },
  ];
  if (isAdmin) {
    items.push(
      { href: "/approvals", label: "Approvals", icon: "approvals", badge: pending, section: "admin" },
      { href: "/categories", label: "Categories", icon: "categories", section: "admin" },
      { href: "/users", label: "Users", icon: "users", section: "admin" },
    );
  }

  return (
    <>
      <NavLinks items={items} />
      <div className="absolute top-3 right-4 flex items-center gap-3 lg:static lg:border-t lg:border-zinc-200 lg:p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
            {initials(user.name)}
          </span>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
            <p className="truncate text-xs text-zinc-500 capitalize">{user.role}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut className="size-4" />
            <span className="sr-only">Sign out</span>
          </button>
        </form>
      </div>
    </>
  );
}

export function NavigationSkeleton() {
  return (
    <div className="flex gap-2 px-3 pb-2 lg:flex-1 lg:flex-col lg:pt-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-9 w-24 lg:w-full" />
      ))}
    </div>
  );
}
