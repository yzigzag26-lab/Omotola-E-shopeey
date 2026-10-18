import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/env";

export const metadata: Metadata = {
  title: "Our story",
  description: "Corazon Empire is a small, considered house of fashion, accessories and home pieces, curated in Lagos.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="shell py-14 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <header>
          <p className="eyebrow">The house</p>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">A quieter kind of luxury.</h1>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Corazon Empire is a Lagos-based house of fashion, accessories and home objects — built
            around the idea that a small, well-chosen collection is worth more than a crowded one.
          </p>
        </header>

        <div className="prose-luxe max-w-none">
          <p>
            We started with eight small worlds: room decor, unisex wears, tattoo stickers, waist
            beads, kitchen utensils, footwear, bags and jewelry. Each exists because we wanted the
            piece ourselves — something with the right weight, the right finish and a price that
            makes sense.
          </p>
          <h2>How we choose</h2>
          <p>
            We look for pieces that hold up in real life. A tee that keeps its shape, a bag that
            closes properly, a vase that looks considered even when it is empty. We photograph each
            piece honestly, including the back, so you know exactly what arrives.
          </p>
          <h2>How we sell</h2>
          <p>
            We keep things deliberately human. You place an order request through this site — by
            WhatsApp or email — and the seller confirms availability, final delivery cost and payment
            arrangements with you personally before anything is paid.
          </p>
          <p>
            We do not claim stock levels we cannot guarantee, we do not invent reviews, and we do not
            add fees we have not confirmed.
          </p>
          <h2>Where we are</h2>
          <p>
            {BUSINESS.city}. Delivery is arranged nationwide, with charges confirmed per location.
          </p>
          <p>
            <Link href="/shop">Browse the collection</Link> or{" "}
            <Link href="/contact">start a conversation</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
