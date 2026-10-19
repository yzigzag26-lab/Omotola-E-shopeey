import type { Metadata } from "next";
import { CartView, type CatalogEntry } from "@/components/storefront/cart-view";
import { getPublishedProducts } from "@/lib/data/catalog";
import { primaryImage } from "@/lib/types";

export const metadata: Metadata = {
  title: "Your bag",
  description: "Review your Corazon Empire selections and place an order via WhatsApp or email.",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const products = await getPublishedProducts();
  const catalog: CatalogEntry[] = products.data.map((product) => {
    const image = primaryImage(product);
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      priceKobo: product.price_kobo,
      availability: product.availability,
      image: image?.image_url_thumb ?? image?.image_url ?? null,
      variantValues: product.variants.filter((variant) => variant.is_available).map((variant) => variant.value),
    };
  });

  return (
    <div className="shell py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Your selection</p>
        <h1 className="mt-4 font-display text-5xl md:text-6xl">
          Your <span className="accent text-burgundy">bag</span>
        </h1>
      </header>
      <div className="mt-10">
        <CartView catalog={catalog} />
      </div>
    </div>
  );
}
