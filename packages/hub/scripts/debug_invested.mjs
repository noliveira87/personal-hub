import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env.local') });

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const YEAR = 2026;
const MONTH = 3;

// Snapshot de março
const { data: snap } = await s
  .from('portfolio_monthly_snapshots')
  .select('*')
  .eq('year', YEAR)
  .eq('month', MONTH)
  .single();

console.log('\n=== SNAPSHOT mar/2026 ===');
console.log('monthly_inflow:    ', snap?.monthly_inflow);
console.log('monthly_performance:', snap?.monthly_performance);
console.log('total_invested:    ', snap?.total_invested);
console.log('total_current_value:', snap?.total_current_value);

// Movimentos reais de março
const { data: invs } = await s.from('portfolio_investments').select('id, name, notes');

let totalContrib = 0;
let totalWithd = 0;
const lines = [];

for (const inv of invs || []) {
  if (!inv.notes || !inv.notes.startsWith('PORTFOLIO_MOVEMENTS:')) continue;
  const movements = JSON.parse(inv.notes.replace('PORTFOLIO_MOVEMENTS:', ''));
  for (const m of movements) {
    const d = new Date(m.date);
    if (d.getFullYear() !== YEAR || d.getMonth() + 1 !== MONTH) continue;
    if (m.kind === 'contribution') {
      totalContrib += m.amount;
      lines.push(`  [+] ${inv.name}: +${m.amount} (${m.kind})`);
    } else if (m.kind === 'withdrawal') {
      totalWithd += m.amount;
      lines.push(`  [-] ${inv.name}: -${m.amount} (${m.kind})`);
    } else {
      lines.push(`  [~] ${inv.name}: ${m.amount} (${m.kind})`);
    }
  }
}

console.log('\n=== MOVIMENTOS REAIS mar/2026 ===');
lines.forEach(l => console.log(l));
console.log('Contributions:', totalContrib.toFixed(2));
console.log('Withdrawals:  ', totalWithd.toFixed(2));
console.log('Net invested: ', (totalContrib - totalWithd).toFixed(2));

console.log('\n=== DELTA ===');
const delta = (snap?.monthly_inflow ?? 0) - (totalContrib - totalWithd);
console.log(`Snapshot monthly_inflow (${snap?.monthly_inflow}) - Net movements (${(totalContrib - totalWithd).toFixed(2)}) = ${delta.toFixed(2)}`);
if (Math.abs(delta) > 0.01) {
  console.log('⚠️  DIVERGÊNCIA: o snapshot tem um valor diferente dos movimentos reais.');
} else {
  console.log('✅  Snapshot bate com movimentos reais.');
}
