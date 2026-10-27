-- ===== 04_storage.sql =====
-- Bucket for product images: only admins can upload, list or delete.
-- Limits: 2 MB per file, JPG / PNG / WebP only.
-- The bucket is assumed to be PUBLIC so the shop can show the images through
-- their public URLs without any policy. Check this in
-- Storage > product-images > the bucket must be marked "Public".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,  -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and is_admin());

drop policy if exists "admin read product images" on storage.objects;
create policy "admin read product images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'product-images' and is_admin());

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and is_admin());
