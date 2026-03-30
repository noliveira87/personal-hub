alter table public.contracts
  add column if not exists housing_usage text;

alter table public.contracts
  drop constraint if exists contracts_housing_usage_check;

alter table public.contracts
  add constraint contracts_housing_usage_check
  check (housing_usage is null or housing_usage in ('primary-residence', 'secondary-home'));
