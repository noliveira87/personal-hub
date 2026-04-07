-- Add default_monthly_value column to contracts table
-- This value is used to auto-fill the amount when creating a home expense linked to this contract

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS default_monthly_value NUMERIC(10, 2) DEFAULT NULL;
