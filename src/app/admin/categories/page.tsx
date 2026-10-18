import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { CategoryForm } from "@/components/admin/category-form";
import { toggleCategoryAction } from "@/app/admin/catalog-actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ edit?: string }>;

export default async function AdminCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAdminPage();
  const { edit } = await searchParams;
  const { data: categories } = await session.supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  const editing = (categories ?? []).find((category) => category.id === edit) ?? null;

  return (
    <AdminShell email={session.email} active="/admin/categories">
      <p className="eyebrow">Structure</p>
      <h1 className="mt-2 font-display text-3xl">Categories</h1>
      <p className="mt-1 text-sm text-muted">Eight launch categories. Inactive categories disappear from the storefront.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-line bg-ivory-deep/50 text-[10px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Order</th>
                <th scope="col" className="px-4 py-3">Visible</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(categories ?? []).map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-[11px] text-muted">/category/{category.slug}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">{category.display_order}</td>
                  <td className="px-4 py-3">
                    <form action={toggleCategoryAction} className="flex items-center gap-2">
                      <input type="hidden" name="category_id" value={category.id} />
                      <input type="hidden" name="is_active" value={String(category.is_active)} />
                      <span className={`border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${category.is_active ? "border-success/40 text-success" : "border-line text-muted"}`}>
                        {category.is_active ? "active" : "hidden"}
                      </span>
                      <button type="submit" className="text-[9px] uppercase tracking-[0.12em] text-burgundy underline underline-offset-2">
                        {category.is_active ? "Hide" : "Show"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/categories?edit=${category.id}`} className="text-[10px] uppercase tracking-[0.12em] text-burgundy underline underline-offset-4">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CategoryForm category={editing} />
      </div>
    </AdminShell>
  );
}
