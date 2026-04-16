-- Home expenses incremental migrations (consolidated)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

alter table public.home_expenses_transactions
  add column if not exists contract_id text references public.contracts(id) on delete set null;

alter table public.home_expenses_transactions
  add column if not exists notes text;

alter table public.home_expenses_transactions
  add column if not exists billing_period_start date;

alter table public.home_expenses_transactions
  add column if not exists billing_period_end date;

alter table public.home_expenses_transactions
  add column if not exists cubic_meters numeric(10,2);

alter table public.home_expenses_transactions
  add column if not exists reading_date date;

create index if not exists home_expenses_transactions_contract_id_date_idx
  on public.home_expenses_transactions (contract_id, date desc)
  where contract_id is not null;

insert into public.home_expenses_transactions (
  id,
  name,
  type,
  category,
  amount,
  date,
  recurring,
  contract_id,
  created_at
)
select
  gen_random_uuid(),
  c.name || ' (' || c.provider || ')',
  'expense',
  case c.category
    when 'mortgage' then 'mortgage'
    when 'home-insurance' then 'mortgage'
    when 'apartment-insurance' then 'mortgage'
    when 'gas' then 'electricity'
    when 'electricity' then 'electricity'
    when 'internet' then 'internet'
    when 'mobile' then 'internet'
    when 'water' then 'water'
    else 'other'
  end,
  h.price,
  h.date::date,
  c.billing_frequency = 'monthly',
  h.contract_id,
  h.created_at
from public.contract_price_history h
join public.contracts c on c.id = h.contract_id
where not exists (
  select 1
  from public.home_expenses_transactions t
  where t.contract_id = h.contract_id
    and t.type = 'expense'
    and t.date = h.date::date
    and t.amount = h.price
);
