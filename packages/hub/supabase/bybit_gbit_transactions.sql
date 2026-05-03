-- Bybit GBIT transactions seed + schema

create table if not exists public.cashback_bybit_gbit_transactions (
  id text primary key,
  seed_key text unique,
  movement text not null,
  amount numeric(12, 2) not null default 0,
  bank text,
  purchase_type text,
  date date not null,
  curve_card text,
  days integer not null default 0,
  gbit boolean not null default false,
  gbit_applied_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cashback_bybit_gbit_transactions
  add column if not exists seed_key text,
  add column if not exists movement text,
  add column if not exists amount numeric(12, 2) default 0,
  add column if not exists bank text,
  add column if not exists purchase_type text,
  add column if not exists date date,
  add column if not exists curve_card text,
  add column if not exists days integer default 0,
  add column if not exists gbit boolean default false,
  add column if not exists gbit_applied_at date,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists cashback_bybit_gbit_transactions_seed_key_idx
  on public.cashback_bybit_gbit_transactions (seed_key)
  where seed_key is not null;

create index if not exists cashback_bybit_gbit_transactions_date_idx
  on public.cashback_bybit_gbit_transactions (date desc);

alter table public.cashback_bybit_gbit_transactions enable row level security;

drop policy if exists "cashback_bybit_gbit_transactions_select" on public.cashback_bybit_gbit_transactions;
create policy "cashback_bybit_gbit_transactions_select"
  on public.cashback_bybit_gbit_transactions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cashback_bybit_gbit_transactions_insert" on public.cashback_bybit_gbit_transactions;
create policy "cashback_bybit_gbit_transactions_insert"
  on public.cashback_bybit_gbit_transactions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cashback_bybit_gbit_transactions_update" on public.cashback_bybit_gbit_transactions;
create policy "cashback_bybit_gbit_transactions_update"
  on public.cashback_bybit_gbit_transactions
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "cashback_bybit_gbit_transactions_delete" on public.cashback_bybit_gbit_transactions;
create policy "cashback_bybit_gbit_transactions_delete"
  on public.cashback_bybit_gbit_transactions
  for delete
  to anon, authenticated
  using (true);

insert into public.cashback_bybit_gbit_transactions
  (id, seed_key, movement, amount, bank, date, curve_card, days, gbit)
values
  (gen_random_uuid()::text, 'bybit-2026-seed-001', 'Chinês', 8.70, 'ABanca', '2026-02-25', 'Nuno', 67, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-002', 'O Palco', 125.50, 'Santander', '2026-02-27', 'Nuno', 65, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-003', 'Amazon BR', 243.74, 'ABanca', '2026-03-02', 'Nuno', 62, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-004', 'Vente-unique', 62.29, 'Santander', '2026-03-02', 'Nuno', 62, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-005', 'Wells', 47.69, 'Santander', '2026-03-02', 'Nuno', 62, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-006', 'Hospital da Luz', 3.40, 'ABanca', '2026-03-04', 'Nuno', 60, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-007', 'Espaço Casa', 42.46, 'Santander', '2026-03-04', 'Nuno', 60, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-008', 'E002 Taveiro', 62.95, 'Santander', '2026-03-04', 'Nuno', 60, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-009', 'Banian Lda', 18.28, 'ABanca', '2026-03-05', 'Nuno', 59, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-010', 'Hiwell', 13.00, 'Santander', '2026-03-05', 'Nuno', 59, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-011', 'Hiwell', 124.80, 'Santander', '2026-03-05', 'Nuno', 59, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-012', 'Ok Sofas Coim', 139.00, 'ABanca', '2026-03-05', 'Nuno', 59, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-013', 'Continente', 155.25, 'ABanca', '2026-03-06', 'Nuno', 58, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-014', 'Bagga Cont', 4.08, 'ABanca', '2026-03-07', 'Nuno', 57, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-015', 'Continente', 23.67, 'ABanca', '2026-03-07', 'Nuno', 57, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-016', 'Homa', 75.00, 'ABanca', '2026-03-07', 'Nuno', 57, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-017', 'SushiHomu', 46.70, 'Santander', '2026-03-12', 'Minina', 52, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-018', 'Booking', 251.63, 'ABanca', '2026-03-18', 'Minina', 46, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-019', 'Café', 64.99, 'ABanca', '2026-03-19', 'Minina', 45, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-020', 'Katia', 56.00, 'ABanca', '2026-03-20', 'Minina', 44, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-021', 'Continente', 64.01, 'ABanca', '2026-03-20', 'Minina', 44, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-022', 'Alves Bandeira', 21.17, 'ABanca', '2026-03-22', 'Minina', 42, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-023', 'Continente', 61.63, 'ABanca', '2026-03-22', 'Minina', 42, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-024', 'HLuz', 150.00, 'Santander', '2026-03-23', 'Minina', 41, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-025', 'HLuz', 65.00, 'Santander', '2026-03-23', 'Minina', 41, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-026', 'Temu', 94.31, 'Santander', '2026-03-23', 'Minina', 41, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-027', 'Booking', 396.81, 'Santander', '2026-03-26', 'Minina', 38, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-028', 'Amazon', 29.25, 'Santander', '2026-03-27', 'Minina', 37, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-029', 'KuantoKusta', 21.98, 'Santander', '2026-03-27', 'Minina', 37, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-030', 'LIDL', 12.46, 'Santander', '2026-03-28', 'Minina', 36, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-031', 'Isakaya', 44.40, 'Santander', '2026-03-29', 'Minina', 35, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-032', 'Gois', 37.00, 'Santander', '2026-03-29', 'Minina', 35, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-033', 'VistoUK', 19.22, 'Santander', '2026-03-30', 'Minina', 34, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-034', 'VistoUK', 19.22, 'Santander', '2026-03-30', 'Minina', 34, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-035', 'EasyJet', 39.80, 'Santander', '2026-03-31', 'Minina', 33, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-036', 'Notino', 45.30, 'Santander', '2026-04-01', 'Minina', 32, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-037', 'Massadas', 85.00, 'Santander', '2026-04-01', 'Minina', 32, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-038', 'Booking RJ', 2292.55, 'Santander', '2026-04-02', 'Minina', 31, true),
  (gen_random_uuid()::text, 'bybit-2026-seed-039', 'Primark', 15.20, 'Santander', '2026-04-20', 'Minina', 13, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-040', 'Amazon', 91.56, 'ABanca', '2026-04-03', 'Minina', 30, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-041', 'LIDL', 31.27, 'ABanca', '2026-04-03', 'Minina', 30, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-042', 'Mauser', 34.44, 'ABanca', '2026-04-03', 'Minina', 30, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-043', 'Silvestre', 31.00, 'ABanca', '2026-04-03', 'Minina', 30, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-044', 'Nutrimagri', 17.14, 'ABanca', '2026-04-04', 'Minina', 29, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-045', 'AVelha', 48.00, 'ABanca', '2026-04-05', 'Minina', 28, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-046', 'Temu', 34.26, 'ABanca', '2026-04-05', 'Minina', 28, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-047', 'CBD', 1.90, 'ABanca', '2026-04-11', 'Minina', 22, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-048', 'Mercadona', 10.00, 'ABanca', '2026-04-12', 'Minina', 21, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-049', 'Mercadona', 10.00, 'ABanca', '2026-04-12', 'Minina', 21, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-050', 'Lidl', 7.63, 'ABanca', '2026-04-19', 'Minina', 14, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-051', 'Bagga Cont', 8.35, 'ABanca', '2026-04-20', 'Minina', 13, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-052', 'Continente', 0.82, 'ABanca', '2026-04-21', 'Minina', 12, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-053', 'Temu', 6.36, 'ABanca', '2026-04-22', 'Minina', 11, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-054', 'Temu', 2.88, 'ABanca', '2026-04-22', 'Minina', 11, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-055', 'Continente', 8.37, 'ABanca', '2026-04-22', 'Minina', 11, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-056', 'Rejuvemed', 49.20, 'ABanca', '2026-04-22', 'Minina', 11, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-057', 'Opo 9007', 1.50, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-058', 'Tram Airport', 12.00, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-059', 'Slug Lettuce', 34.22, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-060', 'Sinclairs Bar', 5.77, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-061', 'Tender Mackie', 23.08, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-062', 'Co-op', 4.62, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-063', 'Tesco', 7.04, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-064', 'Pharmacy', 3.20, 'ABanca', '2026-04-25', 'Minina', 8, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-065', 'Trof', 67.28, 'ABanca', '2026-04-26', 'Minina', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-066', 'Tkmaxx', 184.86, 'ABanca', '2026-04-26', 'Minina', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-067', 'Beenetwork', 4.04, 'ABanca', '2026-04-26', 'Minina', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-068', 'Mufc Megastore', 35.78, 'ABanca', '2026-04-26', 'Minina', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-069', 'Uber eats', 58.85, 'ABanca', '2026-04-26', 'Minina', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-070', 'Metrolink', 1.62, 'ABanca', '2026-04-27', 'Minina', 6, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-071', 'Beenetwork', 8.54, 'ABanca', '2026-04-27', 'Minina', 6, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-072', 'WH Smith', 5.77, 'ABanca', '2026-04-28', 'Minina', 5, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-073', 'Hiwell', 124.80, 'Santander', '2026-04-13', 'Nuno', 20, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-074', 'OLX', 4.49, 'Santander', '2026-04-14', 'Nuno', 19, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-075', 'Padaria Pastel', 7.45, 'Santander', '2026-04-15', 'Nuno', 18, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-076', 'Ryanair', 20.50, 'Santander', '2026-04-17', 'Nuno', 16, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-077', 'McDonalds', 4.60, 'Santander', '2026-04-28', 'Nuno', 5, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-078', 'Chinês', 16.25, 'ABanca', '2026-04-18', 'Nuno', 15, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-079', 'Segreto', 47.70, 'ABanca', '2026-04-19', 'Nuno', 14, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-080', 'Cafe Central', 2.40, 'ABanca', '2026-04-19', 'Nuno', 14, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-081', 'Mauser', 21.98, 'ABanca', '2026-04-20', 'Nuno', 13, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-082', 'Venn Canteen', 62.00, 'ABanca', '2026-04-24', 'Nuno', 9, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-083', 'Premium Maia', 4.00, 'ABanca', '2026-04-24', 'Nuno', 9, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-084', 'OLX', 4.49, 'ABanca', '2026-04-26', 'Nuno', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-085', 'Beenetwork', 4.04, 'ABanca', '2026-04-26', 'Nuno', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-086', 'Vuv Food', 10.17, 'ABanca', '2026-04-26', 'Nuno', 7, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-087', 'Vienna Coffee', 51.93, 'ABanca', '2026-04-27', 'Nuno', 6, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-088', 'Manchester Souv', 17.51, 'ABanca', '2026-04-27', 'Nuno', 6, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-089', 'Starbucks', 8.19, 'ABanca', '2026-04-27', 'Nuno', 6, false),
  (gen_random_uuid()::text, 'bybit-2026-seed-090', 'Beenetwork', 5.65, 'ABanca', '2026-04-27', 'Nuno', 6, false)
on conflict (seed_key) do nothing;

update public.cashback_bybit_gbit_transactions
set gbit_applied_at = '2026-05-01'
where seed_key like 'bybit-2026-seed-%'
  and gbit = true
  and gbit_applied_at is null;
