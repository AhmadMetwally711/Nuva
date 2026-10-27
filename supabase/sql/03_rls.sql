-- ===== 03_rls.sql =====
-- Row Level Security: enable it on every table, then add the policies.
-- Safe to run more than once (policies are dropped and recreated).
--
-- How the app is protected:
--  * orders, order_items, user_profiles, product_returns and
--    product_return_items have NO insert/update/delete policies, so the
--    client can only change them through the SECURITY DEFINER functions in
--    02_functions_triggers.sql (create_order, cancel_order, admin_*).
--  * A customer cannot change their own account_type (no update policy
--    on user_profiles), so they cannot make themselves an admin.

alter table public.user_profiles        enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.product_variants     enable row level security;
alter table public.cart_items           enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.product_returns      enable row level security;
alter table public.product_return_items enable row level security;

-- ---------------------------------------------------------------
-- user_profiles: read your own profile, admins read all
-- ---------------------------------------------------------------
drop policy if exists "read own profile or admin" on public.user_profiles;
create policy "read own profile or admin"
  on public.user_profiles
  for select
  using ((id = auth.uid()) or is_admin());

-- ---------------------------------------------------------------
-- categories: everyone reads, admins manage
-- ---------------------------------------------------------------
drop policy if exists "read categories" on public.categories;
create policy "read categories"
  on public.categories
  for select
  using (true);

drop policy if exists "admin categories" on public.categories;
create policy "admin categories"
  on public.categories
  for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------
-- products: everyone reads, admins manage
-- ---------------------------------------------------------------
drop policy if exists "read products" on public.products;
create policy "read products"
  on public.products
  for select
  using (true);

drop policy if exists "admin products" on public.products;
create policy "admin products"
  on public.products
  for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------
-- product_variants: everyone reads, admins manage
-- ---------------------------------------------------------------
drop policy if exists "read variants" on public.product_variants;
create policy "read variants"
  on public.product_variants
  for select
  using (true);

drop policy if exists "admin variants" on public.product_variants;
create policy "admin variants"
  on public.product_variants
  for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------
-- cart_items: each signed-in user manages only their own cart
-- ---------------------------------------------------------------
drop policy if exists "manage own cart" on public.cart_items;
create policy "manage own cart"
  on public.cart_items
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- orders and order_items: customers read their own, admins read all
-- (writes go through create_order / cancel_order / admin_set_order_status)
-- ---------------------------------------------------------------
drop policy if exists "read own orders" on public.orders;
create policy "read own orders"
  on public.orders
  for select
  using ((user_id = auth.uid()) or is_admin());

drop policy if exists "read own items" on public.order_items;
create policy "read own items"
  on public.order_items
  for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and ((o.user_id = auth.uid()) or is_admin())
    )
  );

-- ---------------------------------------------------------------
-- returns: admins only (writes go through admin_record_return)
-- ---------------------------------------------------------------
drop policy if exists "admin read returns" on public.product_returns;
create policy "admin read returns"
  on public.product_returns
  for select
  using (is_admin());

drop policy if exists "admin read return items" on public.product_return_items;
create policy "admin read return items"
  on public.product_return_items
  for select
  using (is_admin());

-- ---------------------------------------------------------------
-- Optional hardening (not applied): the "read products" policy above lets
-- anyone read hidden products (is_active = false) through the API, even
-- though the shop page filters them out. To hide them for real, replace the
-- two read policies with:
--
-- drop policy if exists "read products" on public.products;
-- create policy "read products" on public.products
--   for select using (is_active or is_admin());
--
-- drop policy if exists "read variants" on public.product_variants;
-- create policy "read variants" on public.product_variants
--   for select using (
--     is_admin() or exists (
--       select 1 from public.products p
--       where p.id = product_variants.product_id and p.is_active
--     )
--   );
--
-- Check first that nothing in the app needs to read a hidden product
-- (for example an old order that shows a product which was hidden later).
