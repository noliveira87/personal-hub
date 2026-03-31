#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const outrasDespesas2025 = [
  { date: '2025-01-01', amount: null },
  { date: '2025-02-01', amount: 2290.66 },
  { date: '2025-03-01', amount: 1506.0 },
  { date: '2025-04-01', amount: 4189.27 },
  { date: '2025-05-01', amount: 0.0 },
  { date: '2025-06-01', amount: 2972.0 },
  { date: '2025-07-01', amount: 0.0 },
  { date: '2025-08-01', amount: 0.0 },
  { date: '2025-09-01', amount: 0.0 },
  { date: '2025-10-01', amount: 0.0 },
  { date: '2025-11-01', amount: 0.0 },
  { date: '2025-12-01', amount: 0.0 },
];

const rowsToInsert = outrasDespesas2025
  .filter((r) => r.amount !== null && r.amount > 0)
  .map((r) => ({
    id: crypto.randomUUID(),
    name: 'Outras Despesas (coluna) - 2025',
    type: 'expense',
    category: 'other',
    amount: r.amount,
    date: r.date,
    recurring: false,
    contract_id: null,
    created_at: new Date().toISOString(),
  }));

try {
  const candidateDates = rowsToInsert.map((r) => r.date);

  const { data: existing, error: existingError } = await supabase
    .from('home_expenses_transactions')
    .select('date, amount, category, name')
    .eq('category', 'other')
    .eq('name', 'Outras Despesas (coluna) - 2025')
    .in('date', candidateDates);

  if (existingError) throw existingError;

  const existingSet = new Set(existing.map((r) => `${r.date}|${r.amount}`));
  const freshRows = rowsToInsert.filter((r) => !existingSet.has(`${r.date}|${r.amount}`));

  if (freshRows.length === 0) {
    console.log('No new rows to insert.');
    process.exit(0);
  }

  const { error: insertError } = await supabase
    .from('home_expenses_transactions')
    .insert(freshRows);

  if (insertError) throw insertError;

  console.log(`Inserted ${freshRows.length} rows:`);
  for (const row of freshRows) {
    console.log(`${row.date} | ${row.category} | €${row.amount}`);
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
