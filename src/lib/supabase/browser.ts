"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Browser client for the public publishable key only.
 * The storefront avoids client-side database access; this exists for optional
 * progressive features and never receives a service-role key.
 */
export function getBrowserSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase browser configuration is missing.");
  client = createBrowserClient<Database>(url, key);
  return client;
}
