-- Home expenses manual transactions (salary/income + ad-hoc expenses)
-- Contract-generated transactions are computed at runtime and NOT stored here.
create table if not exists public.home_expenses_transactions (
  id uuid primary key,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  category text,
  amount numeric(12,2) not null,
  date date not null,
  recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists home_expenses_transactions_date_idx
  on public.home_expenses_transactions (date desc);

alter table public.home_expenses_transactions enable row level security;

drop policy if exists "Transactions are readable by everyone" on public.home_expenses_transactions;
create policy "Transactions are readable by everyone"
  on public.home_expenses_transactions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Transactions are insertable by everyone" on public.home_expenses_transactions;
create policy "Transactions are insertable by everyone"
  on public.home_expenses_transactions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Transactions are updatable by everyone" on public.home_expenses_transactions;
create policy "Transactions are updatable by everyone"
  on public.home_expenses_transactions
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Transactions are deletable by everyone" on public.home_expenses_transactions;
create policy "Transactions are deletable by everyone"
  on public.home_expenses_transactions
  for delete
  to anon, authenticated
  using (true);
