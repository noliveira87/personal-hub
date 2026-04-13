alter table public.home_expenses_transactions
  add column if not exists cubic_meters numeric(10,2);

alter table public.home_expenses_transactions
  add column if not exists reading_date date;
