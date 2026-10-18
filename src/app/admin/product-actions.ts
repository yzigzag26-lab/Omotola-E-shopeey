"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { parseNairaToKobo } from "@/lib/format/money";
import { isValidSlug, slugify } from "@/lib/format/slug";
import { uploadProductImage, removeUnreferencedFiles } from "@/lib/images/upload";
import { parseVariants, type ParsedVariant } from "@/lib/products/variants";

export type ProductFormState = { error: string | null; success: string | null };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name.").max(140),
  slug: z.string().trim().min(2, "Enter a slug.").max(80).refine(isValidSlug, "Slug may only contain lowercase letters, numbers and dashes."),
  category_id: z.string().uuid("Choose a category."),
  description: z.string().trim().min(10, "Write a short description.").max(6000),
  price: z.string().trim().min(1, "Enter a price."),
  availability: z.enum(["available", "temporarily_unavailable", "made_to_order"]),
  status: z.enum(["draft", "published", "archived"]),
  is_featured: z.boolean(),
  seo_title: optionalText(70),
  seo_description: optionalText(200),
  variants: optionalText(2000),
});

function revalidateStore(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  revalidatePath("/admin/images");
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/category/[slug]", "page");
}

async function replaceVariants(
  supabase: Awaited<ReturnType<typeof requireAdminAction>>["supabase"],
  productId: string,
  variants: ParsedVariant[],
): Promise<void> {
  const { error: deleteError } = await supabase.from("product_variants").delete().eq("product_id", productId);
  if (deleteError) throw new Error("Could not update options.");
  if (variants.length === 0) return;
  const rows = variants.map((variant, index) => ({
    product_id: productId,
    kind: variant.kind,
    value: variant.value,
    display_order: index,
    is_available: true,
  }));
  const { error } = await supabase.from("product_variants").insert(rows);
  if (error) throw new Error("Could not save options.");
}

export async function saveProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { supabase } = await requireAdminAction();
  const productId = String(formData.get("product_id") ?? "").trim() || null;

  const priceKobo = parseNairaToKobo(String(formData.get("price") ?? ""));
  if (priceKobo === null || priceKobo <= 0) return { error: "Enter a valid price in naira, e.g. 18500 or 18500.00.", success: null };

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: rawSlug || slugify(String(formData.get("name") ?? "")),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    price: String(formData.get("price") ?? ""),
    availability: formData.get("availability"),
    status: formData.get("status"),
    is_featured: formData.get("is_featured") === "on" || formData.get("is_featured") === "true",
    seo_title: formData.get("seo_title"),
    seo_description: formData.get("seo_description"),
    variants: formData.get("variants"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form.", success: null };
  }
  const input = parsed.data;
  const variants = parseVariants(input.variants);

  const payload = {
    name: input.name,
    slug: input.slug,
    category_id: input.category_id,
    description: input.description,
    price_kobo: priceKobo,
    availability: input.availability,
    status: input.status,
    is_featured: input.is_featured,
    seo_title: input.seo_title,
    seo_description: input.seo_description,
    currency: "NGN" as const,
  };

  let savedId = productId;
  let slug = input.slug;

  if (productId) {
    const { data, error } = await supabase.from("products").update(payload).eq("id", productId).select("id, slug").single();
    if (error) {
      return { error: error.code === "23505" ? "That slug is already used by another product." : "Could not save the product.", success: null };
    }
    savedId = data.id;
    slug = data.slug;
  } else {
    const { data, error } = await supabase.from("products").insert(payload).select("id, slug").single();
    if (error) {
      return { error: error.code === "23505" ? "That slug is already used by another product." : "Could not create the product.", success: null };
    }
    savedId = data.id;
    slug = data.slug;
  }

  if (!savedId) return { error: "Could not save the product.", success: null };

  try {
    await replaceVariants(supabase, savedId, variants);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save options.", success: null };
  }

  const front = formData.get("front_image");
  const back = formData.get("back_image");
  const additional = formData.getAll("additional_images");
  const uploadErrors: string[] = [];

  const uploads: { file: File; role: "front" | "back" | "additional" }[] = [];
  if (front instanceof File && front.size > 0) uploads.push({ file: front, role: "front" });
  if (back instanceof File && back.size > 0) uploads.push({ file: back, role: "back" });
  for (const file of additional) {
    if (file instanceof File && file.size > 0) uploads.push({ file, role: "additional" });
  }

  for (const upload of uploads) {
    try {
      await uploadProductImage({
        supabase,
        productId: savedId,
        file: upload.file,
        role: upload.role,
        altText: `${input.name} — ${upload.role} view`,
      });
    } catch (error) {
      uploadErrors.push(error instanceof Error ? error.message : "Image upload failed.");
    }
  }

  revalidateStore(slug);

  if (uploadErrors.length > 0) {
    return { error: `Product saved, but some images failed: ${uploadErrors.join(" ")}`, success: null };
  }
  if (productId) return { error: null, success: "Product saved and storefront updated." };
  redirect(`/admin/products/${savedId}?created=1`);
}

