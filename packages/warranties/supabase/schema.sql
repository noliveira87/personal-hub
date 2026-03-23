create extension if not exists "pgcrypto";

create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  category text not null default 'others' check (category in ('tech', 'appliances', 'others')),
  purchased_from text,
  purchase_date date not null,
  warranty_years int not null check (warranty_years in (2, 3)),
  expiration_date date not null,
  price numeric(10, 2),
  receipt_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.warranties
add column if not exists category text;

update public.warranties
set category = 'others'
where category is null;

alter table public.warranties
alter column category set default 'others';

alter table public.warranties
alter column category set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'warranties_category_check'
  ) then
    alter table public.warranties
    add constraint warranties_category_check
    check (category in ('tech', 'appliances', 'others'));
  end if;
end $$;

alter table public.warranties
add column if not exists price numeric(10, 2);

alter table public.warranties
add column if not exists archived_at timestamptz;

create index if not exists warranties_created_at_idx on public.warranties (created_at desc);
create index if not exists warranties_archived_at_idx on public.warranties (archived_at);

alter table public.warranties enable row level security;

drop policy if exists "Allow anon select warranties" on public.warranties;
drop policy if exists "Allow anon insert warranties" on public.warranties;
drop policy if exists "Allow anon update warranties" on public.warranties;
drop policy if exists "Allow anon delete warranties" on public.warranties;

create policy "Allow anon select warranties"
on public.warranties
for select
to anon
using (true);

create policy "Allow anon insert warranties"
on public.warranties
for insert
to anon
with check (true);

create policy "Allow anon update warranties"
on public.warranties
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete warranties"
on public.warranties
for delete
to anon
using (true);

-- STORAGE SETUP INSTRUCTIONS:
-- 1. In Supabase Dashboard, go to Storage (left sidebar)
-- 2. Click "Create bucket" and name it: receipts
-- 3. Enable "Public bucket" toggle
-- 4. Click "Create bucket"
-- 5. Select the "receipts" bucket and go to Policies tab
-- 6. Add INSERT policy: (leave all selections default) USING (true) WITH CHECK (true)
-- 7. Add SELECT policy: (leave all selections default) USING (true)
-- 8. Add DELETE policy: USING (bucket_id = 'receipts')
-- 9. Done! Receipts can now be uploaded and deleted


-- CONTRACTS TABLE
create table if not exists public.contracts (
  id text primary key,
  name text not null,
  category text not null,
  provider text not null,
  type text not null,
  start_date text not null,
  end_date text not null,
  renewal_type text not null,
  billing_frequency text not null,
  price numeric(12, 2) not null,
  currency text not null default 'EUR',
  notes text,
  status text not null default 'active',
  alerts jsonb default '[]'::jsonb,
  telegram_alert_enabled boolean default false,
  document_links text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_created_at_idx on public.contracts (created_at desc);
create index if not exists contracts_end_date_idx on public.contracts (end_date);
create index if not exists contracts_status_idx on public.contracts (status);

alter table public.contracts enable row level security;

drop policy if exists "Allow anon select contracts" on public.contracts;
drop policy if exists "Allow anon insert contracts" on public.contracts;
drop policy if exists "Allow anon update contracts" on public.contracts;
drop policy if exists "Allow anon delete contracts" on public.contracts;

create policy "Allow anon select contracts"
on public.contracts
for select
to anon
using (true);

create policy "Allow anon insert contracts"
on public.contracts
for insert
to anon
with check (true);

create policy "Allow anon update contracts"
on public.contracts
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete contracts"
on public.contracts
for delete
to anon
using (true);

