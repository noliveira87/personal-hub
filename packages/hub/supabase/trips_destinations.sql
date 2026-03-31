-- One-time migration for multi-destination trips support.
-- Safe to run multiple times.
alter table public.trips
  add column if not exists destinations jsonb not null default '[]'::jsonb;

update public.trips
set destinations = jsonb_build_array(destination)
where (destinations is null or jsonb_typeof(destinations) <> 'array' or jsonb_array_length(destinations) = 0)
  and coalesce(destination, '') <> '';
