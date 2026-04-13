alter table public.home_expenses_transactions
  add column if not exists billing_period_start date;

alter table public.home_expenses_transactions
  add column if not exists billing_period_end date;