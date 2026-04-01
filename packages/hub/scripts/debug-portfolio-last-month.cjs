const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '../../../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const vars = Object.fromEntries(
  env
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const url = vars.VITE_SUPABASE_URL;
const key = vars.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);
const MOVEMENTS_PREFIX = 'PORTFOLIO_MOVEMENTS:';

function parseMovements(notes) {
  if (!notes) return [];
  const rawLine = String(notes)
    .split('\n')
    .find((line) => line.trim().startsWith(MOVEMENTS_PREFIX));
  if (!rawLine) return [];
  const payload = rawLine.trim().slice(MOVEMENTS_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({
      id: String(m.id ?? ''),
      date: String(m.date ?? ''),
      kind: String(m.kind ?? ''),
      amount: Number(typeof m.amount === 'string' ? m.amount.replace(',', '.') : m.amount) || 0,
      note: m.note ? String(m.note) : '',
    }));
  } catch {
    return [];
  }
}

function isNonInvestmentWithdrawal(movement) {
  if (movement.kind !== 'withdrawal') return false;
  const text = `${movement.id || ''} ${movement.note || ''}`.toLowerCase();
  return (
    text.includes('non-investment') ||
    text.includes('nao-invest') ||
    text.includes('não-invest') ||
    text.includes('life expense') ||
    text.includes('despesa')
  );
}

(async () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

  const [{ data: investments, error: invErr }, { data: earnings, error: earningsErr }] = await Promise.all([
    supabase.from('portfolio_investments').select('id,name,type,notes'),
    supabase
      .from('portfolio_earnings')
      .select('id,title,provider,kind,date,amount_eur')
      .gte('date', `${monthKey}-01`)
      .lt('date', `${monthKey}-32`),
  ]);

  if (invErr) {
    console.error('Error loading investments:', invErr.message);
    process.exit(1);
  }
  if (earningsErr) {
    console.error('Error loading earnings:', earningsErr.message);
    process.exit(1);
  }

  const investedRows = [];
  const performanceRows = [];
  let totalInflow = 0;
  let movementPerformanceTotal = 0;

  for (const investment of investments || []) {
    const movements = parseMovements(investment.notes).filter((movement) => {
      if (movement.date.slice(0, 7) !== monthKey) return false;
      if (movement.note === 'Initial position') return false;
      if (isNonInvestmentWithdrawal(movement)) return false;
      return true;
    });

    if (!movements.length) continue;

    const contributions = movements
      .filter((movement) => movement.kind === 'contribution')
      .reduce((sum, movement) => sum + movement.amount, 0);
    const withdrawals = movements
      .filter((movement) => movement.kind === 'withdrawal')
      .reduce((sum, movement) => sum + movement.amount, 0);
    const movementPerformance = movements
      .filter((movement) => movement.kind === 'adjustment' || movement.kind === 'cashback')
      .reduce((sum, movement) => sum + movement.amount, 0);

    const netInvested = contributions - withdrawals;

    if (netInvested !== 0) {
      investedRows.push({
        name: investment.name,
        type: investment.type,
        contributions,
        withdrawals,
        netInvested,
      });
      totalInflow += netInvested;
    }

    if (movementPerformance !== 0) {
      performanceRows.push({
        name: investment.name,
        type: investment.type,
        movementPerformance,
      });
      movementPerformanceTotal += movementPerformance;
    }
  }

  const earningsByKind = {};
  let earningsTotal = 0;

  for (const earning of earnings || []) {
    const kind = earning.kind || 'other';
    const value = Number(earning.amount_eur) || 0;
    earningsByKind[kind] = (earningsByKind[kind] || 0) + value;
    earningsTotal += value;
  }

  investedRows.sort((a, b) => Math.abs(b.netInvested) - Math.abs(a.netInvested));
  performanceRows.sort((a, b) => Math.abs(b.movementPerformance) - Math.abs(a.movementPerformance));

  console.log(`MONTH=${monthKey}`);
  console.log('');
  console.log('INVESTED BREAKDOWN (contributions - withdrawals)');
  if (!investedRows.length) {
    console.log('- no invested movements');
  } else {
    for (const row of investedRows) {
      console.log(
        `- ${row.name} [${row.type}] | contrib ${row.contributions.toFixed(2)} | withdraw ${row.withdrawals.toFixed(2)} | net ${row.netInvested.toFixed(2)}`,
      );
    }
  }
  console.log(`TOTAL INVESTED = ${totalInflow.toFixed(2)}`);
  console.log('');
  console.log('PERFORMANCE BREAKDOWN (movement performance + earnings)');
  if (!performanceRows.length) {
    console.log('- no movement performance');
  } else {
    for (const row of performanceRows) {
      console.log(`- ${row.name} [${row.type}] | movements ${row.movementPerformance.toFixed(2)}`);
    }
  }
  console.log(`MOVEMENT PERFORMANCE TOTAL = ${movementPerformanceTotal.toFixed(2)}`);
  console.log('');
  console.log('EARNINGS BY KIND');
  const earningKinds = Object.keys(earningsByKind).sort();
  if (!earningKinds.length) {
    console.log('- no earnings');
  } else {
    for (const kind of earningKinds) {
      console.log(`- ${kind}: ${(Number(earningsByKind[kind]) || 0).toFixed(2)}`);
    }
  }
  console.log(`EARNINGS TOTAL = ${earningsTotal.toFixed(2)}`);
  console.log('');
  console.log(`TOTAL PERFORMANCE = ${(movementPerformanceTotal + earningsTotal).toFixed(2)}`);
})();
