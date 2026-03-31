#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: contracts, error } = await supabase
  .from('contracts')
  .select('id, name, provider, category, status')
  .order('name');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('All contracts:');
contracts.forEach(c => {
  console.log(`${c.name} (${c.provider}) - ${c.category} - ${c.status}`);
  console.log(`  ID: ${c.id}`);
});
