import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatMoney } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { setProductAvailabilityAction, setProductStatusAction } from "@/app/admin/product-actions";
import { PRODUCT_SELECT } from "@/lib/data/admin";
import type { ProductWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; deleted?: string }>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAdminPage();
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = ["draft", "published", "archived"].includes(params.status ?? "") ? params.status : "";

  let request = session.supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (status) request = request.eq("status", status as "draft" | "published" | "archived");
  if (query) request = request.ilike("name", `%${query}%`);

  const { data, error } = await request;
  const products = (data ?? []) as unknown as ProductWithRelations[];

  return (
    <AdminShell email={session.email} active="/admin/products">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-2 font-display text-3xl">Products</h1>
          <p className="mt-1 text-sm text-muted">{products.length} shown · changes appear on the storefront immediately.</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">Add product</Link>
      </div>

      {params.deleted ? (
        <p className="mt-5 border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">Product deleted. Historical order snapshots were preserved.</p>
      ) : null}
      {error ? (
        <p className="mt-5 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">Could not load products: {error.message}</p>
      ) : null}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-52 flex-1">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={query} className="field" placeholder="Product name" />
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" defaultValue={status} className="field">
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <button type="submit" className="btn btn-outline">Filter</button>
        {query || status ? <Link href="/admin/products" className="btn btn-quiet">Clear</Link> : null}
      </form>

      {products.length === 0 ? (
        <div className="mt-6 border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-display text-xl">No products match</p>
          <p className="mt-2 text-sm text-muted">Adjust the filters or add a new product.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[54rem] text-left text-sm">
            <thead className="border-b border-line bg-ivory-deep/50 text-[10px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3">Price</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Availability</th>
                <th scope="col" className="px-4 py-3">Updated</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => {
                const image = [...product.images].sort((a, b) => a.display_order - b.display_order)[0];
                return (
                  <tr key={product.id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-11 shrink-0 border border-line bg-ivory-deep">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image.image_url_thumb ?? image.image_url} alt={image.alt_text} className="h-full w-full object-contain" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${product.id}`} className="block truncate font-medium text-ink hover:text-burgundy">
                            {product.name}
                          </Link>
                          <p className="truncate text-[11px] text-muted">{product.category?.name} · /{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(product.price_kobo)}</td>
                    <td className="px-4 py-3">
                      <form action={setProductStatusAction} className="flex items-center gap-1">
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="status" value={product.status === "published" ? "draft" : "published"} />
                        <span className={`border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                          product.status === "published" ? "border-success/40 text-success" : "border-line text-muted"
                        }`}>
                          {product.status}
                        </span>
                        <button type="submit" className="text-[9px] uppercase tracking-[0.12em] text-burgundy underline underline-offset-2">
                          {product.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form action={setProductAvailabilityAction} className="flex items-center gap-1">
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="availability" value={product.availability === "temporarily_unavailable" ? "available" : "temporarily_unavailable"} />
                        <span className="text-[10px] uppercase tracking-[0.1em] text-muted">
                          {product.availability.replace(/_/g, " ")}
                        </span>
                        <button type="submit" className="text-[9px] uppercase tracking-[0.12em] text-burgundy underline underline-offset-2">
                          {product.availability === "temporarily_unavailable" ? "Restore" : "Pause"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted">{formatDate(product.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/products/${product.id}`} className="text-[10px] uppercase tracking-[0.12em] text-burgundy underline underline-offset-4">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
