-- Add alert fields to contract_quotes
-- alert_date: the date/time the alert should fire
-- alert_enabled: send app notification
-- telegram_alert_enabled: send telegram notification
-- alert_sent_at: timestamp of when the alert was last sent (to avoid duplicates)

ALTER TABLE contract_quotes
  ADD COLUMN IF NOT EXISTS alert_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMPTZ DEFAULT NULL;
