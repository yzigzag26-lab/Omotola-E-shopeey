import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminShell } from "@/components/admin/admin-shell";
import { AccessDenied } from "@/components/admin/access-denied";
import { formatMoney } from "@/lib/format/money";
import { formatDateTime } from "@/lib/format/date";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AdminLogin />;

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return <AccessDenied email={user.email ?? "unknown"} />;

  const [published, drafts, orders, pending, recentOrders, recentProducts] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("products").select("id", { count: "exact", head: true }).neq("status", "published"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("products").select("*").order("updated_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: "Published products", value: published.count ?? 0, href: "/admin/products?status=published" },
    { label: "Draft / archived", value: drafts.count ?? 0, href: "/admin/products?status=draft" },
    { label: "Total orders", value: orders.count ?? 0, href: "/admin/orders" },
    { label: "Awaiting review", value: pending.count ?? 0, href: "/admin/orders?status=pending_review" },
  ];

  return (
    <AdminShell email={user.email ?? ""} active="/admin">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">Good to see you.</h1>
          <p className="mt-2 text-sm text-muted">Everything here reads live from the store database.</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary">Add product</Link>
      </div>

      <section aria-label="Store statistics" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5 transition-colors hover:border-ink">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{stat.label}</p>
            <p className="mt-3 font-display text-3xl tabular-nums">{stat.value}</p>
          </Link>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="recent-orders">
          <div className="flex items-center justify-between">
            <h2 id="recent-orders" className="font-display text-xl">Recent orders</h2>
            <Link href="/admin/orders" className="text-[10px] uppercase tracking-[0.14em] text-burgundy underline underline-offset-4">All orders</Link>
          </div>
          {recentOrders.data && recentOrders.data.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {recentOrders.data.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${order.id}`} className="block truncate text-sm text-ink hover:text-burgundy">
                      {order.reference} · {order.customer_name}
                    </Link>
                    <p className="text-[11px] text-muted">{formatDateTime(order.created_at)} · {order.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums">{formatMoney(order.total_kobo)}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{order.status.replace("_", " ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No orders yet. Orders placed by customers will appear here.</p>
          )}
        </section>

        <section className="card p-5" aria-labelledby="recent-products">
          <div className="flex items-center justify-between">
            <h2 id="recent-products" className="font-display text-xl">Recently updated</h2>
            <Link href="/admin/products" className="text-[10px] uppercase tracking-[0.14em] text-burgundy underline underline-offset-4">All products</Link>
          </div>
          {recentProducts.data && recentProducts.data.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {recentProducts.data.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/products/${product.id}`} className="block truncate text-sm text-ink hover:text-burgundy">
                      {product.name}
                    </Link>
                    <p className="text-[11px] text-muted">{formatDateTime(product.updated_at)} · {product.status}</p>
                  </div>
                  <p className="text-sm tabular-nums">{formatMoney(product.price_kobo)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No products yet. Add your first piece.</p>
          )}
        </section>
      </div>

      <section className="mt-6 card border-gold/40 bg-gold-soft/15 p-5">
        <h2 className="font-display text-lg">Launch reminders</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
          <li>• Replace the initial administrator password with a strong, unique one via “Forgot password”.</li>
          <li>• Configure the email provider (<code className="text-xs">RESEND_API_KEY</code>) before enabling email ordering.</li>
          <li>• Confirm delivery fees per order — the site never invents them.</li>
        </ul>
      </section>
    </AdminShell>
  );
}
