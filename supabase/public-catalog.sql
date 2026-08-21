-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Il catalogo pubblico legge solo questi campi: i dati privati del negozio
-- (owner_id, ordini, clienti) restano protetti dalle policy RLS.

alter table public.products add column if not exists legacy_id integer;

create or replace function public.get_public_catalog()
returns table (
  id uuid,
  legacy_id integer,
  name text,
  description text,
  price numeric,
  stock integer,
  variants jsonb,
  image_url text,
  available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.legacy_id, p.name, p.description, p.price, p.stock,
         p.variants, p.image_url, p.available
  from public.products p
  where p.available = true
  order by p.created_at desc;
$$;

revoke all on function public.get_public_catalog() from public;
grant execute on function public.get_public_catalog() to anon, authenticated;
