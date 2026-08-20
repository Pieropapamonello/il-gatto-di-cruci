-- Run this once in Supabase > SQL Editor > New query.
create table if not exists public.sale_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  slug text not null unique default encode(gen_random_bytes(6), 'hex'),
  visits integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.sale_link_products (
  link_id uuid not null references public.sale_links(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key(link_id, product_id)
);

create table if not exists public.sale_link_coupons (
  link_id uuid not null references public.sale_links(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  primary key(link_id, coupon_id)
);

alter table public.sale_links enable row level security;
alter table public.sale_link_products enable row level security;
alter table public.sale_link_coupons enable row level security;

drop policy if exists "owners manage sale links" on public.sale_links;
drop policy if exists "owners manage sale link products" on public.sale_link_products;
drop policy if exists "owners manage sale link coupons" on public.sale_link_coupons;

create policy "owners manage sale links" on public.sale_links for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage sale link products" on public.sale_link_products for all
  using (exists (select 1 from public.sale_links where id = link_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.sale_links where id = link_id and owner_id = auth.uid()));
create policy "owners manage sale link coupons" on public.sale_link_coupons for all
  using (exists (select 1 from public.sale_links where id = link_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.sale_links where id = link_id and owner_id = auth.uid()));
