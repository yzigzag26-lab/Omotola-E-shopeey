import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type AdminSession = { supabase: TypedSupabaseClient; userId: string; email: string };

/**
 * Reads the current session and verifies administrator status against the
 * database (is_admin() checks the admin_users allow-list and JWT app_metadata).
 * Never trusts client-side state.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return null;

  return { supabase, userId: user.id, email: user.email ?? "" };
});

/** For pages: sends non-admins to the login screen. */
export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin");
  return session;
}

/** For server actions: throws so the action fails closed. */
export async function requireAdminAction(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authorised.");
  return session;
}
