import "server-only";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ImageRole, ProductImageRow } from "@/lib/supabase/database.types";
import { processProductImage } from "./process";

const BUCKET = "product-images";

export type UploadResult = { image: ProductImageRow; replaced: boolean };

/**
 * Uploads a normalised image pair (display + thumbnail) to Supabase Storage and
 * keeps product_images consistent. Replacing a front/back image updates the
 * existing row so the unique per-role constraint is respected; the previous
 * storage objects are removed after the database row is safely updated.
 */
export async function uploadProductImage(options: {
  supabase: TypedSupabaseClient;
  productId: string;
  file: File;
  role: ImageRole;
  altText: string;
}): Promise<UploadResult> {
  const { supabase, productId, file, role } = options;
  const altText = options.altText.trim().slice(0, 200) || "Product image";
  const processed = await processProductImage(file);

  const unique = crypto.randomUUID();
  const mainPath = `${productId}/${unique}.jpg`;
  const thumbPath = `${productId}/${unique}-thumb.jpg`;

  const displayUpload = await supabase.storage.from(BUCKET).upload(mainPath, processed.display, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (displayUpload.error) throw new Error(`Image upload failed: ${displayUpload.error.message}`);

  const thumbUpload = await supabase.storage.from(BUCKET).upload(thumbPath, processed.thumb, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (thumbUpload.error) {
    await supabase.storage.from(BUCKET).remove([mainPath]);
    throw new Error(`Thumbnail upload failed: ${thumbUpload.error.message}`);
  }

  const displayUrl = supabase.storage.from(BUCKET).getPublicUrl(mainPath).data.publicUrl;
  const thumbUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

  if (role === "additional") {
    const { data: last } = await supabase
      .from("product_images")
      .select("display_order")
      .eq("product_id", productId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("product_images")
      .insert({
        product_id: productId,
        storage_path: mainPath,
        image_url: displayUrl,
        image_url_thumb: thumbUrl,
        role,
        alt_text: altText,
        display_order: (last?.display_order ?? 0) + 1,
        width: processed.width,
        height: processed.height,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`Could not save image record: ${error?.message ?? "unknown"}`);
    return { image: data, replaced: false };
  }

  const { data: existing } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .eq("role", role)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("product_images")
      .update({
        storage_path: mainPath,
        image_url: displayUrl,
        image_url_thumb: thumbUrl,
        alt_text: altText,
        width: processed.width,
        height: processed.height,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) {
      await supabase.storage.from(BUCKET).remove([mainPath, thumbPath]);
      throw new Error(`Could not update image record: ${error?.message ?? "unknown"}`);
    }
    await removeUnreferencedFiles(supabase, [existing.storage_path]);
    return { image: data, replaced: true };
  }

  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      storage_path: mainPath,
      image_url: displayUrl,
      image_url_thumb: thumbUrl,
      role,
      alt_text: altText,
      display_order: role === "front" ? 0 : 1,
      width: processed.width,
      height: processed.height,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`Could not save image record: ${error?.message ?? "unknown"}`);
  return { image: data, replaced: false };
}

/** Deletes storage objects only when no product_images row still references them. */
export async function removeUnreferencedFiles(supabase: TypedSupabaseClient, paths: (string | null)[]): Promise<void> {
  const candidates = paths.filter((path): path is string => Boolean(path));
  if (candidates.length === 0) return;

  for (const path of candidates) {
    const { count, error } = await supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", path);
    if (error || (count ?? 0) > 0) continue;

    const objects = [path];
    if (path.endsWith(".jpg")) objects.push(path.replace(/\.jpg$/, "-thumb.jpg"));
    await supabase.storage.from(BUCKET).remove(objects);
  }
}
