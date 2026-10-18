import { describe, expect, it } from "vitest";
import { orderRequestSchema } from "@/lib/validation/order";

const base = {
  channel: "whatsapp" as const,
  idempotency_key: "1234abcd-5678-90ef",
  customer_name: "Ada Obi",
  customer_phone: "+234 800 000 0000",
  delivery_address: "12 Test Street, Lagos",
  items: [{ product_id: "d0000000-0000-4000-8000-000000000001", quantity: 2 }],
};

describe("order request validation", () => {
  it("accepts a valid WhatsApp order", () => {
    const parsed = orderRequestSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it("accepts email orders only with a valid email", () => {
    expect(orderRequestSchema.safeParse({ ...base, channel: "email" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, channel: "email", customer_email: "ada@example.com" }).success).toBe(true);
    expect(orderRequestSchema.safeParse({ ...base, channel: "email", customer_email: "nope" }).success).toBe(false);
  });

  it("rejects empty carts, bad quantities and malformed product ids", () => {
    expect(orderRequestSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, items: [{ product_id: base.items[0]!.product_id, quantity: 0 }] }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, items: [{ product_id: base.items[0]!.product_id, quantity: 21 }] }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, items: [{ product_id: "not-a-uuid", quantity: 1 }] }).success).toBe(false);
  });

  it("rejects unknown channels and short idempotency keys", () => {
    expect(orderRequestSchema.safeParse({ ...base, channel: "sms" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, idempotency_key: "short" }).success).toBe(false);
  });

  it("requires a reachable phone number and delivery address", () => {
    expect(orderRequestSchema.safeParse({ ...base, customer_phone: "" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, customer_phone: "abc" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, delivery_address: "x" }).success).toBe(false);
  });
});
