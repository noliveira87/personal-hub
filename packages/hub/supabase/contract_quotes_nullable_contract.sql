-- Make contract_id optional so quotes can exist independently of a contract
ALTER TABLE contract_quotes
  ALTER COLUMN contract_id DROP NOT NULL;
