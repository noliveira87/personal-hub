alter table public.contracts
  add column if not exists show_in_checklist boolean;

update public.contracts
set show_in_checklist = true
where show_in_checklist is null;

alter table public.contracts
  alter column show_in_checklist set default true;

alter table public.contracts
  alter column show_in_checklist set not null;
