import { formatMoney } from "@/lib/format/money";
import { BUSINESS } from "@/lib/env";

export type WhatsAppLine = {
  name: string;
  variant?: string | null;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
};

export type WhatsAppOrderPayload = {
  reference?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  lines: WhatsAppLine[];
  subtotalKobo: number;
};

/**
 * Builds the wa.me deep link. Nothing is "sent" until the customer presses send
 * inside WhatsApp — the site never claims the order was transmitted or accepted.
 */
export function buildWhatsAppUrl(payload: WhatsAppOrderPayload, phone: string = BUSINESS.whatsappNumber): string {
  const lines: string[] = ["CORAZON EMPIRE — NEW ORDER REQUEST", ""];

  if (payload.reference) lines.push(`Order reference: ${payload.reference}`);
  if (payload.customerName) lines.push(`Name: ${payload.customerName}`);
  if (payload.customerPhone) lines.push(`Phone: ${payload.customerPhone}`);
  if (payload.deliveryAddress) lines.push(`Delivery: ${payload.deliveryAddress}`);
  if (payload.reference || payload.customerName) lines.push("");

  lines.push("Items:");
  for (const line of payload.lines) {
    const variant = line.variant ? ` (${line.variant})` : "";
    lines.push(
      `• ${line.name}${variant} × ${line.quantity} — ${formatMoney(line.unitPriceKobo)} each = ${formatMoney(line.lineTotalKobo)}`,
    );
  }

  lines.push("", `Subtotal: ${formatMoney(payload.subtotalKobo)}`);
  lines.push("Delivery: not yet confirmed — the seller will confirm the fee.");
  lines.push("");
  lines.push(
    "Please confirm availability, final delivery charges and payment arrangements. This message is a request only and is not yet a confirmed order.",
  );

  const text = encodeURIComponent(lines.join("\n"));
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${text}`;
}
