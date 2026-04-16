-- Cashback purchases - Cetelem support
-- Keep this migration idempotent for environments already migrated.
alter table if exists public.cashback_purchases
  add column if not exists is_cetelem boolean not null default false;

create index if not exists cashback_purchases_is_cetelem_idx
  on public.cashback_purchases (is_cetelem);
