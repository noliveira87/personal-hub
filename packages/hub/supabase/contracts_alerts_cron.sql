create or replace function public.send_contract_scheduled_alerts()
returns text
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
  v_expiry_hint text;
  v_item record;

  v_response jsonb;
  v_count integer := 0;
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
    return 'No settings found';
  end if;

  if not v_enabled then
    return 'Contracts disabled';
  end if;

  if btrim(v_bot_token) = '' or btrim(v_chat_id) = '' then
    return 'Missing Telegram config';
  end if;

  v_today_key := current_date::text;

  select coalesce(array_agg(value), '{}')
  into v_sent_today
  from jsonb_array_elements_text(coalesce(v_history -> v_today_key, '[]'::jsonb));

  raise log 'Starting contracts alert job for %', v_today_key;

  for v_item in
    with expanded as (
      select
        c.id,
        c.name,
        c.provider,
        c.end_date,
        a.alert,
        a.alert_index,
        c.telegram_alert_enabled
      from public.contracts c
      cross join lateral jsonb_array_elements(coalesce(c.alerts, '[]'::jsonb)) with ordinality as a(alert, alert_index)
      where c.status in ('active', 'pending-cancellation')
    ),
    normalized as (
      select
        e.id,
        e.name,
        e.provider,
        case
          when coalesce(e.end_date::text, '') ~ '^\d{4}-\d{2}-\d{2}$'
          then e.end_date::date
          else null
        end as end_date,
        e.alert_index,
        coalesce(e.alert->>'kind', 'days-before') as kind,
        case
          when coalesce(e.alert->>'daysBefore', '') ~ '^[0-9]+$'
          then greatest(1, (e.alert->>'daysBefore')::integer)
          else 30
        end as days_before,
        case
          when coalesce(e.alert->>'specificDate', '') ~ '^\d{4}-\d{2}-\d{2}$'
          then (e.alert->>'specificDate')::date
          else null
        end as specific_date,
        coalesce(nullif(e.alert->>'reason', ''), '') as reason,
        case
          when e.alert ? 'enabled'
          then (coalesce(nullif(lower(e.alert->>'enabled'), ''), 'true') = 'true')
          else true
        end as app_enabled,
        case
          when e.alert ? 'telegramEnabled'
          then (coalesce(nullif(lower(e.alert->>'telegramEnabled'), ''), 'false') = 'true')
          else true
        end as telegram_enabled,
        e.telegram_alert_enabled
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
        n.telegram_alert_enabled,
        n.telegram_enabled,
        case
          when n.kind = 'specific-date' then n.specific_date
          when n.end_date is not null then (n.end_date::date - n.days_before) -- ✅ FIX AQUI
          else null
        end as trigger_date,
        case
          when n.kind = 'specific-date' then 'specific date'
          else n.days_before::text || ' days before expiry'
        end as trigger_label
      from normalized n
      where n.telegram_enabled = true
        and n.telegram_alert_enabled = true
    )
    select *
    from due_today d
    where d.trigger_date = current_date
    order by d.end_date asc nulls last, d.alert_index asc
  loop

    v_signature := v_item.id::text || ':' || v_item.alert_index::text || ':' || v_item.trigger_date::text;

    if v_signature = any(v_sent_today) then
      raise log 'Skipping already sent: %', v_signature;
      continue;
    end if;

    v_reason_text := case
      when btrim(v_item.reason) = '' then ''
      else E'\n📝 Reason: ' || v_item.reason
    end;

    v_expiry_hint := case
      when v_item.end_date is null then ''
      else E'\n📅 Expires on: ' || to_char(v_item.end_date, 'DD/MM/YYYY')
    end;

    raise log 'Sending alert for: %', v_item.name;

    select net.http_post(
      url := format('https://api.telegram.org/bot%s/sendMessage', v_bot_token),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'chat_id', v_chat_id,
        'text',
          '🔔 D12 Contracts Alert' || E'\n\n' ||
          '📄 Contract: ' || v_item.name || E'\n' ||
          '🏢 Provider: ' || coalesce(nullif(v_item.provider, ''), '—') || E'\n' ||
          '🗓 Trigger: ' || v_item.trigger_label || ' (' || to_char(v_item.trigger_date, 'DD/MM/YYYY') || ')' ||
          v_expiry_hint ||
          v_reason_text || E'\n\n' ||
          '👉 Open alerts: https://hub.cafofo12.ddns.net/contracts/alerts',
        'disable_web_page_preview', true
      )
    )
    into v_response;

    raise log 'Telegram response: %', v_response;

    v_sent_today := array_append(v_sent_today, v_signature);
    v_count := v_count + 1;
  end loop;

  v_history := jsonb_set(v_history, array[v_today_key], to_jsonb(v_sent_today), true);

  update public.app_settings
  set
    contracts_alerts_sent = v_history,
    updated_at = now()
  where id = 'global';

  raise log 'Finished job. Sent % alerts', v_count;

  return 'Sent ' || v_count || ' alerts';
end;
$$;