import type {
  AnnouncementRow,
  CategoryRow,
  ProductImageRow,
  ProductRow,
  ProductVariantRow,
  PromotionRow,
  StoreSettingsRow,
  OrderItemRow,
  OrderRow,
} from "./supabase/database.types";

export type Category = CategoryRow;
export type Product = ProductRow;
export type ProductImage = ProductImageRow;
export type ProductVariant = ProductVariantRow;
export type Announcement = AnnouncementRow;
export type Promotion = PromotionRow;
export type StoreSettings = StoreSettingsRow;
export type Order = OrderRow;
export type OrderItem = OrderItemRow;

export type ProductWithRelations = Product & {
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

export type OrderWithItems = Order & { items: OrderItem[] };

/** Shape returned by the public.list_order_items RPC for a customer-facing order. */
export type OrderReceiptItem = {
  product_name: string;
  variant: string | null;
  unit_price_kobo: number;
  quantity: number;
  line_total_kobo: number;
};

export type OrderReceipt = {
  order_id: string;
  reference: string;
  channel: "whatsapp" | "email";
  subtotal_kobo: number;
  delivery_fee_kobo: number | null;
  total_kobo: number;
  items: OrderReceiptItem[];
};

export type DataResult<T> = {
  data: T;
  /** `offline` is only ever true when the sandbox/demo fallback is explicitly enabled. */
  source: "supabase" | "offline";
};

export function primaryImage(product: ProductWithRelations): ProductImage | null {
  const images = [...(product.images ?? [])].sort((a, b) => a.display_order - b.display_order);
  return images.find((image) => image.role === "front") ?? images[0] ?? null;
}
