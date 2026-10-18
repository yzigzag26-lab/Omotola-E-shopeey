"use client";

import Link from "next/link";
import { useState } from "react";
import { CartLink } from "./cart-link";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/category/room-decor", label: "Home" },
  { href: "/category/unisex-wears", label: "Wears" },
  { href: "/category/jewelry", label: "Jewelry" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-line bg-ivory/95 backdrop-blur-sm">
      <div className="shell flex h-16 items-center justify-between gap-4 md:h-20">
        <button
          type="button"
          className="-ml-2 p-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="block h-px w-5 bg-ink" />
          <span className="mt-1.5 block h-px w-5 bg-ink" />
          <span className="mt-1.5 block h-px w-3.5 bg-ink" />
        </button>

        <Link href="/" className="flex items-baseline gap-2" aria-label="Corazon Empire home">
          <span className="font-display text-xl tracking-[0.02em] md:text-2xl">Corazon</span>
          <span className="text-[10px] uppercase tracking-[0.34em] text-burgundy md:text-[11px]">Empire</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-[11px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-burgundy">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <CartLink className="text-ink transition-colors hover:text-burgundy" />
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-ivory md:hidden">
          <ul className="shell divide-y divide-line-soft">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-sm uppercase tracking-[0.14em] text-ink-soft"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
