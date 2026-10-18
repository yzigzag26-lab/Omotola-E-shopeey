import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, requirePublicSupabaseConfig } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service-role client. Never import this into client components.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured, so features
 * that depend on it degrade with an explicit message instead of crashing.
 */
export function createServiceSupabase(): SupabaseClient<Database> | null {
  const serviceKey = getServiceRoleKey();
  if (!serviceKey) return null;
  const { url } = requirePublicSupabaseConfig();
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
