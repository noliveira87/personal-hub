#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase
  .from('home_expenses_transactions')
  .select('date, name, category, amount, type')
  .gte('date', '2025-01-01')
  .lt('date', '2025-02-01')
  .order('date');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Transactions in January 2025:');
data.forEach(t => {
  console.log(`${t.date} | ${t.type.padEnd(7)} | ${t.category.padEnd(15)} | ${t.amount.toString().padEnd(8)} | ${t.name}`);
});

console.log(`\nTotal: ${data.length} transactions`);
console.log('Groceries:', data.filter(t => t.category === 'groceries').length);
