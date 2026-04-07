-- Add restaurant address support to journey bites
alter table if exists public.journey_bites
  add column if not exists restaurant_address text;
