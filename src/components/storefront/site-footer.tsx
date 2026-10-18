import Link from "next/link";
import { BUSINESS } from "@/lib/env";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-line bg-ivory-deep">
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl">Corazon</span>
            <span className="text-[11px] uppercase tracking-[0.34em] text-burgundy">Empire</span>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
            Considered pieces for the wardrobe, the home and the everyday ritual. Curated in Lagos,
            delivered across Nigeria.
          </p>
          <a
            href={`https://wa.me/${BUSINESS.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block text-xs uppercase tracking-[0.18em] text-burgundy underline underline-offset-4"
          >
            WhatsApp {BUSINESS.whatsappDisplay}
          </a>
        </div>

        <FooterColumn
          title="Shop"
          links={[
            { href: "/shop", label: "All products" },
            { href: "/shop?sort=newest", label: "New arrivals" },
            { href: "/shop?featured=1", label: "Featured" },
          ]}
        />
        <FooterColumn
          title="Company"
          links={[
            { href: "/about", label: "Our story" },
            { href: "/contact", label: "Contact" },
            { href: "/cart", label: "Your bag" },
          ]}
        />
        <FooterColumn
          title="Policies"
          links={[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms & delivery" },
            { href: "/contact", label: "Returns enquiry" },
          ]}
        />
      </div>

      <div className="border-t border-line/80">
        <div className="shell flex flex-col gap-2 py-6 text-[11px] uppercase tracking-[0.16em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Corazon Empire. All rights reserved.</p>
          <p>Prices in Nigerian naira (₦). Delivery confirmed on order.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className="text-sm text-muted transition-colors hover:text-burgundy">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
