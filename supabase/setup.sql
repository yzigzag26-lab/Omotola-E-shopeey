-- ============================================================================
-- Corazon Empire — complete database setup in one paste
-- ============================================================================
-- GENERATED FILE — do not edit by hand. Regenerate with: npm run setup:sql
--
-- Sources, included verbatim and in this order:
--   supabase/migrations/20261018000100_schema_tables.sql     311 lines
--   supabase/migrations/20261018000200_order_functions.sql   236 lines
--   supabase/migrations/20261018000300_rls_storage_seed.sql  138 lines
--   supabase/migrations/20261018000400_grants.sql            55 lines
--   supabase/seed/seed-apply.sql                             6 lines
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
-- ============================================================================

-- ============================================================================
-- STEP 1 of 3 — schema part 1/3: extensions, enums, tables, triggers, indexes
-- source: supabase/migrations/20261018000100_schema_tables.sql (311 lines)
-- ============================================================================

-- ============================================================================
-- Corazon Empire — schema part 1/3: extensions, enums, tables, triggers, indexes
-- ============================================================================
-- ============================================================================
-- Corazon Empire — core schema, constraints, RPCs, RLS and storage policies
-- Target: Supabase Postgres 17
-- All money is stored as integer kobo (NGN 1.00 = 100 kobo).
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enumerated types (idempotent)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.availability_status as enum ('available', 'temporarily_unavailable', 'made_to_order');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.publication_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.image_role as enum ('front', 'back', 'additional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_channel as enum ('whatsapp', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending_review', 'confirmed', 'fulfilled', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.email_status as enum ('not_requested', 'pending', 'sent', 'failed', 'unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.promotion_type as enum ('percentage', 'fixed_amount', 'referral', 'free_delivery');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin allow-list. Only service role / SQL can modify this table.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users au where au.user_id = auth.uid())
      or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_admin(); $$;

revoke all on function private.is_admin() from public;
revoke all on function public.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_len check (char_length(name) between 2 and 80),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80)
);
create index if not exists categories_active_order_idx on public.categories (is_active, display_order);

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid not null references public.categories (id) on delete restrict,
  price_kobo bigint not null,
  currency char(3) not null default 'NGN',
  availability public.availability_status not null default 'available',
  status public.publication_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_positive check (price_kobo > 0 and price_kobo <= 100000000000),
  constraint products_currency_ngn check (currency = 'NGN'),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  constraint products_name_len check (char_length(name) between 2 and 140),
  constraint products_seo_title_len check (seo_title is null or char_length(seo_title) <= 70),
  constraint products_seo_description_len check (seo_description is null or char_length(seo_description) <= 200)
);
create index if not exists products_status_created_idx on public.products (status, created_at desc);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_featured_idx on public.products (is_featured) where status = 'published';

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Product images
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text,
  image_url text not null,
  image_url_thumb text,
  role public.image_role not null default 'additional',
  alt_text text not null default '',
  display_order integer not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint product_images_url_len check (char_length(image_url) <= 1000),
  constraint product_images_alt_len check (char_length(alt_text) <= 200),
  constraint product_images_thumb_len check (image_url_thumb is null or char_length(image_url_thumb) <= 1000)
);
create index if not exists product_images_product_idx on public.product_images (product_id, display_order);
create unique index if not exists product_images_one_front on public.product_images (product_id) where role = 'front';
create unique index if not exists product_images_one_back on public.product_images (product_id) where role = 'back';

-- ---------------------------------------------------------------------------
-- Product variants (optional per product)
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind text not null,
  value text not null,
  display_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint product_variants_kind_len check (char_length(kind) between 1 and 40),
  constraint product_variants_value_len check (char_length(value) between 1 and 60),
  constraint product_variants_unique unique (product_id, kind, value)
);
create index if not exists product_variants_product_idx on public.product_variants (product_id, kind, display_order);

