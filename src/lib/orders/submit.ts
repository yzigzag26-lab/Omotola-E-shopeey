import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getEmailConfig } from "@/lib/env";
import { buildOrderEmail } from "./email-template";
import type { OrderReceipt, OrderReceiptItem } from "@/lib/types";

export class OrderError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "ORDER_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type SubmitInput = {
  channel: "whatsapp" | "email";
  idempotencyKey: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  deliveryAddress: string;
  notes: string | null;
  items: { product_id: string; variant: string | null; quantity: number }[];
};

function normaliseReceipt(raw: unknown): OrderReceipt {
  const value = raw as {
    order_id: string;
    reference: string;
    channel: "whatsapp" | "email";
    subtotal_kobo: number;
    delivery_fee_kobo: number | null;
    total_kobo: number;
    items: OrderReceiptItem[];
    replayed?: boolean;
  };
  if (!value?.order_id || !value?.reference) {
    throw new OrderError("The order could not be created. Please try again.", 502, "ORDER_REJECTED");
  }
  return {
    order_id: value.order_id,
    reference: value.reference,
    channel: value.channel,
    subtotal_kobo: Number(value.subtotal_kobo),
    delivery_fee_kobo: value.delivery_fee_kobo === null ? null : Number(value.delivery_fee_kobo),
    total_kobo: Number(value.total_kobo),
    items: Array.isArray(value.items) ? value.items : [],
  };
}

/**
 * Creates a pending order through the transactional submit_order() RPC and, for
 * the email channel, requests a notification from the configured provider.
 * The cart must only be cleared by the caller after this resolves.
 */
export async function submitOrder(input: SubmitInput): Promise<{ receipt: OrderReceipt; emailSent: boolean; emailConfigured: boolean }> {
  const supabase = await createServerSupabase();

  // Fail fast for email orders when the provider is not configured, so no
  // half-processed order is created and the customer keeps their cart.
  const emailConfig = getEmailConfig();
  if (input.channel === "email" && !emailConfig) {
    throw new OrderError(
      "Email ordering is not available yet: the store's email provider has not been configured. Your cart has been kept — please order via WhatsApp instead.",
      503,
      "EMAIL_NOT_CONFIGURED",
    );
  }

  // Authoritative pre-flight validation: published, sellable, and variant exists.
  // The RPC re-checks price/status inside the transaction as defence in depth.
  const productIds = [...new Set(input.items.map((item) => item.product_id))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, status, availability")
    .in("id", productIds);

  if (productError) {
    console.error("[orders] product validation query failed", { code: productError.code });
    throw new OrderError("We could not validate your cart. Please try again.", 502, "PRODUCT_LOOKUP_FAILED");
  }

  const { data: variantRows, error: variantError } = await supabase
    .from("product_variants")
    .select("product_id, value, is_available")
    .in("product_id", productIds);

  if (variantError) {
    console.error("[orders] variant validation query failed", { code: variantError.code });
    throw new OrderError("We could not validate your cart. Please try again.", 502, "PRODUCT_LOOKUP_FAILED");
  }

  const variantsByProduct = new Map<string, { value: string; is_available: boolean }[]>();
  for (const variant of variantRows ?? []) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push({ value: variant.value, is_available: variant.is_available });
    variantsByProduct.set(variant.product_id, list);
  }

  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  for (const item of input.items) {
    const product = productMap.get(item.product_id);
    if (!product || product.status !== "published" || product.availability === "temporarily_unavailable") {
      throw new OrderError(
        "One or more items in your bag are no longer available. Please review your bag and try again.",
        409,
        "ITEM_UNAVAILABLE",
      );
    }
    const variants = (variantsByProduct.get(item.product_id) ?? []).filter((variant) => variant.is_available);
    if (variants.length > 0) {
      if (!item.variant) {
        throw new OrderError("Please select an option for every item in your bag.", 400, "VARIANT_REQUIRED");
      }
      if (!variants.some((variant) => variant.value === item.variant)) {
        throw new OrderError("A selected option is no longer available. Please update your bag.", 409, "VARIANT_UNAVAILABLE");
      }
    } else {
      item.variant = null;
    }
  }

  const { data, error } = await supabase.rpc("submit_order", {
    payload: {
      channel: input.channel,
      idempotency_key: input.idempotencyKey,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      delivery_address: input.deliveryAddress,
      customer_notes: input.notes,
      items: input.items,
    },
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("ORDER_INVALID:")) {
      throw new OrderError(message.replace(/^.*ORDER_INVALID:\s*/, ""), 400, "ORDER_INVALID");
    }
    console.error("[orders] submit_order failed", { code: error.code, hint: error.hint });
    throw new OrderError("We could not record your order. Please try again shortly.", 502, "ORDER_RPC_FAILED");
  }

  const receipt = normaliseReceipt(data);
  if (input.channel !== "email" || !emailConfig) {
    return { receipt, emailSent: false, emailConfigured: Boolean(emailConfig) };
  }

  const { subject, html, text } = buildOrderEmail({
    receipt,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    deliveryAddress: input.deliveryAddress,
    notes: input.notes,
    submittedAt: new Date().toISOString(),
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailConfig.from,
        to: [emailConfig.orderRecipient],
        reply_to: input.customerEmail ?? undefined,
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[orders] email provider rejected notification", { status: response.status, detail: detail.slice(0, 300) });
      await markEmailStatus(receipt.order_id, "failed", `Provider responded ${response.status}`);
      throw new OrderError(
        `Your order ${receipt.reference} was saved, but the email notification could not be sent. Your cart has been kept — please try again or order via WhatsApp.`,
        502,
        "EMAIL_SEND_FAILED",
      );
    }

    await markEmailStatus(receipt.order_id, "sent", null);
    return { receipt, emailSent: true, emailConfigured: true };
  } catch (error) {
    if (error instanceof OrderError) throw error;
    console.error("[orders] email notification error", error instanceof Error ? error.name : "unknown");
    await markEmailStatus(receipt.order_id, "failed", "Notification request failed");
    throw new OrderError(
      `Your order ${receipt.reference} was saved, but the email notification could not be sent. Your cart has been kept — please try again or order via WhatsApp.`,
      502,
      "EMAIL_SEND_FAILED",
    );
  }
}

/** Uses the service-role key when configured; order status is otherwise left pending with a logged warning. */
async function markEmailStatus(orderId: string, status: "sent" | "failed", detail: string | null): Promise<void> {
  try {
    const { createServiceSupabase } = await import("@/lib/supabase/admin");
    const service = createServiceSupabase();
    if (!service) {
      console.warn("[orders] SUPABASE_SERVICE_ROLE_KEY missing — email_status not updated for", orderId);
      return;
    }
    const { error } = await service.rpc("set_order_email_status", {
      p_order_id: orderId,
      p_status: status,
      p_error: detail,
    });
    if (error) console.warn("[orders] could not update email_status", { code: error.code });
  } catch {
    console.warn("[orders] email_status update failed");
  }
}
