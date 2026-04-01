import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('/Users/olivenun/Desktop/Personal/Projects/personal-hub/.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
const sb = createClient(url, key);

const { data } = await sb.from('portfolio_investments').select('id, name, notes, current_value, invested_amount');

console.log('\n=== MOVIMENTOS DE ABRIL 2026 ===\n');
let totalPerformance = 0;
let totalInvested = 0;

data.forEach(inv => {
  if (!inv.notes) return;
  let movements = [];
  try {
    const raw = inv.notes.replace('PORTFOLIO_MOVEMENTS:', '');
    movements = JSON.parse(raw);
  } catch(e) { return; }

  const aprilMovements = movements.filter(m => m.date && m.date.startsWith('2026-04'));
  if (!aprilMovements.length) return;

  console.log(`\n${inv.name}:`);
  aprilMovements.forEach(m => {
    const isPerf = ['cashback', 'profit', 'adjustment'].includes(m.kind);
    const tag = isPerf ? '[PERFORMANCE]' : '[INVESTIMENTO]';
    console.log(`  ${tag} ${m.kind} | ${m.amount}€ | ${m.date} | ${m.notes || ''}`);
    if (isPerf) totalPerformance += Number(m.amount);
    else totalInvested += Number(m.amount);
  });
});

console.log('\n=== TOTAIS ===');
console.log(`Performance (cashback/profit/adjustment): ${totalPerformance.toFixed(2)}€`);
console.log(`Investimento (contribution/withdrawal): ${totalInvested.toFixed(2)}€`);
