import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Exchanges a Supabase auth code (password recovery, magic link) for a session.
 * Only relative, same-site destinations are accepted.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/admin/reset-password";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";

  if (!code) {
    return NextResponse.redirect(new URL("/admin/forgot-password?error=missing_code", url.origin));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/admin/forgot-password?error=invalid_link", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
