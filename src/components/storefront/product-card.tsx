import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { Price } from "@/components/ui/price";
import { primaryImage, type ProductWithRelations } from "@/lib/types";
import { AvailabilityBadge } from "@/components/ui/badge";

export function ProductCard({ product, priority = false }: { product: ProductWithRelations; priority?: boolean }) {
  const image = primaryImage(product);
  const hoverImage = product.images.find((item) => item.role === "back") ?? null;

  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="relative overflow-hidden border border-line bg-ivory-deep">
          <ProductImage src={image?.image_url} thumbSrc={image?.image_url_thumb} alt={image?.alt_text ?? product.name} priority={priority} />
          {hoverImage ? (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
              <ProductImage
                src={hoverImage.image_url}
                thumbSrc={hoverImage.image_url_thumb}
                alt={hoverImage.alt_text}
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              />
            </div>
          ) : null}
          {product.availability !== "available" ? (
            <div className="absolute left-3 top-3">
              <AvailabilityBadge status={product.availability} short />
            </div>
          ) : null}
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{product.category?.name ?? "Corazon Empire"}</p>
          <h3 className="font-display text-lg leading-snug text-ink group-hover:text-burgundy">{product.name}</h3>
          <Price kobo={product.price_kobo} className="text-sm text-ink-soft" />
        </div>
      </Link>
    </article>
  );
}
