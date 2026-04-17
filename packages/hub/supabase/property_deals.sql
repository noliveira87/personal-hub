-- Property deals (real estate buy/sell manager)
create table if not exists public.property_deals (
  id text primary key,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_deals_updated_at_idx
  on public.property_deals (updated_at desc);

alter table public.property_deals enable row level security;

drop policy if exists "property_deals_select" on public.property_deals;
create policy "property_deals_select"
  on public.property_deals
  for select
  to anon, authenticated
  using (true);

drop policy if exists "property_deals_insert" on public.property_deals;
create policy "property_deals_insert"
  on public.property_deals
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "property_deals_update" on public.property_deals;
create policy "property_deals_update"
  on public.property_deals
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "property_deals_delete" on public.property_deals;
create policy "property_deals_delete"
  on public.property_deals
  for delete
  to anon, authenticated
  using (true);
