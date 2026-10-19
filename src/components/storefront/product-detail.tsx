"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { Price } from "@/components/ui/price";
import { AvailabilityBadge } from "@/components/ui/badge";
import { useCart } from "./cart-provider";
import { buildWhatsAppUrl } from "@/lib/orders/whatsapp";
import type { ProductWithRelations } from "@/lib/types";

type Props = { product: ProductWithRelations };

export function ProductDetail({ product }: Props) {
  const { addItem } = useCart();
  const images = useMemo(
    () => [...product.images].sort((a, b) => a.display_order - b.display_order),
    [product.images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const variantKinds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const variant of [...product.variants].sort((a, b) => a.display_order - b.display_order)) {
      if (!variant.is_available) continue;
      const list = map.get(variant.kind) ?? [];
      list.push(variant.value);
      map.set(variant.kind, list);
    }
    return [...map.entries()];
  }, [product.variants]);
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(variantKinds.map(([kind, values]) => [kind, values[0] ?? ""])),
  );
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const activeImage = images[activeIndex] ?? null;
  const unavailable = product.availability === "temporarily_unavailable";
  const selectedVariant = variantKinds.map(([kind]) => selections[kind]).filter(Boolean).join(" / ") || null;
  const missingVariant = variantKinds.some(([kind]) => !selections[kind]);

  const handleAdd = () => {
    if (unavailable) {
      setFeedback({ type: "error", message: "This piece is temporarily unavailable. Message us to be notified when it returns." });
      return;
    }
    if (missingVariant) {
      setFeedback({ type: "error", message: "Please select an option before adding to your bag." });
      return;
    }
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceKobo: product.price_kobo,
        image: images[0]?.image_url_thumb ?? images[0]?.image_url ?? null,
        variant: selectedVariant,
        availability: product.availability,
      },
      quantity,
    );
    setFeedback({ type: "success", message: `${product.name} added to your bag.` });
  };

  const whatsappUrl = buildWhatsAppUrl({
    lines: [
      {
        name: product.name,
        variant: selectedVariant,
        quantity,
        unitPriceKobo: product.price_kobo,
        lineTotalKobo: product.price_kobo * quantity,
      },
    ],
    subtotalKobo: product.price_kobo * quantity,
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div>
        <div className="overflow-hidden rounded-blob border border-line bg-white p-2.5">
          <div className="group relative overflow-hidden rounded-[1.5rem] bg-ivory-deep">
            <ProductImage
              src={activeImage?.image_url}
              thumbSrc={null}
              alt={activeImage?.alt_text ?? product.name}
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              fallbackLabel={product.name}
            />
            {images.length > 1 ? (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveIndex((index) => (index - 1 + images.length) % images.length)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/90 text-ink backdrop-blur transition-colors hover:bg-ink hover:text-ivory"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-ink-soft">
                  {activeIndex + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex((index) => (index + 1) % images.length)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/90 text-ink backdrop-blur transition-colors hover:bg-ink hover:text-ivory"
                  aria-label="Next image"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {images.length > 1 ? (
          <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Product images">
            {images.map((image, index) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-pressed={index === activeIndex}
                  className={`block w-full overflow-hidden rounded-2xl border-2 bg-white p-0.5 transition-colors ${index === activeIndex ? "border-burgundy" : "border-line hover:border-ink"}`}
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ivory-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.image_url_thumb ?? image.image_url}
                      alt={image.alt_text}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="lg:pt-2">
        <nav aria-label="Breadcrumb" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          <Link href="/shop" className="hover:text-burgundy">Shop</Link>
          <span aria-hidden="true"> / </span>
          {product.category ? (
            <Link href={`/category/${product.category.slug}`} className="hover:text-burgundy">
              {product.category.name}
            </Link>
          ) : null}
        </nav>

        <h1 className="mt-4 font-display text-4xl leading-[1.05] md:text-5xl">{product.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Price kobo={product.price_kobo} className="rounded-full bg-ink px-4 py-1.5 font-display text-xl font-bold text-ivory" />
          <AvailabilityBadge status={product.availability} />
        </div>

        <p className="mt-6 max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
          {product.description}
        </p>

        {variantKinds.length > 0 ? (
          <div className="mt-8 space-y-5">
            {variantKinds.map(([kind, values]) => (
              <fieldset key={kind}>
                <legend className="label">{kind}</legend>
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => {
                    const selected = selections[kind] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setSelections((current) => ({ ...current, [kind]: value }));
                          setFeedback(null);
                        }}
                        className={`min-w-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                          selected ? "border-ink bg-ink text-ivory" : "border-line bg-white text-ink-soft hover:border-ink"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="quantity" className="label">Quantity</label>
            <div className="flex items-center overflow-hidden rounded-full border border-line bg-white">
              <button
                type="button"
                className="h-11 w-11 text-lg text-ink-soft hover:bg-ivory-deep disabled:opacity-40"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                id="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={quantity}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  setQuantity(Number.isFinite(next) ? Math.min(20, Math.max(1, next)) : 1);
                }}
                className="h-11 w-12 bg-transparent font-semibold text-center text-sm tabular-nums focus:outline-none"
              />
              <button
                type="button"
                className="h-11 w-11 text-lg text-ink-soft hover:bg-ivory-deep disabled:opacity-40"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                disabled={quantity >= 20}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex-1 text-xs text-muted">
            Line total <span className="ml-2 text-base text-ink"><Price kobo={product.price_kobo * quantity} /></span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={handleAdd} disabled={unavailable} className="btn btn-primary w-full">
            Add to bag
          </button>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-burgundy w-full">
            Buy via WhatsApp
          </a>
        </div>

        {feedback ? (
          <p
            role="status"
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-success/30 bg-success/5 text-success"
                : "border-danger/30 bg-danger/5 text-danger"
            }`}
          >
            {feedback.message}{" "}
            {feedback.type === "success" ? (
              <Link href="/cart" className="underline underline-offset-4">View bag</Link>
            ) : null}
          </p>
        ) : null}

        <dl className="mt-9 divide-y divide-line rounded-card border border-line bg-white px-5 text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Availability</dt>
            <dd className="text-right text-ink-soft">Confirmed personally by the seller after you order.</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-right text-ink-soft">Nationwide. Fee confirmed before payment.</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Payment</dt>
            <dd className="text-right text-ink-soft">Arranged directly with the seller.</dd>
          </div>
          {product.category ? (
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Category</dt>
              <dd className="text-right">
                <Link href={`/category/${product.category.slug}`} className="text-burgundy underline underline-offset-4">
                  {product.category.name}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-5 text-[11px] leading-relaxed text-muted">
          Opening WhatsApp prepares a message for you to review and send yourself. The order is only
          a request until the seller confirms availability and delivery.
        </p>
      </div>
    </div>
  );
}
