-- Global app settings for Personal Hub (Mode A: family/shared)
-- Run this in Supabase SQL Editor.

create table if not exists public.app_settings (
  id text primary key default 'global',
  telegram_bot_token text,
  telegram_chat_id text,
  warranties_enabled boolean not null default true,
  contracts_enabled boolean not null default true,
  portfolio_enabled boolean not null default false,
  warranty_alert_days integer not null default 30,
  warranty_alerts_sent jsonb not null default '{}'::jsonb,
  contracts_alerts_sent jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 'global')
);

alter table public.app_settings
  add column if not exists warranty_alerts_sent jsonb not null default '{}'::jsonb;

alter table public.app_settings
  add column if not exists contracts_alerts_sent jsonb not null default '{}'::jsonb;

alter table public.app_settings enable row level security;

-- Public anon read/write for single shared family setup (Mode A).
-- If you later add auth, replace these policies with user-scoped ones.
drop policy if exists "app_settings_select_anon" on public.app_settings;
create policy "app_settings_select_anon"
  on public.app_settings
  for select
  to anon
  using (true);

drop policy if exists "app_settings_insert_anon" on public.app_settings;
create policy "app_settings_insert_anon"
  on public.app_settings
  for insert
  to anon
  with check (id = 'global');

drop policy if exists "app_settings_update_anon" on public.app_settings;
create policy "app_settings_update_anon"
  on public.app_settings
  for update
  to anon
  using (id = 'global')
  with check (id = 'global');

insert into public.app_settings (
  id,
  warranties_enabled,
  contracts_enabled,
  portfolio_enabled,
  warranty_alert_days
)
values (
  'global',
  true,
  true,
  false,
  30
)
on conflict (id) do nothing;
