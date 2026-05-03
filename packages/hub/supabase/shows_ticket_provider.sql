alter table if exists public.shows
add column if not exists ticket_provider text;

alter table if exists public.shows
drop constraint if exists shows_ticket_provider_check;

alter table if exists public.shows
add constraint shows_ticket_provider_check
check (ticket_provider is null or ticket_provider in ('bol', 'ticketline'));
