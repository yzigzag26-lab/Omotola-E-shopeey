#!/usr/bin/env node
/** Shared helpers for maintenance scripts. Requires a service-role key — never run in the browser. */
import { createClient } from "@supabase/supabase-js";

export function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing environment variable(s): ${missing.join(", ")}`);
    console.error("Set them in your shell or .env.local. See .env.example and docs/SETUP.md.");
    process.exit(1);
  }
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;
  requireEnv(url ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]);
  requireEnv(key ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
