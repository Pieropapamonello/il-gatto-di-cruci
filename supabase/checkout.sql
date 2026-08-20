-- Esegui questo file nel SQL Editor di Supabase dopo schema.sql.
alter table public.products add column if not exists legacy_id integer;
create unique index if not exists products_owner_legacy_id_key on public.products(owner_id, legacy_id) where legacy_id is not null;

create or replace function public.create_checkout_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_address text,
  p_shipping_method text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  item_count integer;
  item_total numeric(10,2) := 0;
  shipping_cost numeric(10,2);
  order_id uuid;
  order_number_value text;
  saved_items jsonb := '[]'::jsonb;
  qty integer;
  requested_variant text;
  variant_index integer;
  variant_row jsonb;
  variants_value jsonb;
  order_owner_id uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'Carrello non valido';
  end if;
  if length(trim(coalesce(p_customer_name,''))) < 2 or length(trim(coalesce(p_customer_email,''))) < 5 or length(trim(coalesce(p_customer_address,''))) < 5 then
    raise exception 'Dati cliente non validi';
  end if;
  if p_shipping_method not in ('pickup','home') then raise exception 'Metodo di spedizione non valido'; end if;
  shipping_cost := case when p_shipping_method = 'home' then 6.90 else 3.90 end;

  for item in select value from jsonb_array_elements(p_items) loop
    qty := coalesce((item->>'quantity')::integer, 0);
    if qty < 1 or qty > 10 then raise exception 'Quantità non valida'; end if;
    select * into product_row from public.products
      where legacy_id = (item->>'legacy_id')::integer and available = true for update;
    if not found then raise exception 'Un prodotto non è più disponibile'; end if;
    if order_owner_id is null then order_owner_id := product_row.owner_id;
    elsif order_owner_id <> product_row.owner_id then raise exception 'I prodotti devono appartenere allo stesso catalogo'; end if;

    requested_variant := nullif(trim(coalesce(item->>'variant','')), '');
    variants_value := product_row.variants;
    if requested_variant is not null then
      variant_index := null;
      for variant_row, variant_index in select value, ordinality - 1 from jsonb_array_elements(variants_value) with ordinality loop
        if variant_row->>'name' = requested_variant then exit; end if;
        variant_index := null;
      end loop;
      if variant_index is null then raise exception 'Variante non disponibile: %', requested_variant; end if;
      variant_row := variants_value->variant_index;
      if coalesce((variant_row->>'stock')::integer,0) < qty or coalesce((variant_row->>'available')::boolean,true) = false then
        raise exception 'Variante esaurita: %', requested_variant;
      end if;
      variants_value := jsonb_set(variants_value, array[variant_index::text,'stock'], to_jsonb((variant_row->>'stock')::integer - qty));
      variants_value := jsonb_set(variants_value, array[variant_index::text,'available'], to_jsonb(((variant_row->>'stock')::integer - qty) > 0));
      update public.products set variants = variants_value where id = product_row.id;
    else
      if product_row.stock < qty then raise exception 'Prodotto esaurito: %', product_row.name; end if;
      update public.products set stock = product_row.stock - qty, available = (product_row.stock - qty) > 0 where id = product_row.id;
    end if;
    item_count := qty;
    item_total := item_total + product_row.price * item_count;
    saved_items := saved_items || jsonb_build_array(jsonb_build_object('product_id',product_row.id,'name',product_row.name,'variant',requested_variant,'quantity',item_count,'price',product_row.price,'image_url',product_row.image_url));
  end loop;

  order_number_value := floor(10000000 + random() * 89999999)::text;
  insert into public.orders(owner_id,order_number,customer_name,customer_email,customer_address,shipping_method,shipping_price,total,status,payment_method,items)
  values (order_owner_id, order_number_value, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_address), case when p_shipping_method='home' then 'Consegna a domicilio' else 'InPost — punto ritiro' end, shipping_cost, item_total + shipping_cost, 'Da confermare', 'Pagamento manuale', saved_items)
  returning id into order_id;
  return jsonb_build_object('id',order_id,'order_number',order_number_value,'total',item_total + shipping_cost,'items',saved_items);
end;
$$;
revoke all on function public.create_checkout_order(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout_order(text,text,text,text,jsonb) to service_role;

create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare order_row public.orders%rowtype; item jsonb; product_row public.products%rowtype; idx integer; variant_row jsonb; variants_value jsonb;
begin
  if p_status not in ('Da confermare','Approvato','In lavorazione','Completato','Annullato') then raise exception 'Stato non valido'; end if;
  select * into order_row from public.orders where id=p_order_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Ordine non trovato'; end if;
  if order_row.status='Da confermare' and p_status='Annullato' then
    for item in select value from jsonb_array_elements(order_row.items) loop
      select * into product_row from public.products where id=(item->>'product_id')::uuid for update;
      if nullif(item->>'variant','') is not null then
        idx:=null; variants_value:=product_row.variants;
        for variant_row,idx in select value,ordinality-1 from jsonb_array_elements(variants_value) with ordinality loop
          if variant_row->>'name'=item->>'variant' then exit; end if; idx:=null;
        end loop;
        if idx is not null then
          variants_value:=jsonb_set(variants_value,array[idx::text,'stock'],to_jsonb((variant_row->>'stock')::integer+(item->>'quantity')::integer));
          variants_value:=jsonb_set(variants_value,array[idx::text,'available'],'true'::jsonb);
          update public.products set variants=variants_value where id=product_row.id;
        end if;
      else update public.products set stock=stock+(item->>'quantity')::integer,available=true where id=product_row.id;
      end if;
    end loop;
  end if;
  update public.orders set status=p_status where id=p_order_id;
end; $$;
revoke all on function public.set_order_status(uuid,text) from public, anon;
grant execute on function public.set_order_status(uuid,text) to authenticated;
