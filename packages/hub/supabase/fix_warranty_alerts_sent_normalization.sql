-- Normalize public.app_settings.warranty_alerts_sent keys to ISO format YYYY-MM-DD
-- and merge duplicate entries for the same day.

with src as (
  select warranty_alerts_sent
  from public.app_settings
  where id = 'global'
),
pairs as (
  select
    case
      when k ~ '^\d{4}-\d{2}-\d{2}$' then k
      else to_char(to_date(k, 'Dy Mon DD YYYY'), 'YYYY-MM-DD')
    end as day_key,
    jsonb_array_elements_text(v) as sig
  from src,
  jsonb_each(warranty_alerts_sent) as e(k, v)
  where jsonb_typeof(v) = 'array'
),
agg as (
  select day_key, jsonb_agg(distinct sig) as sigs
  from pairs
  where day_key is not null
  group by day_key
)
update public.app_settings s
set warranty_alerts_sent = (
  select coalesce(jsonb_object_agg(day_key, sigs), '{}'::jsonb)
  from agg
)
where s.id = 'global';

-- Optional check
select warranty_alerts_sent from public.app_settings where id = 'global';
