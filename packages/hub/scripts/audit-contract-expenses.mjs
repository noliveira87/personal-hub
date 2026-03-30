import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

const year = Number(process.argv[2] || new Date().getFullYear());
const now = new Date();
const lastMonth = Math.min(11, now.getFullYear() === year ? now.getMonth() : 11);
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function extractYearMonth(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1 };
}

function contractActiveInMonth(contract, yearNum, monthNum) {
  const monthStart = new Date(yearNum, monthNum, 1);
  const monthEnd = new Date(yearNum, monthNum + 1, 0);
  const start = new Date(contract.start_date);
  const end = contract.end_date ? new Date(contract.end_date) : null;

  if (!Number.isNaN(start.getTime()) && start > monthEnd) return false;
  if (end && !Number.isNaN(end.getTime()) && end < monthStart) return false;
  return true;
}

const { data: contracts, error: contractsError } = await supabase
  .from('contracts')
  .select('id,name,provider,status,billing_frequency,start_date,end_date,price,category')
  .eq('status', 'active')
  .order('name', { ascending: true });

if (contractsError) throw contractsError;

const { data: allPriceHistory, error: historyError } = await supabase
  .from('contract_price_history')
  .select('id,contract_id,price,date')
  .order('date', { ascending: true });

if (historyError) throw historyError;

const expectedRows = [];
const missingCandidates = [];

for (const c of contracts ?? []) {
  for (let m = 0; m <= lastMonth; m++) {
    if (!contractActiveInMonth(c, year, m)) continue;

    const monthlyHistory = (allPriceHistory ?? [])
      .filter((h) => h.contract_id === c.id)
      .filter((h) => {
        const ym = extractYearMonth(h.date);
        return ym && ym.year === year && ym.month === m;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const isMonthly = c.billing_frequency === 'monthly';
    if (!isMonthly && monthlyHistory.length === 0) continue;

    const resolvedPrice = monthlyHistory.length > 0 ? Number(monthlyHistory[0].price) : Number(c.price);

    if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
      missingCandidates.push({
        month: monthNames[m],
        contract: c.name,
        provider: c.provider,
        billing: c.billing_frequency,
        reason: 'resolved price <= 0',
        source: monthlyHistory.length > 0 ? 'history' : 'contract.price',
      });
      continue;
    }

    expectedRows.push({
      month: monthNames[m],
      contract: c.name,
      provider: c.provider,
      billing: c.billing_frequency,
      source: monthlyHistory.length > 0 ? 'history' : 'contract.price',
      price: resolvedPrice,
    });
  }
}

const byMonth = new Map();
for (const row of expectedRows) {
  if (!byMonth.has(row.month)) byMonth.set(row.month, []);
  byMonth.get(row.month).push(row);
}

console.log(`AUDIT CONTRACT EXPENSES ${year} (Jan-${monthNames[lastMonth]})`);
console.log(`Active contracts: ${contracts?.length ?? 0}`);
console.log(`Generated expected expense rows: ${expectedRows.length}`);
console.log('');
console.log('MONTH SUMMARY');
for (let m = 0; m <= lastMonth; m++) {
  const month = monthNames[m];
  const rows = byMonth.get(month) || [];
  const total = rows.reduce((sum, r) => sum + r.price, 0);
  console.log(`${month}: ${rows.length} rows | €${total.toFixed(2)}`);
}

console.log('');
if (missingCandidates.length === 0) {
  console.log('No missing candidates caused by invalid/non-positive price.');
} else {
  console.log('MISSING CANDIDATES (price invalid):');
  for (const item of missingCandidates) {
    console.log(`${item.month} | ${item.contract} (${item.provider}) | ${item.billing} | ${item.source} | ${item.reason}`);
  }
}

console.log('');
console.log('DETAIL ROWS');
for (const row of expectedRows) {
  console.log(`${row.month} | ${row.contract} (${row.provider}) | €${row.price.toFixed(2)} | ${row.billing} | ${row.source}`);
}
