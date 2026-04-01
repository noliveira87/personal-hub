import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env.local') });

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data: investments, error } = await sb
  .from('portfolio_investments')
  .select('name, type, current_value, invested_amount')
  .order('name');

if (error) { console.error(error); process.exit(1); }

console.log('\n=== Ganhos não realizados por investimento ===');
let total = 0;
for (const inv of investments) {
  const gain = (inv.current_value || 0) - (inv.invested_amount || 0);
  total += gain;
  if (Math.abs(gain) > 0.01) {
    console.log(`${inv.name} (${inv.type}): investido=${inv.invested_amount} atual=${inv.current_value} ganho=${gain.toFixed(2)}`);
  }
}
console.log(`\nTotal ganhos não realizados: ${total.toFixed(2)}`);

const { data: movements, error: mErr } = await sb
  .from('portfolio_movements')
  .select('investment_name, kind, amount, date, notes')
  .gte('date', '2026-04-01')
  .lte('date', '2026-04-30')
  .order('date');

if (mErr) { console.error(mErr); process.exit(1); }

console.log('\n=== Movimentos de Abril 2026 ===');
if (!movements.length) {
  console.log('Nenhum movimento encontrado em abril.');
} else {
  movements.forEach(m => console.log(`${m.date} | ${m.investment_name} | ${m.kind} | ${m.amount}`));
}
