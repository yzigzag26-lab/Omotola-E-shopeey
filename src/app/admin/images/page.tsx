import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import type { ProductWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  const session = await requireAdminPage();
  const { data } = await session.supabase
    .from("products")
    .select("*, category:categories(*), images:product_images(*), variants:product_variants(*)")
    .order("name");
  const products = (data ?? []) as unknown as ProductWithRelations[];

  const missingFront = products.filter((product) => !product.images.some((image) => image.role === "front"));
  const missingBack = products.filter((product) => !product.images.some((image) => image.role === "back"));

  return (
    <AdminShell email={session.email} active="/admin/images">
      <p className="eyebrow">Media</p>
      <h1 className="mt-2 font-display text-3xl">Product images</h1>
      <p className="mt-1 text-sm text-muted">
        Every upload is fitted into a shared 4:5 area — the original proportions are preserved and
        nothing is stretched. Front and back views are expected for each product.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Products</p>
          <p className="mt-2 font-display text-3xl">{products.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Missing front</p>
          <p className="mt-2 font-display text-3xl">{missingFront.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Missing back</p>
          <p className="mt-2 font-display text-3xl">{missingBack.length}</p>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {products.map((product) => {
          const front = product.images.find((image) => image.role === "front");
          const back = product.images.find((image) => image.role === "back");
          return (
            <li key={product.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="h-16 w-14 border border-line bg-ivory-deep">
                {front ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={front.image_url_thumb ?? front.image_url} alt={front.alt_text} className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="h-16 w-14 border border-line bg-ivory-deep">
                {back ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={back.image_url_thumb ?? back.image_url} alt={back.alt_text} className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-[11px] text-muted">
                  {product.images.length} image{product.images.length === 1 ? "" : "s"} ·{" "}
                  {front ? "front set" : "front missing"} · {back ? "back set" : "back missing"}
                </p>
              </div>
              <Link href={`/admin/products/${product.id}`} className="btn btn-quiet btn-sm">Manage images</Link>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
