"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "./cart-provider";
import { ProductImage } from "@/components/ui/product-image";
import { Price } from "@/components/ui/price";
import { formatMoney } from "@/lib/format/money";
import { buildWhatsAppUrl } from "@/lib/orders/whatsapp";
import type { OrderReceipt } from "@/lib/types";

export type CatalogEntry = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  availability: "available" | "temporarily_unavailable" | "made_to_order";
  image: string | null;
  variantValues: string[];
};

type Channel = "whatsapp" | "email";

type SuccessState = {
  receipt: OrderReceipt;
  channel: Channel;
  emailSent: boolean;
  whatsappUrl: string | null;
};

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ce-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CartView({ catalog }: { catalog: CatalogEntry[] }) {
  const { items, hydrated, updateQuantity, removeItem, clear } = useCart();
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    delivery_address: "",
    customer_notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const idempotencyKey = useRef<string>(newKey());

  const byId = useMemo(() => new Map(catalog.map((entry) => [entry.id, entry])), [catalog]);

  const lines = useMemo(
    () =>
      items.map((item) => {
        const current = byId.get(item.productId);
        const unavailable = !current || current.availability === "temporarily_unavailable";
        return {
          ...item,
          currentPriceKobo: current?.priceKobo ?? item.priceKobo,
          priceChanged: current ? current.priceKobo !== item.priceKobo : false,
          unavailable,
          image: current?.image ?? item.image,
        };
      }),
    [items, byId],
  );

  const payableLines = lines.filter((line) => !line.unavailable);
  const currentSubtotal = payableLines.reduce((total, line) => total + line.currentPriceKobo * line.quantity, 0);
  const hasUnavailable = lines.some((line) => line.unavailable);
  const cartEmpty = hydrated && lines.length === 0;

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (payableLines.length === 0) {
      setError("There are no available items to order.");
      return;
    }
    if (form.customer_name.trim().length < 2) return setError("Please enter your full name.");
    if (form.customer_phone.trim().length < 7) return setError("Please enter a phone number we can reach you on.");
    if (channel === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customer_email.trim())) {
      return setError("Please enter a valid email address for email ordering.");
    }
    if (form.delivery_address.trim().length < 5) return setError("Please enter your delivery address.");

    // Open the WhatsApp window synchronously so browsers do not block it later.
    const whatsappWindow = channel === "whatsapp" ? window.open("about:blank", "_blank", "noopener,noreferrer") : null;

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          idempotency_key: idempotencyKey.current,
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_email: channel === "email" ? form.customer_email.trim() : undefined,
          delivery_address: form.delivery_address.trim(),
          customer_notes: form.customer_notes.trim() || undefined,
          items: payableLines.map((line) => ({
            product_id: line.productId,
            variant: line.variant,
            quantity: line.quantity,
          })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; receipt: OrderReceipt; emailSent: boolean }
        | { ok: false; message?: string }
        | null;

      if (!response.ok || !payload || payload.ok !== true) {
        whatsappWindow?.close();
        setError(payload && "message" in payload && payload.message ? payload.message : "We could not submit your order. Your cart has been kept.");
        return;
      }

      const receipt = payload.receipt;
      const whatsappUrl =
        channel === "whatsapp"
          ? buildWhatsAppUrl({
              reference: receipt.reference,
              customerName: form.customer_name.trim(),
              customerPhone: form.customer_phone.trim(),
              deliveryAddress: form.delivery_address.trim(),
              lines: receipt.items.map((item) => ({
                name: item.product_name,
                variant: item.variant,
                quantity: item.quantity,
                unitPriceKobo: item.unit_price_kobo,
                lineTotalKobo: item.line_total_kobo,
              })),
              subtotalKobo: receipt.subtotal_kobo,
            })
          : null;

      if (whatsappUrl && whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else if (whatsappUrl) {
        whatsappWindow?.close();
      }

      setSuccess({ receipt, channel, emailSent: payload.emailSent, whatsappUrl });
      clear();
      idempotencyKey.current = newKey();
    } catch {
      whatsappWindow?.close();
      setError("Network error — your cart has been kept. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const { receipt } = success;
    return (
      <section aria-live="polite" className="mx-auto max-w-2xl">
        <div className="border border-line bg-white p-6 md:p-10">
          <p className="eyebrow">{success.channel === "email" ? "Order request recorded" : "Order request prepared"}</p>
          <h2 className="mt-3 font-display text-3xl">Thank you — nearly there.</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Your order <strong className="text-ink">{receipt.reference}</strong> has been recorded with a
            status of <em>pending seller review</em>. Availability, final delivery charges and payment
            arrangements are confirmed personally — this is not yet a confirmed sale.
          </p>

          {success.channel === "whatsapp" ? (
            <div className="mt-5 border border-gold/40 bg-ivory px-4 py-3 text-sm text-ink-soft">
              A WhatsApp window should have opened with your order details. Press <strong>send</strong> in
              WhatsApp to deliver the message. If it did not open, use the link below.
              {success.whatsappUrl ? (
                <a href={success.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-burgundy mt-4 w-full">
                  Open WhatsApp with my order
                </a>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 border border-line bg-ivory px-4 py-3 text-sm text-ink-soft">
              {success.emailSent
                ? "The order notification was accepted by our email provider. That confirms dispatch to the provider, not guaranteed inbox delivery. The seller will reply to confirm."
                : "Your order is saved, but the email notification could not be confirmed. Please also send the order via WhatsApp so the seller sees it promptly."}
              {!success.emailSent ? (
                <a
                  href={buildWhatsAppUrl({
                    reference: receipt.reference,
                    customerName: form.customer_name.trim(),
                    customerPhone: form.customer_phone.trim(),
                    deliveryAddress: form.delivery_address.trim(),
                    lines: receipt.items.map((item) => ({
                      name: item.product_name,
                      variant: item.variant,
                      quantity: item.quantity,
                      unitPriceKobo: item.unit_price_kobo,
                      lineTotalKobo: item.line_total_kobo,
                    })),
                    subtotalKobo: receipt.subtotal_kobo,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-burgundy mt-4 w-full"
                >
                  Send via WhatsApp instead
                </a>
              ) : null}
            </div>
          )}

          <dl className="mt-6 border-t border-line pt-4 text-sm">
            {receipt.items.map((item, index) => (
              <div key={`${item.product_name}-${index}`} className="flex justify-between gap-4 py-2">
                <dt className="text-ink-soft">
                  {item.product_name}
                  {item.variant ? <span className="text-muted"> · {item.variant}</span> : null}
                  <span className="text-muted"> × {item.quantity}</span>
                </dt>
                <dd className="tabular-nums">{formatMoney(item.line_total_kobo)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-line pt-3 font-medium">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(receipt.subtotal_kobo)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1 text-muted">
              <dt>Delivery</dt>
              <dd>To be confirmed</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-primary">Continue shopping</Link>
            <Link href="/contact" className="btn btn-quiet">Contact the seller</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!hydrated) {
    return <p className="py-16 text-center text-sm text-muted">Loading your bag…</p>;
  }

  if (cartEmpty) {
    return (
      <div className="border border-line bg-white px-6 py-16 text-center">
        <p className="eyebrow">Your bag</p>
        <h2 className="mt-3 font-display text-2xl">Your bag is empty</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Explore the collection and add the pieces you would like the seller to confirm.
        </p>
        <Link href="/shop" className="btn btn-primary mt-6">Shop the collection</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
      <section aria-label="Bag items">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <li key={`${line.productId}-${line.variant ?? ""}`} className="grid grid-cols-[5.5rem_1fr] gap-4 py-5 sm:grid-cols-[7rem_1fr]">
              <Link href={`/product/${line.slug}`} className="block border border-line bg-ivory-deep">
                <ProductImage src={line.image} alt={line.name} sizes="7rem" />
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/product/${line.slug}`} className="font-display text-lg leading-snug hover:text-burgundy">
                      {line.name}
                    </Link>
                    {line.variant ? <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-muted">{line.variant}</p> : null}
                    {line.unavailable ? (
                      <p className="mt-1 text-xs text-danger">This piece is no longer available and will not be ordered.</p>
                    ) : null}
                    {line.priceChanged ? (
                      <p className="mt-1 text-xs text-burgundy">Price updated to {formatMoney(line.currentPriceKobo)}.</p>
                    ) : null}
                  </div>
                  <p className="text-sm"><Price kobo={line.currentPriceKobo} /></p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center border border-line bg-white">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.variant, line.quantity - 1)}
                      className="h-9 w-9 text-ink-soft hover:bg-ivory-deep"
                      aria-label={`Decrease quantity of ${line.name}`}
                    >
                      −
                    </button>
                    <span className="w-9 border-x border-line text-center text-sm tabular-nums">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.variant, line.quantity + 1)}
                      className="h-9 w-9 text-ink-soft hover:bg-ivory-deep disabled:opacity-40"
                      disabled={line.quantity >= 20}
                      aria-label={`Increase quantity of ${line.name}`}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="tabular-nums text-ink-soft">{formatMoney(line.currentPriceKobo * line.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.productId, line.variant)}
                      className="uppercase tracking-[0.12em] text-muted underline underline-offset-4 hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between text-sm">
          <button type="button" onClick={clear} className="text-xs uppercase tracking-[0.12em] text-muted underline underline-offset-4 hover:text-danger">
            Empty bag
          </button>
          <Link href="/shop" className="text-xs uppercase tracking-[0.12em] text-burgundy underline underline-offset-4">
            Continue shopping
          </Link>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          Subtotal shown is based on current store prices. Delivery is quoted separately and confirmed
          by the seller — no delivery fee is charged automatically.
        </p>
      </section>

      <aside className="border border-line bg-white p-5 md:p-6">
        <h2 className="font-display text-xl">Order summary</h2>
        <div className="mt-4 space-y-2 border-b border-line pb-4 text-sm">
          {payableLines.map((line) => (
            <div key={`${line.productId}-${line.variant ?? ""}`} className="flex justify-between gap-3 text-ink-soft">
              <span className="truncate">{line.name} × {line.quantity}</span>
              <span className="shrink-0 tabular-nums">{formatMoney(line.currentPriceKobo * line.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 pt-2 font-medium">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(currentSubtotal)}</span>
          </div>
          <div className="flex justify-between gap-3 text-muted">
            <span>Delivery</span>
            <span>To be confirmed</span>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="label">How would you like to order?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "whatsapp", label: "WhatsApp" },
                { value: "email", label: "Email" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center justify-center border px-3 py-2.5 text-xs uppercase tracking-[0.14em] ${
                  channel === option.value ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink"
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  value={option.value}
                  checked={channel === option.value}
                  onChange={() => setChannel(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="hint">
            {channel === "whatsapp"
              ? "We record the order, then open WhatsApp with a message for you to review and send."
              : "We record the order and email the seller. You will still confirm details with them."}
          </p>
        </fieldset>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="customer_name" className="label">Full name <span className="text-burgundy">*</span></label>
            <input id="customer_name" name="customer_name" className="field" autoComplete="name" required
              value={form.customer_name} onChange={(event) => setField("customer_name", event.target.value)} />
          </div>
          <div>
            <label htmlFor="customer_phone" className="label">Phone <span className="text-burgundy">*</span></label>
            <input id="customer_phone" name="customer_phone" type="tel" className="field" autoComplete="tel" required
              placeholder="+234…" value={form.customer_phone} onChange={(event) => setField("customer_phone", event.target.value)} />
          </div>
          <div>
            <label htmlFor="customer_email" className="label">
              Email {channel === "email" ? <span className="text-burgundy">*</span> : <span className="text-muted">(optional)</span>}
            </label>
            <input id="customer_email" name="customer_email" type="email" className="field" autoComplete="email"
              required={channel === "email"} value={form.customer_email}
              onChange={(event) => setField("customer_email", event.target.value)} />
          </div>
          <div>
            <label htmlFor="delivery_address" className="label">Delivery address / location <span className="text-burgundy">*</span></label>
            <textarea id="delivery_address" name="delivery_address" className="field min-h-20" rows={3} required
              value={form.delivery_address} onChange={(event) => setField("delivery_address", event.target.value)} />
          </div>
          <div>
            <label htmlFor="customer_notes" className="label">Notes <span className="text-muted">(optional)</span></label>
            <textarea id="customer_notes" name="customer_notes" className="field min-h-16" rows={2}
              value={form.customer_notes} onChange={(event) => setField("customer_notes", event.target.value)} />
          </div>

          {hasUnavailable ? (
            <p className="border border-line bg-ivory px-3 py-2 text-xs text-muted">
              Unavailable items are excluded from this order. Remove them from your bag to avoid confusion.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>
          ) : null}

          <button type="submit" className="btn btn-burgundy w-full" disabled={submitting || payableLines.length === 0}>
            {submitting ? "Submitting…" : channel === "whatsapp" ? "Place order & open WhatsApp" : "Place order by email"}
          </button>
          <p className="text-[10px] leading-relaxed text-muted">
            No payment is taken here. Availability, delivery cost and payment are confirmed by the seller.
          </p>
        </form>
      </aside>
    </div>
  );
}
