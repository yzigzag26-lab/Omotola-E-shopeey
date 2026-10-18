import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseConfig } from "@/lib/env";
import type { Database } from "./database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Request-scoped Supabase client that carries the visitor's session cookies.
 * Used for both public reads (RLS: anon) and admin actions (RLS: authenticated admin).
 */
export async function createServerSupabase(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = requirePublicSupabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled by Server Actions / Route Handlers.
        }
      },
    },
  });
}
