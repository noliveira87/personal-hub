-- Server-side warranty Telegram alerts (runs even when app is closed)
-- Run this in Supabase SQL Editor after running:
--   1) packages/warranties/supabase/schema.sql
--   2) packages/hub/supabase/settings.sql

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.send_warranty_expiry_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bot_token text;
  v_chat_id text;
  v_enabled boolean;
  v_alert_days integer;
  v_history jsonb;
  v_today_key text;
  v_signature text;
  v_days_left integer;
  v_sent_today text[];
  v_item record;
begin
  select
    coalesce(telegram_bot_token, ''),
    coalesce(telegram_chat_id, ''),
    coalesce(warranties_enabled, true),
    greatest(1, coalesce(warranty_alert_days, 30)),
    coalesce(warranty_alerts_sent, '{}'::jsonb)
  into
    v_bot_token,
    v_chat_id,
    v_enabled,
    v_alert_days,
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
    select
      w.id,
      w.product_name,
      w.expiration_date
    from public.warranties w
    where w.archived_at is null
      and w.expiration_date = (current_date + v_alert_days)
    order by w.expiration_date asc
  loop
    v_signature := v_item.id::text || ':' || v_item.expiration_date::text;

    if v_signature = any(v_sent_today) then
      continue;
    end if;

    v_days_left := (v_item.expiration_date - current_date);

    perform net.http_post(
      url := format('https://api.telegram.org/bot%s/sendMessage', v_bot_token),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'chat_id', v_chat_id,
        'text',
          '🛡️ <b>Warranty Vault — Expiry Alert</b>' || E'\n\n' ||
          '• ' || v_item.product_name || ' — <b>' || v_days_left || 'd</b> remaining' || E'\n\n' ||
          '<a href="https://hub.cafofo12.ddns.net/warranties?status=expiring">Open expiring warranties</a>',
        'parse_mode', 'HTML',
        'disable_web_page_preview', true
      )
    );

    v_sent_today := array_append(v_sent_today, v_signature);
  end loop;

  v_history := jsonb_set(v_history, array[v_today_key], to_jsonb(v_sent_today), true);

  update public.app_settings
  set
    warranty_alerts_sent = v_history,
    updated_at = now()
  where id = 'global';
end;
$$;

revoke all on function public.send_warranty_expiry_alerts() from public;
grant execute on function public.send_warranty_expiry_alerts() to service_role;

-- Schedule daily run at 09:15 UTC
select cron.unschedule('warranty-expiry-alerts')
where exists (
  select 1
  from cron.job
  where jobname = 'warranty-expiry-alerts'
);

select cron.schedule(
  'warranty-expiry-alerts',
  '15 9 * * *',
  $$select public.send_warranty_expiry_alerts();$$
);

-- Manual test (optional):
-- select public.send_warranty_expiry_alerts();
