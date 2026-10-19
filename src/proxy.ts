import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "@/lib/env";

/**
 * Refreshes Supabase auth cookies and performs a cheap gate on admin sub-routes.
 * Real authorization happens server-side in every page/action via is_admin();
 * this only avoids rendering admin chrome for clearly anonymous visitors.
 *
 * This file used to be `src/middleware.ts`. Next.js 16 renamed the convention to
 * "proxy" and deprecates the old filename, so the export is `proxy` now.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const config = getPublicSupabaseConfig();
  if (!config) return response;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicAdminRoute =
    pathname === "/admin" ||
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password" ||
    pathname.startsWith("/auth/");

  if (pathname.startsWith("/admin") && !isPublicAdminRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
