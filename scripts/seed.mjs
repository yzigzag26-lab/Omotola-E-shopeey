#!/usr/bin/env node
/**
 * Idempotent demo catalogue seed.
 *
 * - Upserts the eight categories and eight products by slug (never deletes).
 * - Upserts the sixteen demo image records by fixed id.
 * - Upserts variants by (product_id, kind, value).
 * - Re-running is safe: no duplicate categories or products are created.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { adminClient } from "./_supabase.mjs";

const catalogPath = path.join(process.cwd(), "supabase", "seed", "demo-catalog.json");

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const supabase = adminClient();

  console.log(`Seeding ${catalog.categories.length} categories…`);
  for (const category of catalog.categories) {
    const { id, ...rest } = category;
    const { error } = await supabase.from("categories").upsert({ id, ...rest }, { onConflict: "slug" });
    if (error) throw new Error(`Category ${category.slug}: ${error.message}`);
  }

  console.log(`Seeding ${catalog.products.length} products…`);
  for (const product of catalog.products) {
    const { id, variants: _variants, images: _images, ...rest } = product;
    const { error } = await supabase
      .from("products")
      .upsert({ id, ...rest, currency: "NGN" }, { onConflict: "slug" });
    if (error) throw new Error(`Product ${product.slug}: ${error.message}`);
  }

  const { data: products, error: productError } = await supabase.from("products").select("id, slug");
  if (productError) throw new Error(productError.message);
  const idBySlug = new Map(products.map((row) => [row.slug, row.id]));

  console.log("Seeding image records…");
  for (const product of catalog.products) {
    const productId = idBySlug.get(product.slug);
    if (!productId) throw new Error(`Missing product after upsert: ${product.slug}`);
    for (const [index, image] of product.images.entries()) {
      const { error } = await supabase.from("product_images").upsert(
        {
          id: image.id,
          product_id: productId,
          storage_path: null,
          image_url: `/products/${image.file}.jpg`,
          image_url_thumb: `/products/${image.file}-thumb.jpg`,
          role: image.role,
          alt_text: image.alt,
          display_order: index,
          width: 1600,
          height: 2000,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw new Error(`Image ${image.file}: ${error.message}`);
    }

    for (const [index, variant] of product.variants.entries()) {
      const { error } = await supabase.from("product_variants").upsert(
        {
          product_id: productId,
          kind: variant.kind,
          value: variant.value,
          display_order: index,
          is_available: true,
        },
        { onConflict: "product_id,kind,value", ignoreDuplicates: true },
      );
      if (error) throw new Error(`Variant ${variant.kind}/${variant.value}: ${error.message}`);
    }
  }

  const [categoriesCount, productsCount, imagesCount, variantsCount, announcement] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("product_images").select("id", { count: "exact", head: true }),
    supabase.from("product_variants").select("id", { count: "exact", head: true }),
    supabase.from("announcements").select("message, is_enabled").eq("singleton", true).maybeSingle(),
  ]);

  console.log("Seed complete:");
  console.log(`  categories: ${categoriesCount.count ?? 0}`);
  console.log(`  products:   ${productsCount.count ?? 0}`);
  console.log(`  images:     ${imagesCount.count ?? 0}`);
  console.log(`  variants:   ${variantsCount.count ?? 0}`);
  console.log(`  announcement: ${announcement.data ? (announcement.data.is_enabled ? "enabled" : "disabled") : "missing"}`);
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message);
  process.exit(1);
});
