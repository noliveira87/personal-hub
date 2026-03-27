#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const parseAmount = (v) => {
  const n = String(v ?? '').replace(/\s/g, '').replace(/[€$£]/g, '');
  if (!n) return NaN;
  return Math.round(Number(n.replace(/,/g, '')) * 100) / 100;
};

const toIsoDate = (pt) => {
  const [dd, mm, yyyy] = String(pt).split('/');
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
};

const tsv = fs.readFileSync(path.join(__dirname, 'social-media-check.tsv'), 'utf-8');
const expectedRows = tsv
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .slice(1)
  .map((line) => line.split('\t'))
  .filter((p) => p.length >= 8)
  .map((p) => ({
    title: p[0].trim(),
    provider: p[1].trim(),
    date: toIsoDate(p[3].trim()),
    amount: parseAmount(p[p.length - 1].trim()),
  }))
  .filter((r) => r.title && r.provider && r.date && Number.isFinite(r.amount));

let all = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('portfolio_earnings')
    .select('title,provider,kind,date,amount_eur,notes')
    .order('date', { ascending: false })
    .range(from, from + 999);

  if (error) {
    console.error('DB_ERROR', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) break;
  all = all.concat(data);
  from += 1000;
}

const actualRows = all
  .filter((r) => (r.kind === 'survey' && String(r.notes ?? '').startsWith('KIND:social_media')) || r.kind === 'social_media')
  .map((r) => ({
    title: String(r.title ?? '').trim(),
    provider: String(r.provider ?? '').trim(),
    date: String(r.date ?? '').trim(),
    amount: Math.round(Number(r.amount_eur || 0) * 100) / 100,
  }));

const keyOf = (r) => `${r.title}||${r.provider}||${r.date}||${r.amount.toFixed(2)}`;

const countMap = (rows) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};

const expectedMap = countMap(expectedRows);
const actualMap = countMap(actualRows);

let matched = 0;
let missingCount = 0;
let extraCount = 0;
const missing = [];
const extra = [];

for (const [k, cnt] of expectedMap) {
  const got = actualMap.get(k) ?? 0;
  matched += Math.min(cnt, got);
  if (got < cnt) {
    missingCount += cnt - got;
    missing.push(`${cnt - got}x ${k}`);
  }
}

for (const [k, cnt] of actualMap) {
  const exp = expectedMap.get(k) ?? 0;
  if (cnt > exp) {
    extraCount += cnt - exp;
    extra.push(`${cnt - exp}x ${k}`);
  }
}

const expectedTotal = expectedRows.reduce((s, r) => s + r.amount, 0);
const actualTotal = actualRows.reduce((s, r) => s + r.amount, 0);

console.log(`EXPECTED_COUNT=${expectedRows.length}`);
console.log(`EXPECTED_TOTAL=${expectedTotal.toFixed(2)}`);
console.log(`ACTUAL_SOCIAL_COUNT=${actualRows.length}`);
console.log(`ACTUAL_SOCIAL_TOTAL=${actualTotal.toFixed(2)}`);
console.log(`MATCHED_ROWS=${matched}`);
console.log(`MISSING_ROWS=${missingCount}`);
console.log(`EXTRA_ROWS=${extraCount}`);

if (missing.length) {
  console.log('MISSING_SAMPLE_START');
  missing.slice(0, 10).forEach((x) => console.log(x));
  console.log('MISSING_SAMPLE_END');
}
if (extra.length) {
  console.log('EXTRA_SAMPLE_START');
  extra.slice(0, 10).forEach((x) => console.log(x));
  console.log('EXTRA_SAMPLE_END');
}