-- ---------------------------------------------------------------------------
-- Orders (customer data — never publicly readable)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  delivery_address text not null,
  delivery_notes text,
  channel public.order_channel not null,
  status public.order_status not null default 'pending_review',
  subtotal_kobo bigint not null,
  delivery_fee_kobo bigint,
  total_kobo bigint not null,
  currency char(3) not null default 'NGN',
  customer_notes text,
  email_status public.email_status not null default 'not_requested',
  email_error text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_subtotal_positive check (subtotal_kobo >= 0),
  constraint orders_fee_positive check (delivery_fee_kobo is null or delivery_fee_kobo >= 0),
  constraint orders_total_consistent check (total_kobo = subtotal_kobo + coalesce(delivery_fee_kobo, 0)),
  constraint orders_currency_ngn check (currency = 'NGN'),
  constraint orders_ref_format check (reference ~ '^CE-[0-9]{6}-[A-Z0-9]{6}$'),
  constraint orders_phone_len check (char_length(customer_phone) between 7 and 24),
  constraint orders_name_len check (char_length(customer_name) between 2 and 140),
  constraint orders_address_len check (char_length(delivery_address) between 5 and 600),
  constraint orders_email_len check (customer_email is null or char_length(customer_email) <= 254),
  constraint orders_idempotency_len check (idempotency_key is null or char_length(idempotency_key) between 8 and 120)
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
for each row execute function private.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  variant text,
  unit_price_kobo bigint not null,
  quantity integer not null,
  line_total_kobo bigint not null,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_range check (quantity between 1 and 99),
  constraint order_items_price_positive check (unit_price_kobo > 0),
  constraint order_items_line_consistent check (line_total_kobo = unit_price_kobo * quantity),
  constraint order_items_name_len check (char_length(product_name) between 1 and 200),
  constraint order_items_variant_len check (variant is null or char_length(variant) <= 60)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Announcement (single row, enforced by singleton unique key)
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  is_enabled boolean not null default false,
  singleton boolean not null default true unique,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint announcements_single_row check (singleton),
  constraint announcements_message_len check (char_length(message) between 1 and 280)
);

drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at before update on public.announcements
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Promotions / referrals (prepared, disabled by default)
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  promotion_type public.promotion_type not null,
  discount_value integer not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  is_enabled boolean not null default false,
  is_public boolean not null default false,
  eligibility jsonb not null default '{}'::jsonb,
  referral_code text,
  referral_reward_kobo bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_name_len check (char_length(name) between 2 and 120),
  constraint promotions_discount_non_negative check (discount_value >= 0),
  constraint promotions_dates check (start_at is null or end_at is null or end_at > start_at),
  constraint promotions_reward_positive check (referral_reward_kobo is null or referral_reward_kobo >= 0)
);
create index if not exists promotions_public_idx on public.promotions (is_enabled, is_public);

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at before update on public.promotions
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Store settings (single non-secret configuration row)
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id boolean primary key default true,
  store_name text not null default 'Corazon Empire',
  support_email text not null default 'omojuli001@gmail.com',
  whatsapp_number text not null default '2348071334513',
  currency char(3) not null default 'NGN',
  instagram_url text,
  tiktok_url text,
  tagline text,
  updated_at timestamptz not null default now(),
  constraint store_settings_singleton check (id),
  constraint store_settings_currency_ngn check (currency = 'NGN')
);

drop trigger if exists store_settings_updated_at on public.store_settings;
create trigger store_settings_updated_at before update on public.store_settings
for each row execute function private.set_updated_at();

-- ============================================================================
-- STEP 1 of 3 — schema part 2/3: transactional order functions
-- source: supabase/migrations/20261018000200_order_functions.sql (236 lines)
-- ============================================================================

