import Link from "next/link";
import { BUSINESS } from "@/lib/env";
import { WhatsAppIcon } from "@/components/ui/icons";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 px-3 pb-3 md:mt-28 md:px-5 md:pb-5">
      <div className="mx-auto max-w-[78rem] overflow-hidden rounded-blob border border-line bg-ivory-deep">
        <div className="grid gap-12 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-10 md:py-16">
          <div>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-burgundy font-display text-sm font-bold text-ivory">
                C
              </span>
              <span className="font-display text-2xl font-bold tracking-[-0.03em]">
                Corazon<span className="accent ml-1 text-burgundy">empire</span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              Considered pieces for the wardrobe, the home and the everyday ritual. Curated in Lagos,
              delivered across Nigeria.
            </p>
            <a
              href={`https://wa.me/${BUSINESS.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-burgundy btn-sm mt-6"
            >
              <WhatsAppIcon /> WhatsApp {BUSINESS.whatsappDisplay}
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

        <p
          aria-hidden="true"
          className="select-none overflow-hidden whitespace-nowrap px-4 text-center font-display text-[17vw] font-bold leading-[0.8] tracking-[-0.06em] text-sand/70 md:text-[11rem]"
        >
          corazon<span className="accent text-burgundy/20">.</span>
        </p>

        <div className="border-t border-line/80 bg-ivory/60">
          <div className="flex flex-col gap-2 px-6 py-5 text-[12px] font-medium text-muted sm:flex-row sm:items-center sm:justify-between md:px-10">
            <p>© {year} Corazon Empire. All rights reserved.</p>
            <p>Prices in Nigerian naira (₦). Delivery confirmed on order.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className="text-sm font-medium text-muted transition-colors hover:text-burgundy">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
