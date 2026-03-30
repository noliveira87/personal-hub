alter table public.contracts
  add column if not exists mortgage_details jsonb;
