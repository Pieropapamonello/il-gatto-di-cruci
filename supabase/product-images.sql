-- Run once in Supabase > SQL Editor to enable product image uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "public can view product images" on storage.objects;
drop policy if exists "owners can upload product images" on storage.objects;
drop policy if exists "owners can update product images" on storage.objects;
drop policy if exists "owners can delete product images" on storage.objects;

create policy "public can view product images"
on storage.objects for select to public
using (bucket_id = 'product-images');

create policy "owners can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and auth.email() = 'mekamiepixie@gmail.com' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and auth.email() = 'mekamiepixie@gmail.com' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'product-images' and auth.email() = 'mekamiepixie@gmail.com' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and auth.email() = 'mekamiepixie@gmail.com' and (storage.foldername(name))[1] = auth.uid()::text);
