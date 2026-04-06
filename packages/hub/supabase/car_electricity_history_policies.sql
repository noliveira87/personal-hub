alter table public.car_electricity_history enable row level security;

drop policy if exists "car_electricity_history_select_anon" on public.car_electricity_history;
create policy "car_electricity_history_select_anon"
  on public.car_electricity_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists "car_electricity_history_update_anon" on public.car_electricity_history;
create policy "car_electricity_history_update_anon"
  on public.car_electricity_history
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "car_electricity_history_delete_anon" on public.car_electricity_history;
create policy "car_electricity_history_delete_anon"
  on public.car_electricity_history
  for delete
  to anon, authenticated
  using (true);