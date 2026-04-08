-- Storage bucket and policies for warranties receipts
-- Required by src/lib/warranties.ts (bucket: 'receipts')

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Clean up known/legacy policy names if they exist
drop policy if exists "Anyone can upload receipts" on storage.objects;
drop policy if exists "Anyone can read receipts" on storage.objects;
drop policy if exists "Anyone can update receipts" on storage.objects;
drop policy if exists "Anyone can delete receipts" on storage.objects;
drop policy if exists "Public can read receipts" on storage.objects;
drop policy if exists "Authenticated users can upload receipts" on storage.objects;
drop policy if exists "Authenticated users can update receipts" on storage.objects;
drop policy if exists "Authenticated users can delete receipts" on storage.objects;

-- Allow upload/update/delete for anon + authenticated users.
-- This project runs without per-user auth, so policies are bucket-scoped.
create policy "Anyone can upload receipts"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'receipts');

create policy "Anyone can read receipts"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'receipts');

create policy "Anyone can update receipts"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'receipts')
with check (bucket_id = 'receipts');

create policy "Anyone can delete receipts"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'receipts');
