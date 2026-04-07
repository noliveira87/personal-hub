-- Health module tables
-- Run in Supabase SQL Editor.
-- health_appointments: one row per individual appointment/exam (person + category + date)
-- health_person_notes: free-form note per person

-- ─── Appointments ────────────────────────────────────────────────────────────
create table if not exists public.health_appointments (
  id          uuid        primary key default gen_random_uuid(),
  person      text        not null check (person in ('nuno', 'minina')),
  category    text        not null,
  date        date        not null,
  clinic      text,
  doctor      text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (person, category, date)
);

alter table public.health_appointments
  add column if not exists clinic text,
  add column if not exists doctor text;

create index if not exists health_appointments_person_idx
  on public.health_appointments (person);
create index if not exists health_appointments_person_category_idx
  on public.health_appointments (person, category);

alter table public.health_appointments enable row level security;

drop policy if exists "health_appointments_select" on public.health_appointments;
drop policy if exists "health_appointments_insert" on public.health_appointments;
drop policy if exists "health_appointments_update" on public.health_appointments;
drop policy if exists "health_appointments_delete" on public.health_appointments;

create policy "health_appointments_select" on public.health_appointments
  for select to anon, authenticated using (true);
create policy "health_appointments_insert" on public.health_appointments
  for insert to anon, authenticated with check (true);
create policy "health_appointments_update" on public.health_appointments
  for update to anon, authenticated using (true) with check (true);
create policy "health_appointments_delete" on public.health_appointments
  for delete to anon, authenticated using (true);

-- ─── Cholesterol entries ────────────────────────────────────────────────────
create table if not exists public.health_cholesterol_entries (
  id             uuid        primary key default gen_random_uuid(),
  person         text        not null check (person in ('nuno', 'minina')),
  year           integer     not null,
  entry_order    integer     not null default 1 check (entry_order > 0),
  total          integer,
  hdl            integer,
  ldl            integer,
  triglycerides  integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (person, year, entry_order)
);

create index if not exists health_cholesterol_entries_person_idx
  on public.health_cholesterol_entries (person);
create index if not exists health_cholesterol_entries_person_year_idx
  on public.health_cholesterol_entries (person, year desc, entry_order asc);

alter table public.health_cholesterol_entries enable row level security;

drop policy if exists "health_cholesterol_select" on public.health_cholesterol_entries;
drop policy if exists "health_cholesterol_insert" on public.health_cholesterol_entries;
drop policy if exists "health_cholesterol_update" on public.health_cholesterol_entries;
drop policy if exists "health_cholesterol_delete" on public.health_cholesterol_entries;

create policy "health_cholesterol_select" on public.health_cholesterol_entries
  for select to anon, authenticated using (true);
create policy "health_cholesterol_insert" on public.health_cholesterol_entries
  for insert to anon, authenticated with check (true);
create policy "health_cholesterol_update" on public.health_cholesterol_entries
  for update to anon, authenticated using (true) with check (true);
create policy "health_cholesterol_delete" on public.health_cholesterol_entries
  for delete to anon, authenticated using (true);

-- ─── Person notes ────────────────────────────────────────────────────────────
create table if not exists public.health_person_notes (
  person      text        primary key check (person in ('nuno', 'minina')),
  note        text        not null default '',
  updated_at  timestamptz not null default now()
);

alter table public.health_person_notes enable row level security;

drop policy if exists "health_person_notes_select" on public.health_person_notes;
drop policy if exists "health_person_notes_upsert" on public.health_person_notes;

create policy "health_person_notes_select" on public.health_person_notes
  for select to anon, authenticated using (true);
create policy "health_person_notes_upsert" on public.health_person_notes
  for all to anon, authenticated using (true) with check (true);