-- ============================================================================
-- Corazon Empire — schema part 2/3: transactional order functions
-- ============================================================================
-- ---------------------------------------------------------------------------
-- Transactional order submission
-- The browser sends product ids + quantities only. Prices, names and totals
-- are resolved from published product rows inside this transaction.
-- ---------------------------------------------------------------------------
create or replace function public.submit_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_phone text;
  v_address text;
  v_notes text;
  v_channel public.order_channel;
  v_raw_items jsonb;
  v_items jsonb;
  v_key text;
  v_existing public.orders%rowtype;
  v_order_id uuid;
  v_reference text;
  v_subtotal bigint;
  v_item_count integer;
  v_result jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'ORDER_INVALID: Malformed order payload.';
  end if;

  v_name := btrim(coalesce(payload ->> 'customer_name', ''));
  v_email := nullif(btrim(coalesce(payload ->> 'customer_email', '')), '');
  v_phone := btrim(coalesce(payload ->> 'customer_phone', ''));
  v_address := btrim(coalesce(payload ->> 'delivery_address', ''));
  v_notes := nullif(btrim(coalesce(payload ->> 'customer_notes', '')), '');
  v_key := nullif(btrim(coalesce(payload ->> 'idempotency_key', '')), '');

  if char_length(v_name) < 2 or char_length(v_name) > 140 then
    raise exception 'ORDER_INVALID: A valid customer name is required.';
  end if;
  if char_length(v_phone) < 7 or char_length(v_phone) > 24 then
    raise exception 'ORDER_INVALID: A valid phone number is required.';
  end if;
  if char_length(v_address) < 5 or char_length(v_address) > 600 then
    raise exception 'ORDER_INVALID: A delivery address is required.';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'ORDER_INVALID: A valid email address is required.';
  end if;
  if char_length(coalesce(v_notes, '')) > 1000 then
    raise exception 'ORDER_INVALID: Notes are too long.';
  end if;

  if payload ->> 'channel' not in ('whatsapp', 'email') then
    raise exception 'ORDER_INVALID: Unknown order channel.';
  end if;
  v_channel := (payload ->> 'channel')::public.order_channel;

  if v_key is not null and char_length(v_key) < 8 then
    raise exception 'ORDER_INVALID: Invalid idempotency key.';
  end if;

  -- Replay protection: return the original order for a repeated submission.
  if v_key is not null then
    select * into v_existing from public.orders where idempotency_key = v_key;
    if found then
      select coalesce(jsonb_agg(jsonb_build_object(
               'product_name', oi.product_name,
               'variant', oi.variant,
               'unit_price_kobo', oi.unit_price_kobo,
               'quantity', oi.quantity,
               'line_total_kobo', oi.line_total_kobo) order by oi.created_at), '[]'::jsonb)
        into v_result
        from public.order_items oi where oi.order_id = v_existing.id;
      return jsonb_build_object(
        'order_id', v_existing.id,
        'reference', v_existing.reference,
        'channel', v_existing.channel,
        'subtotal_kobo', v_existing.subtotal_kobo,
        'delivery_fee_kobo', v_existing.delivery_fee_kobo,
        'total_kobo', v_existing.total_kobo,
        'items', v_result,
        'replayed', true);
    end if;
  end if;

  v_raw_items := payload -> 'items';
  if v_raw_items is null or jsonb_typeof(v_raw_items) <> 'array' then
    raise exception 'ORDER_INVALID: Your cart is empty.';
  end if;
  if jsonb_array_length(v_raw_items) = 0 or jsonb_array_length(v_raw_items) > 30 then
    raise exception 'ORDER_INVALID: Your cart must contain between 1 and 30 items.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_raw_items) item
    where (item ->> 'quantity') !~ '^[0-9]{1,2}$'
       or (item ->> 'quantity')::integer not between 1 and 99
       or coalesce(item ->> 'product_id', '') !~ '^[0-9a-fA-F-]{36}$'
       or char_length(coalesce(item ->> 'variant', '')) > 60
  ) then
    raise exception 'ORDER_INVALID: One or more cart lines are invalid.';
  end if;

  -- Deduplicate identical product+variant lines and sum their quantities.
  select jsonb_agg(jsonb_build_object(
           'product_id', grouped.product_id,
           'variant', grouped.variant,
           'quantity', grouped.qty))
    into v_items
  from (
    select (item ->> 'product_id')::uuid as product_id,
           nullif(btrim(coalesce(item ->> 'variant', '')), '') as variant,
           sum((item ->> 'quantity')::integer)::integer as qty
    from jsonb_array_elements(v_raw_items) as item
    group by 1, 2
    having sum((item ->> 'quantity')::integer) between 1 and 99
  ) grouped;

  select jsonb_array_length(v_items) into v_item_count;
  if v_item_count is null or v_item_count = 0 then
    raise exception 'ORDER_INVALID: Your cart is empty.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_items) item
    left join public.products p on p.id = (item ->> 'product_id')::uuid
    where p.id is null
       or p.status <> 'published'
       or p.availability = 'temporarily_unavailable'
  ) then
    raise exception 'ORDER_INVALID: One or more items are no longer available. Please review your cart.';
  end if;

  -- Authoritative totals from the database, never from the browser.
  select coalesce(sum(p.price_kobo * (item ->> 'quantity')::integer), 0)
    into v_subtotal
  from jsonb_array_elements(v_items) item
  join public.products p on p.id = (item ->> 'product_id')::uuid;

  v_reference := 'CE-' || to_char(now(), 'YYMMDD') || '-' ||
                 upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));

  insert into public.orders (
    reference, customer_name, customer_email, customer_phone, delivery_address, delivery_notes,
    channel, status, subtotal_kobo, delivery_fee_kobo, total_kobo, customer_notes,
    email_status, idempotency_key
  ) values (
    v_reference, v_name, v_email, v_phone, v_address, null,
    v_channel, 'pending_review', v_subtotal, null, v_subtotal, v_notes,
    case when v_channel = 'email' then 'pending'::public.email_status else 'not_requested'::public.email_status end,
    v_key
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, variant, unit_price_kobo, quantity, line_total_kobo)
  select v_order_id, p.id, p.name, nullif(item ->> 'variant', ''), p.price_kobo,
         (item ->> 'quantity')::integer, p.price_kobo * (item ->> 'quantity')::integer
  from jsonb_array_elements(v_items) item
  join public.products p on p.id = (item ->> 'product_id')::uuid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'product_name', oi.product_name,
           'variant', oi.variant,
           'unit_price_kobo', oi.unit_price_kobo,
           'quantity', oi.quantity,
           'line_total_kobo', oi.line_total_kobo) order by oi.created_at), '[]'::jsonb)
    into v_result
    from public.order_items oi where oi.order_id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'reference', v_reference,
    'channel', v_channel,
    'subtotal_kobo', v_subtotal,
    'delivery_fee_kobo', null,
    'total_kobo', v_subtotal,
    'items', v_result,
    'replayed', false);
