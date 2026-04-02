-- Server-side warranty Telegram alerts (runs even when app is closed)
-- IMPORTANT: Run this in Supabase SQL Editor after running:
--   1) packages/warranties/supabase/schema.sql
--   2) packages/hub/supabase/settings.sql

-- Step 1: Enable required extensions
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Step 2: Create or replace the warranty alert function
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
  v_expiration_text text;
  v_price_text text;
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
    -- No Telegram credentials configured, skip silently
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
      w.category,
      w.purchased_from,
      w.price,
      w.expiration_date
    from public.warranties w
    where w.archived_at is null
      and w.expiration_date = (current_date + v_alert_days :: int)
    order by w.expiration_date asc
  loop
    v_signature := v_item.id::text || ':' || v_item.expiration_date::text;

    if v_signature = any(v_sent_today) then
      continue;
    end if;

    v_days_left := (v_item.expiration_date - current_date);
    v_expiration_text := to_char(v_item.expiration_date, 'DD/MM/YYYY');
    v_price_text := case
      when v_item.price is null then '—'
      when v_item.price = trunc(v_item.price) then '€' || to_char(v_item.price, 'FM9999999990')
      else '€' || replace(to_char(v_item.price, 'FM9999999990D00'), ',', '.')
    end;

    perform net.http_post(
      url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'chat_id', v_chat_id,
        'text',
          '🛡️ <b>Warranty Expiry Alert</b>' || E'\n\n' ||
          '📦 <b>Product:</b> ' || v_item.product_name || E'\n' ||
          '🗂️ <b>Category:</b> ' || coalesce(nullif(v_item.category, ''), '—') || E'\n' ||
          '📅 <b>Expires on:</b> ' || v_expiration_text || E'\n' ||
          '⏳ <b>Days left:</b> ' || v_days_left::text || E'\n' ||
          '🏬 <b>Store:</b> ' || coalesce(nullif(v_item.purchased_from, ''), '—') || E'\n' ||
          E'\n' ||
          '👉 <a href="https://hub.cafofo12.ddns.net/warranties?status=expiring">Open expiring warranties</a>',
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

-- Step 3: Set permissions
revoke all on function public.send_warranty_expiry_alerts() from public;
grant execute on function public.send_warranty_expiry_alerts() to service_role;

-- Step 4: Remove old cron job if it exists and schedule new one
-- This will run daily at 09:15 UTC
select cron.unschedule('warranty-expiry-alerts-job') 
where exists (
  select 1 from cron.job 
  where jobname = 'warranty-expiry-alerts-job'
);

-- Schedule the job: runs daily at 9:15 AM UTC
select cron.schedule(
  'warranty-expiry-alerts-job',
  '15 9 * * *',
  'select public.send_warranty_expiry_alerts();'
);

-- Step 5: Verify the job was created
-- Run this to check if cron job is active:
-- select * from cron.job;

-- Step 6: Manual test (uncomment to test)
-- select public.send_warranty_expiry_alerts();