const imageIdSchema = z.object({ image_id: z.string().uuid(), product_id: z.string().uuid() });

export async function deleteProductImageAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const parsed = imageIdSchema.safeParse({ image_id: formData.get("image_id"), product_id: formData.get("product_id") });
  if (!parsed.success) return;

  const { data: image } = await supabase.from("product_images").select("*").eq("id", parsed.data.image_id).maybeSingle();
  if (!image) return;

  const { error } = await supabase.from("product_images").delete().eq("id", parsed.data.image_id);
  if (error) return;
  await removeUnreferencedFiles(supabase, [image.storage_path]);
  revalidatePath(`/admin/products/${parsed.data.product_id}`);
  revalidatePath("/admin/images");
}

export async function reorderProductImageAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const imageId = String(formData.get("image_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  if (!imageId || !productId || !["up", "down"].includes(direction)) return;

  const { data: images } = await supabase
    .from("product_images")
    .select("id, display_order")
    .eq("product_id", productId)
    .order("display_order", { ascending: true });
  if (!images || images.length < 2) return;

  const index = images.findIndex((image) => image.id === imageId);
  if (index < 0) return;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= images.length) return;

  const current = images[index];
  const target = images[targetIndex];
  if (!current || !target) return;

  await supabase.from("product_images").update({ display_order: target.display_order }).eq("id", current.id);
  await supabase.from("product_images").update({ display_order: current.display_order }).eq("id", target.id);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return;

  // Preserve historical order snapshots: order_items.product_id is ON DELETE SET NULL.
  const { data: images } = await supabase.from("product_images").select("storage_path").eq("product_id", productId);
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return;
  await removeUnreferencedFiles(supabase, (images ?? []).map((image) => image.storage_path));
  revalidateStore();
  redirect("/admin/products?deleted=1");
}

export async function setProductStatusAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const productId = String(formData.get("product_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!productId || !["draft", "published", "archived"].includes(status)) return;
  const { data } = await supabase
    .from("products")
    .update({ status: status as "draft" | "published" | "archived" })
    .eq("id", productId)
    .select("slug")
    .maybeSingle();
  revalidateStore(data?.slug);
  revalidatePath(`/admin/products/${productId}`);
}

export async function setProductAvailabilityAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const productId = String(formData.get("product_id") ?? "");
  const availability = String(formData.get("availability") ?? "");
  if (!productId || !["available", "temporarily_unavailable", "made_to_order"].includes(availability)) return;
  const { data } = await supabase
    .from("products")
    .update({ availability: availability as "available" | "temporarily_unavailable" | "made_to_order" })
    .eq("id", productId)
    .select("slug")
    .maybeSingle();
  revalidateStore(data?.slug);
  revalidatePath(`/admin/products/${productId}`);
}
