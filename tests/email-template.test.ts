import { describe, expect, it } from "vitest";
import { buildOrderEmail } from "@/lib/orders/email-template";
import type { OrderReceipt } from "@/lib/types";

const receipt: OrderReceipt = {
  order_id: "11111111-1111-4111-8111-111111111111",
  reference: "CE-261018-ABC123",
  channel: "email",
  subtotal_kobo: 4_200_000,
  delivery_fee_kobo: null,
  total_kobo: 4_200_000,
  items: [
    { product_name: "Aurelia Decorative Vase", variant: null, unit_price_kobo: 1_850_000, quantity: 2, line_total_kobo: 3_700_000 },
    { product_name: "Signature Waist Bead Set", variant: "34 in", unit_price_kobo: 500_000, quantity: 1, line_total_kobo: 500_000 },
  ],
};

const data = {
  receipt,
  customerName: "Ada <script>obi</script>",
  customerEmail: "ada@example.com",
  customerPhone: "+2348000000000",
  deliveryAddress: "12 Test Street, Lagos",
  notes: null,
  submittedAt: "2026-10-18T10:00:00.000Z",
};

describe("order email", () => {
  it("includes the reference, items and totals", () => {
    const email = buildOrderEmail(data);
    expect(email.subject).toContain("CE-261018-ABC123");
    expect(email.text).toContain("Aurelia Decorative Vase");
    expect(email.text).toContain("(34 in)");
    expect(email.text).toContain("42,000");
    expect(email.text).toContain("to be confirmed");
  });

  it("escapes customer-provided HTML", () => {
    const email = buildOrderEmail(data);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("never claims delivery was confirmed", () => {
    const email = buildOrderEmail(data);
    expect(email.text).toContain("not confirmed until the seller replies");
  });
});
