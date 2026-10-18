import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import catalog from "../supabase/seed/demo-catalog.json";

describe("demo catalogue seed", () => {
  it("has exactly eight categories and eight products", () => {
    expect(catalog.categories).toHaveLength(8);
    expect(catalog.products).toHaveLength(8);
    expect(new Set(catalog.categories.map((category) => category.slug)).size).toBe(8);
    expect(new Set(catalog.products.map((product) => product.slug)).size).toBe(8);
  });

  it("places one product in each category", () => {
    const counts = new Map<string, number>();
    for (const product of catalog.products) {
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
    }
    for (const category of catalog.categories) expect(counts.get(category.id)).toBe(1);
  });

  it("has the required demo prices in kobo", () => {
    const prices = Object.fromEntries(catalog.products.map((product) => [product.name, product.price_kobo]));
    expect(prices).toEqual({
      "Aurelia Decorative Vase": 1_850_000,
      "Essential Oversized T-Shirt": 1_200_000,
      "Minimalist Tattoo Sticker Set": 350_000,
      "Signature Waist Bead Set": 500_000,
      "Modern Kitchen Utensil Set": 1_500_000,
      "Everyday Comfort Slides": 1_650_000,
      "Everyday Luxe Shoulder Bag": 2_200_000,
      "Classic Gold-Tone Jewelry Set": 850_000,
    });
  });

  it("declares a front image and a second gallery view for every product", () => {
    for (const product of catalog.products) {
      const roles = product.images.map((image) => image.role);
      expect(roles.filter((role) => role === "front")).toHaveLength(1);
      expect(roles.filter((role) => role === "back")).toHaveLength(roles.includes("back") ? 1 : 0);
      expect(product.images.length).toBeGreaterThanOrEqual(2);
    }
    expect(catalog.products.flatMap((product) => product.images)).toHaveLength(16);
  });

  it("only references image files that ship with the repository", () => {
    for (const product of catalog.products) {
      for (const image of product.images) {
        for (const file of [`${image.file}.jpg`, `${image.file}-thumb.jpg`]) {
          const asset = path.resolve(import.meta.dirname, "..", "public", "products", file);
          expect(existsSync(asset), `missing asset ${file} for ${product.slug}`).toBe(true);
        }
      }
    }
  });

  it("publishes every demo product in naira", () => {
    for (const product of catalog.products) {
      expect(product.status).toBe("published");
      expect(product.price_kobo).toBeGreaterThan(0);
      expect(Number.isInteger(product.price_kobo)).toBe(true);
    }
    expect(catalog.currency).toBe("NGN");
  });
});
