"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";

export function ShopFilters({
  categories,
  initialQuery,
  activeCategory,
}: {
  categories: Category[];
  initialQuery: string;
  activeCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    router.push(params.toString() ? `/shop?${params.toString()}` : "/shop");
  };

  const hrefForCategory = (slug?: string, featured = false) => {
    const params = new URLSearchParams();
    if (slug) params.set("category", slug);
    if (featured) params.set("featured", "1");
    const q = searchParams.get("sort");
    if (q) params.set("sort", q);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <div className="space-y-6 rounded-card border border-line bg-white p-5">
      <form onSubmit={submit} role="search" className="space-y-2">
        <label htmlFor="shop-search" className="label">
          Search
        </label>
        <div className="flex rounded-full border border-line bg-ivory p-1 focus-within:border-burgundy">
          <input
            id="shop-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Vase, bag, beads…"
            className="field min-h-10 rounded-full border-0 bg-transparent px-3 focus:shadow-none"
          />
          <button type="submit" className="btn btn-primary min-h-10 shrink-0 px-4">
            Go
          </button>
        </div>
      </form>

      <nav aria-label="Categories" className="space-y-2">
        <p className="label">Category</p>
        <ul className="flex flex-wrap gap-1.5 text-sm">
          <li>
            <Link href={hrefForCategory()} className={`chip px-3 py-1.5 text-[12px] ${!activeCategory ? "chip-active" : ""}`}>
              All pieces
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={hrefForCategory(category.slug)}
                aria-current={activeCategory === category.slug ? "page" : undefined}
                className="chip px-3 py-1.5 text-[12px]"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-2">
        <p className="label">Collections</p>
        <div className="flex flex-wrap gap-1.5">
          <Link href={hrefForCategory(undefined, true)} className="chip px-3 py-1.5 text-[12px]">
            ✦ Featured pieces
          </Link>
          <Link href={hrefForCategory()} className="chip px-3 py-1.5 text-[12px]">
            Clear filters
          </Link>
        </div>
      </div>
    </div>
  );
}
