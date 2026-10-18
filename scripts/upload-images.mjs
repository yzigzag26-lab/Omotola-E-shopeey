#!/usr/bin/env node
/**
 * Uploads the optimised demo photography to Supabase Storage and repoints the
 * demo product_images records at the public storage URLs.
 *
 * Run this once per environment (requires network access to Supabase):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run upload-images
 *
 * The storefront also works without this step because the demo seed references
 * the bundled /products/*.jpg assets.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { adminClient } from "./_supabase.mjs";

const dir = path.join(process.cwd(), "public", "products");
const BUCKET = "product-images";

async function main() {
  const supabase = adminClient();
  const files = (await readdir(dir)).filter((file) => file.endsWith(".jpg"));
  if (files.length === 0) {
    console.error("No processed images found in public/products. Run `node scripts/process-images.mjs` first.");
    process.exit(1);
  }

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET);
  if (bucketError || !bucket) {
    console.error(`Storage bucket "${BUCKET}" is not available: ${bucketError?.message ?? "not found"}`);
    console.error("Apply supabase/migrations/20261018000300_rls_storage_seed.sql first.");
    process.exit(1);
  }

  let uploaded = 0;
  for (const file of files) {
    const body = await readFile(path.join(dir, file));
    const objectPath = `catalog/${file}`;
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) {
      console.error(`Upload failed for ${file}: ${error.message}`);
      process.exit(1);
    }
    uploaded += 1;
  }

  const { data: images, error: imageError } = await supabase
    .from("product_images")
    .select("id, image_url, image_url_thumb");
  if (imageError) throw new Error(imageError.message);

  let repointed = 0;
  for (const image of images ?? []) {
    const base = path.basename(image.image_url);
    if (!base.endsWith(".jpg")) continue;
    const displayPath = `catalog/${base}`;
    const thumbName = base.replace(/\.jpg$/, "-thumb.jpg");
    const thumbPath = `catalog/${thumbName}`;
    const displayUrl = supabase.storage.from(BUCKET).getPublicUrl(displayPath).data.publicUrl;
    const thumbUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
    const { error } = await supabase
      .from("product_images")
      .update({ storage_path: displayPath, image_url: displayUrl, image_url_thumb: thumbUrl })
      .eq("id", image.id);
    if (error) {
      console.error(`Could not repoint image ${image.id}: ${error.message}`);
      continue;
    }
    repointed += 1;
  }

  console.log(`Uploaded ${uploaded} file(s) to ${BUCKET}/catalog and repointed ${repointed} image record(s).`);
}

main().catch((error) => {
  console.error("\nUpload failed:", error.message);
  process.exit(1);
});
