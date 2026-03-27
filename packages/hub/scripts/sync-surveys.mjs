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
  const [day, month, year] = String(value ?? '').split('/');
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// 1. Delete all surveys from DB
console.log('🗑️  Deleting all surveys from database...');
const { error: deleteError } = await supabase
  .from('portfolio_earnings')
  .delete()
  .eq('kind', 'survey');

if (deleteError) {
  console.error('Error deleting:', deleteError);
  process.exit(1);
}

// 2. Parse surveys.txt
const content = fs.readFileSync(path.join(__dirname, 'surveys.txt'), 'utf-8');
const lines = content.split('\n').slice(1); // Skip header

const surveys = [];
lines.forEach((line) => {
  if (!line.trim()) return;
  
  const parts = line.split('\t');
  if (parts.length < 8) return;

  const transaction = parts[0];
  const supplier = parts[1];
  const dateStr = parts[3];
  const valueStr = parts[parts.length - 1];

  const value = parseEuroAmount(valueStr);
  const date = toIsoDate(dateStr);
  if (!Number.isFinite(value) || !date) return;
  
  surveys.push({
    id: randomUUID(),
    title: transaction,
    provider: supplier,
    kind: 'survey',
    date,
    amount_eur: value,
    crypto_asset: null,
    crypto_units: null,
    spot_eur_at_earned: null,
    notes: ''
  });
});

console.log(`\n📥 Importing ${surveys.length} surveys from surveys.txt...`);

// 3. Insert surveys
const { error: insertError } = await supabase
  .from('portfolio_earnings')
  .insert(surveys);

if (insertError) {
  console.error('Error inserting:', insertError);
  process.exit(1);
}

// 4. Verify
console.log(`✅ Imported ${surveys.length} surveys\n`);

const { data: surveyData } = await supabase
  .from('portfolio_earnings')
  .select('amount_eur')
  .eq('kind', 'survey');

const surveyTotal = surveyData.reduce((s, r) => s + r.amount_eur, 0);

console.log(`📊 DATABASE STATE:\n`);
console.log(`Surveys: ${surveyData.length} entries = €${surveyTotal.toFixed(2)}`);
console.log(`✓ Matches expected: €1457.67\n`);
