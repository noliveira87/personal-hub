-- Load missing Nuno health categories and ensure category order includes all 10
-- Run in Supabase SQL Editor.

insert into public.health_appointments (person, category, date, note)
values
  ('nuno', 'ECG em repouso', '2021-06-29', null),
  ('nuno', 'Eco Abdominal', '2021-07-15', null),
  ('nuno', 'Eco Pélvica Suprapúbica', '2021-07-15', null)
on conflict (person, category, date) do nothing;

update public.app_settings
set
  health_category_order = jsonb_set(
    coalesce(health_category_order, '{}'::jsonb),
    '{nuno}',
    to_jsonb(array[
      'Análises Clínicas',
      'Dentista',
      'Medicina Geral',
      'Oftalmologista',
      'Otorrino',
      'Ecocardiograma',
      'ECG em repouso',
      'Eco Abdominal',
      'Eco Renal',
      'Eco Pélvica Suprapúbica'
    ]::text[]),
    true
  ),
  updated_at = now()
where id = 'global';
