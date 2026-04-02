-- Debug Telegram Delivery Issue
-- Run these bloco a bloco para identificar onde a mensagem está falhando

-- =====================================================
-- 1) VERIFICAR CREDENTIALS
-- =====================================================

select
  id,
  contracts_enabled,
  telegram_bot_token,
  telegram_chat_id,
  (telegram_bot_token is not null and telegram_bot_token <> '') as has_token,
  (telegram_chat_id is not null and telegram_chat_id <> '') as has_chat_id
from public.app_settings
where id = 'global';


-- =====================================================
-- 2) VERIFICAR SE O ALERTA EXISTE E ESTÁ ATIVO
-- =====================================================

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
    coalesce((e.alert->>'telegramEnabled')::boolean, false) as telegram_enabled,
    coalesce(nullif(e.alert->>'reason', ''), '') as reason,
    e.alert as full_alert_json
  from expanded e
)
select
  n.contract_id,
  n.contract_name,
  n.provider,
  n.alert_index,
  n.kind,
  n.trigger_date,
  n.telegram_enabled,
  n.reason,
  current_date,
  (n.trigger_date = current_date) as should_trigger_today,
  n.full_alert_json
from normalized n
where n.kind = 'specific-date'
order by n.contract_name, n.alert_index;


-- =====================================================
-- 3) CHECK DEDUPLICATION - JÁ FOI ENVIADO HOJE?
-- =====================================================

-- Lista todos os alertas que já foram marcados como enviados hoje
select
  jsonb_array_elements(contracts_alerts_sent -> to_char(current_date, 'YYYY-MM-DD'))::text as sent_signature
from public.app_settings
where id = 'global'
  and contracts_alerts_sent ? to_char(current_date, 'YYYY-MM-DD');

-- Se a list acima estiver vazia, significa nenhum alerta foi enviado hoje
-- Se tiver algo, pode ser deduplicação bloqueando


-- =====================================================
-- 4) TEST TELEGRAM API DIRECTLY
-- =====================================================

-- Teste 1: Verificar que pode fazer HTTP request
do $$
declare
  v_response json;
  v_token text;
  v_chat_id text;
begin
  -- Get credentials
  select telegram_bot_token, telegram_chat_id into v_token, v_chat_id
  from public.app_settings
  where id = 'global';
  
  raise notice 'Token exists: %, Chat ID exists: %', 
    (v_token is not null), 
    (v_chat_id is not null);
  
  -- Test Telegram API call
  if v_token is not null and v_chat_id is not null then
    select content::json into v_response
    from http_post(
      'https://api.telegram.org/bot' || v_token || '/sendMessage',
      json_build_object(
        'chat_id', v_chat_id,
        'text', '🔍 Test message from cron debug: ' || now()::text
      )::text,
      'application/json'
    );
    
    raise notice 'Telegram response: %', v_response;
    
    if (v_response->>'ok')::boolean then
      raise notice '✅ Telegram API call succeeded!';
    else
      raise notice '❌ Telegram API returned error: %', v_response->>'description';
    end if;
  else
    raise notice '❌ Missing Telegram credentials';
  end if;
end $$;


-- =====================================================
-- 5) INSPECT FUNCTION LOGIC
-- =====================================================

-- Ve o código da função
select prosrc
from pg_proc
where proname = 'send_contract_scheduled_alerts';


-- =====================================================
-- 6) RESET E RETRY MANUAL
-- =====================================================

-- Limpa sent_today para hoje
update public.app_settings
set contracts_alerts_sent = contracts_alerts_sent - to_char(current_date, 'YYYY-MM-DD'),
    updated_at = now()
where id = 'global';

-- Test manual dispatch again
select public.send_contract_scheduled_alerts();

-- Check what was sent
select coalesce(contracts_alerts_sent -> to_char(current_date, 'YYYY-MM-DD'), '[]'::jsonb) as sent_today
from public.app_settings
where id = 'global';
