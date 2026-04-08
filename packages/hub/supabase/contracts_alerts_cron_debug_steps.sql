-- Contract Alerts Cron - Debug/Test/Prod Steps
-- Run this in Supabase SQL Editor.

-- =====================================================
-- QUICK 5-STEP MANUAL SEND TEST (copy-ready)
-- =====================================================

-- STEP 1) Confirm global settings
select
  id,
  contracts_enabled,
  (telegram_bot_token is not null and btrim(telegram_bot_token) <> '') as has_bot_token,
  (telegram_chat_id is not null and btrim(telegram_chat_id) <> '') as has_chat_id
from public.app_settings
where id = 'global';

-- STEP 2) Direct Telegram API test (returns request_id)
with cfg as (
  select
    telegram_bot_token as bot_token,
    telegram_chat_id as chat_id
  from public.app_settings
  where id = 'global'
)
select net.http_post(
  url := 'https://api.telegram.org/bot' || cfg.bot_token || '/sendMessage',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := jsonb_build_object(
    'chat_id', cfg.chat_id,
    'text', 'Direct Telegram SQL test ' || now()::text
  )
) as request_id
from cfg;

-- STEP 3) Check latest Telegram HTTP responses
select
  id,
  status_code,
  content,
  created
from net._http_response
order by created desc
limit 10;

-- STEP 4) Clear dedup for today and run the contract alert function now
update public.app_settings
set
  contracts_alerts_sent = contracts_alerts_sent - to_char(current_date, 'YYYY-MM-DD'),
  updated_at = now()
where id = 'global';

select public.send_contract_scheduled_alerts();

-- STEP 5) Re-check HTTP responses after function call
select
  id,
  status_code,
  content,
  created
from net._http_response
order by created desc
limit 10;

-- =====================================================
-- A) PRE-CHECKS
-- =====================================================

-- 1) Check global config for contracts/telegram
select
  id,
  contracts_enabled,
  (telegram_bot_token is not null and btrim(telegram_bot_token) <> '') as has_bot_token,
  (telegram_chat_id is not null and btrim(telegram_chat_id) <> '') as has_chat_id,
  contracts_alerts_sent
from public.app_settings
where id = 'global';

-- 2) Check alerts that should trigger today (custom specific-date)
with expanded as (
  select
    c.id as contract_id,
    c.name as contract_name,
    c.provider,
    a.alert,
    a.alert_index
  from public.contracts c
  cross join lateral jsonb_array_elements(coalesce(c.alerts, '[]'::jsonb)) with ordinality as a(alert, alert_index)
  where c.status in ('active', 'pending-cancellation')
    and coalesce(c.telegram_alert_enabled, false) = true
),
normalized as (
  select
    e.contract_id,
    e.contract_name,
    e.provider,
    e.alert_index,
    coalesce(e.alert->>'kind', 'days-before') as kind,
    case
      when coalesce(e.alert->>'specificDate', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then (e.alert->>'specificDate')::date
      else null
    end as trigger_date,
    case
      when e.alert ? 'telegramEnabled' then (coalesce(nullif(lower(e.alert->>'telegramEnabled'), ''), 'false') = 'true')
      else true
    end as telegram_enabled,
    coalesce(nullif(e.alert->>'reason', ''), '') as reason
  from expanded e
)
select
  n.contract_id,
  n.contract_name,
  n.provider,
  n.alert_index,
  n.trigger_date,
  n.reason,
  (n.contract_id::text || ':' || n.alert_index::text || ':' || n.trigger_date::text) as signature
from normalized n
where n.kind = 'specific-date'
  and n.telegram_enabled = true
  and n.trigger_date = current_date
order by n.contract_name, n.alert_index;

-- 3) Show what is already marked as sent today
select coalesce(contracts_alerts_sent -> to_char(current_date, 'YYYY-MM-DD'), '[]'::jsonb) as sent_today
from public.app_settings
where id = 'global';


-- =====================================================
-- B) OPTIONAL RESET OF TODAY SENT MAP (for retesting)
-- =====================================================

-- Uncomment to clear only today's sent signatures:
-- update public.app_settings
-- set contracts_alerts_sent = contracts_alerts_sent - to_char(current_date, 'YYYY-MM-DD'),
--     updated_at = now()
-- where id = 'global';


-- =====================================================
-- C) MANUAL FUNCTION TEST
-- =====================================================

-- Manual trigger. Returns void, so SQL result may appear blank.
select public.send_contract_scheduled_alerts();

-- Check sent map after manual trigger
select coalesce(contracts_alerts_sent -> to_char(current_date, 'YYYY-MM-DD'), '[]'::jsonb) as sent_today_after_manual
from public.app_settings
where id = 'global';


-- =====================================================
-- D) CRON TEST MODE (every minute)
-- =====================================================

-- 1) Remove existing job names if present
select cron.unschedule('contracts-scheduled-alerts')
where exists (select 1 from cron.job where jobname = 'contracts-scheduled-alerts');

select cron.unschedule('contracts-alerts-job')
where exists (select 1 from cron.job where jobname = 'contracts-alerts-job');

-- 2) Schedule test run every minute
select cron.schedule(
  'contracts-scheduled-alerts',
  '* * * * *',
  $$select public.send_contract_scheduled_alerts();$$
);

-- 3) Confirm job exists and is active
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'contracts-scheduled-alerts';

-- 4) After 2-3 minutes, check executions
select
  d.jobid,
  d.status,
  coalesce(d.return_message, '(empty)') as return_message,
  d.start_time,
  d.end_time
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
where j.jobname = 'contracts-scheduled-alerts'
order by d.start_time desc
limit 20;

-- 5) Check sent map after cron test
select coalesce(contracts_alerts_sent -> to_char(current_date, 'YYYY-MM-DD'), '[]'::jsonb) as sent_today_after_cron
from public.app_settings
where id = 'global';


-- =====================================================
-- E) BACK TO PRODUCTION SCHEDULE
-- =====================================================

-- Daily at 09:00 UTC (10:00 Portugal in DST)
select cron.unschedule('contracts-scheduled-alerts')
where exists (select 1 from cron.job where jobname = 'contracts-scheduled-alerts');

select cron.schedule(
  'contracts-scheduled-alerts',
  '0 9 * * *',
  $$select public.send_contract_scheduled_alerts();$$
);

-- Final check
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'contracts-scheduled-alerts';
