import Link from "next/link";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveCategories, getPublishedProducts } from "@/lib/data/catalog";
import { ShopFilters } from "@/components/storefront/shop-filters";
import type { ProductWithRelations } from "@/lib/types";

export const metadata = {
  title: "Shop all",
  description: "Browse every Corazon Empire piece — fashion, accessories, home and everyday objects.",
  alternates: { canonical: "/shop" },
};

const PAGE_SIZE = 8;
type SortKey = "newest" | "price-asc" | "price-desc";

type SearchParams = Promise<{ q?: string; category?: string; sort?: string; featured?: string; page?: string }>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [categoriesResult, productsResult] = await Promise.all([getActiveCategories(), getPublishedProducts()]);
  const categories = categoriesResult.data;
  const allProducts = productsResult.data;

  const query = (params.q ?? "").trim().toLowerCase();
  const categorySlug = params.category ?? "";
  const sort: SortKey = params.sort === "price-asc" || params.sort === "price-desc" ? params.sort : "newest";
  const featuredOnly = params.featured === "1";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const category = categories.find((item) => item.slug === categorySlug) ?? null;

  let filtered: ProductWithRelations[] = allProducts.filter((product) => {
    if (category && product.category_id !== category.id) return false;
    if (featuredOnly && !product.is_featured) return false;
    if (query) {
      const haystack = `${product.name} ${product.category?.name ?? ""} ${product.description}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  filtered = filtered.sort((a, b) => {
    if (sort === "price-asc") return a.price_kobo - b.price_kobo;
    if (sort === "price-desc") return b.price_kobo - a.price_kobo;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    const merged = {
      q: params.q,
      category: params.category,
      sort: params.sort,
      featured: params.featured,
      page: params.page,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "" && !(key === "page" && Number(value) === 1)) {
        next.set(key, String(value));
      }
    }
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <div className="shell py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-4 font-display text-5xl md:text-6xl">
          Shop <span className="accent text-burgundy">it all.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Every published piece, in one place. Availability is confirmed by the seller when you
          order — nothing is reserved automatically.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:self-start">
          <ShopFilters categories={categories} initialQuery={params.q ?? ""} activeCategory={categorySlug} />
        </aside>

        <section aria-label="Products">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-line bg-white py-2 pl-5 pr-2">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted" role="status">
              {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
              {category ? ` in ${category.name}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold">
              <span className="px-1 text-muted">Sort</span>
              {(
                [
                  { key: "newest", label: "Newest" },
                  { key: "price-asc", label: "Price ↑" },
                  { key: "price-desc", label: "Price ↓" },
                ] as const
              ).map((option) => (
                <Link
                  key={option.key}
                  href={buildHref({ sort: option.key, page: 1 })}
                  aria-current={sort === option.key ? "true" : undefined}
                  className={`rounded-full border px-3 py-1.5 transition-colors ${
                    sort === option.key ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {visible.length > 0 ? (
              <ProductGrid products={visible} />
            ) : (
              <EmptyState
                eyebrow="Nothing matched"
                title="No pieces found"
                description="Try a different search term or clear the filters to see the full collection."
                action={
                  <Link href="/shop" className="btn btn-outline">
                    Clear filters
                  </Link>
                }
              />
            )}
          </div>

          {totalPages > 1 ? (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-between rounded-full border border-line bg-white p-1.5">
              <Link
                href={buildHref({ page: currentPage - 1 })}
                aria-disabled={currentPage === 1}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
                  currentPage === 1 ? "pointer-events-none text-muted/50" : "bg-ink text-ivory hover:bg-burgundy"
                }`}
              >
                Previous
              </Link>
              <span className="text-[12px] font-semibold text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <Link
                href={buildHref({ page: currentPage + 1 })}
                aria-disabled={currentPage === totalPages}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
                  currentPage === totalPages ? "pointer-events-none text-muted/50" : "bg-ink text-ivory hover:bg-burgundy"
                }`}
              >
                Next
              </Link>
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
