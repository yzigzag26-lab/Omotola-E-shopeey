"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function CartLink({ className = "" }: { className?: string }) {
  const { count, hydrated } = useCart();
  return (
    <Link href="/cart" className={`relative inline-flex items-center gap-2 ${className}`} aria-label={`Shopping bag, ${hydrated ? count : 0} item${count === 1 ? "" : "s"}`}>
      <span className="text-[11px] uppercase tracking-[0.18em]">Bag</span>
      <span
        aria-hidden="true"
        className="flex h-6 min-w-6 items-center justify-center rounded-full border border-current px-1.5 text-[10px] tabular-nums"
      >
        {hydrated ? count : 0}
      </span>
    </Link>
  );
}
