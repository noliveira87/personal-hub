-- ETF monthly interest movements import (from cumulative values)
-- Run this in Supabase SQL Editor AFTER ETF Nuno and ETF Minina already exist in public.portfolio_investments.
--
-- Goal:
-- - take cumulative ETF interest by month
-- - convert it into monthly delta movements (adjustment / profit-loss)
-- - split each month 50/50 between ETF Nuno and ETF Minina
-- - append to PORTFOLIO_MOVEMENTS in notes (idempotent)
-- - replace previous generated ETF interest IDs so ongoing months can be refreshed
-- - make those values appear in monthly evolution analytics
--
-- How to update an ongoing month (e.g. March not closed yet):
-- 1) edit raw_cumulative for that month with the newest cumulative value
-- 2) run this script again
--    -> generated ETF interest IDs are rebuilt for Nuno/Minina, so March updates cleanly

with raw_cumulative(month, cumulative_interest) as (
  values
    ('2026-01', 4500.00::numeric),
    ('2026-02', 4750.00::numeric),
    ('2026-03', 4600.00::numeric)
),
monthly_delta as (
  select
    month,
    cumulative_interest,
    case
      when lag(cumulative_interest) over (order by month) is not null
        then cumulative_interest - lag(cumulative_interest) over (order by month)
      else null
    end as delta_interest,
    (month || '-28')::date as movement_date
  from raw_cumulative
),
first_month_inferred as (
  select
    md.month,
    md.cumulative_interest,
    coalesce(
      md.delta_interest,
      (
        select avg(x.delta_interest)
        from monthly_delta x
        where x.delta_interest is not null
      )
    ) as inferred_delta_interest,
    md.movement_date
  from monthly_delta md
),
target_candidates as (
  select
    id,
    name,
    notes,
    case
      when lower(name) like '%nuno%' then 'nuno'
      when lower(name) like '%minina%' then 'minina'
      else null
    end as owner
  from public.portfolio_investments
  where type = 'etf'
),
targets as (
  select id, name, notes, owner
  from target_candidates
  where owner is not null
),
valid_targets as (
  select t.*
  from targets t
  where (select count(*) from targets) = 2
),
raw_items(target_id, id, date, kind, amount, note) as (
  select
    t.id as target_id,
    'etf-juros-' || replace(d.month, '-', '') || '-' || t.owner,
    d.movement_date::text,
    'adjustment',
    d.inferred_delta_interest / 2,
    'ETF monthly interest (inferred monthly delta, 50/50 Nuno+Minina)'
  from first_month_inferred d
  cross join valid_targets t
),
parsed as (
  select
    t.id,
    t.name,
    t.owner,
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
  from valid_targets t
),
normalized as (
  select
    p.id,
    p.name,
    p.owner,
    p.user_notes,
    coalesce(
      (
        select jsonb_agg(elem)
        from jsonb_array_elements(p.existing_movements) elem
        where not ((elem ->> 'id') ~ '^etf-juros-[0-9]{6}(-[a-z]+)?$')
      ),
      '[]'::jsonb
    ) as existing_movements
  from parsed p
),
existing_ids as (
  select p.id, elem ->> 'id' as movement_id
  from normalized p
  cross join lateral jsonb_array_elements(p.existing_movements) elem
),
to_add as (
  select r.*
  from raw_items r
  where not exists (
    select 1
    from existing_ids e
    where e.id = r.target_id and e.movement_id = r.id
  )
),
new_json as (
  select
    target_id,
    coalesce(
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
  group by target_id
),
merged as (
  select
    p.id,
    p.user_notes,
    (
      select coalesce(jsonb_agg(obj order by obj ->> 'date', obj ->> 'id'), '[]'::jsonb)
      from (
        select distinct on (obj ->> 'id') obj
        from jsonb_array_elements(p.existing_movements || coalesce(n.added_movements, '[]'::jsonb)) obj
        order by obj ->> 'id'
      ) dedup
    ) as final_movements
  from normalized p
  left join new_json n on n.target_id = p.id
)
update public.portfolio_investments i
set
  notes = case
    when m.user_notes <> '' then 'PORTFOLIO_MOVEMENTS:' || m.final_movements::text || E'\n' || m.user_notes
    else 'PORTFOLIO_MOVEMENTS:' || m.final_movements::text
  end,
  updated_at = now()
from merged m
where i.id = m.id
;
