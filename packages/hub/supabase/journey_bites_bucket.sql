-- Storage bucket for Journey Bites food photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journey-bites',
  'journey-bites',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Journey bites photos are publicly readable" on storage.objects;
create policy "Journey bites photos are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'journey-bites');

drop policy if exists "Journey bites photos are insertable" on storage.objects;
create policy "Journey bites photos are insertable"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'journey-bites');

drop policy if exists "Journey bites photos are updatable" on storage.objects;
create policy "Journey bites photos are updatable"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'journey-bites')
  with check (bucket_id = 'journey-bites');

drop policy if exists "Journey bites photos are deletable" on storage.objects;
create policy "Journey bites photos are deletable"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'journey-bites');
