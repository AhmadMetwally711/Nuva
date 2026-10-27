-- ===== 01_schema.sql =====
-- Tables, constraints and foreign keys, in dependency order.
-- Row Level Security is switched on for every table right after it is
-- created, so no table is ever open. The policies are in 03_rls.sql.
-- Safe to run more than once (create table if not exists).

-- ---------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------
create table if not exists public.categories (
  id   bigint generated always as identity not null,
  name text not null,
  slug text not null,
  constraint categories_pkey primary key (id),
  constraint categories_slug_key unique (slug)
);
alter table public.categories enable row level security;

-- ---------------------------------------------------------------
-- products
-- ---------------------------------------------------------------
create table if not exists public.products (
  id          bigint generated always as identity not null,
  category_id bigint,
  name        text not null,
  description text,
  price       numeric(10,2) not null,
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint products_pkey primary key (id),
  constraint products_price_check check (price >= 0),
  constraint products_category_id_fkey
    foreign key (category_id) references public.categories (id)
);
alter table public.products enable row level security;

-- ---------------------------------------------------------------
-- product_variants (size + color + stock)
-- ---------------------------------------------------------------
create table if not exists public.product_variants (
  id         bigint generated always as identity not null,
  product_id bigint not null,
  size       text not null,
  color      text not null,
  stock      integer not null default 0,
  constraint product_variants_pkey primary key (id),
  constraint product_variants_stock_check check (stock >= 0),
  constraint product_variants_product_id_size_color_key
    unique (product_id, size, color),
  constraint product_variants_product_id_fkey
    foreign key (product_id) references public.products (id) on delete cascade
);
alter table public.product_variants enable row level security;

-- ---------------------------------------------------------------
-- user_profiles (one row per auth user, created by the signup trigger)
-- ---------------------------------------------------------------
create table if not exists public.user_profiles (
  id           uuid not null,
  name         text,
  account_type text default 'customer',
  created_at   timestamptz not null default now(),
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_id_fkey
    foreign key (id) references auth.users (id)
);
alter table public.user_profiles enable row level security;

-- Optional: restrict the allowed values (not applied unless you run it)
-- alter table public.user_profiles
--   add constraint user_profiles_account_type_check
--   check (account_type in ('customer', 'admin'));

-- ---------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------
create table if not exists public.orders (
  id               bigint generated always as identity not null,
  user_id          uuid not null,
  status           text not null default 'pending',
  total            numeric(10,2) not null,
  shipping_address text not null,
  phone            text not null,
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz,
  constraint orders_pkey primary key (id),
  constraint orders_status_check
    check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  constraint orders_user_id_fkey
    foreign key (user_id) references auth.users (id),
  -- second foreign key to user_profiles: lets the API join the customer name
  constraint orders_user_profile_fkey
    foreign key (user_id) references public.user_profiles (id)
);
alter table public.orders enable row level security;

-- ---------------------------------------------------------------
-- order_items (unit_price is a snapshot of the price at order time)
-- ---------------------------------------------------------------
create table if not exists public.order_items (
  id         bigint generated always as identity not null,
  order_id   bigint not null,
  variant_id bigint not null,
  quantity   integer not null,
  unit_price numeric(10,2) not null,
  constraint order_items_pkey primary key (id),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_order_id_fkey
    foreign key (order_id) references public.orders (id) on delete cascade,
  constraint order_items_variant_id_fkey
    foreign key (variant_id) references public.product_variants (id)
);
alter table public.order_items enable row level security;

-- ---------------------------------------------------------------
-- product_returns and product_return_items
-- ---------------------------------------------------------------
create table if not exists public.product_returns (
  id            bigint generated always as identity not null,
  order_id      bigint not null,
  user_id       uuid not null,
  reason        text not null,
  note          text,
  restocked     boolean not null,
  refund_amount numeric(10,2) not null,
  created_at    timestamptz not null default now(),
  constraint product_returns_pkey primary key (id),
  constraint product_returns_reason_check
    check (reason in ('wrong_size', 'defective', 'not_as_described', 'changed_mind', 'other')),
  constraint product_returns_order_id_fkey
    foreign key (order_id) references public.orders (id) on delete cascade,
  constraint product_returns_user_id_fkey
    foreign key (user_id) references public.user_profiles (id)
);
alter table public.product_returns enable row level security;

create table if not exists public.product_return_items (
  id            bigint generated always as identity not null,
  return_id     bigint not null,
  order_item_id bigint not null,
  quantity      integer not null,
  constraint product_return_items_pkey primary key (id),
  constraint product_return_items_quantity_check check (quantity > 0),
  constraint product_return_items_return_id_fkey
    foreign key (return_id) references public.product_returns (id) on delete cascade,
  constraint product_return_items_order_item_id_fkey
    foreign key (order_item_id) references public.order_items (id) on delete cascade
);
alter table public.product_return_items enable row level security;

-- ---------------------------------------------------------------
-- cart_items (one row per user and variant)
-- ---------------------------------------------------------------
create table if not exists public.cart_items (
  user_id    uuid not null,
  variant_id bigint not null,
  quantity   integer not null,
  created_at timestamptz not null default now(),
  constraint cart_items_pkey primary key (user_id, variant_id),
  constraint cart_items_quantity_check check (quantity >= 1 and quantity <= 99),
  constraint cart_items_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint cart_items_variant_id_fkey
    foreign key (variant_id) references public.product_variants (id) on delete cascade
);
alter table public.cart_items enable row level security;
