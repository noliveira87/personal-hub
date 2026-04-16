-- Contract Quotes / Budgets
-- Stores quotes/estimates linked to contracts (price, date, description, PDF attachment)

CREATE TABLE IF NOT EXISTS contract_quotes (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  provider TEXT,
  description TEXT,
  price_net NUMERIC(10, 2),
  vat_rate NUMERIC(5, 2),
  price NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  date DATE,
  pdf_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  payment_terms TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE contract_quotes
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS price_net NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2);

CREATE INDEX IF NOT EXISTS contract_quotes_contract_id_idx
  ON contract_quotes(contract_id);

-- Row Level Security
ALTER TABLE public.contract_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for anon and authenticated" ON public.contract_quotes;
CREATE POLICY "Allow select for anon and authenticated"
  ON public.contract_quotes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert for anon and authenticated" ON public.contract_quotes;
CREATE POLICY "Allow insert for anon and authenticated"
  ON public.contract_quotes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for anon and authenticated" ON public.contract_quotes;
CREATE POLICY "Allow update for anon and authenticated"
  ON public.contract_quotes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for anon and authenticated" ON public.contract_quotes;
CREATE POLICY "Allow delete for anon and authenticated"
  ON public.contract_quotes FOR DELETE
  TO anon, authenticated
  USING (true);

-- Storage bucket for contract quote PDFs
-- Run in Supabase Dashboard > Storage > New bucket:
--   Name: contract-quotes
--   Public: true (so PDFs can be opened by the browser directly)
