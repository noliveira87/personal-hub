#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

try {
  console.log('🔍 Checking available transaction categories...');
  
  const { data, error } = await supabase
    .from('home_expenses_transactions')
    .select('category')
    .limit(100);

  if (error) throw error;

  const categories = [...new Set(data.map(row => row.category))];
  console.log('Available categories:');
  categories.forEach(cat => {
    console.log(`  - ${cat}`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
