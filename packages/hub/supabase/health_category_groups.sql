-- Health category general groups mapping (Consultas/Exames)
-- Run in Supabase SQL Editor and adjust category names as needed.

alter table public.app_settings
  add column if not exists health_category_groups jsonb not null default '{}'::jsonb;

update public.app_settings
set
  health_category_groups = jsonb_set(
    jsonb_set(
      coalesce(health_category_groups, '{}'::jsonb),
      '{nuno}',
      jsonb_build_object(
        'consultas', to_jsonb(array[
          'Dentista',
          'Medicina Geral',
          'Oftalmologista',
          'Otorrino'
        ]::text[]),
        'exames', to_jsonb(array[
          'Análises Clínicas',
          'Ecocardiograma',
          'ECG em repouso',
          'Eco Abdominal',
          'Eco Renal',
          'Eco Pélvica Suprapúbica'
        ]::text[])
      ),
      true
    ),
    '{minina}',
    jsonb_build_object(
      'consultas', to_jsonb(array[
        'Consulta da Mama',
        'Dentista',
        'Dermatologia',
        'Ginecologista',
        'Imunoalergologia',
        'Medicina Geral',
        'Oftalmologista',
        'Otorrino'
      ]::text[]),
      'exames', to_jsonb(array[
        'Análises Clínicas',
        'Citologia',
        'ECG em repouso',
        'Eco Mamária',
        'Raio-X Boca',
        'Raio-X Tórax'
      ]::text[])
    ),
    true
  ),
  updated_at = now()
where id = 'global';
