import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { describe, expect, it } from "vitest";

/**
 * Runs supabase/setup.sql against a real PostgreSQL 17 (compiled to WebAssembly)
 * with the parts of a Supabase project the file touches stubbed in: the anon /
 * authenticated / service_role roles, the auth schema with auth.users, auth.uid()
 * and auth.jwt(), and the storage schema. Supabase's default privileges are
 * reproduced too, because they are what makes the explicit REVOKEs in migration 4
 * necessary.
 *
 * This is the test that would have caught "the paste fails at statement 200".
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const SETUP_SQL = readFileSync(path.join(ROOT, "supabase/setup.sql"), "utf8");
const ADMIN_EMAIL = "omojuli001@gmail.com";

const STEP_TWO = SETUP_SQL.slice(SETUP_SQL.indexOf("-- STEP 2 of 3"), SETUP_SQL.indexOf("-- STEP 3 of 3"));
const STEP_THREE = SETUP_SQL.slice(SETUP_SQL.indexOf("-- STEP 3 of 3"));

const SCAFFOLD = `
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  email_confirmed_at timestamptz,
  updated_at timestamptz default now()
);

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;

-- Supabase grants ALL on new public/storage tables and functions to the API
-- roles by default. Keeping that behaviour makes the revokes in migration 4
-- meaningful instead of vacuous.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema storage grant all on tables to anon, authenticated, service_role;
grant usage on schema public, storage, extensions to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
`;

type Row = Record<string, unknown>;

async function openDatabase(withAdminUser: boolean): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.waitReady;
  await db.exec(SCAFFOLD);
  if (withAdminUser) {
    await db.exec(`insert into auth.users (email) values ('${ADMIN_EMAIL}')`);
  }
  return db;
}

async function one(db: PGlite, sql: string, params?: unknown[]): Promise<Row | undefined> {
  const { rows } = await db.query<Row>(sql, params);
  return rows[0];
}

/** Runs `statement` as `role` and reports whether PostgreSQL refused it. */
async function deniedFor(db: PGlite, role: string, statement: string): Promise<boolean> {
  await db.exec(`set role ${role}`);
  try {
    await db.exec(statement);
    return false;
  } catch {
    return true;
  } finally {
    await db.exec("reset role");
  }
}

