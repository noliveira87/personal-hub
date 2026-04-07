-- Fix P2P investment values to match actual data
-- Capital emprestado: 515.95€
-- Ganhos acumulados: 39.87€
-- Total: 555.82€

update public.portfolio_investments
set
  invested_amount = 515.95,
  current_value = 555.82,
  updated_at = now()
where type = 'p2p'
  and lower(name) like '%p2p%' or lower(name) like '%goparity%';
