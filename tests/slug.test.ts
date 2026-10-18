import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "@/lib/format/slug";

describe("slug", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Aurelia Decorative Vase")).toBe("aurelia-decorative-vase");
    expect(slugify("Everyday Luxe Shoulder Bag")).toBe("everyday-luxe-shoulder-bag");
    expect(slugify("Classic Gold-Tone Jewelry Set")).toBe("classic-gold-tone-jewelry-set");
  });

  it("strips accents and punctuation", () => {
    expect(slugify("Café Décor & More!")).toBe("cafe-decor-and-more");
    expect(slugify("  --Leading and trailing--  ")).toBe("leading-and-trailing");
  });

  it("validates slug shape", () => {
    expect(isValidSlug("room-decor")).toBe(true);
    expect(isValidSlug("Room Decor")).toBe(false);
    expect(isValidSlug("double--dash")).toBe(false);
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("a")).toBe(false);
  });
});
