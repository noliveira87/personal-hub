-- Health seed data (DB only)
-- Source of truth: two spreadsheet tables
-- Blue table = Nuno, Pink table = Minina

truncate table public.health_appointments;
truncate table public.health_cholesterol_entries;

insert into public.health_appointments (person, category, date, note) values
-- Nuno (blue)
('nuno', 'Análises Clínicas', '2026-02-05', null),
('nuno', 'Análises Clínicas', '2024-12-14', null),
('nuno', 'Análises Clínicas', '2023-01-18', null),
('nuno', 'Análises Clínicas', '2023-04-21', null),
('nuno', 'Análises Clínicas', '2023-12-23', null),
('nuno', 'Análises Clínicas', '2021-07-07', null),

('nuno', 'Dentista', '2026-02-24', null),
('nuno', 'Dentista', '2024-01-05', null),
('nuno', 'Dentista', '2024-12-21', null),
('nuno', 'Dentista', '2023-05-31', null),
('nuno', 'Dentista', '2022-04-04', null),
('nuno', 'Dentista', '2021-08-28', null),

('nuno', 'Medicina Geral', '2026-05-03', null),
('nuno', 'Medicina Geral', '2023-04-13', null),
('nuno', 'Medicina Geral', '2021-06-28', null),

('nuno', 'Oftalmologista', '2024-10-05', null),
('nuno', 'Oftalmologista', '2021-09-10', null),
('nuno', 'Oftalmologista', '2021-07-08', null),

('nuno', 'Otorrino', '2025-09-03', null),
('nuno', 'Otorrino', '2024-01-12', null),
('nuno', 'Otorrino', '2024-10-14', null),
('nuno', 'Otorrino', '2023-02-20', null),
('nuno', 'Otorrino', '2022-04-19', null),
('nuno', 'Otorrino', '2021-04-23', null),
('nuno', 'Otorrino', '2021-08-28', null),

('nuno', 'Ecocardiograma', '2021-06-29', null),
('nuno', 'Eco Renal', '2021-07-15', null),

-- Minina (pink)
('minina', 'Análises Clínicas', '2026-02-05', null),
('minina', 'Análises Clínicas', '2024-12-14', null),
('minina', 'Análises Clínicas', '2023-04-21', null),
('minina', 'Análises Clínicas', '2023-12-23', null),
('minina', 'Análises Clínicas', '2021-07-07', null),

('minina', 'Citologia', '2025-07-31', null),
('minina', 'Citologia', '2023-07-08', 'Teste do HPV'),
('minina', 'Citologia', '2021-06-25', null),

('minina', 'Dentista', '2026-04-24', null),
('minina', 'Dentista', '2024-05-07', 'Limpeza'),
('minina', 'Dentista', '2023-07-16', null),
('minina', 'Dentista', '2022-10-31', null),
('minina', 'Dentista', '2021-07-01', null),
('minina', 'Dentista', '2021-07-14', null),

('minina', 'Dermatologia', '2023-04-20', 'Remoção Sinal Pipi'),
('minina', 'Dermatologia', '2023-03-30', null),
('minina', 'Dermatologia', '2022-03-04', 'Remoção Sinal Queixo'),
('minina', 'Dermatologia', '2022-02-28', null),
('minina', 'Dermatologia', '2021-06-11', null),
('minina', 'Dermatologia', '2020-11-20', 'Remoção Sinal rosto'),

('minina', 'ECG em repouso', '2025-01-17', null),
('minina', 'ECG em repouso', '2023-12-19', null),
('minina', 'ECG em repouso', '2021-07-29', null),

('minina', 'Eco Mamária', '2025-05-17', null),
('minina', 'Eco Mamária', '2024-05-10', null),
('minina', 'Eco Mamária', '2023-07-12', null),
('minina', 'Eco Mamária', '2021-07-29', null),

('minina', 'Ginecologista', '2025-07-31', null),
('minina', 'Ginecologista', '2024-05-17', null),
('minina', 'Ginecologista', '2023-07-08', null),
('minina', 'Ginecologista', '2022-09-29', null),
('minina', 'Ginecologista', '2021-06-25', null),
('minina', 'Ginecologista', '2020-08-20', null),

('minina', 'Consulta da Mama', '2024-02-29', null),
('minina', 'Imunoalergologia', '2022-03-25', null),

('minina', 'Medicina Geral', '2025-10-28', null),
('minina', 'Medicina Geral', '2025-02-05', null),
('minina', 'Medicina Geral', '2024-12-12', null),
('minina', 'Medicina Geral', '2024-01-04', null),
('minina', 'Medicina Geral', '2023-11-15', null),
('minina', 'Medicina Geral', '2021-06-29', null),
('minina', 'Medicina Geral', '2021-08-10', null),

('minina', 'Oftalmologista', '2024-05-08', null),
('minina', 'Oftalmologista', '2019-12-12', null),

('minina', 'Otorrino', '2024-08-30', null),
('minina', 'Otorrino', '2022-06-18', null),
('minina', 'Otorrino', '2021-03-12', null),

('minina', 'Raio-X Tórax', '2021-07-29', null),
('minina', 'Raio-X Boca', '2021-07-14', null);

insert into public.health_cholesterol_entries (person, year, entry_order, total, hdl, ldl, triglycerides) values
('nuno', 2026, 1, 241, 63, 159, 96),
('nuno', 2024, 1, 212, 74, 127, 53),
('nuno', 2023, 1, 239, 82, 143, 70),
('nuno', 2023, 2, 224, 77, 135, 57),
('nuno', 2023, 3, 264, 86, 162, 79),
('nuno', 2021, 1, 226, 63, 142, 104),
('nuno', 2016, 1, 227, null, null, null),
('nuno', 2015, 1, 238, null, null, null),
('nuno', 2014, 1, 221, 60, 140, 131),
('nuno', 2012, 1, 239, 58, 151, 118),
('nuno', 2011, 1, 210, 54, 157, 98),
('nuno', 2010, 1, 248, 55, 161, 95);
