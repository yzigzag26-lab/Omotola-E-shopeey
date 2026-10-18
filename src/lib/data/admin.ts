/** Shared PostgREST select used by admin product queries. */
export const PRODUCT_SELECT = "*, category:categories(*), images:product_images(*), variants:product_variants(*)";
