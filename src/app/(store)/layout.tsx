import { unstable_rethrow } from "next/navigation";
import { CartProvider } from "@/components/storefront/cart-provider";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { AnnouncementMarquee } from "@/components/storefront/announcement-marquee";
import { OfflineNotice } from "@/components/storefront/offline-notice";
import { getAnnouncement } from "@/lib/data/catalog";

/**
 * The announcement is read through the cookie-aware Supabase client, so every
 * storefront route is request-time by definition. Declaring it here stops Next
 * from attempting a static prerender it can only abandon, which used to fill
 * the build log with "couldn't be rendered statically because it used cookies".
 */
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let announcement = null;
  let source: "supabase" | "offline" = "supabase";
  try {
    const result = await getAnnouncement();
    announcement = result.data;
    source = result.source;
  } catch (error) {
    // Next.js uses thrown errors for control flow (redirect, notFound, dynamic
    // usage). Never swallow those — only the announcement query may fail softly.
    unstable_rethrow(error);
    // Storefront chrome must still render if the announcement query fails.
    console.error("[store-layout] announcement unavailable", error instanceof Error ? error.message : "unknown");
  }

  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <OfflineNotice source={source} />
      <AnnouncementMarquee announcement={announcement} />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
