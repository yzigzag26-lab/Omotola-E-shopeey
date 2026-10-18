import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "@/lib/orders/whatsapp";

const decode = (url: string) => decodeURIComponent(new URL(url).searchParams.get("text") ?? "");

describe("WhatsApp order links", () => {
  it("targets the business number in international format", () => {
    const url = buildWhatsAppUrl({
      lines: [{ name: "Aurelia Decorative Vase", quantity: 1, unitPriceKobo: 1_850_000, lineTotalKobo: 1_850_000 }],
      subtotalKobo: 1_850_000,
    });
    expect(url.startsWith("https://wa.me/2348071334513?text=")).toBe(true);
  });

  it("includes reference, customer, items, quantities and totals", () => {
    const url = buildWhatsAppUrl({
      reference: "CE-261018-ABC123",
      customerName: "Ada Obi",
      customerPhone: "+2348000000000",
      deliveryAddress: "12 Test Street, Lagos",
      lines: [
        { name: "Aurelia Decorative Vase", quantity: 2, unitPriceKobo: 1_850_000, lineTotalKobo: 3_700_000 },
        { name: "Signature Waist Bead Set", variant: "34 in", quantity: 1, unitPriceKobo: 500_000, lineTotalKobo: 500_000 },
      ],
      subtotalKobo: 4_200_000,
    });
    const text = decode(url);
    expect(text).toContain("CORAZON EMPIRE — NEW ORDER REQUEST");
    expect(text).toContain("CE-261018-ABC123");
    expect(text).toContain("Ada Obi");
    expect(text).toContain("12 Test Street, Lagos");
    expect(text).toContain("Aurelia Decorative Vase × 2");
    expect(text).toContain("(34 in)");
    expect(text).toContain("42,000");
    expect(text).toContain("not yet a confirmed order");
    expect(text).toContain("Delivery: not yet confirmed");
  });

  it("does not invent a delivery fee", () => {
    const url = buildWhatsAppUrl({
      lines: [{ name: "Slides", quantity: 1, unitPriceKobo: 1_650_000, lineTotalKobo: 1_650_000 }],
      subtotalKobo: 1_650_000,
    });
    expect(decode(url)).not.toMatch(/Delivery: ₦/);
  });
});
