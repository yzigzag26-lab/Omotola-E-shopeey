import { NextResponse } from "next/server";
import { orderRequestSchema } from "@/lib/validation/order";
import { submitOrder, OrderError } from "@/lib/orders/submit";
import { ConfigurationError } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `orders:${ip}`;
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request), 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ ok: false, code: "BAD_CONTENT_TYPE", message: "Expected JSON." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_JSON", message: "Malformed request." }, { status: 400 });
  }

  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, code: "VALIDATION_FAILED", message: first?.message ?? "Please check your details.", field: first?.path?.join(".") },
      { status: 422 },
    );
  }

  const data = parsed.data;

  try {
    const result = await submitOrder({
      channel: data.channel,
      idempotencyKey: data.idempotency_key,
      customerName: data.customer_name,
      customerEmail: data.customer_email ?? null,
      customerPhone: data.customer_phone,
      deliveryAddress: data.delivery_address,
      notes: data.customer_notes ?? null,
      items: data.items.map((item) => ({
        product_id: item.product_id,
        variant: item.variant ?? null,
        quantity: item.quantity,
      })),
    });

    return NextResponse.json({
      ok: true,
      receipt: result.receipt,
      emailSent: result.emailSent,
      emailConfigured: result.emailConfigured,
    });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
    }
    // A missing Supabase configuration is operator misconfiguration, not an
    // unexpected failure. Reporting it as 500 UNEXPECTED hides the real cause
    // and makes a bad deploy indistinguishable from a code fault.
    if (error instanceof ConfigurationError) {
      console.error("[api/orders] store not configured:", error.message);
      return NextResponse.json(
        {
          ok: false,
          code: "STORE_NOT_CONFIGURED",
          message: "Ordering is temporarily unavailable while the store finishes its setup. Your cart has been kept.",
        },
        { status: 503 },
      );
    }
    console.error("[api/orders] unexpected failure", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { ok: false, code: "UNEXPECTED", message: "Something went wrong. Your cart has been kept — please try again." },
      { status: 500 },
    );
  }
}
