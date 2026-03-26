-- Portfolio earnings ledger (surveys, cashback, crypto cashback)
-- Run this in Supabase SQL Editor.

create table if not exists public.portfolio_earnings (
  id text primary key,
  title text not null,
  provider text,
  kind text not null check (kind in ('cashback', 'survey', 'crypto_cashback')),
  date text not null,
  amount_eur numeric(12, 2) not null default 0,
  crypto_asset text check (crypto_asset in ('BTC', 'ETH')),
  crypto_units numeric(20, 8),
  spot_eur_at_earned numeric(14, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_earnings_date_idx
  on public.portfolio_earnings (date desc);

alter table public.portfolio_earnings enable row level security;

drop policy if exists "portfolio_earnings_select_anon" on public.portfolio_earnings;
create policy "portfolio_earnings_select_anon"
  on public.portfolio_earnings
  for select
  to anon
  using (true);

drop policy if exists "portfolio_earnings_insert_anon" on public.portfolio_earnings;
create policy "portfolio_earnings_insert_anon"
  on public.portfolio_earnings
  for insert
  to anon
  with check (true);

drop policy if exists "portfolio_earnings_update_anon" on public.portfolio_earnings;
create policy "portfolio_earnings_update_anon"
  on public.portfolio_earnings
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "portfolio_earnings_delete_anon" on public.portfolio_earnings;
create policy "portfolio_earnings_delete_anon"
  on public.portfolio_earnings
  for delete
  to anon
  using (true);
