-- Adiciona unique constraint para garantir apenas uma linha por mês/ano/contrato
ALTER TABLE car_electricity_history
ADD CONSTRAINT unique_contract_month_year UNIQUE (contract_id, year, month);