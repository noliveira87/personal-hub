#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data from 2025 spreadsheet (columns to import)
const expenseData = [
  { month: '2025-01-01', salario: 5072.64, alimentacao: 182.40, agua: null, luz: null, net: null, habitacao: null, outras: 453.96, social: 100.00 },
  { month: '2025-02-01', salario: 4828.46, alimentacao: 214.20, agua: 17.48, luz: 27.19, net: 40.49, habitacao: 1717.05, outras: 413.53, social: 100.00 },
  { month: '2025-03-01', salario: 4828.46, alimentacao: 224.40, agua: 25.62, luz: 97.04, net: 40.99, habitacao: 1120.46, outras: 419.36, social: 100.00 },
  { month: '2025-04-01', salario: 4905.83, alimentacao: 204.00, agua: 25.98, luz: 91.59, net: 40.99, habitacao: 1120.46, outras: 410.51, social: 100.00 },
  { month: '2025-05-01', salario: 7538.40, alimentacao: 0.00, agua: 24.32, luz: 67.39, net: 41.77, habitacao: 1120.46, outras: 419.92, social: 100.00 },
  { month: '2025-06-01', salario: 4905.83, alimentacao: 193.80, agua: 26.34, luz: 77.49, net: 40.99, habitacao: 1120.46, outras: 483.49, social: 100.00 },
  { month: '2025-07-01', salario: 4905.82, alimentacao: 224.40, agua: 21.96, luz: 90.56, net: 40.99, habitacao: 1120.46, outras: 416.31, social: 190.00 },
  { month: '2025-08-01', salario: 5352.07, alimentacao: 214.20, agua: 32.49, luz: 143.97, net: 40.99, habitacao: 1120.46, outras: 419.40, social: 160.00 },
  { month: '2025-09-01', salario: 3640.83, alimentacao: 224.40, agua: 27.05, luz: 41.00, net: 39.10, habitacao: 1120.46, outras: 436.81, social: 50.00 },
  { month: '2025-10-01', salario: 4989.73, alimentacao: 204.00, agua: 19.14, luz: 20.97, net: 42.08, habitacao: 1120.46, outras: 462.69, social: 100.00 },
  { month: '2025-11-01', salario: 7573.40, alimentacao: 224.40, agua: 26.69, luz: 99.20, net: 40.92, habitacao: 1120.46, outras: 325.35, social: 100.00 },
  { month: '2025-12-01', salario: 4923.83, alimentacao: 173.40, agua: 29.85, luz: 98.91, net: 40.99, habitacao: 1120.46, outras: 470.41, social: 100.00 },
];

