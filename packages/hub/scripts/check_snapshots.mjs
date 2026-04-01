import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('/Users/olivenun/Desktop/Personal/Projects/personal-hub/.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from('portfolio_monthly_snapshots')
  .select('*')
  .gte('month', '2026-03')
  .order('month', { ascending: true });

if (error) { console.error('Erro:', error.message); process.exit(1); }
if (!data.length) { console.log('Sem snapshots para março/abril 2026.'); }
else {
  data.forEach(row => {
    console.log(`\n📅 ${row.month}`);
    console.log(`  monthly_inflow:      ${row.monthly_inflow}`);
    console.log(`  monthly_performance: ${row.monthly_performance}`);
    console.log(`  total_invested:      ${row.total_invested}`);
    console.log(`  total_current_value: ${row.total_current_value}`);
    console.log(`  updated_at:          ${row.updated_at}`);
  });
}
