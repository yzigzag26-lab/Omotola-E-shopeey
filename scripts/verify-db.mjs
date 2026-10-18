#!/usr/bin/env node
/**
 * Read-only production sanity check. Confirms the schema, seed counts, storage
 * bucket and (via RLS-protected REST calls) that anonymous clients cannot read
 * customer orders. Requires the service-role key.
 */
import { adminClient, requireEnv } from "./_supabase.mjs";

async function main() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const supabase = adminClient();
  const checks = [];

  const tables = [
    "categories",
    "products",
    "product_images",
    "product_variants",
    "orders",
    "order_items",
    "announcements",
    "promotions",
    "store_settings",
    "admin_users",
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    checks.push({ check: `table ${table}`, status: error ? `ERROR: ${error.message}` : `ok (${count ?? 0} rows)` });
  }

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket("product-images");
  checks.push({
    check: "storage bucket product-images",
    status: bucketError ? `ERROR: ${bucketError.message}` : `ok (public=${bucket.public}, limit=${bucket.file_size_limit})`,
  });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anon) {
    const response = await fetch(`${base}/rest/v1/orders?select=id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    checks.push({
      check: "anonymous orders access blocked",
      status: response.ok ? "FAILED — anon could read orders" : `ok (HTTP ${response.status})`,
    });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("store_settings")
    .select("store_name, whatsapp_number")
    .eq("id", true)
    .maybeSingle();
  checks.push({
    check: "store settings row",
    status: settingsError ? `ERROR: ${settingsError.message}` : settings ? `ok (${settings.store_name})` : "missing",
  });

  const { data: announcement } = await supabase
    .from("announcements")
    .select("is_enabled")
    .eq("singleton", true)
    .maybeSingle();
  checks.push({ check: "single announcement row", status: announcement ? `ok (enabled=${announcement.is_enabled})` : "missing" });

  let failures = 0;
  for (const item of checks) {
    if (!item.status.startsWith("ok")) failures += 1;
    console.log(`${item.status.startsWith("ok") ? "✓" : "✗"} ${item.check}: ${item.status}`);
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) need attention.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Verification failed:", error.message);
  process.exit(1);
});
