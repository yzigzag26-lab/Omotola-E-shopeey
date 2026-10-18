import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { isOfflineFallbackEnabled } from "@/lib/env";
import {
  DEMO_ANNOUNCEMENT,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_SETTINGS,
} from "@/lib/demo/catalog";
import type {
  Announcement,
  Category,
  DataResult,
  ProductWithRelations,
  StoreSettings,
} from "@/lib/types";

const PRODUCT_SELECT = "*, category:categories(*), images:product_images(*), variants:product_variants(*)";

function sortRelations(product: ProductWithRelations): ProductWithRelations {
  return {
    ...product,
    images: [...(product.images ?? [])].sort((a, b) => a.display_order - b.display_order),
    variants: [...(product.variants ?? [])].sort((a, b) => {
      if (a.kind === b.kind) return a.display_order - b.display_order;
      return a.kind.localeCompare(b.kind);
    }),
  };
}

async function withFallback<T>(label: string, query: () => Promise<T>, fallback: () => T): Promise<DataResult<T>> {
  try {
    return { data: await query(), source: "supabase" };
  } catch (error) {
    if (isOfflineFallbackEnabled()) {
      console.warn(`[catalog] ${label} unavailable — serving bundled demo catalogue (offline preview).`);
      return { data: fallback(), source: "offline" };
    }
    throw error;
  }
}

export async function getActiveCategories(): Promise<DataResult<Category[]>> {
  return withFallback(
    "categories",
    async () => {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    () => DEMO_CATEGORIES,
  );
}

export async function getPublishedProducts(): Promise<DataResult<ProductWithRelations[]>> {
  return withFallback(
    "products",
    async () => {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as ProductWithRelations[]).map(sortRelations);
    },
    () => [...DEMO_PRODUCTS].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
  );
}

export async function getProductBySlug(slug: string): Promise<DataResult<ProductWithRelations | null>> {
  return withFallback(
    "product",
    async () => {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? sortRelations(data as unknown as ProductWithRelations) : null;
    },
    () => DEMO_PRODUCTS.find((product) => product.slug === slug) ?? null,
  );
}

export async function getCategoryBySlug(slug: string): Promise<DataResult<Category | null>> {
  return withFallback(
    "category",
    async () => {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    () => DEMO_CATEGORIES.find((category) => category.slug === slug) ?? null,
  );
}

export async function getProductsByCategory(categoryId: string): Promise<DataResult<ProductWithRelations[]>> {
  return withFallback(
    "products-by-category",
    async () => {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "published")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as ProductWithRelations[]).map(sortRelations);
    },
    () => DEMO_PRODUCTS.filter((product) => product.category_id === categoryId),
  );
}

export async function getAnnouncement(): Promise<DataResult<Announcement | null>> {
  return withFallback(
    "announcement",
    async () => {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_enabled", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    () => (DEMO_ANNOUNCEMENT.is_enabled ? DEMO_ANNOUNCEMENT : null),
  );
}

export async function getStoreSettings(): Promise<DataResult<StoreSettings>> {
  return withFallback(
    "store-settings",
    async () => {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? DEMO_SETTINGS;
    },
    () => DEMO_SETTINGS,
  );
}
