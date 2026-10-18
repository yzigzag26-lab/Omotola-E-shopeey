#!/usr/bin/env node
/**
 * Builds supabase/setup.sql — the four migrations, the demo seed, the
 * administrator grant and the verification queries stitched into one file that
 * can be pasted into the Supabase SQL Editor in a single go.
 *
 * The sources are included verbatim, in order. Nothing here rewrites SQL: if a
 * migration changes, re-run this script. tests/setup-sql.test.ts fails when the
 * committed file no longer matches the sources, so the two cannot drift apart.
 *
 *   node scripts/build-setup-sql.mjs          # write supabase/setup.sql
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");

export const SETUP_SQL_RELATIVE_PATH = "supabase/setup.sql";

export const ADMIN_EMAIL = "omojuli001@gmail.com";

/** Migration and seed files, in the only order that works. */
export const SOURCES = [
  {
    title: "STEP 1 of 3 — schema part 1/3: extensions, enums, tables, triggers, indexes",
    relativePath: "supabase/migrations/20261018000100_schema_tables.sql",
  },
  {
    title: "STEP 1 of 3 — schema part 2/3: transactional order functions",
    relativePath: "supabase/migrations/20261018000200_order_functions.sql",
  },
  {
    title: "STEP 1 of 3 — schema part 3/3: RLS, storage policies, singleton rows",
    relativePath: "supabase/migrations/20261018000300_rls_storage_seed.sql",
  },
  {
    title: "STEP 1 of 3 — explicit table and function privileges",
    relativePath: "supabase/migrations/20261018000400_grants.sql",
  },
  {
    title: "STEP 1 of 3 — demo catalogue seed (8 categories, 8 products, 16 images, 13 variants)",
    relativePath: "supabase/seed/seed-apply.sql",
  },
];

const RULE = `-- ${"=".repeat(76)}`;

const countLines = (text) => text.trimEnd().split("\n").length;

function banner(title, relativePath, lineCount) {
  return [
    RULE,
    `-- ${title}`,
    `-- source: ${relativePath} (${lineCount} lines)`,
    RULE,
  ].join("\n");
}

/**
 * The administrator block. Deliberately does not create the auth user: writing
 * to auth.users from SQL depends on Supabase's internal auth schema, which
 * changes between versions. It grants the allow-list row and the JWT claim for
 * a user that already exists, and explains how to create one when it does not.
 */
const ADMIN_BLOCK = `-- ${"=".repeat(76)}
-- STEP 2 of 3 — administrator
-- The application treats a signed-in user as an administrator when EITHER a
-- row exists in public.admin_users OR the JWT's app_metadata.role is 'admin'.
-- This block satisfies both. It is idempotent and safe to run on its own.
--
-- This block does NOT create the auth user. Create it first if needed:
--   Authentication -> Users -> Add user
--   email: ${ADMIN_EMAIL}   password: your own strong password
--   "Auto Confirm User": on
-- then run this block again.
-- ${"=".repeat(76)}
do $$
declare
  c_admin_email constant text := '${ADMIN_EMAIL}';
  v_user_id uuid;
begin
  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = c_admin_email;

  if v_user_id is null then
    raise notice 'No auth user exists for %. Create it in Authentication > Users > Add user (auto-confirm on), then re-run this STEP 2 block. Everything else in this file has already been applied.', c_admin_email;
    return;
  end if;

  -- Allow-list row read by private.is_admin(). This is the primary check.
  insert into public.admin_users (user_id, email)
  values (v_user_id, c_admin_email)
  on conflict (user_id) do update set email = excluded.email;

  raise notice 'Administrator allow-list row present for % (%).', c_admin_email, v_user_id;
end $$;

-- Second, independent block: the JWT claim. Kept separate and error-tolerant so
-- that a host that restricts writes to auth.users still leaves the allow-list
-- row above in place — either check alone grants administrator access.
do $$
declare
  c_admin_email constant text := '${ADMIN_EMAIL}';
  v_user_id uuid;
begin
  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = c_admin_email;
  if v_user_id is null then
    return; -- the notice above already explained what to do
  end if;

  -- app_metadata is server-owned, so a user cannot promote themselves by
  -- editing user_metadata. Email is confirmed so the first sign-in works.
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', 'admin'),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = v_user_id;

  raise notice 'app_metadata.role = admin set on %. Sign in at /admin and change the password.', c_admin_email;
exception when others then
  raise notice 'Could not set app_metadata.role directly (%). The admin_users row is enough for access; set the role in Authentication > Users if you also want the JWT claim.', sqlerrm;
end $$;`;

/**
 * Read-only verification. Every check is a separate result set so the SQL
 * Editor's "last result" view never hides a failure behind a success.
 */
