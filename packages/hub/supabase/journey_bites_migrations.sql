-- Journey Bites incremental migrations (consolidated)
-- Safe to run multiple times.

alter table if exists public.journey_bites
  add column if not exists restaurant_address text;
