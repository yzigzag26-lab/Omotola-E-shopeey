import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const session = await requireAdminPage();
  const { data: categories } = await session.supabase.from("categories").select("*").order("display_order");

  return (
    <AdminShell email={session.email} active="/admin/products">
      <nav aria-label="Breadcrumb" className="text-[10px] uppercase tracking-[0.14em] text-muted">
        <Link href="/admin/products" className="hover:text-burgundy">Products</Link>
        <span aria-hidden="true"> / </span>
        <span>New</span>
      </nav>
      <h1 className="mt-3 font-display text-3xl">Add a product</h1>
      <p className="mt-1 text-sm text-muted">Saved products appear on the storefront as soon as their status is “Published”.</p>

      <div className="mt-7">
        {categories && categories.length > 0 ? (
          <AdminProductForm categories={categories} />
        ) : (
          <div className="card p-6">
            <p className="text-sm text-ink-soft">Create at least one category before adding products.</p>
            <Link href="/admin/categories" className="btn btn-primary mt-4">Manage categories</Link>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
