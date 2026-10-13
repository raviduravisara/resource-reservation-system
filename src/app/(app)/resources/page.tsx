import { Boxes, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ResourceCard } from "@/components/resources/resource-card";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getLiveStatuses, listCategories, listResources } from "@/server/queries/resources";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  return (
    <>
      <PageHeader
        title="Resources"
        description="Rooms, equipment and vehicles available to book, with live availability."
      />
      <Suspense fallback={<ResourcesSkeleton />}>
        <ResourceDirectory searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResourceDirectory({ searchParams }: { searchParams: PageProps<"/resources">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const categoryId = typeof params.category === "string" ? params.category : undefined;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const isAdmin = user.role === "admin";
  const now = new Date();

  const [categories, resources] = await Promise.all([
    listCategories(),
    listResources({ categoryId, query, includeInactive: isAdmin }),
  ]);
  const statuses = await getLiveStatuses(
    resources.filter((r) => r.isActive).map((r) => r.id),
    now,
  );

  const chip = (active: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100",
    );
  const withQuery = (category?: string) => {
    const search = new URLSearchParams();
    if (category) search.set("category", category);
    if (query) search.set("q", query);
    const qs = search.toString();
    return qs ? `/resources?${qs}` : "/resources";
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href={withQuery()} className={chip(!categoryId)}>
            All
          </Link>
          {categories.map((category) => (
            <Link key={category.id} href={withQuery(category.id)} className={chip(categoryId === category.id)}>
              {category.name}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Form action="/resources" className="relative flex-1 lg:w-64">
            {categoryId && <input type="hidden" name="category" value={categoryId} />}
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input name="q" defaultValue={query} placeholder="Search name or location" className="pl-9" />
          </Form>
          {isAdmin && (
            <Link href="/resources/new" className={buttonStyles()}>
              <Plus />
              Add resource
            </Link>
          )}
        </div>
      </div>

      {resources.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} status={statuses.get(resource.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Boxes}
          title="No resources found"
          description={query ? `Nothing matches "${query}".` : "Nothing has been added to this category yet."}
          action={
            isAdmin && (
              <Link href="/resources/new" className={buttonStyles({ variant: "secondary" })}>
                Add a resource
              </Link>
            )
          }
        />
      )}
    </div>
  );
}

function ResourcesSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
