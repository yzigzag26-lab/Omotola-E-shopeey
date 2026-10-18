import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProductForm } from "@/components/admin/product-form";
import { ImageManager } from "@/components/admin/image-manager";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { PRODUCT_SELECT } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import type { ProductWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ created?: string }>;

export default async function EditProductPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const session = await requireAdminPage();
  const { id } = await params;
  const { created } = await searchParams;

  const [{ data: product }, { data: categories }] = await Promise.all([
    session.supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle(),
    session.supabase.from("categories").select("*").order("display_order"),
  ]);

  if (!product) notFound();
  const typed = product as unknown as ProductWithRelations;

  return (
    <AdminShell email={session.email} active="/admin/products">
      <nav aria-label="Breadcrumb" className="text-[10px] uppercase tracking-[0.14em] text-muted">
        <Link href="/admin/products" className="hover:text-burgundy">Products</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-soft">{typed.name}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{typed.name}</h1>
          <p className="mt-1 text-xs text-muted">
            {typed.status} · {formatMoney(typed.price_kobo)} · updated {formatDateTime(typed.updated_at)}
          </p>
        </div>
        <Link href={`/product/${typed.slug}`} target="_blank" className="btn btn-quiet btn-sm">View on storefront</Link>
      </div>

      {created ? (
        <p className="mt-5 border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Product created. Upload a back view below if you have not yet — both views are recommended.
        </p>
      ) : null}

      <div className="mt-7 space-y-6">
        <AdminProductForm product={typed} categories={categories ?? []} />
        <ImageManager productId={typed.id} images={typed.images} />
        <section className="card border-danger/30 p-5" aria-labelledby="danger-heading">
          <h2 id="danger-heading" className="font-display text-lg text-danger">Delete product</h2>
          <p className="mt-1 text-xs text-muted">
            Permanently removes the product and its images. Past orders keep their item snapshots, so
            order history is not damaged.
          </p>
          <div className="mt-3">
            <DeleteProductButton productId={typed.id} productName={typed.name} />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
