alter table public.home_expenses_transactions
  add column if not exists notes text;
