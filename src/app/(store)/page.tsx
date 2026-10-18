import Link from "next/link";
import Image from "next/image";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveCategories, getPublishedProducts } from "@/lib/data/catalog";
import { primaryImage } from "@/lib/types";
import { BUSINESS } from "@/lib/env";

export const metadata = {
  title: { absolute: "Corazon Empire — Fashion, Accessories & Home" },
  description:
    "Corazon Empire is a curated house of fashion, accessories and home pieces. Shop room decor, waists beads, bags, jewelry and more — delivered across Nigeria.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categoriesResult, productsResult] = await Promise.all([getActiveCategories(), getPublishedProducts()]);
  const categories = categoriesResult.data;
  const products = productsResult.data;
  const featured = products.filter((product) => product.is_featured).slice(0, 4);
  const newArrivals = [...products]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 4);
  const heroImage = products.map(primaryImage).find((image) => image?.image_url) ?? null;
  const heroProduct = products.find((product) => primaryImage(product)?.image_url === heroImage?.image_url) ?? null;

  return (
    <>
      <section className="border-b border-line">
        <div className="shell grid items-stretch gap-0 md:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-center py-16 md:py-24 lg:py-28">
            <p className="eyebrow rise">Fashion · Home · Everyday objects</p>
            <h1 className="rise-late mt-6 max-w-xl font-display text-4xl leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl lg:text-6xl">
              Pieces chosen with intention.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Corazon Empire is a small, considered house of fashion, accessories and home pieces —
              quietly luxurious, made to be lived in, and selected one object at a time.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="btn btn-primary">
                Shop the collection
              </Link>
              <Link href="/about" className="btn btn-quiet">
                Our story
              </Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6 text-[11px] uppercase tracking-[0.14em] text-muted">
              <div>
                <dt className="sr-only">Delivery</dt>
                <dd>Nationwide delivery</dd>
              </div>
              <div>
                <dt className="sr-only">Ordering</dt>
                <dd>WhatsApp or email</dd>
              </div>
              <div>
                <dt className="sr-only">Payment</dt>
                <dd>Confirmed on order</dd>
              </div>
            </dl>
          </div>

          <div className="relative min-h-[22rem] border-line md:border-l">
            {heroImage && heroProduct ? (
              <Link href={`/product/${heroProduct.slug}`} className="group absolute inset-0 block" aria-label={`View ${heroProduct.name}`}>
                <Image
                  src={heroImage.image_url}
                  alt={heroImage.alt_text}
                  fill
                  priority
                  sizes="(min-width: 768px) 48vw, 100vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-ink/70 to-transparent p-5 text-ivory md:p-7">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-ivory/80">Featured piece</p>
                    <p className="mt-1 font-display text-xl">{heroProduct.name}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] underline underline-offset-4">View</span>
                </div>
              </Link>
            ) : (
              <div className="flex h-full min-h-[22rem] items-center justify-center bg-ivory-deep">
                <p className="max-w-xs px-8 text-center text-sm text-muted">
                  The first collection is being prepared. Check back shortly.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="shell py-16 md:py-24" aria-labelledby="categories-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2 id="categories-heading" className="mt-3 font-display text-3xl md:text-4xl">
              Eight small worlds
            </h2>
          </div>
          <Link href="/shop" className="text-[11px] uppercase tracking-[0.18em] text-burgundy underline underline-offset-4">
            Shop everything
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {categories.map((category) => {
            const cover = products.find((product) => product.category_id === category.id);
            const image = cover ? primaryImage(cover) : null;
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group relative overflow-hidden border border-line bg-white"
              >
                <div className="relative aspect-[4/5] w-full bg-ivory-deep">
                  {image ? (
                    <Image
                      src={image.image_url_thumb ?? image.image_url}
                      alt={image.alt_text}
                      fill
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent px-4 pb-4 pt-12 text-ivory">
                  <p className="font-display text-lg leading-tight">{category.name}</p>
                  <span className="mt-1 inline-block text-[10px] uppercase tracking-[0.18em] text-ivory/80">
                    Explore
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="shell pb-16 md:pb-24" aria-labelledby="featured-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-10">
            <div>
              <p className="eyebrow">Selected by the house</p>
              <h2 id="featured-heading" className="mt-3 font-display text-3xl md:text-4xl">
                Featured pieces
              </h2>
            </div>
            <Link href="/shop?featured=1" className="text-[11px] uppercase tracking-[0.18em] text-burgundy underline underline-offset-4">
              View featured
            </Link>
          </div>
          <div className="mt-10">
            <ProductGrid products={featured} />
          </div>
        </section>
      ) : null}

      <section className="border-y border-line bg-ivory-deep/60">
        <div className="shell grid gap-10 py-16 md:grid-cols-[1fr_1.1fr] md:items-center md:py-24">
          <div>
            <p className="eyebrow">The house</p>
            <h2 className="mt-3 font-display text-3xl leading-tight md:text-4xl">
              A quieter kind of luxury.
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              We look for objects that earn their place — a vase with the right weight, a tee that
              holds its shape, a bag that works for the life you actually live. Everything is chosen
              in small numbers, photographed honestly and priced plainly.
            </p>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              Orders are confirmed personally. You will always know what is available, what delivery
              costs and when to expect it before anything is paid.
            </p>
            <Link href="/about" className="btn btn-outline mt-8">
              Read our story
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {newArrivals.slice(0, 2).map((product) => {
              const image = primaryImage(product);
              return (
                <Link key={product.id} href={`/product/${product.slug}`} className="group">
                  <div className="relative aspect-[4/5] overflow-hidden border border-line bg-white">
                    {image ? (
                      <Image
                        src={image.image_url_thumb ?? image.image_url}
                        alt={image.alt_text}
                        fill
                        sizes="(min-width: 768px) 22vw, 45vw"
                        className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted">{product.category?.name}</p>
                  <p className="font-display text-base text-ink">{product.name}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="shell py-16 md:py-24" aria-labelledby="new-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Just in</p>
            <h2 id="new-heading" className="mt-3 font-display text-3xl md:text-4xl">
              New arrivals
            </h2>
          </div>
          <Link href="/shop?sort=newest" className="text-[11px] uppercase tracking-[0.18em] text-burgundy underline underline-offset-4">
            All new arrivals
          </Link>
        </div>
        <div className="mt-10">
          {newArrivals.length > 0 ? (
            <ProductGrid products={newArrivals} />
          ) : (
            <EmptyState
              eyebrow="Coming soon"
              title="The first pieces are on their way"
              description="New arrivals will appear here as soon as they are published."
            />
          )}
        </div>
      </section>

      <section className="border-t border-line bg-ink text-ivory">
        <div className="shell grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Talk to us</p>
            <h2 className="mt-4 font-display text-3xl leading-tight md:text-4xl">
              Questions, sizing, delivery — we answer personally.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-ivory/70">
              Send a message on WhatsApp or email and the seller will confirm availability, final
              delivery charges and payment arrangements before you commit.
            </p>
          </div>
          <div className="space-y-4 md:justify-self-end">
            <a
              href={`https://wa.me/${BUSINESS.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn border border-gold/60 bg-transparent text-ivory hover:bg-gold/10"
            >
              WhatsApp {BUSINESS.whatsappDisplay}
            </a>
            <a href={`mailto:${BUSINESS.orderEmail}`} className="btn bg-ivory text-ink hover:bg-gold-soft">
              {BUSINESS.orderEmail}
            </a>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ivory/50">
              Lagos, Nigeria · Mon–Sat
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
