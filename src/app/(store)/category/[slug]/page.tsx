import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveCategories, getCategoryBySlug, getProductsByCategory } from "@/lib/data/catalog";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: category } = await getCategoryBySlug(slug);
    if (!category) return { title: "Category not found" };
    return {
      title: category.name,
      description: category.description ?? `Shop ${category.name} at Corazon Empire.`,
      alternates: { canonical: `/category/${category.slug}` },
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [categoryResult, categoriesResult] = await Promise.all([getCategoryBySlug(slug), getActiveCategories()]);
  const category = categoryResult.data;
  if (!category) notFound();
  const products = await getProductsByCategory(category.id);

  return (
    <div className="shell py-12 md:py-16">
      <nav aria-label="Breadcrumb" className="text-[10px] uppercase tracking-[0.18em] text-muted">
        <Link href="/" className="hover:text-burgundy">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/shop" className="hover:text-burgundy">Shop</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-soft">{category.name}</span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <p className="eyebrow">Category</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">{category.name}</h1>
        {category.description ? (
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{category.description}</p>
        ) : null}
      </header>

      <nav aria-label="Other categories" className="mt-8 flex flex-wrap gap-2">
        {categoriesResult.data.map((item) => (
          <Link
            key={item.id}
            href={`/category/${item.slug}`}
            aria-current={item.id === category.id ? "page" : undefined}
            className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${
              item.id === category.id ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="mt-10">
        {products.data.length > 0 ? (
          <ProductGrid products={products.data} />
        ) : (
          <EmptyState
            eyebrow={category.name}
            title="Pieces arriving soon"
            description="This category is being curated. In the meantime, browse the full collection."
            action={<Link href="/shop" className="btn btn-outline">Shop all</Link>}
          />
        )}
      </div>
    </div>
  );
}
