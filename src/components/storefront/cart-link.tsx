"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function CartLink({ className = "" }: { className?: string }) {
  const { count, hydrated } = useCart();
  return (
    <Link href="/cart" className={`relative inline-flex items-center gap-2 ${className}`} aria-label={`Shopping bag, ${hydrated ? count : 0} item${count === 1 ? "" : "s"}`}>
      <span className="text-[13px] font-semibold">Bag</span>
      <span
        aria-hidden="true"
        className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold tabular-nums text-burgundy"
      >
        {hydrated ? count : 0}
      </span>
    </Link>
  );
}
