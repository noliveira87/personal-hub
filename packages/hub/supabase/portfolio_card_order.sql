-- Portfolio card order persistence for short-term and long-term sections
-- Run this in Supabase SQL Editor.

create table if not exists public.portfolio_card_order (
  category text primary key check (category in ('short-term', 'long-term')),
  ordered_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_card_order enable row level security;

drop policy if exists "portfolio_card_order_select_anon" on public.portfolio_card_order;
create policy "portfolio_card_order_select_anon"
  on public.portfolio_card_order
  for select
  to anon
  using (true);

drop policy if exists "portfolio_card_order_insert_anon" on public.portfolio_card_order;
create policy "portfolio_card_order_insert_anon"
  on public.portfolio_card_order
  for insert
  to anon
  with check (true);

drop policy if exists "portfolio_card_order_update_anon" on public.portfolio_card_order;
create policy "portfolio_card_order_update_anon"
  on public.portfolio_card_order
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "portfolio_card_order_delete_anon" on public.portfolio_card_order;
create policy "portfolio_card_order_delete_anon"
  on public.portfolio_card_order
  for delete
  to anon
  using (true);
