import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '../../../.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);
const targetYear = Number(process.argv[2] || new Date().getFullYear());
const contractNameQuery = (process.argv[3] || 'cafofo').toLowerCase();

if (!Number.isFinite(targetYear) || targetYear < 2000 || targetYear > 2100) {
  console.error('Invalid year. Usage: node backfill-mortgage-cafofo-2026.mjs <year> [nameQuery]');
  process.exit(1);
}

const today = new Date();
const lastMonth = today.getFullYear() === targetYear ? (today.getMonth() + 1) : 12;

function toDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

try {
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id,name,provider,category,status,start_date')
    .eq('category', 'mortgage')
    .ilike('name', `%${contractNameQuery}%`)
    .limit(10);

  if (contractsError) {
    throw contractsError;
  }

  if (!contracts || contracts.length === 0) {
    console.error(`No mortgage contract matching "${contractNameQuery}" was found.`);
    process.exit(2);
  }

  const contract = contracts[0];

  const { data: txs, error: txError } = await supabase
    .from('home_expenses_transactions')
    .select('id,date,amount,name,category,contract_id,type,created_at')
    .eq('contract_id', contract.id)
    .eq('type', 'expense')
    .gte('date', `${targetYear}-01-01`)
    .lte('date', `${targetYear}-12-31`)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (txError) {
    throw txError;
  }

  const monthlyLatest = new Map();
  for (const tx of txs ?? []) {
    const month = Number(String(tx.date).slice(5, 7));
    const prev = monthlyLatest.get(month);
    if (!prev || String(tx.date) > String(prev.date)) {
      monthlyLatest.set(month, tx);
    }
  }

  const baseline = [...monthlyLatest.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  let resolvedBaseline = baseline;

  if (!resolvedBaseline) {
    const { data: latestAnyYear, error: latestAnyYearError } = await supabase
      .from('home_expenses_transactions')
      .select('id,date,amount,name,category,contract_id,type,created_at')
      .eq('contract_id', contract.id)
      .eq('type', 'expense')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAnyYearError) {
      throw latestAnyYearError;
    }

    if (!latestAnyYear) {
      console.error(`No baseline transaction found for contract ${contract.name}. Backfill aborted.`);
      process.exit(3);
    }

    resolvedBaseline = latestAnyYear;
  }

  const baselineDay = Number(String(resolvedBaseline.date).slice(8, 10));
  const startDate = contract.start_date ? new Date(contract.start_date) : null;

  const toInsert = [];
  for (let month = 1; month <= lastMonth; month++) {
    if (monthlyLatest.has(month)) continue;

    if (startDate && !Number.isNaN(startDate.getTime())) {
      const monthEnd = new Date(targetYear, month, 0);
      if (startDate > monthEnd) {
        continue;
      }
    }

    const maxDay = new Date(targetYear, month, 0).getDate();
    const safeDay = Math.min(Math.max(1, baselineDay), maxDay);

    toInsert.push({
      id: randomUUID(),
      name: resolvedBaseline.name,
      type: 'expense',
      category: resolvedBaseline.category,
      notes: null,
      amount: Number(resolvedBaseline.amount),
      date: toDate(targetYear, month, safeDay),
      recurring: true,
      contract_id: contract.id,
    });
  }

  console.log('Contract:', contract.name, `(${contract.id})`);
  console.log('Target year:', targetYear);
  console.log('Found entries in year:', (txs ?? []).length);
  console.log('Baseline:', resolvedBaseline.date, Number(resolvedBaseline.amount).toFixed(2), resolvedBaseline.name);
  console.log('Missing months to backfill:', toInsert.map((row) => row.date).join(', ') || 'none');

  if (toInsert.length === 0) {
    console.log('Nothing to backfill.');
    process.exit(0);
  }

  const { error: insertError } = await supabase
    .from('home_expenses_transactions')
    .insert(toInsert);

  if (insertError) {
    throw insertError;
  }

  console.log(`Backfill complete. Inserted ${toInsert.length} rows.`);
} catch (error) {
  console.error('Backfill failed:', error);
  process.exit(1);
}
