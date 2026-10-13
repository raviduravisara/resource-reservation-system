import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryForm } from "@/components/admin/category-form";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { pluralize } from "@/lib/utils";
import { removeCategory } from "@/server/actions/resources";
import { listCategories } from "@/server/queries/resources";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" description="Group resources so people can find the right thing quickly." />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  await requireAdmin();
  const categories = await listCategories();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <ul className="divide-y divide-zinc-100">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/resources?category=${category.id}`}
                  className="font-medium text-zinc-900 hover:text-brand-700"
                >
                  {category.name}
                </Link>
                {category.description && <p className="text-sm text-zinc-500">{category.description}</p>}
              </div>
              <span className="text-sm text-zinc-500">{pluralize(category.resourceCount, "resource")}</span>
              {category.resourceCount === 0 && (
                <ActionButton
                  action={removeCategory}
                  fields={{ id: category.id }}
                  confirm={`Delete the "${category.name}" category?`}
                  variant="ghost"
                  size="icon"
                  title="Delete"
                >
                  <Trash2 />
                </ActionButton>
              )}
            </li>
          ))}
          {categories.length === 0 && <li className="px-5 py-8 text-center text-sm text-zinc-500">No categories yet.</li>}
        </ul>
      </Card>
      <Card className="self-start">
        <CardHeader title="Add category" />
        <CardBody>
          <CategoryForm />
        </CardBody>
      </Card>
    </div>
  );
}