exception
  when unique_violation then
    if v_key is not null then
      select * into v_existing from public.orders where idempotency_key = v_key;
      if found then
        select coalesce(jsonb_agg(jsonb_build_object(
                 'product_name', oi.product_name,
                 'variant', oi.variant,
                 'unit_price_kobo', oi.unit_price_kobo,
                 'quantity', oi.quantity,
                 'line_total_kobo', oi.line_total_kobo) order by oi.created_at), '[]'::jsonb)
          into v_result
          from public.order_items oi where oi.order_id = v_existing.id;
        return jsonb_build_object(
          'order_id', v_existing.id,
          'reference', v_existing.reference,
          'channel', v_existing.channel,
          'subtotal_kobo', v_existing.subtotal_kobo,
          'delivery_fee_kobo', v_existing.delivery_fee_kobo,
          'total_kobo', v_existing.total_kobo,
          'items', v_result,
          'replayed', true);
      end if;
    end if;
    raise;
  when invalid_text_representation or not_null_violation or check_violation then
    raise exception 'ORDER_INVALID: Please review your cart and details.';
end;
$$;

revoke all on function public.submit_order(jsonb) from public;
grant execute on function public.submit_order(jsonb) to anon, authenticated;

-- Email status is updated by the trusted server (service role) only.
create or replace function public.set_order_email_status(
  p_order_id uuid,
  p_status public.email_status,
  p_error text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
     set email_status = p_status,
         email_error = case when p_error is null then null else left(p_error, 300) end
   where id = p_order_id
     and email_status in ('pending', 'failed');
$$;

revoke all on function public.set_order_email_status(uuid, public.email_status, text) from public, anon, authenticated;
grant execute on function public.set_order_email_status(uuid, public.email_status, text) to service_role;

-- ============================================================================
-- STEP 1 of 3 — schema part 3/3: RLS, storage policies, singleton rows
-- source: supabase/migrations/20261018000300_rls_storage_seed.sql (138 lines)
-- ============================================================================

-- ============================================================================
-- Corazon Empire — schema part 3/3: RLS, storage policies, initial rows
-- ============================================================================
-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.announcements enable row level security;
alter table public.promotions enable row level security;
alter table public.store_settings enable row level security;

-- admin_users: admins may read; nobody may write via the API.
drop policy if exists admin_users_admin_read on public.admin_users;
create policy admin_users_admin_read on public.admin_users
  for select to authenticated using (public.is_admin());

-- categories
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select to anon, authenticated using (is_active);
drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- products
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (status = 'published');
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- product_images
drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_images.product_id and p.status = 'published')
  );
drop policy if exists product_images_admin_all on public.product_images;
create policy product_images_admin_all on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- product_variants
drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_variants.product_id and p.status = 'published')
  );
drop policy if exists product_variants_admin_all on public.product_variants;
create policy product_variants_admin_all on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- orders: private. No anon policy whatsoever; creation only through submit_order().
drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders
  for select to authenticated using (public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- order_items
drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items
  for select to authenticated using (public.is_admin());

-- announcements
drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements
  for select to anon, authenticated using (is_enabled);
drop policy if exists announcements_admin_all on public.announcements;
create policy announcements_admin_all on public.announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- promotions: public only when explicitly enabled, public and in date window.
drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions
  for select to anon, authenticated using (
    is_enabled and is_public
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );
drop policy if exists promotions_admin_all on public.promotions;
create policy promotions_admin_all on public.promotions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- store_settings
drop policy if exists store_settings_public_read on public.store_settings;
create policy store_settings_public_read on public.store_settings
  for select to anon, authenticated using (true);
drop policy if exists store_settings_admin_write on public.store_settings;
create policy store_settings_admin_write on public.store_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public-read product images, admin-only writes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 12582912, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_storage_public_read on storage.objects;
create policy product_images_storage_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists product_images_storage_admin_insert on storage.objects;
create policy product_images_storage_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_storage_admin_update on storage.objects;
create policy product_images_storage_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_storage_admin_delete on storage.objects;
create policy product_images_storage_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed the single announcement row and store settings (idempotent, no products)
-- ---------------------------------------------------------------------------
insert into public.announcements (id, message, is_enabled)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Welcome to Corazon Empire — curated pieces for the wardrobe and the home. Confirm availability and delivery on WhatsApp or by email.',
  true
)
on conflict (singleton) do nothing;

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

-- ============================================================================
-- STEP 1 of 3 — explicit table and function privileges
-- source: supabase/migrations/20261018000400_grants.sql (55 lines)
-- ============================================================================

