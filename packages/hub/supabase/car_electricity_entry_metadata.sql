-- Metadata para entradas de carregamento no histórico de eletricidade do carro
-- Permite distinguir carregamentos em casa vs fora e guardar uma nota/descrição.

alter table public.car_electricity_history
  add column if not exists charging_location text;

alter table public.car_electricity_history
  add column if not exists charging_note text;

update public.car_electricity_history
set charging_location = coalesce(charging_location, 'home')
where charging_location is null;

alter table public.car_electricity_history
  alter column charging_location set default 'home';

-- Check constraint idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'car_electricity_history_charging_location_check'
      AND conrelid = 'public.car_electricity_history'::regclass
  ) THEN
    ALTER TABLE public.car_electricity_history
      ADD CONSTRAINT car_electricity_history_charging_location_check
      CHECK (charging_location IN ('home', 'outside'));
  END IF;
END $$;
