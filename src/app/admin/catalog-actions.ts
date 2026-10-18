"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth/admin";
import { isValidSlug, slugify } from "@/lib/format/slug";
import { parseNairaToKobo } from "@/lib/format/money";

export type FormState = { error: string | null; success: string | null };

const emptyToNull = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : null));

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("category_id") ?? "").trim() || null;

  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter a category name.").max(80),
      slug: z.string().trim().min(2).max(80).refine(isValidSlug, "Use lowercase letters, numbers and dashes only."),
      description: z.string().trim().max(1000).optional(),
      display_order: z.coerce.number().int().min(0).max(999),
      is_active: z.boolean(),
    })
    .safeParse({
      name: formData.get("name"),
      slug: String(formData.get("slug") ?? "") || slugify(String(formData.get("name") ?? "")),
      description: formData.get("description"),
      display_order: formData.get("display_order") ?? 0,
      is_active: formData.get("is_active") === "on",
    });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", success: null };
  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description?.trim() || null,
    display_order: parsed.data.display_order,
    is_active: parsed.data.is_active,
  };

  const { error } = id
    ? await supabase.from("categories").update(payload).eq("id", id)
    : await supabase.from("categories").insert(payload);

  if (error) {
    return { error: error.code === "23505" ? "That category slug already exists." : "Could not save the category.", success: null };
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/admin/categories");
  return { error: null, success: "Category saved." };
}

export async function toggleCategoryAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("category_id") ?? "");
  const next = formData.get("is_active") === "true";
  if (!id) return;
  await supabase.from("categories").update({ is_active: !next }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/categories");
}

export async function saveAnnouncementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireAdminAction();
  const message = String(formData.get("message") ?? "").trim();
  const isEnabled = formData.get("is_enabled") === "on";

  if (!message || message.length > 280) {
    return { error: "Write a message between 1 and 280 characters.", success: null };
  }

  const { data: existing } = await supabase.from("announcements").select("id").eq("singleton", true).maybeSingle();
  const payload = { message, is_enabled: isEnabled, updated_by: userId, singleton: true };

  const { error } = existing
    ? await supabase.from("announcements").update(payload).eq("id", existing.id)
    : await supabase.from("announcements").insert(payload);

  if (error) return { error: "Could not save the announcement.", success: null };

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/announcements");
  return { error: null, success: isEnabled ? "Announcement updated and live." : "Announcement saved (disabled)." };
}

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdminAction();

  const parsed = z
    .object({
      store_name: z.string().trim().min(2).max(80),
      support_email: z.string().trim().email("Enter a valid support email.").max(254),
      whatsapp_number: z.string().trim().regex(/^\d{8,15}$/, "Use digits only, including country code, e.g. 2348071334513."),
      tagline: emptyToNull,
      instagram_url: z.string().trim().url("Enter a full URL.").max(300).optional().or(z.literal("").transform(() => undefined)),
      tiktok_url: z.string().trim().url("Enter a full URL.").max(300).optional().or(z.literal("").transform(() => undefined)),
    })
    .safeParse({
      store_name: formData.get("store_name"),
      support_email: formData.get("support_email"),
      whatsapp_number: formData.get("whatsapp_number"),
      tagline: formData.get("tagline"),
      instagram_url: formData.get("instagram_url"),
      tiktok_url: formData.get("tiktok_url"),
    });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", success: null };

  const { error } = await supabase
    .from("store_settings")
    .update({
      store_name: parsed.data.store_name,
      support_email: parsed.data.support_email,
      whatsapp_number: parsed.data.whatsapp_number,
      tagline: parsed.data.tagline,
      instagram_url: parsed.data.instagram_url ?? null,
      tiktok_url: parsed.data.tiktok_url ?? null,
    })
    .eq("id", true);

  if (error) return { error: "Could not save settings.", success: null };
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { error: null, success: "Store settings saved." };
}

const promotionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  promotion_type: z.enum(["percentage", "fixed_amount", "referral", "free_delivery"]),
  discount_value: z.coerce.number().int().min(0),
  start_at: z.string().trim().optional(),
  end_at: z.string().trim().optional(),
  is_enabled: z.boolean(),
  is_public: z.boolean(),
  referral_code: z.string().trim().max(40).optional(),
});

export async function savePromotionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("promotion_id") ?? "").trim() || null;

  const parsed = promotionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    promotion_type: formData.get("promotion_type"),
    discount_value: formData.get("discount_value") ?? 0,
    start_at: formData.get("start_at"),
    end_at: formData.get("end_at"),
    is_enabled: formData.get("is_enabled") === "on",
    is_public: formData.get("is_public") === "on",
    referral_code: formData.get("referral_code"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", success: null };
  if (parsed.data.is_enabled && parsed.data.is_public) {
    return {
      error: "Enabling a public promotion activates it on the storefront. This release intentionally has no campaign display — keep promotions disabled for launch.",
      success: null,
    };
  }

  const payload = {
    name: parsed.data.name,
    description: parsed.data.description?.trim() || null,
    promotion_type: parsed.data.promotion_type,
    discount_value: parsed.data.discount_value,
    start_at: parsed.data.start_at ? new Date(parsed.data.start_at).toISOString() : null,
    end_at: parsed.data.end_at ? new Date(parsed.data.end_at).toISOString() : null,
    is_enabled: parsed.data.is_enabled,
    is_public: parsed.data.is_public,
    referral_code: parsed.data.referral_code?.trim() || null,
    eligibility: {},
    referral_reward_kobo: null,
  };

  const { error } = id
    ? await supabase.from("promotions").update(payload).eq("id", id)
    : await supabase.from("promotions").insert(payload);

  if (error) return { error: "Could not save the promotion.", success: null };
  revalidatePath("/admin/promotions");
  return { error: null, success: "Promotion saved (inactive unless both enabled and public)." };
}

export async function deletePromotionAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdminAction();
  const id = String(formData.get("promotion_id") ?? "");
  if (!id) return;
  await supabase.from("promotions").delete().eq("id", id);
  revalidatePath("/admin/promotions");
}

const orderUpdateSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["pending_review", "confirmed", "fulfilled", "cancelled"]),
  delivery_fee: z.string().trim().optional(),
});

export async function updateOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdminAction();
  const parsed = orderUpdateSchema.safeParse({
    order_id: formData.get("order_id"),
    status: formData.get("status"),
    delivery_fee: formData.get("delivery_fee"),
  });
  if (!parsed.success) return { error: "Check the order details.", success: null };

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, subtotal_kobo, delivery_fee_kobo")
    .eq("id", parsed.data.order_id)
    .maybeSingle();
  if (fetchError || !order) return { error: "Order not found.", success: null };

  let feeKobo = order.delivery_fee_kobo;
  const rawFee = parsed.data.delivery_fee?.replace(/,/g, "").trim() ?? "";
  if (rawFee !== "") {
    const parsedFee = parseNairaToKobo(rawFee);
    if (parsedFee === null) return { error: "Enter a valid delivery fee in naira, or leave it blank.", success: null };
    feeKobo = parsedFee;
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: parsed.data.status,
      delivery_fee_kobo: feeKobo,
      total_kobo: order.subtotal_kobo + (feeKobo ?? 0),
    })
    .eq("id", parsed.data.order_id);

  if (error) return { error: "Could not update the order.", success: null };
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.order_id}`);
  return { error: null, success: "Order updated." };
}