const VERIFICATION_BLOCK = `-- ${"=".repeat(76)}
-- STEP 3 of 3 — verification (read-only; run any time)
-- ${"=".repeat(76)}

-- 3.1 Catalogue counts. Expected: 8, 8, 16, 13, 1, 1, and admin_users 0 or 1.
select
  (select count(*) from public.categories) as categories,
  (select count(*) from public.products) as products,
  (select count(*) from public.product_images) as product_images,
  (select count(*) from public.product_variants) as product_variants,
  (select count(*) from public.announcements where is_enabled) as enabled_announcements,
  (select count(*) from public.store_settings) as store_settings,
  (select count(*) from public.admin_users) as admin_users;

-- 3.2 Storage bucket. Expected: exactly one row with public = true.
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id = 'product-images';

-- 3.3 Row Level Security coverage. Expected: ZERO rows.
select schemaname, tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
   and not rowsecurity;

-- 3.4 Order and helper functions. Expected: both function names present.
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('submit_order', 'set_order_email_status', 'is_admin')
 order by 1;

-- 3.5 Anonymous privileges. Expected: every column false.
select has_table_privilege('anon', 'public.orders', 'select') as anon_can_select_orders,
       has_table_privilege('anon', 'public.order_items', 'select') as anon_can_select_order_items,
       has_table_privilege('anon', 'public.admin_users', 'select') as anon_can_select_admin_users;

-- 3.6 Anonymous RLS policies on customer tables. Expected: ZERO rows.
select tablename, policyname, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('orders', 'order_items')
   and 'anon' = any (roles);

-- 3.7 One-line summary. Expected: every column true.
select
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) = 0
    as rls_enabled_on_every_public_table,
  (select count(*) from storage.buckets where id = 'product-images' and public) = 1
    as product_images_bucket_is_public,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('submit_order', 'set_order_email_status')) = 2
    as order_functions_present,
  not has_table_privilege('anon', 'public.orders', 'select')
    as anon_cannot_select_orders,
  not has_table_privilege('anon', 'public.order_items', 'select')
    as anon_cannot_select_order_items,
  not has_table_privilege('anon', 'public.admin_users', 'select')
    as anon_cannot_select_admin_users;`;

function header(entries) {
  const width = Math.max(...entries.map((entry) => entry.relativePath.length));
  const listing = entries
    .map((entry) => `--   ${entry.relativePath.padEnd(width)}  ${entry.lineCount} lines`)
    .join("\n");

  return `${RULE}
-- Corazon Empire — complete database setup in one paste
-- ${"=".repeat(76)}
-- GENERATED FILE — do not edit by hand. Regenerate with: npm run setup:sql
--
-- Sources, included verbatim and in this order:
${listing}
--
-- A test (tests/setup-sql.test.ts) fails if this file and those sources
-- disagree, so this copy cannot silently go stale.
--
-- HOW TO RUN
--   1. Supabase dashboard -> SQL Editor -> New query.
--   2. Paste this entire file. Press Run.
--   3. If STEP 2 raised a notice that the administrator does not exist yet,
--      create the user in Authentication -> Users -> Add user and run the
--      STEP 2 block again.
--   Every statement is written to be idempotent, so re-running the whole file
--   is safe. Statements run outside a single transaction: if one fails, read
--   the exact error before changing anything.
--
-- WHY STEP 2 DOES NOT CREATE THE AUTH USER
--   Direct writes to Supabase's auth.users are version-dependent and skip the
--   identity records the auth service expects. The dashboard path is the one
--   Supabase supports. The admin_users row and app_metadata claim this file
--   writes are the same either way.
-- ${"=".repeat(76)}`;
}

/**
 * Builds the full file from the sources on disk.
 * @param {string} root repository root
 * @returns {string}
 */
export function buildSetupSql(root = ROOT) {
  const entries = SOURCES.map((source) => {
    const text = readFileSync(path.join(root, source.relativePath), "utf8").trim();
    return { ...source, text, lineCount: countLines(text) };
  });

  const parts = [header(entries)];

  for (const entry of entries) {
    parts.push(banner(entry.title, entry.relativePath, entry.lineCount));
    parts.push(entry.text);
  }

  parts.push(ADMIN_BLOCK);
  parts.push(VERIFICATION_BLOCK);

  return `${parts.join("\n\n")}\n`;
}

const shorten = (line) => (line === undefined ? "<end of file>" : line.length > 120 ? `${line.slice(0, 117)}...` : line);

/**
 * Returns null when the committed file matches the sources, otherwise a
 * one-line explanation naming the first difference. Exported so the test can
 * prove the detector actually fires (a check that can only pass proves
 * nothing).
 * @param {string} expected
 * @param {string} actual
 * @returns {string | null}
 */
export function driftDescription(expected, actual) {
  if (expected === actual) return null;

  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const total = Math.max(expectedLines.length, actualLines.length);

  for (let index = 0; index < total; index += 1) {
    if (expectedLines[index] !== actualLines[index]) {
      return (
        `supabase/setup.sql is out of date at line ${index + 1}: ` +
        `expected ${JSON.stringify(shorten(expectedLines[index]))} but found ` +
        `${JSON.stringify(shorten(actualLines[index]))}. Run "npm run setup:sql".`
      );
    }
  }

  return 'supabase/setup.sql is out of date. Run "npm run setup:sql".';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sql = buildSetupSql();
  writeFileSync(path.join(ROOT, SETUP_SQL_RELATIVE_PATH), sql, "utf8");
  console.log(
    `wrote ${SETUP_SQL_RELATIVE_PATH}: ${sql.split("\n").length} lines from ${SOURCES.length} sources`,
  );
}
