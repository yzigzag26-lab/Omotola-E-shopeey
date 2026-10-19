"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => (href === "/shop" ? pathname === "/shop" : pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-5">
      <div
        className={`mx-auto flex h-14 max-w-[78rem] items-center justify-between gap-3 rounded-full border px-2.5 transition-all duration-300 md:h-16 md:px-3 ${
          scrolled ? "border-line bg-white/85 shadow-soft backdrop-blur-xl" : "border-line/70 bg-white/70 backdrop-blur-md"
        }`}
      >
        <button
          type="button"
          className="flex h-10 w-10 flex-col items-center justify-center rounded-full bg-ivory-deep md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={`block h-0.5 w-4 rounded-full bg-ink transition-transform ${open ? "translate-y-[3px] rotate-45" : ""}`} />
          <span className={`mt-1 block h-0.5 w-4 rounded-full bg-ink transition-transform ${open ? "-translate-y-[3px] -rotate-45" : ""}`} />
        </button>

        <Link href="/" className="flex items-center gap-2 rounded-full pl-1 pr-2 md:pl-2" aria-label="Corazon Empire home">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy font-display text-sm font-bold text-ivory md:h-9 md:w-9"
          >
            C
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.03em] md:text-xl">
            Corazon<span className="accent ml-1 text-burgundy">empire</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors lg:px-4 ${
                isActive(item.href) ? "bg-ink text-ivory" : "text-ink-soft hover:bg-ivory-deep hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center">
          <CartLink className="rounded-full bg-burgundy py-2 pl-4 pr-2 text-white transition-colors hover:bg-burgundy-deep" />
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="mx-auto mt-2 max-w-[78rem] overflow-hidden rounded-card border border-line bg-white/95 p-2 shadow-soft backdrop-blur-xl md:hidden"
        >
          <ul className="grid gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-semibold ${
                    isActive(item.href) ? "bg-ink text-ivory" : "text-ink-soft hover:bg-ivory-deep"
                  }`}
                >
                  {item.label}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
