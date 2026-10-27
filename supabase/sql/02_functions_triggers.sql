-- ===== 02_functions_triggers.sql =====
-- Helper, signup trigger, customer RPCs and admin RPCs.
-- Run after 01_schema.sql (the function bodies read the tables at call time).

-- ---------------------------------------------------------------
-- is_admin(): true when the signed-in user has account_type = 'admin'
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = (SELECT auth.uid())
      AND account_type = 'admin'
  );
$function$;

-- ---------------------------------------------------------------
-- Signup trigger: every new auth user gets a 'customer' profile
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, name, account_type)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    'customer'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------
-- Customer: place an order (checks stock, locks variants, takes the price
-- from the products table, never from the client)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order(p_items jsonb, p_address text, p_phone text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id  uuid := auth.uid();
  v_order_id bigint;
  v_total    numeric(10,2) := 0;
  v_item     record;
  v_stock    int;
  v_price    numeric(10,2);
  v_active   boolean;
  v_name     text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order';
  end if;

  if is_admin() then
    raise exception 'Admin accounts cannot place orders';
  end if;

  if coalesce(trim(p_address), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Address and phone are required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as i
    where (i->>'variant_id') is null
       or (i->>'quantity') is null
       or (i->>'quantity')::int < 1
  ) then
    raise exception 'Invalid cart item';
  end if;

  insert into orders (user_id, total, shipping_address, phone)
  values (v_user_id, 0, trim(p_address), trim(p_phone))
  returning id into v_order_id;

  for v_item in
    select (i->>'variant_id')::bigint as variant_id,
           sum((i->>'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) as i
    group by 1
    order by 1
  loop
    select pv.stock, p.price, p.is_active, p.name
      into v_stock, v_price, v_active, v_name
    from product_variants pv
    join products p on p.id = pv.product_id
    where pv.id = v_item.variant_id
    for update of pv;

    if not found or not v_active then
      raise exception 'An item in your cart is no longer available';
    end if;

    if v_stock < v_item.quantity then
      raise exception 'Not enough stock for %', v_name;
    end if;

    update product_variants
      set stock = stock - v_item.quantity
    where id = v_item.variant_id;

    insert into order_items (order_id, variant_id, quantity, unit_price)
    values (v_order_id, v_item.variant_id, v_item.quantity, v_price);

    v_total := v_total + v_price * v_item.quantity;
  end loop;

  update orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$function$;

-- ---------------------------------------------------------------
-- Customer: cancel own order while it is still pending (restocks items)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_status  text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in';
  end if;

  select status into v_status
  from orders
  where id = p_order_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'This order can no longer be cancelled';
  end if;

  update product_variants pv
  set stock = pv.stock + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id
    and oi.variant_id = pv.id;

  update orders set status = 'cancelled' where id = p_order_id;
end;
$function$;

-- ---------------------------------------------------------------
-- Admin: create or update a product with its variants
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_save_product(p_id bigint, p_name text, p_description text, p_price numeric, p_category_id bigint, p_image_url text, p_is_active boolean, p_variants jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id      bigint := p_id;
  v_variant jsonb;
  v_stock   int;
  v_old     int;
  v_size    text;
  v_color   text;
begin
  if not is_admin() then
    raise exception 'Not allowed';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Product name is required';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'Invalid price';
  end if;

  if p_category_id is null
     or not exists (select 1 from categories where id = p_category_id) then
    raise exception 'Choose a category';
  end if;

  if coalesce(p_image_url, '') !~ '^https?://' then
    raise exception 'Product image is required';
  end if;

  if p_variants is null or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Invalid variants';
  end if;

  if p_is_active and jsonb_array_length(p_variants) = 0 then
    raise exception 'Add at least one size and color before showing this product';
  end if;

  if v_id is null then
    insert into products (name, description, price, category_id, image_url, is_active)
    values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''),
            p_price, p_category_id, p_image_url, p_is_active)
    returning id into v_id;
  else
    update products
    set name = trim(p_name),
        description = nullif(trim(coalesce(p_description, '')), ''),
        price = p_price,
        category_id = p_category_id,
        image_url = p_image_url,
        is_active = p_is_active
    where id = v_id;

    if not found then
      raise exception 'Product not found';
    end if;
  end if;

  for v_variant in select value from jsonb_array_elements(p_variants)
  loop
    v_stock := (v_variant->>'stock')::int;
    if v_stock is null or v_stock < 0 then
      raise exception 'Invalid stock value';
    end if;

    if (v_variant->>'id') is not null then
      -- Existing size: if the stock number was changed, make sure no order
      -- came in at the same time (optimistic check against old_stock)
      v_old := (v_variant->>'old_stock')::int;
      if v_old is null then
        raise exception 'Invalid variant data';
      end if;

      if v_stock <> v_old then
        update product_variants
        set stock = v_stock
        where id = (v_variant->>'id')::bigint
          and product_id = v_id
          and stock = v_old;

        if not found then
          raise exception 'Stock changed while you were editing. Reload the page and try again.';
        end if;
      end if;
    else
      v_size  := upper(trim(coalesce(v_variant->>'size', '')));
      v_color := initcap(trim(coalesce(v_variant->>'color', '')));

      if v_size = '' or v_color = '' then
        raise exception 'Size and color are required';
      end if;

      begin
        insert into product_variants (product_id, size, color, stock)
        values (v_id, v_size, v_color, v_stock);
      exception when unique_violation then
        raise exception '% / % already exists', v_size, v_color;
      end;
    end if;
  end loop;

  return v_id;
end;
$function$;

-- ---------------------------------------------------------------
-- Admin: change an order's status (cancelling restocks the items)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_order_id bigint, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_current text;
begin
  if not is_admin() then
    raise exception 'Not allowed';
  end if;

  if p_status not in ('pending', 'paid', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  select status into v_current
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_current = p_status then
    return;
  end if;

  if v_current in ('delivered', 'cancelled') then
    raise exception 'A % order cannot be changed', v_current;
  end if;

  if p_status = 'cancelled' then
    update product_variants pv
    set stock = pv.stock + oi.quantity
    from order_items oi
    where oi.order_id = p_order_id
      and oi.variant_id = pv.id;
  end if;

  update orders
  set status = p_status,
      delivered_at = case when p_status = 'delivered' then now() else delivered_at end
  where id = p_order_id;
end;
$function$;

-- ---------------------------------------------------------------
-- Admin: record a return for a delivered order (optional restock)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_record_return(p_order_id bigint, p_order_item_ids bigint[], p_reason text, p_note text DEFAULT NULL::text, p_restock boolean DEFAULT true)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id   uuid;
  v_status    text;
  v_found     int;
  v_refund    numeric(10,2);
  v_return_id bigint;
begin
  if not is_admin() then
    raise exception 'Not allowed';
  end if;

  if p_reason is null
     or p_reason not in ('wrong_size', 'defective', 'not_as_described', 'changed_mind', 'other') then
    raise exception 'Invalid reason';
  end if;

  if p_order_item_ids is null or cardinality(p_order_item_ids) = 0 then
    raise exception 'Select at least one item';
  end if;

  select user_id, status into v_user_id, v_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_status <> 'delivered' then
    raise exception 'Only delivered orders can have a return';
  end if;

  select count(*) into v_found
  from order_items
  where order_id = p_order_id and id = any(p_order_item_ids);

  if v_found <> cardinality(p_order_item_ids) then
    raise exception 'Invalid items';
  end if;

  if exists (
    select 1 from product_return_items
    where order_item_id = any(p_order_item_ids)
  ) then
    raise exception 'One of these items was already returned';
  end if;

  select sum(unit_price * quantity) into v_refund
  from order_items
  where order_id = p_order_id and id = any(p_order_item_ids);

  insert into product_returns (order_id, user_id, reason, note, restocked, refund_amount)
  values (p_order_id, v_user_id, p_reason, nullif(trim(p_note), ''), p_restock, v_refund)
  returning id into v_return_id;

  insert into product_return_items (return_id, order_item_id, quantity)
  select v_return_id, id, quantity
  from order_items
  where order_id = p_order_id and id = any(p_order_item_ids);

  if p_restock then
    update product_variants pv
    set stock = pv.stock + oi.quantity
    from order_items oi
    where oi.order_id = p_order_id
      and oi.id = any(p_order_item_ids)
      and oi.variant_id = pv.id;
  end if;

  return v_return_id;
end;
$function$;

-- ---------------------------------------------------------------
-- Admin: sales dashboard numbers (revenue, daily chart, top products)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_sales_stats(p_days integer DEFAULT 14)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today  date;
  v_start  date;
  v_result jsonb;
begin
  if not is_admin() then
    raise exception 'Not allowed';
  end if;

  p_days  := least(greatest(coalesce(p_days, 14), 1), 365);
  v_today := (now() at time zone 'Africa/Cairo')::date;
  v_start := v_today - (p_days - 1);

  select jsonb_build_object(
    'revenue',
      coalesce((select sum(total) from orders where status = 'delivered'), 0),
    'expected',
      coalesce((select sum(total) from orders
                where status in ('pending', 'paid', 'shipped')), 0),
    'orders_count',
      (select count(*) from orders),
    'pending_count',
      (select count(*) from orders where status = 'pending'),
    'refunded',
      coalesce((select sum(refund_amount) from product_returns), 0),
    'daily',
      (select jsonb_agg(
                jsonb_build_object('day', g.day::date, 'revenue', coalesce(s.revenue, 0))
                order by g.day)
       from generate_series(v_start::timestamp, v_today::timestamp, interval '1 day') as g(day)
       left join (
         select (delivered_at at time zone 'Africa/Cairo')::date as day,
                sum(total) as revenue
         from orders
         where status = 'delivered'
           and delivered_at is not null
           and (delivered_at at time zone 'Africa/Cairo')::date >= v_start
         group by 1
       ) s on s.day = g.day::date),
    'top_products',
      coalesce((select jsonb_agg(t order by t.units desc)
                from (
                  select p.name, sum(oi.quantity)::int as units
                  from order_items oi
                  join orders o on o.id = oi.order_id and o.status <> 'cancelled'
                  join product_variants pv on pv.id = oi.variant_id
                  join products p on p.id = pv.product_id
                  group by p.name
                  order by units desc
                  limit 5
                ) t), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

-- ---------------------------------------------------------------
-- Admin: returns report for one month (Cairo time)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_returns_month(p_year integer, p_month integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_start timestamptz;
  v_end   timestamptz;
begin
  if not is_admin() then
    raise exception 'Not allowed';
  end if;

  if p_month < 1 or p_month > 12 or p_year < 2000 or p_year > 2100 then
    raise exception 'Invalid month';
  end if;

  v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Africa/Cairo');
  v_end := case
    when p_month = 12 then make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'Africa/Cairo')
    else make_timestamptz(p_year, p_month + 1, 1, 0, 0, 0, 'Africa/Cairo')
  end;

  return jsonb_build_object(
    'count',
      (select count(*) from product_returns
       where created_at >= v_start and created_at < v_end),
    'refunded',
      coalesce((select sum(refund_amount) from product_returns
                where created_at >= v_start and created_at < v_end), 0),
    'top_reason',
      (select reason from product_returns
       where created_at >= v_start and created_at < v_end
       group by reason
       order by count(*) desc, reason
       limit 1),
    'returns',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'order_id', r.order_id,
            'customer', up.name,
            'phone', o.phone,
            'reason', r.reason,
            'note', r.note,
            'restocked', r.restocked,
            'refund_amount', r.refund_amount,
            'created_at', r.created_at,
            'items', (
              select coalesce(jsonb_agg(jsonb_build_object(
                'id', ri.id,
                'name', p.name,
                'size', pv.size,
                'color', pv.color,
                'quantity', ri.quantity,
                'unit_price', oi.unit_price
              )), '[]'::jsonb)
              from product_return_items ri
              join order_items oi on oi.id = ri.order_item_id
              join product_variants pv on pv.id = oi.variant_id
              join products p on p.id = pv.product_id
              where ri.return_id = r.id
            )
          )
          order by r.created_at desc
        )
        from product_returns r
        join orders o on o.id = r.order_id
        left join user_profiles up on up.id = r.user_id
        where r.created_at >= v_start and r.created_at < v_end
      ), '[]'::jsonb)
  );
end;
$function$;
