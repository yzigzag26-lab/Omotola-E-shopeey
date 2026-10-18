import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatMoney } from "@/lib/format/money";
import { formatDateTime } from "@/lib/format/date";

export const dynamic = "force-dynamic";

const STATUSES = ["pending_review", "confirmed", "fulfilled", "cancelled"] as const;
type SearchParams = Promise<{ status?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAdminPage();
  const params = await searchParams;
  const status = STATUSES.includes((params.status ?? "") as (typeof STATUSES)[number]) ? params.status : "";

  let request = session.supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
  if (status) request = request.eq("status", status as (typeof STATUSES)[number]);
  const { data: orders, error } = await request;

  return (
    <AdminShell email={session.email} active="/admin/orders">
      <p className="eyebrow">Sales</p>
      <h1 className="mt-2 font-display text-3xl">Orders</h1>
      <p className="mt-1 text-sm text-muted">Customer data is private — visible only to authorised administrators.</p>

      <nav aria-label="Order filters" className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] ${!status ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink"}`}>
          All
        </Link>
        {STATUSES.map((item) => (
          <Link key={item} href={`/admin/orders?status=${item}`} className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] ${status === item ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink"}`}>
            {item.replace(/_/g, " ")}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-5 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">Could not load orders: {error.message}</p>
      ) : null}

      {!orders || orders.length === 0 ? (
        <div className="mt-6 border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-display text-xl">No orders {status ? `with status “${status.replace(/_/g, " ")}”` : "yet"}</p>
          <p className="mt-2 text-sm text-muted">Orders submitted through the storefront will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-line bg-ivory-deep/50 text-[10px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Reference</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">Channel</th>
                <th scope="col" className="px-4 py-3">Total</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink hover:text-burgundy">{order.reference}</Link>
                    <p className="text-[10px] text-muted">{order.email_status !== "not_requested" ? `email: ${order.email_status}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.customer_name}</p>
                    <p className="text-[11px] text-muted">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-muted">{order.channel}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(order.total_kobo)}
                    {order.delivery_fee_kobo === null ? <span className="block text-[10px] text-muted">excl. delivery</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-line px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-ink-soft">
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
