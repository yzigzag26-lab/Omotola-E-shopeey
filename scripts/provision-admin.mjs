#!/usr/bin/env node
/**
 * Provisions (or updates) the administrator account using the Supabase Admin API.
 * The password is read from the environment and is never written to disk or logs.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   ADMIN_EMAIL=omojuli001@gmail.com ADMIN_INITIAL_PASSWORD='choose-a-strong-password' \
 *   npm run provision-admin
 */
import { adminClient, requireEnv } from "./_supabase.mjs";

async function main() {
  requireEnv(["ADMIN_EMAIL", "ADMIN_INITIAL_PASSWORD"]);
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (password.length < 8) {
    console.error("ADMIN_INITIAL_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const supabase = adminClient();

  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw new Error(listError.message);
  const user = existing.users.find((candidate) => candidate.email?.toLowerCase() === email);

  let userId;
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { ...(user.app_metadata ?? {}), role: "admin" },
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
    console.log(`Updated existing account ${email}.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
    console.log(`Created administrator ${email}.`);
  }

  const { error: allowError } = await supabase
    .from("admin_users")
    .upsert({ user_id: userId, email }, { onConflict: "user_id" });
  if (allowError) throw new Error(allowError.message);

  console.log("Administrator allow-list entry is present. Sign in at /admin and change the password.");
}

main().catch((error) => {
  console.error("\nProvisioning failed:", error.message);
  process.exit(1);
});
