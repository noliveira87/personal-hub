-- Contracts incremental migrations (consolidated)
-- Safe to run multiple times.

alter table public.contracts
  add column if not exists payment_type text,
  add column if not exists payment_source text,
  add column if not exists direct_debit_timing text;

alter table public.contracts
  drop constraint if exists contracts_payment_type_check;

alter table public.contracts
  add constraint contracts_payment_type_check
  check (
    payment_type is null
    or payment_type in (
      'direct-debit',
      'bank-transfer',
      'card',
      'entity-reference',
      'mbway',
      'cash',
      'other'
    )
  );

alter table public.contracts
  drop constraint if exists contracts_direct_debit_timing_check;

alter table public.contracts
  add constraint contracts_direct_debit_timing_check
  check (
    direct_debit_timing is null
    or direct_debit_timing in ('start', 'end')
  );

alter table public.contracts
  add column if not exists mortgage_details jsonb;

alter table public.contracts
  add column if not exists housing_usage text;

alter table public.contracts
  drop constraint if exists contracts_housing_usage_check;

alter table public.contracts
  add constraint contracts_housing_usage_check
  check (housing_usage is null or housing_usage in ('primary-residence', 'secondary-home'));

alter table public.contracts
  add column if not exists show_in_checklist boolean;

update public.contracts
set show_in_checklist = true
where show_in_checklist is null;

alter table public.contracts
  alter column show_in_checklist set default true;

alter table public.contracts
  alter column show_in_checklist set not null;

alter table public.contracts
  add column if not exists default_monthly_value numeric(10, 2) default null;
