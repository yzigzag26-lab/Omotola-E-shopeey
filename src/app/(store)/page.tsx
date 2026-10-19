import Link from "next/link";
import Image from "next/image";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveCategories, getPublishedProducts } from "@/lib/data/catalog";
import { primaryImage } from "@/lib/types";
import { BUSINESS } from "@/lib/env";
import { ChatIcon, CheckIcon, ShieldCheckIcon, SparkleIcon, TruckIcon, WhatsAppIcon } from "@/components/ui/icons";

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

  const heroChips = categories.slice(0, 6);
  const spotlight = featured[0] ?? heroProduct;
  const spotlightImage = spotlight ? primaryImage(spotlight) : null;

  return (
    <>
      {/* ------------------------------------------------------------------ HERO */}
      <section className="shell pt-4 md:pt-6" aria-labelledby="hero-heading">
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr] lg:gap-4">
          <div className="relative isolate flex min-h-[34rem] overflow-hidden rounded-blob bg-ink text-ivory md:min-h-[38rem]">
            <Image
              src="/hero/hero-banner.jpg"
              alt="A young woman styled in an ivory tee, gold jewellery, waist beads and a burgundy shoulder bag"
              fill
              priority
              sizes="(min-width: 1024px) 62vw, 100vw"
              className="-z-10 object-cover object-[72%_center]"
            />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/10 md:bg-gradient-to-r md:from-ink/85 md:via-ink/40 md:to-transparent" />

            <div aria-hidden="true" className="absolute right-5 top-5 hidden h-24 w-24 sm:block md:right-7 md:top-7 md:h-28 md:w-28">
              <svg viewBox="0 0 100 100" className="spin-slow h-full w-full text-ivory">
                <defs>
                  <path id="hero-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                </defs>
                <text className="fill-current text-[10.5px] font-bold uppercase tracking-[0.2em]">
                  <textPath href="#hero-circle">New drops weekly ✦ Curated in Lagos ✦</textPath>
                </text>
              </svg>
              <span className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-burgundy text-lg md:h-12 md:w-12">
                ✦
              </span>
            </div>

            <div className="relative mt-auto flex w-full flex-col p-6 sm:p-8 md:p-10 lg:p-12">
              <p className="rise inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-soft" />
                Fashion · Home · Everyday objects
              </p>
              <h1
                id="hero-heading"
                className="rise-late mt-5 max-w-2xl font-display text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-[4.75rem]"
              >
                Where style <br className="hidden sm:block" />
                <span className="accent text-gold-soft">finds you.</span>
              </h1>
              <p className="rise-later mt-5 max-w-md text-[15px] leading-relaxed text-ivory/80">
                Corazon Empire is a small, considered house of fashion, accessories and home pieces —
                picked one object at a time, and delivered across Nigeria.
              </p>
              <div className="rise-later mt-8 flex flex-wrap items-center gap-3">
                <Link href="/shop" className="btn bg-ivory text-ink hover:bg-white">
                  Shop the collection <span aria-hidden="true">→</span>
                </Link>
                <Link href="/about" className="btn btn-glass">
                  Our story
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-[1.35fr_1fr] lg:gap-4">
            {spotlight && spotlightImage ? (
              <Link
                href={`/product/${spotlight.slug}`}
                className="group relative flex min-h-[18rem] flex-col overflow-hidden rounded-blob border border-line bg-white p-3"
                aria-label={`View ${spotlight.name}`}
              >
                <div className="relative flex-1 overflow-hidden rounded-[1.4rem] bg-ivory-deep">
                  <Image
                    src={spotlightImage.image_url_thumb ?? spotlightImage.image_url}
                    alt={spotlightImage.alt_text}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span
                    className="sticker absolute left-3 top-3 rounded-full bg-burgundy px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-soft"
                    style={{ ["--tilt" as string]: "-6deg" }}
                  >
                    Featured drop
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{spotlight.category?.name}</p>
                    <p className="truncate font-display text-lg font-semibold tracking-[-0.02em]">{spotlight.name}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-ivory transition-transform group-hover:rotate-45">
                    ↗
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex min-h-[18rem] items-center justify-center rounded-blob border border-dashed border-sand bg-white p-8">
                <p className="max-w-xs text-center text-sm text-muted">
                  The first collection is being prepared. Check back shortly.
                </p>
              </div>
            )}

            <div className="relative flex flex-col justify-between overflow-hidden rounded-blob bg-burgundy p-6 text-ivory md:p-7">
              <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-burgundy-soft/60 blur-2xl" />
              <div className="relative">
                <p className="font-display text-5xl font-bold tracking-[-0.05em] md:text-6xl">
                  {categories.length || 8}
                  <span className="accent ml-2 text-3xl text-gold-soft md:text-4xl">worlds</span>
                </p>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-ivory/75">
                  Decor, wears, beads, bags, jewelry &amp; more — one tidy little empire.
                </p>
              </div>
              <dl className="relative mt-6 flex flex-wrap gap-2 text-[12px] font-semibold">
                <div className="rounded-full bg-white/10 px-3 py-1.5">
                  <dt className="sr-only">Delivery</dt>
                  <dd className="flex items-center gap-1.5"><TruckIcon /> Nationwide delivery</dd>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1.5">
                  <dt className="sr-only">Ordering</dt>
                  <dd className="flex items-center gap-1.5"><WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp or email</dd>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1.5">
                  <dt className="sr-only">Payment</dt>
                  <dd className="flex items-center gap-1.5"><CheckIcon /> Confirmed on order</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {heroChips.length > 0 ? (
          <nav aria-label="Quick categories" className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <Link href="/shop" className="chip chip-active shrink-0">
              ✦ All
            </Link>
            {heroChips.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`} className="chip shrink-0">
                {category.name}
              </Link>
            ))}
          </nav>
        ) : null}
      </section>

      {/* -------------------------------------------------------------- TICKER */}
      {categories.length > 0 ? (
        <div className="marquee-viewport mt-10 overflow-hidden border-y border-ink bg-ink py-3.5 text-ivory md:mt-14" aria-hidden="true">
          <div className="marquee-track marquee-track-fast">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex shrink-0 items-center">
                {[...categories, ...categories].map((category, index) => (
                  <span key={`${category.id}-${index}`} className="flex items-center whitespace-nowrap px-5 font-display text-xl font-semibold tracking-[-0.02em] md:text-2xl">
                    {index % 2 === 0 ? category.name : <span className="accent text-gold-soft">{category.name}</span>}
                    <span className="ml-10 text-base text-burgundy-soft">✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- CATEGORIES */}
      <section className="shell py-16 md:py-24" aria-labelledby="categories-heading">
        <SectionHeading
          eyebrow="Shop by category"
          id="categories-heading"
          title={
            <>
              Eight small <span className="accent text-burgundy">worlds</span>
            </>
          }
          href="/shop"
          linkLabel="Shop everything"
        />

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {categories.map((category, index) => {
            const cover = products.find((product) => product.category_id === category.id);
            const image = cover ? primaryImage(cover) : null;
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className={`lift group relative overflow-hidden rounded-card border border-line p-2 ${
                  index % 3 === 1 ? "bg-cream/60" : "bg-white"
                }`}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.1rem] bg-ivory-deep">
                  {image ? (
                    <Image
                      src={image.image_url_thumb ?? image.image_url}
                      alt={image.alt_text}
                      fill
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-contain transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                  ) : null}
                  <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-ink transition-all duration-300 group-hover:rotate-45 group-hover:bg-burgundy group-hover:text-white">
                    ↗
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-3">
                  <p className="font-display text-[15px] font-semibold leading-tight tracking-[-0.02em] md:text-base">{category.name}</p>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Explore</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ FEATURED */}
      {featured.length > 0 ? (
        <section className="shell pb-16 md:pb-24" aria-labelledby="featured-heading">
          <SectionHeading
            eyebrow="Selected by the house"
            id="featured-heading"
            title={
              <>
                Featured <span className="accent text-burgundy">pieces</span>
              </>
            }
            href="/shop?featured=1"
            linkLabel="View featured"
          />
          <div className="mt-10">
            <ProductGrid products={featured} />
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- VALUE PROPS */}
      <section className="shell pb-16 md:pb-24" aria-label="Why shop with us">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {[
            {
              icon: <SparkleIcon />,
              title: "Carefully curated",
              copy: "Every piece is hand-picked in small numbers and photographed honestly — front and back.",
              tone: "bg-white",
            },
            {
              icon: <ChatIcon />,
              title: "Fast, human replies",
              copy: "Order on WhatsApp or email and the seller replies personally. No bots, no hassle.",
              tone: "bg-cream/70",
            },
            {
              icon: <ShieldCheckIcon />,
              title: "Confirmed before you pay",
              copy: "Availability and delivery fees are confirmed with you first. Zero surprise charges.",
              tone: "bg-white",
            },
          ].map((item) => (
            <div key={item.title} className={`lift rounded-card border border-line p-6 md:p-7 ${item.tone}`}>
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-burgundy text-white">
                {item.icon}
              </span>
              <h3 className="mt-5 font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ THE HOUSE */}
      <section className="shell">
        <div className="grid gap-10 overflow-hidden rounded-blob border border-line bg-ivory-deep p-6 md:grid-cols-[1fr_1.1fr] md:items-center md:p-12 lg:p-16">
          <div>
            <p className="eyebrow">The house</p>
            <h2 className="mt-4 font-display text-3xl leading-[1.05] md:text-5xl">
              A quieter kind of <span className="accent text-burgundy">luxury.</span>
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
            <Link href="/about" className="btn btn-primary mt-8">
              Read our story <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {newArrivals.slice(0, 2).map((product, index) => {
              const image = primaryImage(product);
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className={`lift group rounded-card border border-line bg-white p-2 ${index === 1 ? "md:mt-10" : ""}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-ivory">
                    {image ? (
                      <Image
                        src={image.image_url_thumb ?? image.image_url}
                        alt={image.alt_text}
                        fill
                        sizes="(min-width: 768px) 22vw, 45vw"
                        className="object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : null}
                  </div>
                  <div className="px-2 pb-1.5 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{product.category?.name}</p>
                    <p className="font-display text-[15px] font-semibold tracking-[-0.02em] text-ink">{product.name}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- NEW ARRIVALS */}
      <section className="shell py-16 md:py-24" aria-labelledby="new-heading">
        <SectionHeading
          eyebrow="Just in"
          id="new-heading"
          title={
            <>
              New <span className="accent text-burgundy">arrivals</span>
            </>
          }
          href="/shop?sort=newest"
          linkLabel="All new arrivals"
        />
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

      {/* ------------------------------------------------------------- CONTACT */}
      <section className="shell">
        <div className="relative isolate grid gap-10 overflow-hidden rounded-blob bg-ink p-7 text-ivory md:grid-cols-[1.2fr_1fr] md:items-center md:p-12 lg:p-16">
          <span aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 -z-10 h-72 w-72 rounded-full bg-burgundy/60 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-0 -z-10 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Talk to us
            </p>
            <h2 className="mt-5 font-display text-3xl leading-[1.05] md:text-5xl">
              Ready to find <span className="accent text-gold-soft">your style?</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-ivory/70">
              Questions, sizing, delivery — we answer personally. Send a message on WhatsApp or email
              and the seller will confirm availability, final delivery charges and payment
              arrangements before you commit.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <a
              href={`https://wa.me/${BUSINESS.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-burgundy w-full md:w-auto"
            >
              <WhatsAppIcon /> WhatsApp {BUSINESS.whatsappDisplay}
            </a>
            <a href={`mailto:${BUSINESS.orderEmail}`} className="btn w-full bg-ivory text-ink hover:bg-gold-soft md:w-auto">
              {BUSINESS.orderEmail}
            </a>
            <Link href="/shop" className="btn btn-glass w-full md:w-auto">
              Browse the catalogue <span aria-hidden="true">→</span>
            </Link>
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory/50">
              Lagos, Nigeria · Mon–Sat
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  eyebrow,
  id,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  id: string;
  title: React.ReactNode;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-4 font-display text-3xl leading-[1.05] md:text-5xl">
          {title}
        </h2>
      </div>
      <Link href={href} className="link-arrow">
        {linkLabel}
      </Link>
    </div>
  );
}
