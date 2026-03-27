#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const parseEuroAmount = (value) => {
  const raw = String(value ?? '').replace(/\s/g, '').replace(/[€$£]/g, '');
  if (!raw) return NaN;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;

  if (hasComma && hasDot) {
    const decimalSeparator = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = raw.split(thousandSeparator).join('');
    if (decimalSeparator === ',') normalized = normalized.replace(',', '.');
  } else if (hasComma) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = raw.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};

const toIsoDate = (value) => {
  const [day, month, year] = String(value).split('/');
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const normalizeKind = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'cashback' || normalized === 'plutus - cashback') {
    return 'cashback';
  }
  return null;
};

// 1. Delete all cashback from DB
console.log('🗑️  Deleting all cashback from database...');
const { error: deleteError } = await supabase
  .from('portfolio_earnings')
  .delete()
  .eq('kind', 'cashback');

if (deleteError) {
  console.error('Error deleting:', deleteError);
  process.exit(1);
}

// 2. Parse cashback.txt
const content = fs.readFileSync(path.join(__dirname, 'cashback.txt'), 'utf-8');
const lines = content.split('\n').slice(1); // Skip header

const cashbacks = [];
lines.forEach((line) => {
  if (!line.trim()) return;
  
  const parts = line.split('\t');
  if (parts.length < 8) return;

  const transaction = parts[0];
  const supplier = parts[1];
  const kind = normalizeKind(parts[2]);
  const dateStr = parts[3];
  const valueStr = parts[parts.length - 1];

  if (!kind) return;

  const value = parseEuroAmount(valueStr);
  const date = toIsoDate(dateStr);

  if (!Number.isFinite(value) || !date) return;
  
  cashbacks.push({
    id: randomUUID(),
    title: transaction,
    provider: supplier,
    kind,
    date,
    amount_eur: value,
    crypto_asset: null,
    crypto_units: null,
    spot_eur_at_earned: null,
    notes: ''
  });
});

console.log(`\n📥 Importing ${cashbacks.length} cashback entries from cashback.txt...`);

// 3. Insert in batches (Supabase has limits)
const batchSize = 100;
for (let i = 0; i < cashbacks.length; i += batchSize) {
  const batch = cashbacks.slice(i, i + batchSize);
  const { error: insertError } = await supabase
    .from('portfolio_earnings')
    .insert(batch);

  if (insertError) {
    console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    process.exit(1);
  }
  
  console.log(`  ✓ Inserted ${Math.min(batchSize, i + batchSize - i)} / ${cashbacks.length}`);
}

// 4. Verify
console.log(`\n✅ Imported ${cashbacks.length} cashback entries\n`);

let cashbackData = [];
let offset = 0;
while (true) {
  const { data } = await supabase
    .from('portfolio_earnings')
    .select('amount_eur')
    .eq('kind', 'cashback')
    .range(offset, offset + 999);

  if (!data || data.length === 0) break;
  cashbackData = cashbackData.concat(data);
  offset += 1000;
}

const cashbackTotal = cashbackData.reduce((s, r) => s + r.amount_eur, 0);

console.log(`📊 DATABASE STATE:\n`);
console.log(`Cashback: ${cashbackData.length} entries = €${cashbackTotal.toFixed(2)}`);
console.log(`✓ Imported from cashback.txt\n`);
