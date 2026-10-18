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

