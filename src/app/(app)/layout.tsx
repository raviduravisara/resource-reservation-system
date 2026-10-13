import { Suspense, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { Navigation, NavigationSkeleton } from "@/components/layout/navigation";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="relative border-b border-zinc-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-14 items-center px-4 lg:h-16 lg:px-6">
          <Brand />
        </div>
        <Suspense fallback={<NavigationSkeleton />}>
          <Navigation />
        </Suspense>
      </aside>
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
