import type { MetadataRoute } from "next";
import { getActiveCategories, getPublishedProducts } from "@/lib/data/catalog";
import { getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticRoutes = ["", "/shop", "/about", "/contact", "/privacy", "/terms"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  try {
    const [categories, products] = await Promise.all([getActiveCategories(), getPublishedProducts()]);
    return [
      ...staticRoutes,
      ...categories.data.map((category) => ({
        url: `${base}/category/${category.slug}`,
        lastModified: new Date(category.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...products.data.map((product) => ({
        url: `${base}/product/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
