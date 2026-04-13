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