describe("setup.sql executes on PostgreSQL 17", () => {
  it(
    "applies cleanly, is idempotent, and leaves the documented state",
    async () => {
      const db = await openDatabase(true);
      try {
        await db.exec(SETUP_SQL);
        await db.exec(SETUP_SQL); // second run must not fail or duplicate

        const counts = await one(
          db,
          `select (select count(*) from public.categories) as categories,
                  (select count(*) from public.products) as products,
                  (select count(*) from public.product_images) as images,
                  (select count(*) from public.product_variants) as variants,
                  (select count(*) from public.announcements) as announcements,
                  (select count(*) from public.store_settings) as settings,
                  (select count(*) from public.admin_users) as admins`,
        );
        expect(counts).toEqual({
          categories: 8,
          products: 8,
          images: 16,
          variants: 13,
          announcements: 1,
          settings: 1,
          admins: 1,
        });

        const bucket = await one(db, `select public from storage.buckets where id = 'product-images'`);
        expect(bucket?.public).toBe(true);

        const unprotected = await db.query(
          `select tablename from pg_tables where schemaname = 'public' and not rowsecurity`,
        );
        expect(unprotected.rows).toEqual([]);

        const privileges = await one(
          db,
          `select has_table_privilege('anon', 'public.orders', 'select') as anon_orders_select,
                  has_table_privilege('anon', 'public.orders', 'insert') as anon_orders_insert,
                  has_table_privilege('anon', 'public.orders', 'update') as anon_orders_update,
                  has_table_privilege('anon', 'public.orders', 'delete') as anon_orders_delete,
                  has_table_privilege('anon', 'public.order_items', 'select') as anon_items_select,
                  has_table_privilege('anon', 'public.admin_users', 'select') as anon_admins_select,
                  has_table_privilege('anon', 'public.products', 'select') as anon_products_select,
                  has_table_privilege('authenticated', 'public.orders', 'select') as admin_orders_select,
                  has_table_privilege('authenticated', 'public.orders', 'update') as admin_orders_update,
                  has_table_privilege('authenticated', 'public.orders', 'insert') as admin_orders_insert,
                  has_table_privilege('authenticated', 'public.orders', 'delete') as admin_orders_delete,
                  has_table_privilege('authenticated', 'public.order_items', 'insert') as admin_items_insert,
                  has_function_privilege('anon', 'public.submit_order(jsonb)', 'execute') as anon_submit_order,
                  has_function_privilege('anon', 'public.set_order_email_status(uuid,public.email_status,text)', 'execute') as anon_set_email,
                  has_function_privilege('service_role', 'public.set_order_email_status(uuid,public.email_status,text)', 'execute') as service_set_email`,
        );
        expect(privileges).toEqual({
          anon_orders_select: false,
          anon_orders_insert: false,
          anon_orders_update: false,
          anon_orders_delete: false,
          anon_items_select: false,
          anon_admins_select: false,
          anon_products_select: true,
          admin_orders_select: true,
          admin_orders_update: true, // the dashboard changes status and delivery fee
          admin_orders_insert: false,
          admin_orders_delete: false,
          admin_items_insert: false,
          anon_submit_order: true, // checkout runs as anon
          anon_set_email: false,
          service_set_email: true,
        });

        expect(await deniedFor(db, "anon", "select count(*) from public.orders")).toBe(true);
        expect(await deniedFor(db, "anon", "select count(*) from public.order_items")).toBe(true);
        expect(await deniedFor(db, "anon", "select count(*) from public.admin_users")).toBe(true);
        expect(await deniedFor(db, "anon", "select count(*) from public.products")).toBe(false);

        const admin = await one(
          db,
          `select u.id, u.raw_app_meta_data as metadata, u.email_confirmed_at is not null as confirmed
             from auth.users u join public.admin_users au on au.user_id = u.id
            where u.email = '${ADMIN_EMAIL}'`,
        );
        expect(admin?.confirmed).toBe(true);
        expect(admin?.metadata).toEqual({ role: "admin" });

        await db.exec(
          `select set_config('request.jwt.claims', '${JSON.stringify({ sub: admin?.id, app_metadata: { role: "admin" } })}', false)`,
        );
        expect((await one(db, "select public.is_admin() as ok"))?.ok).toBe(true);

        await db.exec(`select set_config('request.jwt.claims', '{}', false)`);
        expect((await one(db, "select public.is_admin() as ok"))?.ok).toBe(false);
        expect(await deniedFor(db, "anon", "select public.is_admin()")).toBe(false);

        // The admin order-update path the dashboard uses.
        const submitted = await one(db, `select public.submit_order($1::jsonb) as result`, [
          JSON.stringify({
            customer_name: "Test Buyer",
            customer_phone: "08071234567",
            delivery_address: "1 Test Street, Lagos",
            channel: "whatsapp",
            items: [{ product_id: "d0000000-0000-4000-8000-000000000001", quantity: 2 }],
            idempotency_key: "setup-sql-test-0001",
          }),
        ]);
        const order = submitted?.result as { order_id?: string; subtotal_kobo?: number } | undefined;
        expect(order?.subtotal_kobo).toBe(3_700_000); // 2 x 1,850,000 — priced inside the function

        await db.exec(
          `select set_config('request.jwt.claims', '${JSON.stringify({ sub: admin?.id, app_metadata: { role: "admin" } })}', false)`,
        );
        await db.exec("set role authenticated");
        await db.exec(
          `update public.orders set status = 'confirmed', delivery_fee_kobo = 150000,
                  total_kobo = subtotal_kobo + 150000 where id = '${order?.order_id}'`,
        );
        await db.exec("reset role");
        const updated = await one(db, `select status, total_kobo from public.orders where id = '${order?.order_id}'`);
        expect(updated).toEqual({ status: "confirmed", total_kobo: 3_850_000 });
      } finally {
        await db.close();
      }
    },
    180_000,
  );

  it(
    "completes without an administrator and grants it when STEP 2 is re-run",
    async () => {
      const db = await openDatabase(false);
      try {
        await db.exec(SETUP_SQL); // must not fail just because the auth user is missing
        const before = await one(
          db,
          `select (select count(*) from public.admin_users) as admins,
                  (select count(*) from public.products) as products`,
        );
        expect(before).toEqual({ admins: 0, products: 8 });

        await db.exec(`insert into auth.users (email) values ('${ADMIN_EMAIL}')`);
        await db.exec(STEP_TWO);

        const granted = await one(
          db,
          `select au.email as allow_listed, u.raw_app_meta_data as metadata
             from public.admin_users au join auth.users u on u.id = au.user_id`,
        );
        expect(granted).toEqual({ allow_listed: ADMIN_EMAIL, metadata: { role: "admin" } });
      } finally {
        await db.close();
      }
    },
    180_000,
  );

  it(
    "the pasted verification block returns the expected rows",
    async () => {
      const db = await openDatabase(true);
      try {
        await db.exec(SETUP_SQL);
        const statements = STEP_THREE.split(/;\s*\n/)
          .map((part) => part.trim())
          .filter((part) => /\bselect\b/i.test(part) && !part.split("\n").every((line) => line.startsWith("--")));

        const results: Row[][] = [];
        for (const statement of statements) {
          results.push((await db.query<Row>(statement)).rows);
        }

        expect(results).toHaveLength(7);
        expect(results[0]).toEqual([
          {
            categories: 8,
            products: 8,
            product_images: 16,
            product_variants: 13,
            enabled_announcements: 1,
            store_settings: 1,
            admin_users: 1,
          },
        ]);
        expect(results[1]?.[0]?.public).toBe(true);
        expect(results[2]).toEqual([]); // public tables without RLS
        expect(results[3]?.map((row) => row.function_name)).toEqual([
          "is_admin",
          "set_order_email_status",
          "submit_order",
        ]);
        expect(results[4]).toEqual([
          { anon_can_select_orders: false, anon_can_select_order_items: false, anon_can_select_admin_users: false },
        ]);
        expect(results[5]).toEqual([]); // anon policies on orders / order_items
        expect(results[6]).toEqual([
          {
            rls_enabled_on_every_public_table: true,
            product_images_bucket_is_public: true,
            order_functions_present: true,
            anon_cannot_select_orders: true,
            anon_cannot_select_order_items: true,
            anon_cannot_select_admin_users: true,
          },
        ]);
      } finally {
        await db.close();
      }
    },
    180_000,
  );
});
