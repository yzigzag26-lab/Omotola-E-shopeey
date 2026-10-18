/**
 * Supabase schema types for Corazon Empire.
 *
 * Hand-maintained to match supabase/migrations. Regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AvailabilityStatus = "available" | "temporarily_unavailable" | "made_to_order";
export type PublicationStatus = "draft" | "published" | "archived";
export type ImageRole = "front" | "back" | "additional";
export type OrderChannel = "whatsapp" | "email";
export type OrderStatus = "pending_review" | "confirmed" | "fulfilled" | "cancelled";
export type EmailStatus = "not_requested" | "pending" | "sent" | "failed" | "unavailable";
export type PromotionType = "percentage" | "fixed_amount" | "referral" | "free_delivery";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  price_kobo: number;
  currency: string;
  availability: AvailabilityStatus;
  status: PublicationStatus;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductImageRow = {
  id: string;
  product_id: string;
  storage_path: string | null;
  image_url: string;
  image_url_thumb: string | null;
  role: ImageRole;
  alt_text: string;
  display_order: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export type ProductVariantRow = {
  id: string;
  product_id: string;
  kind: string;
  value: string;
  display_order: number;
  is_available: boolean;
  created_at: string;
}

export type OrderRow = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  delivery_address: string;
  delivery_notes: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  subtotal_kobo: number;
  delivery_fee_kobo: number | null;
  total_kobo: number;
  currency: string;
  customer_notes: string | null;
  email_status: EmailStatus;
  email_error: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  variant: string | null;
  unit_price_kobo: number;
  quantity: number;
  line_total_kobo: number;
  created_at: string;
}

export type AnnouncementRow = {
  id: string;
  message: string;
  is_enabled: boolean;
  singleton: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type PromotionRow = {
  id: string;
  name: string;
  description: string | null;
  promotion_type: PromotionType;
  discount_value: number;
  start_at: string | null;
  end_at: string | null;
  is_enabled: boolean;
  is_public: boolean;
  eligibility: Json;
  referral_code: string | null;
  referral_reward_kobo: number | null;
  created_at: string;
  updated_at: string;
}

export type StoreSettingsRow = {
  id: boolean;
  store_name: string;
  support_email: string;
  whatsapp_number: string;
  currency: string;
  instagram_url: string | null;
  tiktok_url: string | null;
  tagline: string | null;
  updated_at: string;
}

export type AdminUserRow = {
  user_id: string;
  email: string;
  created_at: string;
}

type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      categories: Table<
        CategoryRow,
        Omit<CategoryRow, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<Omit<CategoryRow, "id" | "created_at">>
      >;
      products: Table<
        ProductRow,
        Omit<ProductRow, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<Omit<ProductRow, "id" | "created_at">>
      >;
      product_images: Table<
        ProductImageRow,
        Omit<ProductImageRow, "id" | "created_at"> & { id?: string },
        Partial<Omit<ProductImageRow, "id" | "created_at">>
      >;
      product_variants: Table<
        ProductVariantRow,
        Omit<ProductVariantRow, "id" | "created_at"> & { id?: string },
        Partial<Omit<ProductVariantRow, "id" | "created_at">>
      >;
      orders: Table<
        OrderRow,
        Omit<OrderRow, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<Omit<OrderRow, "id" | "created_at">>
      >;
      order_items: Table<
        OrderItemRow,
        Omit<OrderItemRow, "id" | "created_at"> & { id?: string },
        Partial<Omit<OrderItemRow, "id" | "created_at">>
      >;
      announcements: Table<
        AnnouncementRow,
        Omit<AnnouncementRow, "id" | "updated_at"> & { id?: string },
        Partial<Omit<AnnouncementRow, "id">>
      >;
      promotions: Table<
        PromotionRow,
        Omit<PromotionRow, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<Omit<PromotionRow, "id" | "created_at">>
      >;
      store_settings: Table<
        StoreSettingsRow,
        Omit<StoreSettingsRow, "updated_at">,
        Partial<Omit<StoreSettingsRow, "id">>
      >;
      admin_users: Table<AdminUserRow, Omit<AdminUserRow, "created_at">, Partial<Omit<AdminUserRow, "user_id">>>;
    };
    Views: Record<never, never>;
    Functions: {
      submit_order: { Args: { payload: Json }; Returns: Json };
      set_order_email_status: {
        Args: { p_order_id: string; p_status: EmailStatus; p_error?: string | null };
        Returns: undefined;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      availability_status: AvailabilityStatus;
      publication_status: PublicationStatus;
      image_role: ImageRole;
      order_channel: OrderChannel;
      order_status: OrderStatus;
      email_status: EmailStatus;
      promotion_type: PromotionType;
    };
    CompositeTypes: Record<never, never>;
  };
}
