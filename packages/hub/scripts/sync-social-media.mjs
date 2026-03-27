#!/usr/bin/env node
import fs from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const NOTE_PREFIX = 'KIND:social_media';

const parseEuroAmount = (value) => {
  const raw = String(value ?? '').replace(/\s/g, '').replace(/[€$£]/g, '');
  if (!raw) return NaN;

  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};

const toIsoDate = (value) => {
  const [day, month, year] = String(value ?? '').split('/');
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// 1) Delete only social-media earnings (encoded as survey + notes prefix)
console.log('Deleting existing social-media earnings...');
const { error: deleteError } = await supabase
  .from('portfolio_earnings')
  .delete()
  .eq('kind', 'survey')
  .like('notes', `${NOTE_PREFIX}%`);

if (deleteError) {
  console.error('Error deleting social-media earnings:', deleteError);
  process.exit(1);
}

// 2) Parse social-media-check.tsv
const content = fs.readFileSync(path.join(__dirname, 'social-media-check.tsv'), 'utf-8');
const rows = content
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(1); // header

const payload = [];
for (const row of rows) {
  const parts = row.split('\t');
  if (parts.length < 8) continue;

  const title = parts[0]?.trim();
  const provider = parts[1]?.trim();
  const date = toIsoDate(parts[3]?.trim());
  const amount = parseEuroAmount(parts[parts.length - 1]?.trim());

  if (!title || !date || !Number.isFinite(amount)) continue;

  payload.push({
    id: randomUUID(),
    title,
    provider: provider || null,
    kind: 'survey',
    date,
    amount_eur: amount,
    crypto_asset: null,
    crypto_units: null,
    spot_eur_at_earned: null,
    notes: NOTE_PREFIX,
  });
}

if (!payload.length) {
  console.log('No valid social-media rows found in social-media-check.tsv');
  process.exit(0);
}

console.log(`Importing ${payload.length} social-media earnings...`);

// 3) Insert in batches
const batchSize = 100;
for (let i = 0; i < payload.length; i += batchSize) {
  const batch = payload.slice(i, i + batchSize);
  const { error } = await supabase
    .from('portfolio_earnings')
    .insert(batch);

  if (error) {
    console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    process.exit(1);
  }
}

// 4) Verify
let importedRows = [];
let offset = 0;
while (true) {
  const { data, error } = await supabase
    .from('portfolio_earnings')
    .select('amount_eur')
    .eq('kind', 'survey')
    .like('notes', `${NOTE_PREFIX}%`)
    .range(offset, offset + 999);

  if (error) {
    console.error('Error verifying import:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) break;
  importedRows = importedRows.concat(data);
  offset += 1000;
}

const total = importedRows.reduce((sum, row) => sum + Number(row.amount_eur || 0), 0);

console.log(`Imported rows: ${importedRows.length}`);
console.log(`Imported total: EUR ${total.toFixed(2)}`);
