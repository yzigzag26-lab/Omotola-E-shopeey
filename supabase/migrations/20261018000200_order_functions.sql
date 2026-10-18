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

