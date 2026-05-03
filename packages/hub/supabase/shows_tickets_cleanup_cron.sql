-- Shows tickets: storage path + automatic cleanup on the day after the show

create extension if not exists pg_cron;

alter table if exists public.shows
add column if not exists ticket_path text;

-- Normalize accidental full URLs into storage paths and clear empty strings
update public.shows
set ticket_path = null
where ticket_path is not null
  and btrim(ticket_path) = '';

update public.shows
set ticket_path = split_part(regexp_replace(ticket_path, '^.*?/shows/', ''), '?', 1)
where ticket_path is not null
  and ticket_path ~* '^https?://';

create or replace function public.cleanup_expired_show_tickets()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  cleared_count integer := 0;
begin
  with expired as (
    select id, ticket_path
    from public.shows
    where ticket_path is not null
      and btrim(ticket_path) <> ''
      and date < timezone('Europe/Lisbon', now())::date
  ),
  removed as (
    delete from storage.objects o
    using expired e
    where o.bucket_id = 'shows'
      and o.name = e.ticket_path
    returning e.id
  ),
  cleared as (
    update public.shows s
    set ticket_path = null,
        updated_at = now()
    where s.id in (select id from expired)
    returning s.id
  )
  select count(*) into cleared_count from cleared;

  return cleared_count;
end;
$$;

-- Reschedule idempotently
select cron.unschedule('shows-ticket-cleanup')
where exists (
  select 1
  from cron.job
  where jobname = 'shows-ticket-cleanup'
);

-- Daily at 02:30 UTC; function itself evaluates "day after" in Europe/Lisbon
select cron.schedule(
  'shows-ticket-cleanup',
  '30 2 * * *',
  $$select public.cleanup_expired_show_tickets();$$
);
