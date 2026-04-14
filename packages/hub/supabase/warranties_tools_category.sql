-- Allow "tools" as a valid warranties category.
-- Run this once in Supabase SQL editor if your table has a category check constraint.

do $$
declare
  existing_constraint record;
begin
  for existing_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'warranties'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%category%'
  loop
    execute format('alter table public.warranties drop constraint %I', existing_constraint.conname);
  end loop;
end $$;

alter table public.warranties
  add constraint warranties_category_check
  check (category in ('tech', 'appliances', 'tools', 'others'));
