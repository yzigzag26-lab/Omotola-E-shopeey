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
