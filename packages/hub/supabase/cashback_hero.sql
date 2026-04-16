-- Cashback Hero tables
-- Run this in Supabase SQL Editor before using the Cashback Hero feature.

create table if not exists public.cashback_purchases (
  id text primary key,
  merchant text not null,
  category text not null default 'other' check (category in ('groceries', 'tech', 'travel', 'car', 'dining', 'shopping', 'entertainment', 'transport', 'health', 'other')),
  date date not null,
  amount numeric(12, 2) not null default 0,
  notes text,
  is_referral boolean not null default false,
  is_unibanco boolean not null default false,
  is_cetelem boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cashback_purchases
  add column if not exists merchant text,
  add column if not exists category text,
  add column if not exists date date,
  add column if not exists amount numeric(12, 2) default 0,
  add column if not exists notes text,
  add column if not exists is_referral boolean default false,
  add column if not exists is_unibanco boolean default false,
  add column if not exists is_cetelem boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.cashback_purchases
  drop constraint if exists cashback_purchases_category_check;

alter table public.cashback_purchases
  add constraint cashback_purchases_category_check
  check (category in ('groceries', 'tech', 'travel', 'car', 'dining', 'shopping', 'entertainment', 'transport', 'health', 'other'));

create table if not exists public.cashback_entries (
  id text primary key,
  purchase_id text not null references public.cashback_purchases(id) on delete cascade,
  source text not null,
  amount numeric(12, 2) not null default 0,
  points numeric(20, 8),
  date_received date not null,
  legacy_portfolio_earning_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cashback_entries
  add column if not exists purchase_id text,
  add column if not exists source text,
  add column if not exists amount numeric(12, 2) default 0,
  add column if not exists points numeric(20, 8),
  add column if not exists date_received date,
  add column if not exists legacy_portfolio_earning_id text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists cashback_entries_legacy_portfolio_earning_id_idx
  on public.cashback_entries (legacy_portfolio_earning_id)
  where legacy_portfolio_earning_id is not null;

create index if not exists cashback_purchases_date_idx
  on public.cashback_purchases (date desc);

create index if not exists cashback_purchases_is_cetelem_idx
  on public.cashback_purchases (is_cetelem);

create index if not exists cashback_entries_purchase_id_idx
  on public.cashback_entries (purchase_id);

create index if not exists cashback_entries_date_received_idx
  on public.cashback_entries (date_received desc);

-- Link cashback purchases with home-expense transactions (optional)
create table if not exists public.cashback_purchase_home_expense_links (
  id text primary key,
  purchase_id text not null references public.cashback_purchases(id) on delete cascade,
  home_expense_transaction_id uuid not null references public.home_expenses_transactions(id) on delete cascade,
  contract_id text not null references public.contracts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_id)
);

alter table public.cashback_purchase_home_expense_links
  add column if not exists purchase_id text,
  add column if not exists home_expense_transaction_id uuid,
  add column if not exists contract_id text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cashback_purchase_home_expense_links'
      and column_name = 'home_expense_transaction_id'
      and data_type = 'text'
  ) then
    alter table public.cashback_purchase_home_expense_links
      alter column home_expense_transaction_id type uuid
      using home_expense_transaction_id::uuid;
  end if;
end $$;

create index if not exists cashback_purchase_home_expense_links_purchase_id_idx
  on public.cashback_purchase_home_expense_links (purchase_id);

create index if not exists cashback_purchase_home_expense_links_contract_id_idx
  on public.cashback_purchase_home_expense_links (contract_id);

alter table public.cashback_purchases enable row level security;
alter table public.cashback_entries enable row level security;
alter table public.cashback_purchase_home_expense_links enable row level security;

drop policy if exists "cashback_purchases_select" on public.cashback_purchases;
create policy "cashback_purchases_select"
  on public.cashback_purchases
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cashback_purchases_insert" on public.cashback_purchases;
create policy "cashback_purchases_insert"
  on public.cashback_purchases
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cashback_purchases_update" on public.cashback_purchases;
create policy "cashback_purchases_update"
  on public.cashback_purchases
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "cashback_purchases_delete" on public.cashback_purchases;
create policy "cashback_purchases_delete"
  on public.cashback_purchases
  for delete
  to anon, authenticated
  using (true);

drop policy if exists "cashback_entries_select" on public.cashback_entries;
create policy "cashback_entries_select"
  on public.cashback_entries
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cashback_entries_insert" on public.cashback_entries;
create policy "cashback_entries_insert"
  on public.cashback_entries
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cashback_entries_update" on public.cashback_entries;
create policy "cashback_entries_update"
  on public.cashback_entries
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "cashback_entries_delete" on public.cashback_entries;
create policy "cashback_entries_delete"
  on public.cashback_entries
  for delete
  to anon, authenticated
  using (true);

drop policy if exists "cashback_purchase_home_expense_links_select" on public.cashback_purchase_home_expense_links;
create policy "cashback_purchase_home_expense_links_select"
  on public.cashback_purchase_home_expense_links
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cashback_purchase_home_expense_links_insert" on public.cashback_purchase_home_expense_links;
create policy "cashback_purchase_home_expense_links_insert"
  on public.cashback_purchase_home_expense_links
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cashback_purchase_home_expense_links_update" on public.cashback_purchase_home_expense_links;
create policy "cashback_purchase_home_expense_links_update"
  on public.cashback_purchase_home_expense_links
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "cashback_purchase_home_expense_links_delete" on public.cashback_purchase_home_expense_links;
create policy "cashback_purchase_home_expense_links_delete"
  on public.cashback_purchase_home_expense_links
  for delete
  to anon, authenticated
  using (true);

-- Cashback sources (user-managed list)
create table if not exists public.cashback_sources (
  id text primary key,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cashback_sources
  add column if not exists name text,
  add column if not exists sort_order integer default 0,
  add column if not exists created_at timestamptz default now();

alter table public.cashback_sources enable row level security;

drop policy if exists "cashback_sources_select" on public.cashback_sources;
create policy "cashback_sources_select"
  on public.cashback_sources
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cashback_sources_insert" on public.cashback_sources;
create policy "cashback_sources_insert"
  on public.cashback_sources
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cashback_sources_delete" on public.cashback_sources;
create policy "cashback_sources_delete"
  on public.cashback_sources
  for delete
  to anon, authenticated
  using (true);

-- Cashback cards (user-managed list for purchase card selector)
create table if not exists public.cashback_cards (
  id text primary key,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cashback_cards
  add column if not exists name text,
  add column if not exists sort_order integer default 0,
  add column if not exists created_at timestamptz default now();

alter table public.cashback_cards enable row level security;

drop policy if exists "cashback_cards_select" on public.cashback_cards;
create policy "cashback_cards_select"
  on public.cashback_cards
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cashback_cards_insert" on public.cashback_cards;
create policy "cashback_cards_insert"
  on public.cashback_cards
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cashback_cards_delete" on public.cashback_cards;
create policy "cashback_cards_delete"
  on public.cashback_cards
  for delete
  to anon, authenticated
  using (true);