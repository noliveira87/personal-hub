-- Quote alert cron job
-- Sends Telegram notifications for quotes where alert_date = today
-- and alert_sent_at is null (not yet sent).
-- Requires: settings.sql applied, pg_net + pg_cron extensions enabled.
-- Schedule: daily at 09:00 UTC (same as contracts cron)

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.send_quote_scheduled_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bot_token text;
  v_chat_id  text;
  v_enabled  boolean;
  v_item     record;
  v_msg      text;
  v_url      text;
begin
  select
    coalesce(telegram_bot_token, ''),
    coalesce(telegram_chat_id, ''),
    coalesce(contracts_enabled, true)
  into v_bot_token, v_chat_id, v_enabled
  from public.app_settings
  where id = 'global'
  limit 1;

  if not found or not v_enabled then return; end if;
  if btrim(v_bot_token) = '' or btrim(v_chat_id) = '' then return; end if;

  v_url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage';

  for v_item in
    select
      q.id,
      q.title,
      q.price,
      q.currency,
      q.alert_date,
      c.name  as contract_name,
      c.provider as contract_provider
    from contract_quotes q
    left join contracts c on c.id = q.contract_id
    where q.telegram_alert_enabled = true
      and q.alert_date = current_date
      and q.alert_sent_at is null
  loop
    v_msg := '📋 *Orçamento: ' || v_item.title || '*';

    if v_item.price is not null then
      v_msg := v_msg || chr(10) || '💰 ' || v_item.price::text || ' ' || coalesce(v_item.currency, 'EUR');
    end if;

    if v_item.contract_name is not null then
      v_msg := v_msg || chr(10) || '🔗 ' || v_item.contract_name || ' – ' || coalesce(v_item.contract_provider, '');
    end if;

    v_msg := v_msg || chr(10) || '📅 Alerta configurado para hoje (' || v_item.alert_date::text || ')';

    perform net.http_post(
      url     := v_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object(
        'chat_id',    v_chat_id,
        'text',       v_msg,
        'parse_mode', 'Markdown'
      )
    );

    -- Mark as sent
    update contract_quotes
    set alert_sent_at = now()
    where id = v_item.id;

  end loop;
end;
$$;

-- Schedule daily at 09:00 UTC
select cron.schedule(
  'quote-alerts-daily',
  '0 9 * * *',
  $$ select public.send_quote_scheduled_alerts(); $$
);
