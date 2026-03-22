create table if not exists public.portfolio_investments (
  id text primary key,
  name text not null,
  category text not null check (category in ('short-term', 'long-term')),
  type text not null check (type in ('cash', 'etf', 'crypto', 'p2p', 'ppr')),
  invested_amount numeric(14,2) not null default 0,
  current_value numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_monthly_snapshots (
  month text primary key,
  total_invested numeric(14,2) not null default 0,
  total_current_value numeric(14,2) not null default 0,
  total_profit_loss numeric(14,2) not null default 0,
  overall_return_pct numeric(10,4) not null default 0,
  monthly_inflow numeric(14,2) not null default 0,
  monthly_performance numeric(14,2) not null default 0,
  monthly_return_pct numeric(10,4) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_investments enable row level security;
alter table public.portfolio_monthly_snapshots enable row level security;

create policy if not exists "portfolio public read" on public.portfolio_investments
for select using (true);

create policy if not exists "portfolio public write" on public.portfolio_investments
for all using (true) with check (true);

create policy if not exists "portfolio snapshots public read" on public.portfolio_monthly_snapshots
for select using (true);

create policy if not exists "portfolio snapshots public write" on public.portfolio_monthly_snapshots
for all using (true) with check (true);