async function main() {
  try {
    console.log('🔍 Finding contracts...');

    // Find contracts by name
    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select('id, name, provider, category')
      .or(`name.ilike.%MEO%,name.ilike.%água%,name.ilike.%water%,name.ilike.%net%`);

    if (contractError) throw contractError;

    console.log('📋 Available contracts:');
    contracts.forEach(c => console.log(`  - ${c.name} (${c.provider}) [${c.id}] - ${c.category}`));

    // Find specific contracts by ID (hardcoded to avoid ambiguity)
    const luzContract = {
      id: 'f771daad-53f4-4598-b524-f5b3be2303d3',
      name: 'Luz',
      provider: 'MEO Energia',
      category: 'electricity'
    };
    const aguaContract = contracts.find(c => c.category === 'water');
    const netContract = contracts.find(c => c.name.toLowerCase().includes('internet fibra'));

    if (!luzContract) {
      console.error('❌ MEO Energia (electricity) contract not found');
      process.exit(1);
    }
    if (!aguaContract) {
      console.error('❌ ÁGUA (water) contract not found');
      process.exit(1);
    }
    if (!netContract) {
      console.error('❌ NET (internet) contract not found');
      process.exit(1);
    }

    console.log('\n✅ Contracts found:');
    console.log(`  LUZ: ${luzContract.name} [${luzContract.id}]`);
    console.log(`  ÁGUA: ${aguaContract.name} [${aguaContract.id}]`);
    console.log(`  NET: ${netContract.name} [${netContract.id}]`);

    // Prepare transactions for import
    const transactionsToInsert = [];
    const now = new Date().toISOString();

    for (const row of expenseData) {
      const date = new Date(row.month).toISOString().split('T')[0]; // YYYY-MM-DD
      const monthName = new Date(row.month).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

      // Salário (income)
      if (row.salario > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `Salário - ${monthName}`,
          type: 'income',
          category: 'income',
          amount: row.salario,
          date,
          recurring: true,
          contract_id: null,
          created_at: now,
        });
      }

      // Sub. Alimentação (groceries)
      if (row.alimentacao > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `Alimentação - ${monthName}`,
          type: 'expense',
          category: 'groceries',
          amount: row.alimentacao,
          date,
          recurring: true,
          contract_id: null,
          created_at: now,
        });
      }

      // ÁGUA (contracted)
      if (row.agua > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `${aguaContract.name} (${aguaContract.provider})`,
          type: 'expense',
          category: 'water',
          amount: row.agua,
          date,
          recurring: true,
          contract_id: aguaContract.id,
          created_at: now,
        });
      }

      // LUZ (contracted - MEO Energia)
      if (row.luz > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `${luzContract.name} (${luzContract.provider})`,
          type: 'expense',
          category: 'electricity',
          amount: row.luz,
          date,
          recurring: true,
          contract_id: luzContract.id,
          created_at: now,
        });
      }

      // NET (contracted)
      if (row.net > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `${netContract.name} (${netContract.provider})`,
          type: 'expense',
          category: 'internet',
          amount: row.net,
          date,
          recurring: true,
          contract_id: netContract.id,
          created_at: now,
        });
      }

      // CRÉDITO HABITAÇÃO (not linked to contract as per user request)
      if (row.habitacao > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `Crédito Habitação Sta. Clara - ${monthName}`,
          type: 'expense',
          category: 'mortgage',
          amount: row.habitacao,
          date,
          recurring: true,
          contract_id: null,
          created_at: now,
        });
      }

      // Outras Despesas
      if (row.outras > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `Outras Despesas - ${monthName}`,
          type: 'expense',
          category: 'other',
          amount: row.outras,
          date,
          recurring: true,
          contract_id: null,
          created_at: now,
        });
      }

      // Seg. Social
      if (row.social > 0) {
        transactionsToInsert.push({
          id: crypto.randomUUID(),
          name: `Segurança Social - ${monthName}`,
          type: 'expense',
          category: 'social-security',
          amount: row.social,
          date,
          recurring: true,
          contract_id: null,
          created_at: now,
        });
      }
    }

    console.log(`\n📊 Preparing to insert ${transactionsToInsert.length} transactions...`);

    // Check for duplicates
    const { data: existing, error: checkError } = await supabase
      .from('home_expenses_transactions')
      .select('id, date, amount, name')
      .in('date', transactionsToInsert.map(t => t.date));

    if (checkError) throw checkError;

    const existingSet = new Set(existing.map(e => `${e.date}|${e.amount}|${e.name}`));
    const newTransactions = transactionsToInsert.filter(t => !existingSet.has(`${t.date}|${t.amount}|${t.name}`));

    if (newTransactions.length === 0) {
      console.log('✅ All transactions already exist, no import needed');
      return;
    }

    console.log(`✅ ${newTransactions.length} new transactions to insert (${transactionsToInsert.length - newTransactions.length} already exist)\n`);

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < newTransactions.length; i += batchSize) {
      const batch = newTransactions.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('home_expenses_transactions')
        .insert(batch);

      if (insertError) throw insertError;
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} transactions)`);
    }

    console.log(`\n✅ Successfully imported ${newTransactions.length} transactions!`);
    console.log('📈 Summary:');
    console.log(`  - Salários: ${newTransactions.filter(t => t.category === 'income').length}`);
    console.log(`  - Alimentação: ${newTransactions.filter(t => t.category === 'groceries').length}`);
    console.log(`  - ÁGUA: ${newTransactions.filter(t => t.category === 'water').length}`);
    console.log(`  - LUZ: ${newTransactions.filter(t => t.category === 'electricity').length}`);
    console.log(`  - NET: ${newTransactions.filter(t => t.category === 'internet').length}`);
    console.log(`  - Crédito Habitação: ${newTransactions.filter(t => t.category === 'mortgage').length}`);
    console.log(`  - Outras Despesas: ${newTransactions.filter(t => t.category === 'other').length}`);
    console.log(`  - Seg. Social: ${newTransactions.filter(t => t.category === 'social-security').length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
