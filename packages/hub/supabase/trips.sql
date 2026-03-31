-- Trips module schema
create table if not exists public.trips (
  id uuid primary key,
  title text not null,
  destination text not null,
  destinations jsonb not null default '[]'::jsonb,
  start_date date not null,
  end_date date not null,
  cost numeric(12,2) not null default 0,
  photos jsonb not null default '[]'::jsonb,
  hotels jsonb not null default '[]'::jsonb,
  foods jsonb not null default '[]'::jsonb,
  notes text not null default '',
  tags jsonb not null default '[]'::jsonb,
  travel jsonb,
  tickets jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_start_date_idx on public.trips (start_date desc);

alter table public.trips enable row level security;

drop policy if exists "Trips are readable by everyone" on public.trips;
create policy "Trips are readable by everyone"
  on public.trips
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Trips are insertable by everyone" on public.trips;
create policy "Trips are insertable by everyone"
  on public.trips
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Trips are updatable by everyone" on public.trips;
create policy "Trips are updatable by everyone"
  on public.trips
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Trips are deletable by everyone" on public.trips;
create policy "Trips are deletable by everyone"
  on public.trips
  for delete
  to anon, authenticated
  using (true);
