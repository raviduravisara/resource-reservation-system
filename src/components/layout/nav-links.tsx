"use client";

import {
  Boxes,
  CalendarCheck,
  CalendarSearch,
  ClipboardCheck,
  LayoutDashboard,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const icons = {
  dashboard: LayoutDashboard,
  resources: Boxes,
  availability: CalendarSearch,
  reservations: CalendarCheck,
  approvals: ClipboardCheck,
  categories: Tags,
  users: Users,
};

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
  badge?: number;
  section?: "admin";
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const firstAdminIndex = items.findIndex((item) => item.section === "admin");

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:pt-2 lg:pb-0">
      {items.map((item, index) => {
        const Icon = icons[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <div key={item.href} className="contents">
            {index === firstAdminIndex && (
              <p className="mt-5 mb-1 hidden px-3 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase lg:block">
                Administration
              </p>
            )}
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-amber-500 px-1.5 py-px text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