-- ============================================================================
-- Corazon Empire — explicit table privileges
-- RLS filters rows; GRANTs decide whether a role may touch the table at all.
-- Least privilege: `anon` reads the public catalogue only. `authenticated`
-- receives write privileges for tables whose RLS policies require public.is_admin().
-- `orders` / `order_items` are never insertable by clients: orders are created by
-- the SECURITY DEFINER submit_order() function. An administrator may still
-- UPDATE an order's status and delivery fee, which the policy allows.
--
-- Supabase's default privileges grant ALL on new public tables to anon,
-- authenticated and service_role, so every privilege that must not exist has to
-- be revoked explicitly — RLS alone is not the whole story.
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- Public catalogue (read-only for anonymous visitors)
grant select on public.categories, public.products, public.product_images,
  public.product_variants, public.announcements, public.promotions,
  public.store_settings to anon, authenticated;

-- Admin-managed tables: row access is still gated by is_admin() policies.
grant insert, update, delete on public.categories, public.products, public.product_images,
  public.product_variants, public.announcements, public.promotions,
  public.store_settings to authenticated;

-- Admin may read and update customer orders (status, delivery fee, notes).
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.admin_users to authenticated;

-- Clients may never create orders directly; only submit_order() can.
-- Anonymous visitors hold no privilege at all on customer data or the admin
-- allow-list. RLS already returns zero rows; this removes the privilege too, so
-- a future policy mistake cannot expose an order.
revoke all on public.orders from anon;
revoke all on public.order_items from anon;
revoke insert, delete on public.orders from authenticated;
revoke insert, update, delete on public.order_items from authenticated;
revoke all on public.admin_users from anon;

-- NOTE: the admin update grant above is deliberately preserved. Revoking
-- `update` from authenticated here would silently break the dashboard's
-- "change order status / delivery fee" action, which runs as the signed-in
-- administrator.

-- Function execution surface
revoke all on function public.submit_order(jsonb) from public;
grant execute on function public.submit_order(jsonb) to anon, authenticated;
revoke all on function public.set_order_email_status(uuid, public.email_status, text) from public, anon, authenticated;
grant execute on function public.set_order_email_status(uuid, public.email_status, text) to service_role;
grant execute on function public.is_admin() to anon, authenticated;

-- Storage: clients use the storage API, which enforces storage.objects RLS.
grant select on storage.buckets to anon, authenticated;

-- ============================================================================
-- STEP 1 of 3 — demo catalogue seed (8 categories, 8 products, 16 images, 13 variants)
-- source: supabase/seed/seed-apply.sql (6 lines)
-- ============================================================================

