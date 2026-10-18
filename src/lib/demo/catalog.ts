import rawCatalog from "../../../supabase/seed/demo-catalog.json";
import type { Announcement, Category, ProductWithRelations, StoreSettings } from "@/lib/types";

/**
 * Bundled demo catalogue.
 *
 * This is the SAME seed file used by `npm run seed` to populate Supabase, and it
 * is only rendered when the storefront cannot reach Supabase AND the operator
 * explicitly sets DEMO_OFFLINE_FALLBACK=1 (sandbox previews). Every page that uses
 * it shows a visible "offline preview" notice; mutations never use it.
 */

type RawImage = { id: string; role: "front" | "back" | "additional"; file: string; alt: string };
type RawVariant = { kind: string; value: string };
type RawProduct = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  price_kobo: number;
  description: string;
  availability: ProductWithRelations["availability"];
  status: ProductWithRelations["status"];
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  variants: RawVariant[];
  images: RawImage[];
};
type RawCatalog = {
  categories: { id: string; slug: string; name: string; description: string; display_order: number; is_active: boolean }[];
  products: RawProduct[];
  announcement: { id: string; message: string; is_enabled: boolean };
  store_settings: Omit<StoreSettings, "id" | "updated_at">;
};

const catalog = rawCatalog as unknown as RawCatalog;
const SEED_DATE = "2026-10-01T09:00:00.000Z";

// Each demo product ships a front photograph plus a second gallery view. Where a true
// back-view photograph is not available, the second image is an honestly labelled detail
// crop of the front shot and can be replaced through Admin → Product images.
export const DEMO_CATEGORIES: Category[] = catalog.categories.map((category) => ({
  ...category,
  description: category.description,
  created_at: SEED_DATE,
  updated_at: SEED_DATE,
}));

export const DEMO_PRODUCTS: ProductWithRelations[] = catalog.products.map((product, index) => {
  const category = DEMO_CATEGORIES.find((item) => item.id === product.category_id) ?? null;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category_id: product.category_id,
    price_kobo: product.price_kobo,
    currency: "NGN",
    availability: product.availability,
    status: product.status,
    is_featured: product.is_featured,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    created_at: new Date(Date.parse(SEED_DATE) + index * 86_400_000).toISOString(),
    updated_at: SEED_DATE,
    category,
    images: product.images.map((image, imageIndex) => ({
      id: image.id,
      product_id: product.id,
      storage_path: null,
      image_url: `/products/${image.file}.jpg`,
      image_url_thumb: `/products/${image.file}-thumb.jpg`,
      role: image.role,
      alt_text: image.alt,
      display_order: imageIndex,
      width: 1600,
      height: 2000,
      created_at: SEED_DATE,
    })),
    variants: product.variants.map((variant, variantIndex) => ({
      id: `f0000000-0000-4000-8000-${String(index * 10 + variantIndex + 1).padStart(12, "0")}`,
      product_id: product.id,
      kind: variant.kind,
      value: variant.value,
      display_order: variantIndex,
      is_available: true,
      created_at: SEED_DATE,
    })),
  };
});

export const DEMO_ANNOUNCEMENT: Announcement = {
  id: catalog.announcement.id,
  message: catalog.announcement.message,
  is_enabled: catalog.announcement.is_enabled,
  singleton: true,
  updated_at: SEED_DATE,
  updated_by: null,
};

export const DEMO_SETTINGS: StoreSettings = {
  ...catalog.store_settings,
  id: true,
  updated_at: SEED_DATE,
};
