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
      <Link
        href={`/product/${product.slug}`}
        className="lift block rounded-card border border-line bg-white p-2 focus-visible:outline-offset-4"
      >
        <div className="relative overflow-hidden rounded-[1.1rem] bg-ivory-deep">
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
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {product.is_featured ? (
              <span className="rounded-full bg-burgundy px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                Hot pick
              </span>
            ) : null}
            {product.availability !== "available" ? <AvailabilityBadge status={product.availability} short /> : null}
          </div>
          <span
            aria-hidden="true"
            className="absolute bottom-2.5 right-2.5 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-ink text-sm text-ivory opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            ↗
          </span>
        </div>
        <div className="space-y-1.5 px-2 pb-2 pt-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{product.category?.name ?? "Corazon Empire"}</p>
          <h3 className="font-display text-[17px] leading-snug text-ink transition-colors group-hover:text-burgundy">{product.name}</h3>
          <Price kobo={product.price_kobo} className="text-[15px] font-bold text-ink" />
        </div>
      </Link>
    </article>
  );
}
