import type { Metadata } from "next";
import { Suspense } from "react";
import { ResourceForm } from "@/components/resources/resource-form";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/server/queries/resources";

export const metadata: Metadata = { title: "New resource" };

export default function NewResourcePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New resource" description="Add something people can reserve." />
      <Suspense fallback={<Skeleton className="h-[640px] rounded-xl" />}>
        <NewResource />
      </Suspense>
    </div>
  );
}

async function NewResource() {
  await requireAdmin();
  const categories = await listCategories();
  return <ResourceForm categories={categories} />;
}
