-- Shows feature schema + storage setup (idempotent)

create extension if not exists pgcrypto;

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  venue text not null,
  city text not null,
  description text,
  notes text,
  cover_image_path text,
  gallery_paths text[] not null default '{}',
  rating integer not null default 0,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shows add column if not exists description text;
alter table public.shows add column if not exists notes text;
alter table public.shows add column if not exists cover_image_path text;
alter table public.shows add column if not exists gallery_paths text[] not null default '{}';
alter table public.shows add column if not exists rating integer not null default 0;
alter table public.shows add column if not exists tags text[] not null default '{}';
alter table public.shows add column if not exists favorite boolean not null default false;
alter table public.shows add column if not exists created_at timestamptz not null default now();
alter table public.shows add column if not exists updated_at timestamptz not null default now();

update public.shows set gallery_paths = '{}' where gallery_paths is null;
update public.shows set tags = '{}' where tags is null;
update public.shows set rating = 0 where rating is null;
update public.shows set favorite = false where favorite is null;

-- Keep updated_at in sync
create or replace function public.set_updated_at_shows()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shows_set_updated_at on public.shows;
create trigger shows_set_updated_at
before update on public.shows
for each row
execute function public.set_updated_at_shows();

alter table public.shows enable row level security;

drop policy if exists "Allow anon select shows" on public.shows;
create policy "Allow anon select shows"
on public.shows
for select
to anon
using (true);

drop policy if exists "Allow anon insert shows" on public.shows;
create policy "Allow anon insert shows"
on public.shows
for insert
to anon
with check (true);

drop policy if exists "Allow anon update shows" on public.shows;
create policy "Allow anon update shows"
on public.shows
for update
to anon
using (true)
with check (true);

drop policy if exists "Allow anon delete shows" on public.shows;
create policy "Allow anon delete shows"
on public.shows
for delete
to anon
using (true);

-- Storage bucket for shows images
insert into storage.buckets (id, name, public)
values ('shows', 'shows', true)
on conflict (id) do nothing;

-- Storage policies (public access + anon write)
drop policy if exists "Public read shows bucket" on storage.objects;
create policy "Public read shows bucket"
on storage.objects
for select
to public
using (bucket_id = 'shows');

drop policy if exists "Anon upload shows bucket" on storage.objects;
create policy "Anon upload shows bucket"
on storage.objects
for insert
to anon
with check (bucket_id = 'shows');

drop policy if exists "Anon update shows bucket" on storage.objects;
create policy "Anon update shows bucket"
on storage.objects
for update
to anon
using (bucket_id = 'shows')
with check (bucket_id = 'shows');

drop policy if exists "Anon delete shows bucket" on storage.objects;
create policy "Anon delete shows bucket"
on storage.objects
for delete
to anon
using (bucket_id = 'shows');
