import { formatMoney } from "@/lib/format/money";
import { formatDateTime } from "@/lib/format/date";
import type { OrderReceipt } from "@/lib/types";

export type OrderEmailData = {
  receipt: OrderReceipt;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  deliveryAddress: string;
  notes: string | null;
  submittedAt: string;
};

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

export function buildOrderEmail(data: OrderEmailData): { subject: string; html: string; text: string } {
  const { receipt } = data;
  const subject = `New Corazon Empire order ${receipt.reference} — ${formatMoney(receipt.total_kobo)}`;

  const rows = receipt.items
    .map(
      (item) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee7db;">${esc(item.product_name)}${item.variant ? ` <span style="color:#756b5e;">(${esc(item.variant)})</span>` : ""}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee7db;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee7db;text-align:right;">${formatMoney(item.unit_price_kobo)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee7db;text-align:right;">${formatMoney(item.line_total_kobo)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(receipt.reference)}</title></head>
<body style="margin:0;background:#f8f4ed;font-family:Helvetica,Arial,sans-serif;color:#14110f;">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
    <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6b1f2f;">Corazon Empire</p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:12px 0 4px;">New order request</h1>
    <p style="margin:0;color:#756b5e;font-size:13px;">${esc(receipt.reference)} · ${esc(formatDateTime(data.submittedAt))}</p>

    <table style="width:100%;margin:24px 0;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#756b5e;width:130px;">Customer</td><td>${esc(data.customerName)}</td></tr>
      <tr><td style="padding:4px 0;color:#756b5e;">Phone</td><td>${esc(data.customerPhone)}</td></tr>
      <tr><td style="padding:4px 0;color:#756b5e;">Email</td><td>${data.customerEmail ? esc(data.customerEmail) : "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#756b5e;vertical-align:top;">Delivery</td><td>${esc(data.deliveryAddress)}</td></tr>
      ${data.notes ? `<tr><td style="padding:4px 0;color:#756b5e;vertical-align:top;">Notes</td><td>${esc(data.notes)}</td></tr>` : ""}
      <tr><td style="padding:4px 0;color:#756b5e;">Channel</td><td>${receipt.channel === "email" ? "Website (email)" : "WhatsApp"}</td></tr>
      <tr><td style="padding:4px 0;color:#756b5e;">Status</td><td>Pending seller review</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#14110f;color:#f8f4ed;">
        <th style="padding:10px 12px;text-align:left;">Item</th>
        <th style="padding:10px 12px;">Qty</th>
        <th style="padding:10px 12px;text-align:right;">Unit</th>
        <th style="padding:10px 12px;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table style="width:100%;margin-top:16px;font-size:14px;">
      <tr><td style="padding:4px 0;color:#756b5e;">Subtotal</td><td style="text-align:right;">${formatMoney(receipt.subtotal_kobo)}</td></tr>
      <tr><td style="padding:4px 0;color:#756b5e;">Delivery</td><td style="text-align:right;">${receipt.delivery_fee_kobo === null ? "To be confirmed" : formatMoney(receipt.delivery_fee_kobo)}</td></tr>
      <tr><td style="padding:10px 0;font-weight:bold;border-top:1px solid #14110f;">Total${receipt.delivery_fee_kobo === null ? " (excl. delivery)" : ""}</td><td style="text-align:right;font-weight:bold;border-top:1px solid #14110f;">${formatMoney(receipt.total_kobo)}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#756b5e;">
      Availability, final delivery charges and payment arrangements are <strong>not confirmed</strong> until the seller
      replies. Reply to this customer directly to confirm the order.
    </p>
    <p style="margin:24px 0 0;font-size:11px;color:#756b5e;">Sent automatically by the Corazon Empire storefront.</p>
  </div>
</body></html>`;

  const text = [
    "CORAZON EMPIRE — NEW ORDER REQUEST",
    `Reference: ${receipt.reference}`,
    `Submitted: ${formatDateTime(data.submittedAt)}`,
    "",
    `Customer: ${data.customerName}`,
    `Phone: ${data.customerPhone}`,
    `Email: ${data.customerEmail ?? "—"}`,
    `Delivery: ${data.deliveryAddress}`,
    data.notes ? `Notes: ${data.notes}` : null,
    `Channel: ${receipt.channel}`,
    "Status: pending seller review",
    "",
    ...receipt.items.map(
      (item) =>
        `- ${item.product_name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity} @ ${formatMoney(item.unit_price_kobo)} = ${formatMoney(item.line_total_kobo)}`,
    ),
    "",
    `Subtotal: ${formatMoney(receipt.subtotal_kobo)}`,
    `Delivery: ${receipt.delivery_fee_kobo === null ? "to be confirmed" : formatMoney(receipt.delivery_fee_kobo)}`,
    `Total: ${formatMoney(receipt.total_kobo)}`,
    "",
    "Availability, final delivery charges and payment arrangements are not confirmed until the seller replies.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { subject, html, text };
}
