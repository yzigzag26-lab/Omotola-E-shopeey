import type { Metadata } from "next";
import { ContactForm } from "@/components/storefront/contact-form";
import { BUSINESS } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Corazon Empire on WhatsApp or email for availability, sizing, delivery and order questions.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="shell py-14 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] md:text-6xl">
            Let&apos;s <span className="accent text-burgundy">talk.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Questions about a piece, sizing, availability or delivery? Message us directly — the
            seller replies personally.
          </p>

          <dl className="mt-9 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-card border border-line bg-white p-4">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">WhatsApp</dt>
              <dd className="mt-1">
                <a href={`https://wa.me/${BUSINESS.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="text-burgundy underline underline-offset-4">
                  {BUSINESS.whatsappDisplay}
                </a>
              </dd>
            </div>
            <div className="rounded-card border border-line bg-white p-4">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Email</dt>
              <dd className="mt-1">
                <a href={`mailto:${BUSINESS.orderEmail}`} className="text-burgundy underline underline-offset-4">
                  {BUSINESS.orderEmail}
                </a>
              </dd>
            </div>
            <div className="rounded-card border border-line bg-white p-4">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Location</dt>
              <dd className="mt-1 text-ink-soft">{BUSINESS.city}</dd>
            </div>
            <div className="rounded-card border border-line bg-white p-4">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Hours</dt>
              <dd className="mt-1 text-ink-soft">Monday – Saturday, 9am – 6pm (WAT)</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-blob border border-line bg-white p-6 shadow-soft md:p-9">
          <h2 className="font-display text-2xl">Send a message</h2>
          <p className="mt-2 text-sm text-muted">Compose it here, then send it in WhatsApp.</p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
