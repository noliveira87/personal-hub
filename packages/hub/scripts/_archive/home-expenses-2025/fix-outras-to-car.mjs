#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

try {
  console.log('🔄 Updating "Outras Despesas" from other to car...');
  
  const { data, error: updateError } = await supabase
    .from('home_expenses_transactions')
    .update({ category: 'car' })
    .eq('category', 'other')
    .like('name', '%Outras Despesas%')
    .select('date, name, category, amount, type');

  if (updateError) throw updateError;

  console.log(`✅ Updated ${data.length} transactions to car category`);
  console.log('\nUpdated transactions:');
  data.forEach(t => {
    console.log(`${t.date} | ${t.category.padEnd(15)} | €${t.amount.toString().padEnd(8)} | ${t.name}`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
