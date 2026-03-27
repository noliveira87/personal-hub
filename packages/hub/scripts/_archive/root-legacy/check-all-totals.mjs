#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAll() {
  // Fetch all surveys
  let surveys = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('portfolio_earnings')
      .select('amount_eur')
      .eq('kind', 'survey')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    surveys = surveys.concat(data);
    offset += 1000;
  }

  // Fetch all cashback
  let cashback = [];
  offset = 0;
  while (true) {
    const { data } = await supabase
      .from('portfolio_earnings')
      .select('amount_eur')
      .eq('kind', 'cashback')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    cashback = cashback.concat(data);
    offset += 1000;
  }

  const surveyTotal = surveys.reduce((s, r) => s + r.amount_eur, 0);
  const cashbackTotal = cashback.reduce((s, r) => s + r.amount_eur, 0);

  console.log(`\n📊 DATABASE STATE:\n`);
  console.log(`Surveys:  ${surveys.length} entries = €${surveyTotal.toFixed(2)}`);
  console.log(`Cashback: ${cashback.length} entries = €${cashbackTotal.toFixed(2)}`);
  console.log(`TOTAL:    €${(surveyTotal + cashbackTotal).toFixed(2)}\n`);
}

checkAll().catch(console.error);
