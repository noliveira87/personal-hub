#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [day, month, year] = String(value ?? '').split('/');
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const normalizeKind = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dividendos' || normalized === 'dividend' || normalized === 'dividends') {
    return 'dividend';
  }
  return null;
};

// 1. Delete all dividends from DB
console.log('Deleting all dividends from database...');
const { error: deleteError } = await supabase
  .from('portfolio_earnings')
  .delete()
  .eq('kind', 'dividend');

if (deleteError) {
  console.error('Error deleting dividends:', deleteError);
  process.exit(1);
}

// 2. Parse dividends.txt
const content = fs.readFileSync(path.join(__dirname, 'dividends.txt'), 'utf-8');
const lines = content.split('\n');

const dividends = [];
lines.forEach((line) => {
  if (!line.trim()) return;

  const parts = line.split('\t');
  if (parts.length < 5) return;

  const title = parts[0]?.trim();
  const provider = parts[1]?.trim();
  const kind = normalizeKind(parts[2]);
  const dateStr = parts[3]?.trim();
  const valueStr = parts[parts.length - 1]?.trim();

  if (!kind || !title) return;

  const amount = parseEuroAmount(valueStr);
  const date = toIsoDate(dateStr);
  if (!Number.isFinite(amount) || !date) return;

  dividends.push({
    id: randomUUID(),
    title,
    provider: provider || null,
    kind,
    date,
    amount_eur: amount,
    crypto_asset: null,
    crypto_units: null,
    spot_eur_at_earned: null,
    notes: '',
  });
});

if (!dividends.length) {
  console.log('No valid dividends found to import.');
  process.exit(0);
}

console.log(`Importing ${dividends.length} dividend entries from dividends.txt...`);

// 3. Insert in batches
const batchSize = 100;
for (let i = 0; i < dividends.length; i += batchSize) {
  const batch = dividends.slice(i, i + batchSize);
  const { error: insertError } = await supabase
    .from('portfolio_earnings')
    .insert(batch);

  if (insertError) {
    console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    process.exit(1);
  }

  console.log(`  Inserted ${Math.min(i + batchSize, dividends.length)} / ${dividends.length}`);
}

// 4. Verify
let dividendRows = [];
let offset = 0;
while (true) {
  const { data, error } = await supabase
    .from('portfolio_earnings')
    .select('amount_eur')
    .eq('kind', 'dividend')
    .range(offset, offset + 999);

  if (error) {
    console.error('Error verifying import:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) break;

  dividendRows = dividendRows.concat(data);
  offset += 1000;
}

const dividendTotal = dividendRows.reduce((sum, row) => sum + Number(row.amount_eur || 0), 0);

console.log('');
console.log(`Imported ${dividends.length} dividend entries.`);
console.log(`Database now has ${dividendRows.length} dividend entries totaling EUR ${dividendTotal.toFixed(2)}.`);
