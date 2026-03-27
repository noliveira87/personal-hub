#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

const parseNumberAfter = (text, key) => {
  const match = String(text ?? '').match(new RegExp(`${key}:(.+)`));
  return match ? Number(match[1].trim()) : null;
};

async function run() {
  const { data, error } = await supabase
    .from('portfolio_investments')
    .select('name,type,invested_amount,current_value,notes');

  if (error) {
    console.error(error);
    process.exit(1);
  }

  let btc = null;
  let eth = null;
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=eur');
    if (response.ok) {
      const q = await response.json();
      btc = q?.bitcoin?.eur ?? null;
      eth = q?.ethereum?.eur ?? null;
    }
  } catch {
    // ignore network errors
  }

  let invested = 0;
  let currentDb = 0;
  let currentResolved = 0;

  for (const row of data ?? []) {
    invested += Number(row.invested_amount ?? 0);
    currentDb += Number(row.current_value ?? 0);

    let current = Number(row.current_value ?? 0);
    if (row.type === 'crypto') {
      const notes = String(row.notes ?? '');
      const units = parseNumberAfter(notes, 'CRYPTO_UNITS');
      const cashbackUnits = parseNumberAfter(notes, 'CRYPTO_CASHBACK_UNITS');
      const cashbackAssetMatch = notes.match(/CRYPTO_CASHBACK_ASSET:(.+)/);
      const cashbackAsset = cashbackAssetMatch?.[1]?.trim();

      if (units && notes.includes('CRYPTO_ASSET:BTC') && btc) {
        current = units * btc;
      } else if (units && notes.includes('CRYPTO_ASSET:ETH') && eth) {
        current = units * eth;
      } else if (!units && cashbackUnits && cashbackAsset === 'BTC' && btc) {
        current = cashbackUnits * btc;
      } else if (!units && cashbackUnits && cashbackAsset === 'ETH' && eth) {
        current = cashbackUnits * eth;
      }
    }

    currentResolved += current;
  }

  const dbProfit = currentDb - invested;
  const resolvedProfit = currentResolved - invested;

  console.log({
    count: data?.length ?? 0,
    invested: Number(invested.toFixed(2)),
    currentDb: Number(currentDb.toFixed(2)),
    dbProfit: Number(dbProfit.toFixed(2)),
    currentResolved: Number(currentResolved.toFixed(2)),
    resolvedProfit: Number(resolvedProfit.toFixed(2)),
    deltaFromLiveCrypto: Number((currentResolved - currentDb).toFixed(2)),
    btc,
    eth,
  });
}

run().catch(console.error);
