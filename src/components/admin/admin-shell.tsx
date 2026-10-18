import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/announcements", label: "Announcement" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/settings", label: "Store settings" },
];

export function AdminShell({
  email,
  active,
  children,
}: {
  email: string;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-ink text-ivory lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <div>
            <p className="font-display text-xl">Corazon</p>
            <p className="text-[9px] uppercase tracking-[0.34em] text-gold">Empire · Admin</p>
          </div>
          <Link href="/" className="text-[10px] uppercase tracking-[0.14em] text-ivory/60 hover:text-gold lg:hidden">
            View store
          </Link>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:px-3 lg:py-4">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map((item) => {
              const selected = active === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    className={`block whitespace-nowrap px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      selected ? "bg-ivory text-ink" : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="hidden border-t border-ivory/10 px-5 py-4 lg:mt-auto lg:block">
          <p className="truncate text-[11px] text-ivory/50">{email}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/" className="text-[10px] uppercase tracking-[0.14em] text-ivory/60 hover:text-gold">View storefront</Link>
            <form action={signOutAction}>
              <button type="submit" className="text-[10px] uppercase tracking-[0.14em] text-ivory/60 hover:text-gold">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white/60 px-5 py-3 lg:hidden">
          <p className="truncate text-[11px] uppercase tracking-[0.12em] text-muted">{email}</p>
          <form action={signOutAction}>
            <button type="submit" className="text-[10px] uppercase tracking-[0.14em] text-burgundy">Sign out</button>
          </form>
        </header>
        <main className="px-5 py-8 md:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
