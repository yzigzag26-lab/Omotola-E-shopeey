import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/env";

export const metadata: Metadata = {
  title: "Terms, delivery & returns",
  description: "Ordering, delivery, payment and returns information for Corazon Empire.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="shell py-14 md:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Policy</p>
        <h1 className="mt-4 font-display text-4xl md:text-5xl">Terms, delivery &amp; returns</h1>
        <p className="mt-5 rounded-2xl border border-gold/40 bg-gold-soft/20 px-4 py-3 text-xs leading-relaxed text-ink-soft">
          Draft policy for review before launch. It reflects how ordering works on this site today.
        </p>

        <div className="prose-luxe mt-8">
          <h2>Orders are requests</h2>
          <p>
            Submitting an order through this website creates an order <em>request</em>. It is not a
            confirmed sale. The seller confirms availability, final delivery charges and payment
            arrangements with you personally. Nothing is reserved until that confirmation.
          </p>

          <h2>Prices</h2>
          <p>
            All prices are shown in Nigerian naira (₦) and are illustrative for the demo catalogue
            until the seller updates them. Prices may change; the price shown on the product page at
            the time of your request is recorded with the order.
          </p>

          <h2>Delivery</h2>
          <p>
            Delivery is arranged nationwide. Delivery charges depend on location and are confirmed by
            the seller — this site does not add an automatic delivery fee. Any stated delivery amount
            on an order is unconfirmed until the seller confirms it.
          </p>

          <h2>Payment</h2>
          <p>
            No payment is collected on this website. Payment is arranged directly with the seller
            after confirmation. Never send payment to an account that has not been confirmed with you
            by the seller.
          </p>

          <h2>Availability</h2>
          <p>
            Some pieces are made to order and some may become temporarily unavailable. If an item you
            requested cannot be supplied, the seller will tell you and agree an alternative, a
            substitution or a refund of any payment made for it.
          </p>

          <h2>Returns and faults</h2>
          <p>
            Please inspect your order on delivery. If something arrives damaged or incorrect, contact
            us within 48 hours with photographs so we can resolve it. For hygiene reasons, waist beads
            and tattoo stickers cannot be returned once opened unless faulty.
          </p>

          <h2>Contact</h2>
          <p>
            Order questions: WhatsApp {BUSINESS.whatsappDisplay} or{" "}
            <a href={`mailto:${BUSINESS.orderEmail}`}>{BUSINESS.orderEmail}</a>. Always confirm the
            item total and delivery fee with the seller before sending payment.
          </p>
          <p>
            See also our <Link href="/privacy">privacy policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
