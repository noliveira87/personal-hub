-- GoParity P2P movements import
-- Run this in Supabase SQL Editor AFTER your P2P investment already exists in public.portfolio_investments.
--
-- What this does:
-- - finds the existing P2P investment row (prefers name 'GoParity' or 'P2P')
-- - appends the GoParity cashflow movements into PORTFOLIO_MOVEMENTS inside notes
-- - aligns P2P totals to the agreed values from your sheet
-- - keeps capital amortization (-6.18) visible in movement history but NOT counted as investment
-- - is idempotent: running it twice does not duplicate the same movements

with raw_items(id, date, kind, amount, note) as (
  values
    ('goparity-2026-03-25-jord-green-fuel-ii',              '2026-03-25', 'adjustment', 1.44::numeric, 'Jord: Green Fuel II'),
    ('goparity-2026-03-23-lime-packing-house-ii-juros',     '2026-03-23', 'adjustment', 0.03::numeric, 'Lime Packing House II (Juros)'),
    ('goparity-2026-03-20-boil-fest',                       '2026-03-20', 'adjustment', 0.99::numeric, 'Boil Fest'),
    ('goparity-2026-03-19-lime-packing-house-ii',           '2026-03-19', 'adjustment', 1.87::numeric, 'Lime Packing House II'),
    ('goparity-2026-03-18-ambiente-solar-minifarm-juros',   '2026-03-18', 'adjustment', 0.01::numeric, 'Ambiente Solar: Minifarm (Juros)'),
    ('goparity-2026-03-17-ambiente-solar-minifarm',         '2026-03-17', 'adjustment', 0.31::numeric, 'Ambiente Solar: Minifarm'),
    ('goparity-2026-02-20-boil-fest',                       '2026-02-20', 'adjustment', 0.98::numeric, 'Boil Fest'),
    ('goparity-2026-02-20-ambiente-solar-minifarm-juros',   '2026-02-20', 'adjustment', 0.01::numeric, 'Ambiente Solar: Minifarm (Juros)'),
    ('goparity-2026-02-20-ambiente-solar-minifarm',         '2026-02-20', 'adjustment', 0.38::numeric, 'Ambiente Solar: Minifarm'),
    ('goparity-2026-01-13-jord-green-fuel-iii',             '2026-01-13', 'adjustment', 0.29::numeric, 'Jord: Green Fuel III'),
    ('goparity-2026-01-08-artisan-topic',                   '2026-01-08', 'adjustment', 0.46::numeric, 'Artisan Topic'),
    ('goparity-2026-01-05-artisan-topic-juros',             '2026-01-05', 'adjustment', 0.02::numeric, 'Artisan Topic (Juros)'),
    ('goparity-2026-01-03-ajuste-amortizacao-capital',      '2026-01-03', 'withdrawal', 6.18::numeric, 'Ajuste – Amortização de capital 2026-01'),
    ('goparity-2026-01-03-ambiente-solar-minifarm',         '2026-01-03', 'adjustment', 1.19::numeric, 'Ambiente Solar: Minifarm'),
    ('goparity-2026-01-03-artisan-topic',                   '2026-01-03', 'adjustment', 6.34::numeric, 'Artisan Topic')
),
target as (
  select id, name, notes, invested_amount, current_value
  from public.portfolio_investments
  where type = 'p2p'
  order by
    case when lower(name) = 'goparity' then 0 when lower(name) = 'p2p' then 1 else 2 end,
    created_at asc
  limit 1
),
parsed as (
  select
    t.id,
    t.name,
    t.invested_amount,
    t.current_value,
    t.notes,
    coalesce(
      case
        when coalesce(t.notes, '') ~ '(^|\n)PORTFOLIO_MOVEMENTS:'
          then ((regexp_match(t.notes, 'PORTFOLIO_MOVEMENTS:([^\n]+)'))[1])::jsonb
        else '[]'::jsonb
      end,
      '[]'::jsonb
    ) as existing_movements,
    btrim(
      regexp_replace(
        coalesce(t.notes, ''),
        '(^|\n)PORTFOLIO_MOVEMENTS:[^\n]+',
        '',
        'g'
      ),
      E'\n '
    ) as user_notes
  from target t
),
existing_ids as (
  select p.id, elem ->> 'id' as movement_id
  from parsed p
  cross join lateral jsonb_array_elements(p.existing_movements) elem
),
to_add as (
  select r.*
  from raw_items r
  where not exists (
    select 1
    from existing_ids e
    where e.movement_id = r.id
  )
),
new_json as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'date', date,
        'kind', kind,
        'amount', amount,
        'note', note
      )
      order by date, id
    ),
    '[]'::jsonb
  ) as added_movements
  from to_add
),
merged as (
  select
    p.id,
    p.user_notes,
    (
      select coalesce(jsonb_agg(obj order by obj ->> 'date', obj ->> 'id'), '[]'::jsonb)
      from (
        select distinct on (obj ->> 'id') obj
        from jsonb_array_elements(p.existing_movements || n.added_movements) obj
        order by obj ->> 'id'
      ) dedup
    ) as final_movements
  from parsed p
  cross join new_json n
)
update public.portfolio_investments i
set
  invested_amount = 505.00,
  current_value = 544.59,
  notes = case
    when m.user_notes <> '' then 'PORTFOLIO_MOVEMENTS:' || m.final_movements::text || E'\n' || m.user_notes
    else 'PORTFOLIO_MOVEMENTS:' || m.final_movements::text
  end,
  updated_at = now()
from merged m
where i.id = m.id
;
