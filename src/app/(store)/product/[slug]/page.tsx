import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/storefront/product-detail";
import { ProductGrid } from "@/components/storefront/product-grid";
import { getProductBySlug, getPublishedProducts } from "@/lib/data/catalog";
import { primaryImage } from "@/lib/types";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: product } = await getProductBySlug(slug);
    if (!product) return { title: "Product not found" };
    const image = primaryImage(product);
    return {
      title: product.seo_title ?? product.name,
      description: product.seo_description ?? product.description.slice(0, 160),
      alternates: { canonical: `/product/${product.slug}` },
      openGraph: {
        type: "website",
        title: product.seo_title ?? product.name,
        description: product.seo_description ?? product.description.slice(0, 160),
        images: image ? [{ url: image.image_url, alt: image.alt_text }] : undefined,
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  const product = result.data;
  if (!product) notFound();

  const all = await getPublishedProducts();
  const related = all.data
    .filter((item) => item.id !== product.id && item.category_id === product.category_id)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((image) => image.image_url),
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: (product.price_kobo / 100).toFixed(2),
      availability:
        product.availability === "available"
          ? "https://schema.org/InStock"
          : product.availability === "made_to_order"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="shell py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-white px-4 py-1.5 text-[12px] font-semibold text-muted">
        <Link href="/" className="hover:text-burgundy">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/shop" className="hover:text-burgundy">Shop</Link>
        {product.category ? (
          <>
            <span aria-hidden="true"> / </span>
            <Link href={`/category/${product.category.slug}`} className="hover:text-burgundy">{product.category.name}</Link>
          </>
        ) : null}
      </nav>

      <ProductDetail product={product} />

      {related.length > 0 ? (
        <section className="mt-20 rounded-blob border border-line bg-ivory-deep p-5 md:p-10" aria-labelledby="related-heading">
          <p className="eyebrow">More from {product.category?.name ?? "the collection"}</p>
          <h2 id="related-heading" className="mt-4 font-display text-3xl md:text-4xl">
            You may also <span className="accent text-burgundy">like</span>
          </h2>
          <div className="mt-8">
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
