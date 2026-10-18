import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderUpdateForm } from "@/components/admin/order-form";
import { formatMoney, koboToNairaInput } from "@/lib/format/money";
import { formatDateTime } from "@/lib/format/date";
import { buildWhatsAppUrl } from "@/lib/orders/whatsapp";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  const session = await requireAdminPage();
  const { id } = await params;

  const { data: order } = await session.supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();
  const { data: items } = await session.supabase.from("order_items").select("*").eq("order_id", id).order("created_at");

  const whatsappUrl = buildWhatsAppUrl({
    reference: order.reference,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    deliveryAddress: order.delivery_address,
    lines: (items ?? []).map((item) => ({
      name: item.product_name,
      variant: item.variant,
      quantity: item.quantity,
      unitPriceKobo: item.unit_price_kobo,
      lineTotalKobo: item.line_total_kobo,
    })),
    subtotalKobo: order.subtotal_kobo,
  });

  return (
    <AdminShell email={session.email} active="/admin/orders">
      <nav aria-label="Breadcrumb" className="text-[10px] uppercase tracking-[0.14em] text-muted">
        <Link href="/admin/orders" className="hover:text-burgundy">Orders</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-soft">{order.reference}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{order.reference}</h1>
          <p className="mt-1 text-xs text-muted">
            Placed {formatDateTime(order.created_at)} · channel {order.channel} · email {order.email_status}
          </p>
        </div>
        <span className="border border-line bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]">
          {order.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="customer-heading">
            <h2 id="customer-heading" className="font-display text-xl">Customer & delivery</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Name</dt>
                <dd className="mt-1">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Phone</dt>
                <dd className="mt-1">{order.customer_phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Email</dt>
                <dd className="mt-1">{order.customer_email ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Delivery address</dt>
                <dd className="mt-1 whitespace-pre-line">{order.delivery_address}</dd>
              </div>
              {order.customer_notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Customer notes</dt>
                  <dd className="mt-1 whitespace-pre-line">{order.customer_notes}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="card p-5" aria-labelledby="items-heading">
            <h2 id="items-heading" className="font-display text-xl">Items</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <thead className="border-b border-line text-[10px] uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3">Item</th>
                    <th scope="col" className="py-2 pr-3">Qty</th>
                    <th scope="col" className="py-2 pr-3 text-right">Unit</th>
                    <th scope="col" className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3">
                        {item.product_name}
                        {item.variant ? <span className="text-muted"> · {item.variant}</span> : null}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{item.quantity}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(item.unit_price_kobo)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatMoney(item.line_total_kobo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(order.subtotal_kobo)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{order.delivery_fee_kobo === null ? "Not confirmed" : formatMoney(order.delivery_fee_kobo)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.total_kobo)}</dd></div>
            </dl>
            {order.email_error ? <p className="mt-3 text-[11px] text-danger">Email note: {order.email_error}</p> : null}
          </section>
        </div>

        <div className="space-y-4">
          <OrderUpdateForm
            orderId={order.id}
            status={order.status}
            deliveryFeeNaira={order.delivery_fee_kobo === null ? "" : koboToNairaInput(order.delivery_fee_kobo)}
          />
          <div className="card p-5">
            <h2 className="font-display text-lg">Contact customer</h2>
            <div className="mt-3 flex flex-col gap-2">
              <a href={`tel:${order.customer_phone.replace(/\s/g, "")}`} className="btn btn-quiet btn-sm">Call {order.customer_phone}</a>
              {order.customer_email ? <a href={`mailto:${order.customer_email}?subject=${encodeURIComponent(`Your Corazon Empire order ${order.reference}`)}`} className="btn btn-quiet btn-sm">Email customer</a> : null}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-burgundy btn-sm">Open order in WhatsApp</a>
            </div>
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-muted">
            Availability and payment are only confirmed when you update the status and tell the
            customer. Recording a fee changes the total; it does not notify the customer.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
