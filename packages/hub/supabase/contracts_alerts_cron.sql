-- Server-side contract Telegram alerts (runs even when app is closed)
-- Run this in Supabase SQL Editor after running:
--   1) packages/hub/supabase/settings.sql

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.send_contract_scheduled_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bot_token text;
  v_chat_id text;
  v_enabled boolean;
  v_history jsonb;
  v_today_key text;
  v_signature text;
  v_sent_today text[];
  v_reason_text text;
  v_item record;
begin
  select
    coalesce(telegram_bot_token, ''),
    coalesce(telegram_chat_id, ''),
    coalesce(contracts_enabled, true),
    coalesce(contracts_alerts_sent, '{}'::jsonb)
  into
    v_bot_token,
    v_chat_id,
    v_enabled,
    v_history
  from public.app_settings
  where id = 'global'
  limit 1;

  if not found then
    return;
  end if;

  if not v_enabled then
    return;
  end if;

  if btrim(v_bot_token) = '' or btrim(v_chat_id) = '' then
    return;
  end if;

  v_today_key := current_date::text;

  select coalesce(array_agg(value), '{}')
  into v_sent_today
  from jsonb_array_elements_text(coalesce(v_history -> v_today_key, '[]'::jsonb));

  for v_item in
    with expanded as (
      select
        c.id,
        c.name,
        c.provider,
        c.end_date,
        a.alert,
        a.alert_index
      from public.contracts c
      cross join lateral jsonb_array_elements(coalesce(c.alerts, '[]'::jsonb)) with ordinality as a(alert, alert_index)
      where c.status in ('active', 'pending-cancellation')
        and coalesce(c.telegram_alert_enabled, false) = true
    ),
    normalized as (
      select
        e.id,
        e.name,
        e.provider,
        e.end_date,
        e.alert_index,
        coalesce(e.alert->>'kind', 'days-before') as kind,
        case
          when coalesce(e.alert->>'daysBefore', '') ~ '^[0-9]+$' then greatest(1, (e.alert->>'daysBefore')::integer)
          else 30
        end as days_before,
        case
          when coalesce(e.alert->>'specificDate', '') ~ '^\\d{4}-\\d{2}-\\d{2}$' then (e.alert->>'specificDate')::date
          else null
        end as specific_date,
        coalesce(nullif(e.alert->>'reason', ''), '') as reason,
        coalesce((e.alert->>'enabled')::boolean, true) as app_enabled,
        coalesce((e.alert->>'telegramEnabled')::boolean, false) as telegram_enabled
      from expanded e
    ),
    due_today as (
      select
        n.id,
        n.name,
        n.provider,
        n.end_date,
        n.alert_index,
        n.reason,
        case
          when n.kind = 'specific-date' then n.specific_date
          when n.end_date is not null then (n.end_date - n.days_before)
          else null
        end as trigger_date,
        case
          when n.kind = 'specific-date' then 'specific date'
          else n.days_before::text || ' days before expiry'
        end as trigger_label
      from normalized n
      where n.telegram_enabled = true
    )
    select
      d.id,
      d.name,
      d.provider,
      d.end_date,
      d.alert_index,
      d.reason,
      d.trigger_date,
      d.trigger_label
    from due_today d
    where d.trigger_date = current_date
    order by d.end_date asc nulls last, d.alert_index asc
  loop
    v_signature := v_item.id::text || ':' || v_item.alert_index::text || ':' || v_item.trigger_date::text;

    if v_signature = any(v_sent_today) then
      continue;
    end if;

    v_reason_text := case
      when btrim(v_item.reason) = '' then ''
      else E'\nReason: ' || v_item.reason
    end;

    perform net.http_post(
      url := format('https://api.telegram.org/bot%s/sendMessage', v_bot_token),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'chat_id', v_chat_id,
        'text',
          '🔔 D12 Contracts Alert' || E'\n\n' ||
          'Contract: ' || v_item.name || E'\n' ||
          'Provider: ' || coalesce(nullif(v_item.provider, ''), '—') || E'\n' ||
          'Trigger: ' || v_item.trigger_label || ' (' || to_char(v_item.trigger_date, 'DD/MM/YYYY') || ')' ||
          case
            when v_item.end_date is null then ''
            else E'\nExpires on: ' || to_char(v_item.end_date, 'DD/MM/YYYY')
          end ||
          v_reason_text || E'\n\n' ||
          'Open alerts: https://hub.cafofo12.ddns.net/contracts/alerts',
        'disable_web_page_preview', true
      )
    );

    v_sent_today := array_append(v_sent_today, v_signature);
  end loop;

  v_history := jsonb_set(v_history, array[v_today_key], to_jsonb(v_sent_today), true);

  update public.app_settings
  set
    contracts_alerts_sent = v_history,
    updated_at = now()
  where id = 'global';
end;
$$;

revoke all on function public.send_contract_scheduled_alerts() from public;
grant execute on function public.send_contract_scheduled_alerts() to service_role;

-- Schedule daily run at 09:20 UTC
select cron.unschedule('contracts-scheduled-alerts')
where exists (
  select 1
  from cron.job
  where jobname = 'contracts-scheduled-alerts'
);

select cron.schedule(
  'contracts-scheduled-alerts',
  '20 9 * * *',
  $$select public.send_contract_scheduled_alerts();$$
);

-- Manual test (optional):
-- select public.send_contract_scheduled_alerts();
