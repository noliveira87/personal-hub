-- Journey Bites module schema (integrated with existing trips)
create extension if not exists pgcrypto;

create table if not exists public.journey_bites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  source_food_index integer,
  dish_name text not null,
  description text,
  restaurant_name text,
  review_url text,
  photo_path text,
  eaten_on date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, source_food_index)
);

create index if not exists journey_bites_trip_idx on public.journey_bites (trip_id);
create index if not exists journey_bites_eaten_on_idx on public.journey_bites (eaten_on desc nulls last);

alter table public.journey_bites enable row level security;

drop policy if exists "Journey bites are readable by everyone" on public.journey_bites;
create policy "Journey bites are readable by everyone"
  on public.journey_bites
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Journey bites are insertable by everyone" on public.journey_bites;
create policy "Journey bites are insertable by everyone"
  on public.journey_bites
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Journey bites are updatable by everyone" on public.journey_bites;
create policy "Journey bites are updatable by everyone"
  on public.journey_bites
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Journey bites are deletable by everyone" on public.journey_bites;
create policy "Journey bites are deletable by everyone"
  on public.journey_bites
  for delete
  to anon, authenticated
  using (true);

-- Backfill legacy foods from trips.foods jsonb.
insert into public.journey_bites (
  id,
  trip_id,
  source_food_index,
  dish_name,
  description,
  review_url,
  photo_path,
  eaten_on,
  sort_order,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  t.id,
  (food.ordinality - 1)::integer,
  trim(food.item ->> 'name') as dish_name,
  nullif(trim(food.item ->> 'description'), '') as description,
  nullif(trim(food.item ->> 'reviewUrl'), '') as review_url,
  nullif(trim(food.item ->> 'image'), '') as photo_path,
  t.end_date,
  (food.ordinality - 1)::integer,
  now(),
  now()
from public.trips t
cross join lateral jsonb_array_elements(coalesce(t.foods, '[]'::jsonb)) with ordinality as food(item, ordinality)
where nullif(trim(food.item ->> 'name'), '') is not null
on conflict (trip_id, source_food_index) do nothing;