insert into public.categories (id,name,slug,description,display_order,is_active) select id,name,slug,description,display_order,is_active from jsonb_populate_recordset(null::public.categories,'[{"id":"c0000000-0000-4000-8000-000000000001","name":"Room Decor","slug":"room-decor","description":"Sculptural accents that bring warmth, texture and quiet character to a room.","display_order":1,"is_active":true},{"id":"c0000000-0000-4000-8000-000000000002","name":"Unisex Wears","slug":"unisex-wears","description":"Relaxed, considered essentials cut for everyone — soft fabric, clean lines, no noise.","display_order":2,"is_active":true},{"id":"c0000000-0000-4000-8000-000000000003","name":"Tattoo Stickers","slug":"tattoo-stickers","description":"Fine-line temporary tattoos for an effortless, expressive finish.","display_order":3,"is_active":true},{"id":"c0000000-0000-4000-8000-000000000004","name":"Waist Beads","slug":"waist-beads","description":"Hand-strung beadwork in burgundy, champagne and ivory — made to be worn, gifted and kept.","display_order":4,"is_active":true},{"id":"c0000000-0000-4000-8000-000000000005","name":"Kitchen Utensils","slug":"kitchen-utensils","description":"Everyday tools with a considered silhouette — designed to look as good as they work.","display_order":5,"is_active":true},{"id":"c0000000-0000-4000-8000-000000000006","name":"Footwear","slug":"footwear","description":"Comfort-first slides and sandals with a polished, understated finish.","display_order":6,"is_active":true},{"id":"c0000000-0000-4000-8000-000000000007","name":"Bags","slug":"bags","description":"Structured shoulder bags and carryalls in rich, wearable tones.","display_order":7,"is_active":true},{"id":"c0000000-0000-4000-8000-000000000008","name":"Jewelry","slug":"jewelry","description":"Gold-tone and beaded pieces designed for layering, everyday and occasion.","display_order":8,"is_active":true}]') on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order, is_active = excluded.is_active;
insert into public.products (id,name,slug,description,category_id,price_kobo,currency,availability,status,is_featured,seo_title,seo_description) select id,name,slug,description,category_id,price_kobo,currency,availability,status,is_featured,seo_title,seo_description from jsonb_populate_recordset(null::public.products,'[{"id":"d0000000-0000-4000-8000-000000000001","slug":"aurelia-decorative-vase","name":"Aurelia Decorative Vase","category_id":"c0000000-0000-4000-8000-000000000001","price_kobo":1850000,"description":"A sculptural ceramic vase with a softly fluted body and a matte ivory glaze. The Aurelia is designed to hold its own on a console or shelf, and looks just as considered empty as it does with a single stem. Each piece is finished by hand, so subtle variation in tone and texture is expected and part of its character.","availability":"available","status":"published","is_featured":true,"seo_title":"Aurelia Decorative Vase — Fluted Ivory Ceramic","seo_description":"A fluted ceramic decorative vase in warm matte ivory. A sculptural accent for consoles, shelves and sideboards.","currency":"NGN"},{"id":"d0000000-0000-4000-8000-000000000002","slug":"essential-oversized-t-shirt","name":"Essential Oversized T-Shirt","category_id":"c0000000-0000-4000-8000-000000000002","price_kobo":1200000,"description":"The everyday tee, refined. A heavyweight cotton jersey with a boxy, oversized cut, dropped shoulders and a clean hem. The Ecru colourway is garment-dyed for a soft, lived-in hand from the first wear. Style it loose over denim or tuck it into tailoring.","availability":"available","status":"published","is_featured":true,"seo_title":"Essential Oversized T-Shirt — Ecru Heavyweight Cotton","seo_description":"A heavyweight cotton oversized t-shirt in soft ecru with dropped shoulders and a relaxed, boxy fit.","currency":"NGN"},{"id":"d0000000-0000-4000-8000-000000000003","slug":"minimalist-tattoo-sticker-set","name":"Minimalist Tattoo Sticker Set","category_id":"c0000000-0000-4000-8000-000000000003","price_kobo":350000,"description":"A curated sheet of fine-line temporary tattoos — botanical stems, small geometric marks and delicate script-free linework. Each design is easy to apply with water and typically lasts a few days on skin. A low-commitment way to try a placement before you commit.","availability":"available","status":"published","is_featured":false,"seo_title":"Minimalist Tattoo Sticker Set — Fine-Line Temporary Tattoos","seo_description":"A sheet of fine-line minimalist temporary tattoos in black ink. Easy to apply and remove.","currency":"NGN"},{"id":"d0000000-0000-4000-8000-000000000004","slug":"signature-waist-bead-set","name":"Signature Waist Bead Set","category_id":"c0000000-0000-4000-8000-000000000004","price_kobo":500000,"description":"A hand-strung strand of small polished glass beads in burgundy, champagne gold and ivory, finished with a fine gold-tone clasp and adjustable chain. Wear it alone or layer with one of our other strands. Strung to order, so allow a little time before dispatch.","availability":"made_to_order","status":"published","is_featured":true,"seo_title":"Signature Waist Bead Set — Burgundy & Champagne","seo_description":"Hand-strung waist beads in burgundy, champagne gold and ivory with an adjustable gold-tone closure.","currency":"NGN"},{"id":"d0000000-0000-4000-8000-000000000005","slug":"modern-kitchen-utensil-set","name":"Modern Kitchen Utensil Set","category_id":"c0000000-0000-4000-8000-000000000005","price_kobo":1500000,"description":"A four-piece cooking set — ladle, slotted turner, serving spoon and whisk — with matte black heads and balanced handles. Heat-resistant and comfortable to hold, with a silhouette clean enough to leave on the counter. Hand wash to preserve the finish.","availability":"available","status":"published","is_featured":false,"seo_title":"Modern Kitchen Utensil Set — Matte Black, 4 Pieces","seo_description":"A modern four-piece kitchen utensil set with matte black heads and balanced handles.","currency":"NGN"},{"id":"d0000000-0000-4000-8000-000000000006","slug":"everyday-comfort-slides","name":"Everyday Comfort Slides","category_id":"c0000000-0000-4000-8000-000000000006","price_kobo":1650000,"description":"A padded slide in soft sand beige, built for the days that do not slow down. The wide strap is lined for comfort and the sole has just enough grip for everyday wear. Water-resistant and easy to wipe clean.","availability":"available","status":"published","is_featured":true,"seo_title":"Everyday Comfort Slides — Sand Beige Padded Slides","seo_description":"Padded everyday slides in sand beige with a comfortable wide strap and grippy sole.","currency":"NGN"},{"id":"d0000000-0000-4000-8000-000000000007","slug":"everyday-luxe-shoulder-bag","name":"Everyday Luxe Shoulder Bag","category_id":"c0000000-0000-4000-8000-000000000007","price_kobo":2200000,"description":"A structured shoulder bag in deep burgundy with a slim champagne gold-tone clasp and a short strap that sits neatly under the arm. Lined interior with a single slip pocket — room for a phone, cardholder, keys and a small pouch. A considered everyday bag that dresses up as easily as it dresses down.","availability":"available","status":"published","is_featured":true,"seo_title":"Everyday Luxe Shoulder Bag — Burgundy Structured Bag","seo_description":"A structured burgundy shoulder bag with a champagne gold-tone clasp and a compact, elegant silhouette.","currency":"NGN"},{"id":"d0000000-0000-4000-8000-000000000008","slug":"classic-gold-tone-jewelry-set","name":"Classic Gold-Tone Jewelry Set","category_id":"c0000000-0000-4000-8000-000000000008","price_kobo":850000,"description":"A fine gold-tone chain necklace with matching small hoop earrings. Lightweight enough for all-day wear and simple enough to layer with pieces you already own. Keep away from perfume and water, and store in the pouch provided.","availability":"available","status":"published","is_featured":false,"seo_title":"Classic Gold-Tone Jewelry Set — Necklace & Hoops","seo_description":"A classic gold-tone jewellery set with a fine chain necklace and matching small hoop earrings.","currency":"NGN"}]') on conflict (slug) do update set name = excluded.name, description = excluded.description, category_id = excluded.category_id, price_kobo = excluded.price_kobo, availability = excluded.availability, status = excluded.status, is_featured = excluded.is_featured, seo_title = excluded.seo_title, seo_description = excluded.seo_description;
insert into public.product_images (id,product_id,storage_path,image_url,image_url_thumb,role,alt_text,display_order,width,height) select id,product_id,storage_path,image_url,image_url_thumb,role,alt_text,display_order,width,height from jsonb_populate_recordset(null::public.product_images,'[{"id":"e0000000-0000-4000-8000-000000000001","product_id":"d0000000-0000-4000-8000-000000000001","storage_path":null,"image_url":"/products/aurelia-decorative-vase-front.jpg","image_url_thumb":"/products/aurelia-decorative-vase-front-thumb.jpg","role":"front","alt_text":"Aurelia Decorative Vase in matte ivory, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000002","product_id":"d0000000-0000-4000-8000-000000000001","storage_path":null,"image_url":"/products/aurelia-decorative-vase-back.jpg","image_url_thumb":"/products/aurelia-decorative-vase-back-thumb.jpg","role":"back","alt_text":"Aurelia Decorative Vase in matte ivory, back view","display_order":1,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000003","product_id":"d0000000-0000-4000-8000-000000000002","storage_path":null,"image_url":"/products/essential-oversized-t-shirt-front.jpg","image_url_thumb":"/products/essential-oversized-t-shirt-front-thumb.jpg","role":"front","alt_text":"Essential Oversized T-Shirt in ecru, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000004","product_id":"d0000000-0000-4000-8000-000000000002","storage_path":null,"image_url":"/products/essential-oversized-t-shirt-back.jpg","image_url_thumb":"/products/essential-oversized-t-shirt-back-thumb.jpg","role":"back","alt_text":"Essential Oversized T-Shirt in ecru, back view","display_order":1,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000005","product_id":"d0000000-0000-4000-8000-000000000003","storage_path":null,"image_url":"/products/minimalist-tattoo-sticker-set-front.jpg","image_url_thumb":"/products/minimalist-tattoo-sticker-set-front-thumb.jpg","role":"front","alt_text":"Minimalist tattoo sticker sheet, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000006","product_id":"d0000000-0000-4000-8000-000000000003","storage_path":null,"image_url":"/products/minimalist-tattoo-sticker-set-detail.jpg","image_url_thumb":"/products/minimalist-tattoo-sticker-set-detail-thumb.jpg","role":"additional","alt_text":"Minimalist Tattoo Sticker Set, close detail of the material and finish","display_order":1,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000007","product_id":"d0000000-0000-4000-8000-000000000004","storage_path":null,"image_url":"/products/signature-waist-bead-set-front.jpg","image_url_thumb":"/products/signature-waist-bead-set-front-thumb.jpg","role":"front","alt_text":"Signature waist bead strand in burgundy and gold, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000008","product_id":"d0000000-0000-4000-8000-000000000004","storage_path":null,"image_url":"/products/signature-waist-bead-set-detail.jpg","image_url_thumb":"/products/signature-waist-bead-set-detail-thumb.jpg","role":"additional","alt_text":"Signature Waist Bead Set, close detail of the material and finish","display_order":1,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000009","product_id":"d0000000-0000-4000-8000-000000000005","storage_path":null,"image_url":"/products/modern-kitchen-utensil-set-front.jpg","image_url_thumb":"/products/modern-kitchen-utensil-set-front-thumb.jpg","role":"front","alt_text":"Modern kitchen utensil set in matte black, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000010","product_id":"d0000000-0000-4000-8000-000000000005","storage_path":null,"image_url":"/products/modern-kitchen-utensil-set-detail.jpg","image_url_thumb":"/products/modern-kitchen-utensil-set-detail-thumb.jpg","role":"additional","alt_text":"Modern Kitchen Utensil Set, close detail of the material and finish","display_order":1,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000011","product_id":"d0000000-0000-4000-8000-000000000006","storage_path":null,"image_url":"/products/everyday-comfort-slides-front.jpg","image_url_thumb":"/products/everyday-comfort-slides-front-thumb.jpg","role":"front","alt_text":"Everyday comfort slides in sand beige, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000012","product_id":"d0000000-0000-4000-8000-000000000006","storage_path":null,"image_url":"/products/everyday-comfort-slides-detail.jpg","image_url_thumb":"/products/everyday-comfort-slides-detail-thumb.jpg","role":"additional","alt_text":"Everyday Comfort Slides, close detail of the material and finish","display_order":1,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000013","product_id":"d0000000-0000-4000-8000-000000000007","storage_path":null,"image_url":"/products/everyday-luxe-shoulder-bag-front.jpg","image_url_thumb":"/products/everyday-luxe-shoulder-bag-front-thumb.jpg","role":"front","alt_text":"Everyday Luxe shoulder bag in burgundy, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000014","product_id":"d0000000-0000-4000-8000-000000000007","storage_path":null,"image_url":"/products/everyday-luxe-shoulder-bag-detail.jpg","image_url_thumb":"/products/everyday-luxe-shoulder-bag-detail-thumb.jpg","role":"additional","alt_text":"Everyday Luxe Shoulder Bag, close detail of the material and finish","display_order":1,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000015","product_id":"d0000000-0000-4000-8000-000000000008","storage_path":null,"image_url":"/products/classic-gold-tone-jewelry-set-front.jpg","image_url_thumb":"/products/classic-gold-tone-jewelry-set-front-thumb.jpg","role":"front","alt_text":"Classic gold-tone jewellery set, front view","display_order":0,"width":1600,"height":2000},{"id":"e0000000-0000-4000-8000-000000000016","product_id":"d0000000-0000-4000-8000-000000000008","storage_path":null,"image_url":"/products/classic-gold-tone-jewelry-set-detail.jpg","image_url_thumb":"/products/classic-gold-tone-jewelry-set-detail-thumb.jpg","role":"additional","alt_text":"Classic Gold-Tone Jewelry Set, close detail of the material and finish","display_order":1,"width":1600,"height":2000}]') on conflict (id) do update set image_url = excluded.image_url, image_url_thumb = excluded.image_url_thumb, role = excluded.role, alt_text = excluded.alt_text, display_order = excluded.display_order;
insert into public.product_variants (product_id,kind,value,display_order,is_available) select product_id,kind,value,display_order,is_available from jsonb_populate_recordset(null::public.product_variants,'[{"product_id":"d0000000-0000-4000-8000-000000000002","kind":"Size","value":"S","display_order":0,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000002","kind":"Size","value":"M","display_order":1,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000002","kind":"Size","value":"L","display_order":2,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000002","kind":"Size","value":"XL","display_order":3,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000004","kind":"Length","value":"30 in","display_order":0,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000004","kind":"Length","value":"34 in","display_order":1,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000004","kind":"Length","value":"38 in","display_order":2,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000006","kind":"Size","value":"38","display_order":0,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000006","kind":"Size","value":"39","display_order":1,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000006","kind":"Size","value":"40","display_order":2,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000006","kind":"Size","value":"41","display_order":3,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000006","kind":"Size","value":"42","display_order":4,"is_available":true},{"product_id":"d0000000-0000-4000-8000-000000000006","kind":"Size","value":"43","display_order":5,"is_available":true}]') on conflict (product_id, kind, value) do update set display_order = excluded.display_order, is_available = excluded.is_available;
insert into public.announcements (id,message,is_enabled) select id,message,is_enabled from jsonb_populate_recordset(null::public.announcements,'[{"id":"a0000000-0000-4000-8000-000000000001","message":"Welcome to Corazon Empire — curated pieces for the wardrobe and the home. Confirm availability and delivery on WhatsApp or by email.","is_enabled":true}]') on conflict (id) do update set message = excluded.message, is_enabled = excluded.is_enabled;
select (select count(*) from public.categories) as categories, (select count(*) from public.products) as products, (select count(*) from public.product_images) as images, (select count(*) from public.product_variants) as variants, (select count(*) from public.announcements where is_enabled) as announcements;

-- ============================================================================
-- STEP 2 of 3 — administrator
-- The application treats a signed-in user as an administrator when EITHER a
-- row exists in public.admin_users OR the JWT's app_metadata.role is 'admin'.
-- This block satisfies both. It is idempotent and safe to run on its own.
--
-- This block does NOT create the auth user. Create it first if needed:
--   Authentication -> Users -> Add user
--   email: omojuli001@gmail.com   password: your own strong password
--   "Auto Confirm User": on
-- then run this block again.
-- ============================================================================
do $$
declare
  c_admin_email constant text := 'omojuli001@gmail.com';
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
  c_admin_email constant text := 'omojuli001@gmail.com';
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
end $$;

-- ============================================================================
-- STEP 3 of 3 — verification (read-only; run any time)
-- ============================================================================

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
    as anon_cannot_select_admin_users;
